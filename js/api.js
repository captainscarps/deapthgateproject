// js/api.js - Integração Supabase, Modo Mock Automático, Fila Offline e Auditoria
// NUNCA ACESSA O DOM

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { semanaAtual } from './deck.js';
import { calcularPontuacao } from './regras.js';

const STORAGE_KEYS = {
  FILA_OFFLINE: 'trilha_fila_partidas_offline',
  SESSAO_LOCAL: 'trilha_jogador_sessao',
  PARTIDAS_PREFIX: 'partidas_'
};

// Armazenamento em memória caso localStorage não esteja disponível (ex: Node/SSR)
const memoryStore = new Map();
function storageGet(key) {
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    return memoryStore.get(key) || null;
  } catch (e) {
    return memoryStore.get(key) || null;
  }
}
function storageSet(key, val) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, String(val));
      return;
    }
  } catch (e) {}
  memoryStore.set(key, String(val));
}
function storageRemove(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
      return;
    }
  } catch (e) {}
  memoryStore.delete(key);
}

export const Api = {
  modoMock: true,
  client: null,
  areasCache: null,
  cartasCache: {},
  simularOffline: false, // Flag de teste para simular contingência offline

  /**
   * Inicializa o cliente Supabase se configurado, ou ativa o MODO MOCK automático
   */
  async inicializar() {
    const temUrlValida = SUPABASE_URL && 
      typeof SUPABASE_URL === 'string' && 
      SUPABASE_URL.trim() !== '' && 
      !SUPABASE_URL.includes('SEU_PROJETO');

    const temKeyValida = SUPABASE_ANON_KEY && 
      typeof SUPABASE_ANON_KEY === 'string' && 
      SUPABASE_ANON_KEY.trim() !== '';

    const supabaseLib = (typeof window !== 'undefined' && window.supabase) 
      ? window.supabase 
      : (typeof globalThis !== 'undefined' && globalThis.supabase ? globalThis.supabase : null);

    if (temUrlValida && temKeyValida && supabaseLib) {
      try {
        this.client = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
        this.modoMock = false;
        console.log('[API] Conectado ao Supabase oficial:', SUPABASE_URL);

        // Tenta renovar sessão ativa ao iniciar
        await this.renovarSessao();
      } catch (e) {
        console.warn('[API] Erro ao inicializar cliente Supabase, ativando modo mock:', e);
        this.modoMock = true;
      }
    } else {
      this.modoMock = true;
      console.log('[API] SUPABASE_URL não configurada ou Supabase-JS ausente. Operando em MODO MOCK.');
    }

    // Tenta sincronizar a fila offline pendente ao abrir o jogo
    await this.reenviarFilaOffline();
    return !this.modoMock;
  },

  /**
   * Valida se o e-mail pertence ao domínio institucional obrigatório (@sestsenat.org.br)
   * Rejeita estritamente ANTES de qualquer requisição à API.
   * @param {string} email
   * @returns {boolean}
   */
  validarEmailInstitucional(email) {
    if (!email || typeof email !== 'string') return false;
    const sanitizado = email.trim().toLowerCase();
    return sanitizado.endsWith('@sestsenat.org.br') && sanitizado.length > '@sestsenat.org.br'.length;
  },

  // ============================================================================
  // AUTENTICAÇÃO COM OTP DE 6 DÍGITOS
  // ============================================================================

  /**
   * Solicita envio de OTP de 6 dígitos por e-mail (POST /auth/v1/otp)
   * Rejeita e-mails fora de @sestsenat.org.br antes de chamar a API.
   * @param {string} email
   * @returns {Promise<{ sucesso: boolean, mensagem: string }>}
   */
  async solicitarOtp(email) {
    if (!this.validarEmailInstitucional(email)) {
      return {
        sucesso: false,
        mensagem: 'Acesso restrito: utilize seu e-mail institucional @sestsenat.org.br.'
      };
    }

    const emailSanitizado = email.trim().toLowerCase();

    // MODO MOCK
    if (this.modoMock || !this.client) {
      await new Promise(r => setTimeout(r, 200));
      console.log(`[MOCK API] OTP gerado para ${emailSanitizado}. Código para teste: 123456`);
      return {
        sucesso: true,
        mensagem: 'Código de 6 dígitos enviado para seu e-mail (no modo mock use 123456).'
      };
    }

    // MODO REAL SUPABASE
    try {
      const { error } = await this.client.auth.signInWithOtp({
        email: emailSanitizado,
        options: {
          shouldCreateUser: true
        }
      });

      if (error) {
        return { sucesso: false, mensagem: 'Erro ao solicitar código: ' + error.message };
      }

      return {
        sucesso: true,
        mensagem: 'Código de verificação enviado! Verifique sua caixa de entrada.'
      };
    } catch (err) {
      return { sucesso: false, mensagem: 'Falha de comunicação: ' + String(err) };
    }
  },

  /**
   * Valida código OTP de 6 dígitos (POST /auth/v1/verify com type "email")
   * @param {string} email
   * @param {string} codigo
   * @returns {Promise<{ sucesso: boolean, token?: string, session?: Object, user?: Object, mensagem?: string }>}
   */
  async validarOtp(email, codigo) {
    if (!this.validarEmailInstitucional(email)) {
      return { sucesso: false, mensagem: 'E-mail institucional inválido.' };
    }

    const emailSanitizado = email.trim().toLowerCase();
    const codigoSanitizado = String(codigo || '').trim();

    // MODO MOCK
    if (this.modoMock || !this.client) {
      await new Promise(r => setTimeout(r, 200));
      if (codigoSanitizado === '123456') {
        const mockUser = {
          id: 'user_mock_' + emailSanitizado.replace(/[^a-z0-9]/g, '_'),
          email: emailSanitizado
        };
        const mockSession = {
          access_token: 'mock_jwt_' + Date.now(),
          user: mockUser
        };
        this.salvarSessaoLocal(mockSession);
        return {
          sucesso: true,
          token: mockSession.access_token,
          session: mockSession,
          user: mockUser,
          mensagem: 'Autenticado com sucesso!'
        };
      }
      return { sucesso: false, mensagem: 'Código inválido. Digite 123456 no modo mock.' };
    }

    // MODO REAL SUPABASE
    try {
      const { data, error } = await this.client.auth.verifyOtp({
        email: emailSanitizado,
        token: codigoSanitizado,
        type: 'email'
      });

      if (error || !data.session) {
        return {
          sucesso: false,
          mensagem: error ? error.message : 'Código incorreto ou expirado.'
        };
      }

      this.salvarSessaoLocal(data.session);

      return {
        sucesso: true,
        token: data.session.access_token,
        session: data.session,
        user: data.user,
        mensagem: 'Autenticação concluída com sucesso!'
      };
    } catch (err) {
      return { sucesso: false, mensagem: 'Erro na verificação: ' + String(err) };
    }
  },

  /**
   * Obtém a sessão ativa
   */
  async obterSessao() {
    if (this.modoMock || !this.client) {
      try {
        const raw = storageGet(STORAGE_KEYS.SESSAO_LOCAL);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    }
    const { data } = await this.client.auth.getSession();
    return data?.session || null;
  },

  /**
   * Renova a sessão do usuário com refresh_token antes de enviar partidas ou ao abrir o jogo
   */
  async renovarSessao() {
    if (this.modoMock || !this.client) return true;
    try {
      const { data, error } = await this.client.auth.refreshSession();
      if (!error && data?.session) {
        this.salvarSessaoLocal(data.session);
        return true;
      }
    } catch (e) {
      console.warn('[API] Falha ao renovar sessão:', e);
    }
    return false;
  },

  /**
   * Realiza logout limpando a sessão no Supabase e no dispositivo local
   */
  async logout() {
    if (!this.modoMock && this.client) {
      try {
        await this.client.auth.signOut();
      } catch (e) {
        console.warn('[API] Erro no signOut do Supabase:', e);
      }
    }
    storageRemove(STORAGE_KEYS.SESSAO_LOCAL);
    return true;
  },

  salvarSessaoLocal(sessao) {
    try {
      storageSet(STORAGE_KEYS.SESSAO_LOCAL, JSON.stringify(sessao));
    } catch (e) {}
  },

  // ============================================================================
  // GESTÃO DE PERFIL E ÁREAS INSTITUCIONAIS
  // ============================================================================

  /**
   * Carrega as 7 áreas oficiais do SEST SENAT da tabela `areas` (fallback em areas_mock.json)
   * @returns {Promise<Array<{ id: number, sigla: string, nome: string }>>}
   */
  async carregarAreas() {
    if (this.areasCache) return this.areasCache;

    if (!this.modoMock && this.client) {
      try {
        const { data, error } = await this.client
          .from('areas')
          .select('id, sigla, nome')
          .order('id', { ascending: true });

        if (!error && Array.isArray(data) && data.length > 0) {
          this.areasCache = data;
          return this.areasCache;
        }
      } catch (e) {
        console.warn('[API] Erro ao buscar áreas do banco, usando fallback:', e);
      }
    }

    try {
      const resp = await fetch('data/areas_mock.json');
      if (resp.ok) {
        this.areasCache = await resp.json();
        return this.areasCache;
      }
    } catch (e) {
      console.warn('Erro ao carregar data/areas_mock.json:', e);
    }

    this.areasCache = [
      { id: 1, sigla: "TI", nome: "Tecnologia da Informação & BI" },
      { id: 2, sigla: "JUR", nome: "Jurídico, Compliance & LGPD" },
      { id: 3, sigla: "RH", nome: "Gestão de Pessoas" },
      { id: 4, sigla: "OPE", nome: "Operações & Transporte" },
      { id: 5, sigla: "SAU", nome: "Saúde & Odontologia" },
      { id: 6, sigla: "EDU", nome: "Educação & Formação Profissional" },
      { id: 7, sigla: "ADM", nome: "Administrativo & Financeiro" }
    ];
    return this.areasCache;
  },

  /**
   * Busca o perfil do jogador vinculado ao user_id autenticado
   * @param {string} userId
   * @returns {Promise<{ id: string, user_id: string, nome: string, area_id: number, email: string, areas?: Object } | null>}
   */
  async buscarPerfil(userId) {
    if (!userId) return null;

    if (this.modoMock || !this.client) {
      try {
        const raw = storageGet('trilha_jogador_perfil');
        if (raw) {
          const perf = JSON.parse(raw);
          if (perf.user_id === userId) return perf;
        }
      } catch (e) {}
      return null;
    }

    try {
      const { data, error } = await this.client
        .from('jogadores')
        .select('id, user_id, nome, area_id, email, areas ( id, sigla, nome )')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[API] Erro ao buscar perfil:', error.message);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  },

  /**
   * Cria o perfil do colaborador (1º acesso) com nome e área travada
   * @param {{ userId: string, nome: string, areaId: number, email: string }} params
   */
  async criarPerfil({ userId, nome, areaId, email }) {
    if (!this.validarEmailInstitucional(email)) {
      throw new Error('E-mail institucional inválido.');
    }

    if (this.modoMock || !this.client) {
      const areas = await this.carregarAreas();
      const areaObj = areas.find(a => a.id === Number(areaId)) || areas[0];
      const perfilMock = {
        id: 'jog_' + Date.now(),
        user_id: userId,
        nome: nome.trim(),
        area_id: Number(areaId),
        email: email.trim().toLowerCase(),
        areas: areaObj
      };
      storageSet('trilha_jogador_perfil', JSON.stringify(perfilMock));
      return perfilMock;
    }

    const { data, error } = await this.client
      .from('jogadores')
      .insert({
        user_id: userId,
        nome: nome.trim(),
        area_id: Number(areaId),
        email: email.trim().toLowerCase()
      })
      .select('id, user_id, nome, area_id, email, areas ( id, sigla, nome )')
      .single();

    if (error) {
      throw new Error('Erro ao salvar perfil no banco: ' + error.message);
    }
    return data;
  },

  // ============================================================================
  // STATUS DE RANKING E PARTIDA OFICIAL
  // ============================================================================

  /**
   * Verifica se o colaborador já possui uma partida oficial na semana informada
   * @param {string} semana
   * @param {string} [jogadorId]
   * @param {string} [email]
   * @returns {Promise<boolean>} Retorna true se a partida VALE ranking (nenhuma oficial ainda)
   */
  async partidaValeRanking(semana = semanaAtual(), jogadorId = null, email = null) {
    if (this.modoMock || !this.client || !jogadorId) {
      try {
        const key = `${STORAGE_KEYS.PARTIDAS_PREFIX}${semana}_${email || 'mock'}`;
        const partidasRaw = storageGet(key);
        if (partidasRaw) {
          const lista = JSON.parse(partidasRaw);
          const jaTemOficial = lista.some(p => p.conta_ranking !== false);
          return !jaTemOficial;
        }
      } catch (e) {}
      return true;
    }

    try {
      const { data, error } = await this.client
        .from('partidas')
        .select('id')
        .eq('jogador_id', jogadorId)
        .eq('semana', semana)
        .eq('conta_ranking', true)
        .maybeSingle();

      if (error) return true;
      return !data; // se NÃO existe partida oficial, então VALE ranking
    } catch (e) {
      return true;
    }
  },

  /**
   * Alias de compatibilidade com a UI existente
   */
  async verificarStatusPartidaSemanal(jogadorEmail, semana = semanaAtual()) {
    const vale = await this.partidaValeRanking(semana, null, jogadorEmail);
    return { valeRanking: vale, totalPartidasNaSemana: vale ? 0 : 1 };
  },

  // ============================================================================
  // CARTAS REMOTAS DA SEMANA COM FALLBACK LOCAL
  // ============================================================================

  /**
   * Carrega as cartas ativas da semana da tabela `cartas`, com fallback local garantido
   * @param {string} [semana=semanaAtual()]
   * @returns {Promise<Array<Object>>}
   */
  async carregarCartas(semana = semanaAtual()) {
    if (this.cartasCache[semana]) {
      return this.cartasCache[semana];
    }

    // 1. Tenta carregar do Supabase se online
    if (!this.modoMock && this.client) {
      try {
        const { data, error } = await this.client
          .from('cartas')
          .select('json, versao')
          .eq('ativa', true)
          .lte('semana_inicio', semana)
          .gte('semana_fim', semana)
          .maybeSingle();

        if (!error && data && Array.isArray(data.json) && data.json.length > 0) {
          console.log(`[API] Cartas carregadas da tabela remota (semana ${semana}, v${data.versao || '1.0'})`);
          this.cartasCache[semana] = data.json;
          return this.cartasCache[semana];
        }
      } catch (e) {
        console.warn('[API] Erro ao carregar cartas remotas, usando fallback:', e);
      }
    }

    // 2. Fallback local data/cartas_fallback.json
    try {
      const resp = await fetch('data/cartas_fallback.json');
      if (resp.ok) {
        const dados = await resp.json();
        const lista = Array.isArray(dados) ? dados : (dados.json || []);
        if (lista.length > 0) {
          this.cartasCache[semana] = lista;
          return this.cartasCache[semana];
        }
      }
    } catch (e) {
      console.warn('[API] Falha ao ler data/cartas_fallback.json:', e);
    }

    return [];
  },

  // ============================================================================
  // ENVIO DE PARTIDA COM EDGE FUNCTION E FILA OFFLINE
  // ============================================================================

  /**
   * Envia partida para homologação auditada no servidor
   * No modo Supabase: invoca a Edge Function 'registrar-partida'
   * No modo Mock / Offline: audita localmente e/ou adiciona à fila offline
   * 
   * @param {Object} payload
   * @returns {Promise<{ sucesso: boolean, status: 'enviado'|'salvo_offline'|'erro', pontosServidor: number, divergencia: boolean, mensagem: string, detalhes?: Object }>}
   */
  async enviarPartida(payload, salvarSeFalhar = true) {
    const semana = payload.semana || semanaAtual();
    const pontosCliente = Number(payload.pontos ?? 0);
    const estaOffline = this.simularOffline || (typeof navigator !== 'undefined' && navigator.onLine === false);

    if (estaOffline) {
      if (salvarSeFalhar) this.salvarNaFilaOffline(payload);
      return {
        sucesso: true,
        status: 'salvo_offline',
        pontosServidor: pontosCliente,
        divergencia: false,
        mensagem: 'Sem conexão de rede. Partida salva localmente para envio automático!'
      };
    }

    // Se estiver em MODO SUPABASE REAL
    if (!this.modoMock && this.client) {
      try {
        await this.renovarSessao();

        const { data, error } = await this.client.functions.invoke('registrar-partida', {
          body: {
            historico: payload.historico || [],
            semana: semana,
            versao_cartas: payload.versao_cartas || '1.0',
            jogada_em: payload.jogada_em || new Date().toISOString()
          }
        });

        if (error || !data) {
          console.warn('[API] Falha na Edge Function registrar-partida:', error);
          if (salvarSeFalhar) this.salvarNaFilaOffline(payload);
          return {
            sucesso: true,
            status: 'salvo_offline',
            pontosServidor: pontosCliente,
            divergencia: false,
            mensagem: 'Servidor indisponível no momento. Partida armazenada para reenvio!'
          };
        }

        const pontosServidor = Number(data.pontos_oficiais ?? data.pontos ?? pontosCliente);
        const divergencia = (pontosServidor !== pontosCliente);

        return {
          sucesso: true,
          status: 'enviado',
          pontosServidor,
          divergencia,
          detalhes: data,
          mensagem: divergencia
            ? `Pontuação auditada e homologada pelo servidor (${pontosServidor} pts).`
            : 'Partida transmitida e homologada com sucesso!'
        };

      } catch (err) {
        console.warn('[API] Erro ao comunicar com Edge Function, enfileirando offline:', err);
        if (salvarSeFalhar) this.salvarNaFilaOffline(payload);
        return {
          sucesso: true,
          status: 'salvo_offline',
          pontosServidor: pontosCliente,
          divergencia: false,
          mensagem: 'Falha na conexão. Partida salva no dispositivo para envio posterior.'
        };
      }
    }

    // MODO MOCK (Simulação fiel do cálculo do servidor)
    try {
      await new Promise(r => setTimeout(r, 100));
      const pontosServidor = calcularPontuacao({
        tokens: payload.tokens,
        acertos: payload.acertos,
        bonusPenseAntes: payload.bonusPenseAntes,
        armadilhas: payload.armadilhas
      });

      const divergencia = (pontosServidor !== pontosCliente);
      const jogadorEmail = payload.email || 'colaborador@sestsenat.org.br';

      // Persiste no storage mock
      const key = `${STORAGE_KEYS.PARTIDAS_PREFIX}${semana}_${jogadorEmail}`;
      const lista = JSON.parse(storageGet(key) || '[]');
      lista.push({
        ...payload,
        pontosOficiais: pontosServidor,
        gravadoEm: new Date().toISOString()
      });
      storageSet(key, JSON.stringify(lista));

      return {
        sucesso: true,
        status: 'enviado',
        pontosServidor,
        divergencia,
        mensagem: divergencia
          ? `Pontuação auditada e homologada (${pontosServidor} pts).`
          : 'Partida transmitida e homologada com sucesso!'
      };
    } catch (err) {
      if (salvarSeFalhar) this.salvarNaFilaOffline(payload);
      return {
        sucesso: true,
        status: 'salvo_offline',
        pontosServidor: pontosCliente,
        divergencia: false,
        mensagem: 'Erro local. Partida enfileirada para reenvio.'
      };
    }
  },

  /**
   * Alias registrarPartida mantido para compatibilidade total
   */
  async registrarPartida(payload, salvarSeFalhar = true) {
    return this.enviarPartida(payload, salvarSeFalhar);
  },

  // ============================================================================
  // FILA OFFLINE DE CONTINGÊNCIA
  // ============================================================================

  salvarNaFilaOffline(payload) {
    try {
      const fila = this.obterFilaOffline();
      fila.push({ ...payload, salvoEm: new Date().toISOString() });
      storageSet(STORAGE_KEYS.FILA_OFFLINE, JSON.stringify(fila));
      console.log(`[FILA OFFLINE] Partida enfileirada. Total pendente: ${fila.length}`);
    } catch (e) {
      console.warn('Erro ao salvar partida na fila offline:', e);
    }
  },

  obterFilaOffline() {
    try {
      return JSON.parse(storageGet(STORAGE_KEYS.FILA_OFFLINE) || '[]');
    } catch (e) {
      return [];
    }
  },

  limparFilaOffline() {
    try {
      storageRemove(STORAGE_KEYS.FILA_OFFLINE);
    } catch (e) {}
  },

  /**
   * Reenvia partidas pendentes na fila offline ao abrir o jogo ou restabelecer conexão
   */
  async reenviarFilaOffline() {
    const fila = this.obterFilaOffline();
    if (!fila || fila.length === 0) return { reenviadas: 0, restantes: 0 };

    console.log(`[FILA OFFLINE] Verificando ${fila.length} partidas pendentes de sincronização...`);
    const restantes = [];
    let reenviadas = 0;

    for (const item of fila) {
      try {
        const res = await this.enviarPartida(item, false);
        if (res.status === 'enviado') {
          reenviadas++;
        } else {
          restantes.push(item);
        }
      } catch (e) {
        restantes.push(item);
      }
    }

    try {
      if (restantes.length > 0) {
        storageSet(STORAGE_KEYS.FILA_OFFLINE, JSON.stringify(restantes));
      } else {
        this.limparFilaOffline();
      }
    } catch (e) {}

    console.log(`[FILA OFFLINE] Sincronização concluída. Reenviadas: ${reenviadas}, Restantes: ${restantes.length}`);
    return { reenviadas, restantes: restantes.length };
  },

  // ============================================================================
  // RANKINGS VIA RPC (SECURITY DEFINER)
  // ============================================================================

  /**
   * Busca ranking consolidado por áreas para a semana informada
   * @param {string} [semana=semanaAtual()]
   */
  async obterRankingAreas(semana = semanaAtual()) {
    if (!this.modoMock && this.client) {
      try {
        const { data, error } = await this.client.rpc('get_ranking_areas', { p_semana: semana });
        if (!error && Array.isArray(data)) return data;
      } catch (e) {
        console.warn('[API] Falha no RPC get_ranking_areas:', e);
      }
    }

    // Simula pequena latência de consulta (200ms)
    await new Promise(r => setTimeout(r, 200));

    // MOCK REALISTA: Dados por semana
    const semAtual = semanaAtual();
    const ehAtual = (semana === semAtual);

    if (ehAtual) {
      return [
        { posicao: 1, semana, area_id: 1, area_sigla: "TI", area_nome: "Tecnologia da Informação & BI", pontuacao_media: 485.3, total_jogadores: 5 },
        { posicao: 2, semana, area_id: 2, area_sigla: "JUR", area_nome: "Jurídico, Compliance & LGPD", pontuacao_media: 460.0, total_jogadores: 4 },
        { posicao: 3, semana, area_id: 7, area_sigla: "ADM", area_nome: "Administrativo & Financeiro", pontuacao_media: 442.0, total_jogadores: 3 },
        { posicao: 4, semana, area_id: 3, area_sigla: "RH", area_nome: "Gestão de Pessoas", pontuacao_media: 420.0, total_jogadores: 3 }
      ];
    } else {
      // Semana anterior
      return [
        { posicao: 1, semana, area_id: 2, area_sigla: "JUR", area_nome: "Jurídico, Compliance & LGPD", pontuacao_media: 492.0, total_jogadores: 6 },
        { posicao: 2, semana, area_id: 1, area_sigla: "TI", area_nome: "Tecnologia da Informação & BI", pontuacao_media: 478.2, total_jogadores: 5 },
        { posicao: 3, semana, area_id: 3, area_sigla: "RH", area_nome: "Gestão de Pessoas", pontuacao_media: 435.0, total_jogadores: 4 },
        { posicao: 4, semana, area_id: 7, area_sigla: "ADM", area_nome: "Administrativo & Financeiro", pontuacao_media: 415.5, total_jogadores: 3 }
      ];
    }
  },

  /**
   * Busca ranking dos colaboradores de uma área específica na semana
   * @param {string} semana
   * @param {number} areaId
   */
  async obterRankingArea(semana = semanaAtual(), areaId = 1) {
    const aid = Number(areaId || 1);

    if (!this.modoMock && this.client) {
      try {
        const { data, error } = await this.client.rpc('get_ranking_area', {
          p_semana: semana,
          p_area_id: aid
        });
        if (!error && Array.isArray(data)) return data;
      } catch (e) {
        console.warn('[API] Falha no RPC get_ranking_area:', e);
      }
    }

    // Simula pequena latência de consulta (200ms)
    await new Promise(r => setTimeout(r, 200));

    // MOCK REALISTA: Dados por área
    const MOCK_POR_AREA = {
      1: [ // TI
        { posicao_area: 1, jogador_nome: "Rafael Scarpille", area_sigla: "TI", area_nome: "Tecnologia da Informação & BI", pontos: 510, acertos: 2 },
        { posicao_area: 2, jogador_nome: "Mariana Souza", area_sigla: "TI", area_nome: "Tecnologia da Informação & BI", pontos: 490, acertos: 2 },
        { posicao_area: 3, jogador_nome: "Carlos Eduardo", area_sigla: "TI", area_nome: "Tecnologia da Informação & BI", pontos: 456, acertos: 1 },
        { posicao_area: 4, jogador_nome: "Aline Ferreira", area_sigla: "TI", area_nome: "Tecnologia da Informação & BI", pontos: 410, acertos: 1 },
        { posicao_area: 5, jogador_nome: "Thiago Alcântara", area_sigla: "TI", area_nome: "Tecnologia da Informação & BI", pontos: 390, acertos: 0 }
      ],
      2: [ // JUR
        { posicao_area: 1, jogador_nome: "Dra. Patrícia Lima", area_sigla: "JUR", area_nome: "Jurídico, Compliance & LGPD", pontos: 495, acertos: 2 },
        { posicao_area: 2, jogador_nome: "Dr. Lucas Mendes", area_sigla: "JUR", area_nome: "Jurídico, Compliance & LGPD", pontos: 460, acertos: 2 },
        { posicao_area: 3, jogador_nome: "Fernando Rocha", area_sigla: "JUR", area_nome: "Jurídico, Compliance & LGPD", pontos: 425, acertos: 1 },
        { posicao_area: 4, jogador_nome: "Beatriz Nogueira", area_sigla: "JUR", area_nome: "Jurídico, Compliance & LGPD", pontos: 400, acertos: 1 }
      ],
      3: [ // RH
        { posicao_area: 1, jogador_nome: "Juliana Martins", area_sigla: "RH", area_nome: "Gestão de Pessoas", pontos: 450, acertos: 2 },
        { posicao_area: 2, jogador_nome: "Rodrigo Silveira", area_sigla: "RH", area_nome: "Gestão de Pessoas", pontos: 420, acertos: 1 },
        { posicao_area: 3, jogador_nome: "Camila Albuquerque", area_sigla: "RH", area_nome: "Gestão de Pessoas", pontos: 390, acertos: 0 }
      ],
      4: [ // OPE (Vazio de propósito para testar estado vazio)
      ],
      5: [ // SAU (2 jogadores - menos de 3, dispara aviso de quórum!)
        { posicao_area: 1, jogador_nome: "Dr. Arnaldo Silva", area_sigla: "SAU", area_nome: "Saúde & Odontologia", pontos: 430, acertos: 1 },
        { posicao_area: 2, jogador_nome: "Dra. Beatriz Neves", area_sigla: "SAU", area_nome: "Saúde & Odontologia", pontos: 410, acertos: 1 }
      ],
      6: [ // EDU (1 jogador - menos de 3, dispara aviso de quórum!)
        { posicao_area: 1, jogador_nome: "Profª Carmen Lúcia", area_sigla: "EDU", area_nome: "Educação & Formação Profissional", pontos: 460, acertos: 2 }
      ],
      7: [ // ADM
        { posicao_area: 1, jogador_nome: "Marcelo Tavares", area_sigla: "ADM", area_nome: "Administrativo & Financeiro", pontos: 465, acertos: 2 },
        { posicao_area: 2, jogador_nome: "Vanessa Ramos", area_sigla: "ADM", area_nome: "Administrativo & Financeiro", pontos: 440, acertos: 1 },
        { posicao_area: 3, jogador_nome: "Bruno Carvalho", area_sigla: "ADM", area_nome: "Administrativo & Financeiro", pontos: 421, acertos: 1 }
      ]
    };

    return MOCK_POR_AREA[aid] || [];
  }
};
