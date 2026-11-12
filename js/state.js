// js/state.js - Estado da partida, ações e pub/sub de mudanças
// NUNCA ACESSA O DOM

import { CONSTANTES, limitarPosicao, verificarCheckpoints, aplicarEfeito, isFimDePartida, calcularPontuacao } from './regras.js';
import { semanaAtual, gerarTabuleiro, DeckManager } from './deck.js';
import { criarRng } from './rng.js';

const STORAGE_KEYS = {
  JOGADOR: 'trilha_jogador',
  SESSAO: 'trilha_sessao'
};

class StateManager {
  constructor() {
    this.listeners = new Map();

    // Estado padrão
    this.state = {
      telaAtual: 'inicio',
      jogador: '',
      jogador_id: '',
      area: '',
      area_id: null,
      email: '',
      
      tokens: CONSTANTES.TOKENS_INICIAIS,
      posicao: CONSTANTES.CASA_INICIAL,
      acertos_desafio: 0,
      bonus_pense_antes: 0,
      armadilhas: 0,
      checkpoints_passados: [],
      pular_proxima_rodada: false,
      historico: [],
      partida_vale_ranking: true,
      
      rodada: 0,
      dado_ultimo: null,
      pontuacao_final: 0,
      partida_finalizada: false,
      jogada_em: '',
      semana_partida: semanaAtual(),
      tabuleiro: [],
      
      tutorial_visto: false,
      termo_privacidade_aceito: false
    };

    // RNG e Deck para a partida atual
    this.rngDado = null;
    this.deckManager = null;

    // Carrega dados persistidos do jogador localmente
    this.carregarJogadorLocal();
  }

  /**
   * Obtém uma cópia do estado atual
   * @returns {Object}
   */
  get() {
    return { ...this.state };
  }

  /**
   * Atualiza parcialmente o estado e notifica ouvintes
   * @param {Object} updates
   */
  set(updates) {
    this.state = { ...this.state, ...updates };
    this.emit('change', this.state);
  }

  /**
   * Registra um ouvinte de evento
   * @param {string} event
   * @param {Function} callback
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove um ouvinte de evento
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const lista = this.listeners.get(event).filter(cb => cb !== callback);
    this.listeners.set(event, lista);
  }

  /**
   * Emite evento para todos os ouvintes registrados
   * @param {string} event
   * @param {*} data
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Erro no listener de ${event}:`, e);
        }
      });
    }
  }

  /**
   * Inicia uma nova partida
   * @param {Object} params
   */
  novaPartida(params = {}) {
    const semana = params.semana || semanaAtual();
    const nomeJogador = params.jogador || this.state.jogador || 'Colaborador';
    const areaJogador = params.area || this.state.area || 'TI';
    const valeRanking = params.partida_vale_ranking !== undefined ? !!params.partida_vale_ranking : true;

    // Inicializa RNG determinístico semanal do dado
    this.rngDado = criarRng(`${semana}_dado`);

    // Gera tabuleiro da semana
    const novoTabuleiro = gerarTabuleiro(semana, params.cartasPorCategoria);

    // Inicializa deck se cartas forem fornecidas
    if (params.cartas && Array.isArray(params.cartas)) {
      this.deckManager = new DeckManager(params.cartas, `${semana}_cartas`);
    }

    this.state = {
      ...this.state,
      jogador: nomeJogador,
      area: areaJogador,
      area_id: params.area_id ?? this.state.area_id,
      tokens: CONSTANTES.TOKENS_INICIAIS,
      posicao: CONSTANTES.CASA_INICIAL,
      acertos_desafio: 0,
      bonus_pense_antes: 0,
      armadilhas: 0,
      checkpoints_passados: [],
      pular_proxima_rodada: false,
      historico: [],
      partida_vale_ranking: valeRanking,
      rodada: 0,
      dado_ultimo: null,
      pontuacao_final: 0,
      partida_finalizada: false,
      jogada_em: new Date().toISOString(),
      semana_partida: semana,
      tabuleiro: novoTabuleiro
    };

    this.salvarJogadorLocal();
    this.emit('nova_partida', this.state);
    this.emit('change', this.state);
  }

  /**
   * Rola o dado determinístico da semana (ou aleatório de 1 a 6)
   * @returns {number} Face de 1 a 6
   */
  rolarDado() {
    if (this.state.partida_finalizada) return 0;
    
    let face = 1;
    if (this.rngDado) {
      face = this.rngDado.inteiro(CONSTANTES.DADO_MIN, CONSTANTES.DADO_MAX);
    } else {
      face = Math.floor(Math.random() * (CONSTANTES.DADO_MAX - CONSTANTES.DADO_MIN + 1)) + CONSTANTES.DADO_MIN;
    }

    this.set({ dado_ultimo: face, rodada: this.state.rodada + 1 });
    return face;
  }

  /**
   * Move o peão pelo tabuleiro aplicando limites e bônus de checkpoint
   * @param {number} casas
   * @returns {{ novaPosicao: number, bonusTokens: number, fimDePartida: boolean }}
   */
  mover(casas) {
    const posAnterior = this.state.posicao;
    const posCalculada = limitarPosicao(posAnterior + Number(casas || 0));

    const cpRes = verificarCheckpoints(posAnterior, posCalculada, this.state.checkpoints_passados);
    const novosTokens = Math.max(0, this.state.tokens + cpRes.bonusTokens);

    const atualizacoes = {
      posicao: posCalculada,
      tokens: novosTokens,
      checkpoints_passados: cpRes.novosCheckpoints
    };

    if (cpRes.fimDePartida || isFimDePartida({ posicao: posCalculada, tokens: novosTokens, rodada: this.state.rodada })) {
      this.set(atualizacoes);
      this.finalizarPartida();
    } else {
      this.set(atualizacoes);
    }

    this.emit('movimento', { de: posAnterior, para: posCalculada, bonus: cpRes.bonusTokens });
    return {
      novaPosicao: posCalculada,
      bonusTokens: cpRes.bonusTokens,
      fimDePartida: cpRes.fimDePartida
    };
  }

  /**
   * Aplica um efeito de carta ao estado
   * @param {Object} efeito
   */
  aplicarEfeito(efeito) {
    const novoEstado = aplicarEfeito(this.state, efeito);
    this.state = novoEstado;

    if (isFimDePartida({ posicao: this.state.posicao, tokens: this.state.tokens, rodada: this.state.rodada })) {
      this.finalizarPartida();
    } else {
      this.emit('change', this.state);
    }
  }

  /**
   * Registra a escolha tomada pelo jogador para auditoria
   * @param {string} carta_id
   * @param {number} opcao_index
   */
  registrarEscolha(carta_id, opcao_index = 0) {
    const item = {
      carta_id: String(carta_id),
      opcao_index: Number(opcao_index),
      jogada_em: new Date().toISOString(),
      timestamp: Date.now()
    };
    const novoHistorico = [...this.state.historico, item];
    this.set({ historico: novoHistorico });
  }

  /**
   * Finaliza a partida e calcula a pontuação oficial
   * @returns {number} Pontuação calculada
   */
  finalizarPartida() {
    if (this.state.partida_finalizada) return this.state.pontuacao_final;

    const pontos = calcularPontuacao({
      tokens: this.state.tokens,
      acertos: this.state.acertos_desafio,
      bonusPenseAntes: this.state.bonus_pense_antes,
      armadilhas: this.state.armadilhas
    });

    this.set({
      pontuacao_final: pontos,
      partida_finalizada: true
    });

    this.emit('partida_terminou', pontos);
    return pontos;
  }

  // --- PERSISTÊNCIA LOCAL SEGURA COM TRY/CATCH ---

  /**
   * Salva dados básicos do jogador e preferências no localStorage
   */
  salvarJogadorLocal(dados = {}) {
    try {
      if (typeof localStorage === 'undefined') return;
      const payload = {
        jogador: dados.jogador ?? this.state.jogador,
        jogador_id: dados.jogador_id ?? this.state.jogador_id,
        area: dados.area ?? this.state.area,
        area_id: dados.area_id ?? this.state.area_id,
        email: dados.email ?? this.state.email,
        tutorial_visto: dados.tutorial_visto ?? this.state.tutorial_visto,
        termo_privacidade_aceito: dados.termo_privacidade_aceito ?? this.state.termo_privacidade_aceito
      };
      localStorage.setItem(STORAGE_KEYS.JOGADOR, JSON.stringify(payload));
    } catch (e) {
      console.warn('Não foi possível persistir jogador no localStorage:', e);
    }
  }

  /**
   * Carrega os dados do jogador do localStorage
   * @returns {boolean}
   */
  carregarJogadorLocal() {
    try {
      if (typeof localStorage === 'undefined') return false;
      const raw = localStorage.getItem(STORAGE_KEYS.JOGADOR);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        this.state = {
          ...this.state,
          jogador: parsed.jogador || this.state.jogador,
          jogador_id: parsed.jogador_id || this.state.jogador_id,
          area: parsed.area || this.state.area,
          area_id: parsed.area_id ?? this.state.area_id,
          email: parsed.email || this.state.email,
          tutorial_visto: !!parsed.tutorial_visto,
          termo_privacidade_aceito: !!parsed.termo_privacidade_aceito
        };
        return true;
      }
    } catch (e) {
      console.warn('Erro ao carregar jogador do localStorage:', e);
    }
    return false;
  }

  /**
   * Salva dados da sessão de autenticação (tokens Supabase)
   */
  salvarSessaoLocal(sessao) {
    try {
      if (typeof localStorage === 'undefined') return;
      if (!sessao) {
        localStorage.removeItem(STORAGE_KEYS.SESSAO);
      } else {
        localStorage.setItem(STORAGE_KEYS.SESSAO, JSON.stringify(sessao));
      }
    } catch (e) {
      console.warn('Erro ao salvar sessão local:', e);
    }
  }

  /**
   * Carrega sessão de autenticação salva
   */
  carregarSessaoLocal() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(STORAGE_KEYS.SESSAO);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('Erro ao carregar sessão local:', e);
      return null;
    }
  }

  /**
   * Limpa sessão local (logout)
   */
  limparSessaoLocal() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(STORAGE_KEYS.SESSAO);
    } catch (e) {
      console.warn('Erro ao limpar sessão local:', e);
    }
  }
}

export const state = new StateManager();
