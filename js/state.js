// js/state.js - Estado da partida, ações e pub/sub de mudanças
// NUNCA ACESSA O DOM

import { CONSTANTES, CONSTANTES_PONTUACAO, limitarPosicao, verificarCheckpoints, aplicarEfeito, isFimDePartida, calcularPontuacao, calcularCustoRolagem, calcularBonusCheckpoint, calcularBonusSequencia, rotuloSequencia } from './regras.js';
import { macroTema } from './temas.js';
import { semanaAtual, gerarTabuleiro, DeckManager, gerarSementeConvidado, GRAFO_PADRAO, gerarTabuleiroGrafo } from './deck.js';
import { criarRng } from './rng.js';
import { AVATAR_PADRAO, validarAvatar } from './avatar.js';

const STORAGE_KEYS = {
  JOGADOR: 'trilha_jogador',
  SESSAO: 'trilha_sessao',
  AVATAR_CONVIDADO: 'trilha_avatar_convidado'
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
      modo_convidado: false,
      
      tokens: CONSTANTES.TOKENS_INICIAIS,
      posicao: CONSTANTES.CASA_INICIAL,
      acertos_desafio: 0,
      bonus_pense_antes: 0,
      armadilhas: 0,
      checkpoints_passados: [],
      pular_proxima_rodada: false,
      historico: [],
      partida_vale_ranking: true,
      sequencia_acertos: 0,
      maior_sequencia: 0,
      respostas_tema: {},
      
      rodada: 0,
      dado_ultimo: null,
      pontuacao_final: 0,
      partida_finalizada: false,
      jogada_em: '',
      semana_partida: semanaAtual(),
      tabuleiro: [],
      grafoTabuleiro: GRAFO_PADRAO,
      bifurcacaoPendente: null,
      hubEventosSorteados: [],
      voltas_completas: 0,
      casas_avancadas: 0,
      boas_praticas: 0,
      checkpoints_volta_atual: [],
      custo_proxima_rolagem: 1,
      tokens_baixos_notificado: false,
      
      // Nova regra: trilha em loop contínuo e escalada
      voltas_completas: 0,
      casas_avancadas: 0,
      boas_praticas: 0,
      checkpoints_volta_atual: [],
      custo_proxima_rolagem: 1,
      tokens_baixos_notificado: false,
      
      tutorial_visto: false,
      termo_privacidade_aceito: false,

      // Avatar Chibi 3D do Jogador
      avatar: { ...AVATAR_PADRAO },
      avatar_configurado: false
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
    const ehConvidado = params.modo_convidado === true;
    
    // Se for convidado: gera semente aleatória criptográfica
    // Se for oficial/treino logado: usa a semente determinística semanal
    const semente = ehConvidado
      ? gerarSementeConvidado()
      : (params.semana || semanaAtual());

    const nomeJogador = ehConvidado ? 'Convidado' : (params.jogador || this.state.jogador || 'Colaborador');
    const areaJogador = params.area || (ehConvidado ? (params.area_id ? 'Área ' + params.area_id : 'Convidado') : (this.state.area || 'TI'));
    const valeRanking = ehConvidado ? false : (params.partida_vale_ranking !== undefined ? !!params.partida_vale_ranking : true);

    // Inicializa RNG do dado (semente aleatória para convidado; semanal para oficial)
    this.rngDado = criarRng(`${semente}_dado`);

    // Tabuleiro: prioriza Grafo Diorama Modular (61 nós) com fallback para legado
    const grafo = params.usarGrafo !== false ? (params.grafoTabuleiro || GRAFO_PADRAO) : null;
    let novoTabuleiro = null;
    if (grafo) {
      novoTabuleiro = gerarTabuleiroGrafo(semente, grafo);
    } else {
      novoTabuleiro = gerarTabuleiro(semente, params.cartasPorCategoria);
    }

    // Inicializa deck se cartas forem fornecidas
    if (params.cartas && Array.isArray(params.cartas)) {
      this.deckManager = new DeckManager(params.cartas, `${semente}_cartas`);
    }

    this.state = {
      ...this.state,
      modo_convidado: ehConvidado,
      jogador: nomeJogador,
      area: areaJogador,
      area_id: params.area_id ?? (ehConvidado ? null : this.state.area_id),
      tokens: CONSTANTES.TOKENS_INICIAIS,
      posicao: CONSTANTES.CASA_INICIAL,
      acertos_desafio: 0,
      bonus_pense_antes: 0,
      armadilhas: 0,
      checkpoints_passados: [],
      pular_proxima_rodada: false,
      historico: [],
      partida_vale_ranking: valeRanking,
      sequencia_acertos: 0,
      maior_sequencia: 0,
      respostas_tema: {},
      rodada: 0,
      dado_ultimo: null,
      pontuacao_final: 0,
      partida_finalizada: false,
      jogada_em: new Date().toISOString(),
      semana_partida: ehConvidado ? null : semente,
      tabuleiro: novoTabuleiro,
      grafoTabuleiro: grafo,
      bifurcacaoPendente: null,
      hubEventosSorteados: []
    };

    if (!ehConvidado) {
      this.salvarJogadorLocal();
    }
    this.emit('nova_partida', this.state);
    this.emit('change', this.state);
  }

  /**
   * Atalho para iniciar partida
   * @param {Object} [params]
   */
  iniciarPartida(params = {}) {
    return this.novaPartida(params);
  }

  /**
   * Atalho para iniciar partida anônima em Modo Convidado
   * @param {Object} [params]
   */
  iniciarPartidaConvidado(params = {}) {
    return this.novaPartida({ ...params, modo_convidado: true });
  }

  /**
   * Rola o dado determinístico da semana (ou aleatório de 1 a 6)
   * @returns {number} Face de 1 a 6
   */
  rolarDado() {
    if (this.state.partida_finalizada) return 0;

    // Custo de rolagem por volta: Volta 1 = 1 token, Volta 2 = 2 tokens, Volta 3+ = 3 tokens
    const custo = calcularCustoRolagem(this.state.voltas_completas || 0);
    const tokensAposCusto = Math.max(0, (this.state.tokens || 0) - custo);
    
    let face = 1;
    if (this.rngDado) {
      face = this.rngDado.inteiro(CONSTANTES.DADO_MIN, CONSTANTES.DADO_MAX);
    } else {
      face = Math.floor(Math.random() * (CONSTANTES.DADO_MAX - CONSTANTES.DADO_MIN + 1)) + CONSTANTES.DADO_MIN;
    }

    const item = {
      tipo: 'rolagem_dado',
      face,
      custo_rolagem: custo,
      tokens_apos_custo: tokensAposCusto,
      jogada_em: new Date().toISOString(),
      timestamp: Date.now()
    };

    this.set({
      dado_ultimo: face,
      rodada: this.state.rodada + 1,
      tokens: tokensAposCusto,
      custo_proxima_rolagem: custo,
      historico: [...this.state.historico, item]
    });
    return face;
  }

  /**
   * Move o peão pelo tabuleiro aplicando limites, grafo com bifurcações e bônus de checkpoint
   * @param {number} casas
   * @param {number|null} [caminhoEscolhido=null]
   * @returns {{ novaPosicao: number, caminhoPercorrido: number[], bonusTokens: number, fimDePartida: boolean, parouEmBifurcacao: boolean, bifurcacaoPendente: Object|null, hubAtivado: boolean }}
   */
  mover(casas, caminhoEscolhido = null) {
    const posAnterior = this.state.posicao;
    const grafo = this.state.grafoTabuleiro;

    // Se estiver usando o novo tabuleiro em grafo (61 nós com ramificações)
    if (grafo && Array.isArray(grafo.casas) && grafo.casas.length > 0) {
      let passos = Number(casas || 0);
      let currId = posAnterior;
      let parouEmBifurcacao = false;
      let bifurcacaoPendente = null;
      let hubAtivado = false;
      let voltaCompletada = false;
      let bonusTokensAcumulado = 0;
      const visitados = new Set(this.state.checkpoints_passados || []);
      const caminhoPercorrido = [currId];

      if (passos < 0) {
        // Movimento negativo no grafo (voltar casas)
        let recuo = Math.abs(passos);
        while (recuo > 0 && currId > 0) {
          const preds = grafo.casas.filter(c => c.proximos && c.proximos.includes(currId));
          if (!preds || preds.length === 0) break;
          // Prioriza o predecessor com menor distância numérica em relação a currId - 1
          preds.sort((a, b) => Math.abs(a.id - (currId - 1)) - Math.abs(b.id - (currId - 1)));
          currId = preds[0].id;
          caminhoPercorrido.push(currId);
          recuo--;
        }
      } else {
        while (passos > 0) {
          const nodo = grafo.casas.find(c => c.id === currId);
          if (!nodo || !nodo.proximos || nodo.proximos.length === 0) {
            // Chegou ao fim do grafo (Portal Final / Casa 60)
            break;
          }

          let proxId = null;
          if (nodo.proximos.length === 1) {
            proxId = nodo.proximos[0];
          } else {
            // Bifurcação!
            if (caminhoEscolhido !== null && nodo.proximos.includes(caminhoEscolhido)) {
              proxId = caminhoEscolhido;
              caminhoEscolhido = null; // consumido
            } else {
              // Pausa movimento para o jogador escolher o caminho
              parouEmBifurcacao = true;
              bifurcacaoPendente = {
                noOrigem: currId,
                passosRestantes: passos,
                bifurcacao: nodo.bifurcacao
              };
              break;
            }
          }

          currId = proxId;
          caminhoPercorrido.push(currId);
          passos--;
          this.state.casas_avancadas = (this.state.casas_avancadas || 0) + 1;

          // Passagem pelo Portal Final (Nó 60) -> Volta completa! Continua para a Casa 0
          if (currId === 60) {
            voltaCompletada = true;
            const novaVolta = (this.state.voltas_completas || 0) + 1;
            this.state.voltas_completas = novaVolta;
            this.state.checkpoints_volta_atual = [];
            this.state.custo_proxima_rolagem = calcularCustoRolagem(novaVolta);
            const bonusVolta = calcularBonusCheckpoint(60, novaVolta - 1);
            bonusTokensAcumulado += bonusVolta;

            // Recalcula grafo com armadilha extra da nova volta se houver
            try {
              const novoTabGrafo = gerarTabuleiroGrafo(this.state.semana_partida, grafo, novaVolta);
              this.state.tabuleiro = novoTabGrafo;
            } catch (_) {}

            // O peão segue imediatamente para o nó 0 no percurso em loop
            currId = 0;
            caminhoPercorrido.push(currId);
            this.emit('volta_completa', { voltas: novaVolta, bonus: bonusVolta });
          }

          // Verifica passagem pelo Hub Central (Nó 33)
          if (currId === 33 && !visitados.has(33)) {
            hubAtivado = true;
            visitados.add(33);
          }

          // Checkpoints: dão bônus 1 vez por volta (com valor reduzido pela metade a cada volta)
          const cpVolta = this.state.checkpoints_volta_atual || [];
          if ((currId === 20 || currId === 27) && !cpVolta.includes(20) && !cpVolta.includes(27)) {
            const b = calcularBonusCheckpoint(20, this.state.voltas_completas || 0);
            bonusTokensAcumulado += b;
            cpVolta.push(20);
            visitados.add(20);
          }
          if ((currId === 40 || currId === 53) && !cpVolta.includes(40) && !cpVolta.includes(53)) {
            const b = calcularBonusCheckpoint(40, this.state.voltas_completas || 0);
            bonusTokensAcumulado += b;
            cpVolta.push(40);
            visitados.add(40);
          }
          this.state.checkpoints_volta_atual = cpVolta;
        }
      }

      const novosTokens = Math.max(0, this.state.tokens + bonusTokensAcumulado);
      // Fim de partida SOMENTE quando tokens chegam a 0 ou limite de segurança
      const fimDePartida = isFimDePartida({ tokens: novosTokens, encerrouVoluntariamente: this.state.partida_finalizada, rodada: this.state.rodada });

      const atualizacoes = {
        posicao: currId,
        tokens: novosTokens,
        checkpoints_passados: Array.from(visitados),
        bifurcacaoPendente: bifurcacaoPendente
      };

      this.set(atualizacoes);

      if (fimDePartida) {
        this.finalizarPartida();
      }

      this.emit('movimento', { de: posAnterior, para: currId, bonus: bonusTokensAcumulado, caminho: caminhoPercorrido });

      return {
        novaPosicao: currId,
        caminhoPercorrido,
        bonusTokens: bonusTokensAcumulado,
        fimDePartida,
        parouEmBifurcacao,
        bifurcacaoPendente,
        hubAtivado,
        voltaCompletada
      };
    }

    // Modo legado linear (31 casas)
    const posCalculada = limitarPosicao(posAnterior + Number(casas || 0), 30);
    const cpRes = verificarCheckpoints(posAnterior, posCalculada, this.state.checkpoints_passados, false);
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
      caminhoPercorrido: [posAnterior, posCalculada],
      bonusTokens: cpRes.bonusTokens,
      fimDePartida: cpRes.fimDePartida,
      parouEmBifurcacao: false,
      bifurcacaoPendente: null,
      hubAtivado: false
    };
  }

  /**
   * Resolução da bifurcação pelo jogador
   * @param {number} noOrigem
   * @param {number} proximoNo
   * @param {string} [nomeEscolha]
   */
  escolherCaminhoBifurcacao(noOrigem, proximoNo, nomeEscolha = '') {
    const pendente = this.state.bifurcacaoPendente;
    const item = {
      tipo: 'bifurcacao',
      no_origem: Number(noOrigem),
      escolha: Number(proximoNo),
      nome: String(nomeEscolha),
      jogada_em: new Date().toISOString(),
      timestamp: Date.now()
    };

    const passosRestantes = pendente ? pendente.passosRestantes : 0;
    this.set({
      historico: [...this.state.historico, item],
      bifurcacaoPendente: null
    });

    // Continua movimento a partir da escolha
    if (passosRestantes > 0) {
      return this.mover(passosRestantes, proximoNo);
    }
    return { novaPosicao: this.state.posicao, caminhoPercorrido: [this.state.posicao], bonusTokens: 0, fimDePartida: false, parouEmBifurcacao: false, bifurcacaoPendente: null, hubAtivado: false };
  }

  /**
   * Sorteia e aplica evento do Hub Central de Dados
   * @param {Object} [eventoPreSorteado]
   * @returns {Object} Evento sorteado
   */
  sortearEventoHub(eventoPreSorteado = null) {
    const grafo = this.state.grafoTabuleiro;
    const eventos = grafo?.hub?.eventos || [
      { id: "ev_1", rotulo: "+3 Tokens", tokens: 3, desc: "Auditoria de dados concluída!" }
    ];

    let ev = eventoPreSorteado;
    if (!ev) {
      if (this.rngDado) {
        ev = this.rngDado.escolher(eventos);
      } else {
        ev = eventos[Math.floor(Math.random() * eventos.length)];
      }
    }

    if (ev.tokens) {
      this.set({ tokens: Math.max(0, this.state.tokens + ev.tokens) });
    }
    if (ev.mover) {
      this.mover(ev.mover);
    }

    const item = {
      tipo: 'hub_evento',
      evento_id: ev.id,
      rotulo: ev.rotulo,
      desc: ev.desc,
      jogada_em: new Date().toISOString(),
      timestamp: Date.now()
    };

    this.set({
      historico: [...this.state.historico, item],
      hubEventosSorteados: [...this.state.hubEventosSorteados, ev]
    });

    this.emit('hub_evento', ev);
    return ev;
  }

  /**
   * Aplica um efeito de carta ao estado
   * @param {Object} efeito
   */
  aplicarEfeito(efeito) {
    // O movimento de cartas ("avança/volta N casas") segue o GRAFO do tabuleiro.
    // Antes era somado direto ao número da casa, o que levava o peão dos atalhos
    // (casas 61–65) para a casa 60 e concedia checkpoints indevidos.
    const deltaMover = Number(efeito?.mover || 0);
    const novoEstado = aplicarEfeito(this.state, { ...efeito, mover: 0 });
    this.state = novoEstado;
    this.ultimoMovimentoCarta = null;
    if (deltaMover !== 0 && this.state.grafoTabuleiro?.casas?.length) {
      this.ultimoMovimentoCarta = this.moverPorCarta(deltaMover);
    }

    if (isFimDePartida({ posicao: this.state.posicao, tokens: this.state.tokens, rodada: this.state.rodada })) {
      this.finalizarPartida();
    } else {
      this.emit('change', this.state);
    }
  }

  /**
   * Move o peão N casas por efeito de carta, seguindo o grafo.
   * Em bifurcações, segue a rota principal (primeiro "proximos"), sem abrir escolha.
   * @param {number} n
   * @returns {{ caminho: number[], bonusTokens: number, voltaCompletada: boolean }}
   */
  moverPorCarta(n) {
    let res = this.mover(n);
    const caminho = [...(res.caminhoPercorrido || [])];
    let bonusTokens = res.bonusTokens || 0;
    let voltaCompletada = !!res.voltaCompletada;
    let guarda = 0;
    while (res.parouEmBifurcacao && res.bifurcacaoPendente && guarda++ < 3) {
      const origem = res.bifurcacaoPendente.noOrigem;
      const nodo = this.state.grafoTabuleiro.casas.find(c => c.id === origem);
      const principal = nodo?.proximos?.[0];
      res = this.escolherCaminhoBifurcacao(origem, principal, 'Rota principal (efeito de carta)');
      caminho.push(...(res.caminhoPercorrido || []).slice(1));
      bonusTokens += res.bonusTokens || 0;
      voltaCompletada = voltaCompletada || !!res.voltaCompletada;
    }
    return { caminho, bonusTokens, voltaCompletada };
  }

  /**
   * Registra o resultado de uma resposta de múltipla escolha:
   * atualiza a sequência de acertos (combo), aplica o bônus de tokens
   * e acumula acertos por macro-tema para o relatório de aprendizagem.
   * @param {Object} carta
   * @param {boolean} correta
   * @returns {{ sequencia: number, bonus: number, rotulo: string|null }}
   */
  registrarResposta(carta, correta) {
    const tema = macroTema(carta?.tema);
    const respostas = { ...(this.state.respostas_tema || {}) };
    const atual = respostas[tema] || { acertos: 0, total: 0 };
    respostas[tema] = { acertos: atual.acertos + (correta ? 1 : 0), total: atual.total + 1 };

    const sequencia = correta ? (this.state.sequencia_acertos || 0) + 1 : 0;
    const bonus = correta ? calcularBonusSequencia(sequencia) : 0;
    this.state = {
      ...this.state,
      respostas_tema: respostas,
      sequencia_acertos: sequencia,
      maior_sequencia: Math.max(this.state.maior_sequencia || 0, sequencia)
    };
    if (bonus > 0) {
      this.state = { ...this.state, tokens: (this.state.tokens || 0) + bonus };
    }
    this.emit('change', this.state);
    return { sequencia, bonus, rotulo: correta ? rotuloSequencia(sequencia) : null };
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
      casas_avancadas: this.state.casas_avancadas,
      voltas: this.state.voltas_completas,
      acertos: this.state.acertos_desafio,
      bonusPenseAntes: this.state.bonus_pense_antes,
      boasPraticas: this.state.boas_praticas,
      armadilhas: this.state.armadilhas
    });

    this.set({
      pontuacao_final: pontos,
      partida_finalizada: true
    });

    this.emit('partida_terminou', pontos);
    return pontos;
  }

  /**
   * Encerramento voluntário da partida pelo jogador (garante os pontos atuais)
   */
  encerrarPartidaVoluntariamente() {
    return this.finalizarPartida();
  }

  // --- PERSISTÊNCIA LOCAL SEGURA COM TRY/CATCH ---

  /**
   * Salva dados básicos do jogador e preferências no localStorage
   */
  salvarJogadorLocal(dados = {}) {
    try {
      if (typeof localStorage === 'undefined') return;

      if (this.state.modo_convidado) {
        // Convidado salva apenas seu avatar localmente no navegador
        if (this.state.avatar) {
          localStorage.setItem(STORAGE_KEYS.AVATAR_CONVIDADO, JSON.stringify(this.state.avatar));
        }
        return;
      }

      const payload = {
        jogador: dados.jogador ?? this.state.jogador,
        jogador_id: dados.jogador_id ?? this.state.jogador_id,
        area: dados.area ?? this.state.area,
        area_id: dados.area_id ?? this.state.area_id,
        email: dados.email ?? this.state.email,
        tutorial_visto: dados.tutorial_visto ?? this.state.tutorial_visto,
        termo_privacidade_aceito: dados.termo_privacidade_aceito ?? this.state.termo_privacidade_aceito,
        avatar: dados.avatar ?? this.state.avatar,
        avatar_configurado: dados.avatar_configurado ?? this.state.avatar_configurado
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

      // Carrega avatar de convidado se existir
      const rawConv = localStorage.getItem(STORAGE_KEYS.AVATAR_CONVIDADO);
      if (rawConv) {
        try {
          const parsedConv = JSON.parse(rawConv);
          const vConv = validarAvatar(parsedConv);
          if (vConv.valido) {
            this.state.avatar = vConv.normalizado;
          }
        } catch (_) {}
      }

      const raw = localStorage.getItem(STORAGE_KEYS.JOGADOR);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const vAvatar = validarAvatar(parsed.avatar);
        this.state = {
          ...this.state,
          jogador: parsed.jogador || this.state.jogador,
          jogador_id: parsed.jogador_id || this.state.jogador_id,
          area: parsed.area || this.state.area,
          area_id: parsed.area_id ?? this.state.area_id,
          email: parsed.email || this.state.email,
          tutorial_visto: !!parsed.tutorial_visto,
          termo_privacidade_aceito: !!parsed.termo_privacidade_aceito,
          avatar: vAvatar.valido ? vAvatar.normalizado : this.state.avatar,
          avatar_configurado: !!parsed.avatar_configurado
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
