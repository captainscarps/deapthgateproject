// js/liga.js - Liga semanal + Duelos assíncronos (PROTÓTIPO • modo convidado)
// ---------------------------------------------------------------------------
// Tudo roda no navegador (localStorage), com colegas FICTÍCIOS simulados.
// Em produção, a mesma lógica migra para o Supabase:
//   tabelas ligas / grupos_liga / duelos + função registrar-duelo (correção no servidor,
//   gabarito nunca vai ao navegador, uma pergunta por vez com registro de horário).
// ---------------------------------------------------------------------------
import { criarRng } from './rng.js';
import { semanaAtual, carregarCartas } from './deck.js';
import { gerarAvatarAleatorio } from './avatar.js';
import { macroTema } from './temas.js';

const STORAGE_KEY = 'trilha_liga_v1';

export const LIGAS = [
  { id: 'bronze', nome: 'Bronze', cor: 'var(--liga-bronze)' },
  { id: 'prata', nome: 'Prata', cor: 'var(--liga-prata)' },
  { id: 'ouro', nome: 'Ouro', cor: 'var(--liga-ouro)' },
  { id: 'diamante', nome: 'Diamante', cor: 'var(--liga-diamante)' },
  { id: 'guardiao', nome: 'Guardião dos Dados', cor: 'var(--liga-guardiao)' }
];

export const REGRAS_DUELO = {
  PERGUNTAS: 7,
  TEMPO_MS: 15000,
  PTS_ACERTO: 100,
  BONUS_VELOCIDADE: 50,
  MULT_PERGUNTA_FINAL: 2,
  PRAZO_HORAS: 48,
  LIMITE_ENVIADOS_DIA: 3,
  PREMIO_VITORIA: 30,
  PERDA_DERROTA: 10,
  PREMIO_EMPATE: 10,
  TAM_GRUPO: 20,
  SOBEM: 5,
  DESCEM: 5,
  // Protótipo: o colega simulado responde em segundos (em produção: até 48 h)
  ATRASO_BOT_MIN_MS: 20000,
  ATRASO_BOT_MAX_MS: 75000,
  MAX_RECEBIDOS_PENDENTES: 2,
  INTERVALO_NOVO_RECEBIDO_MS: 8 * 60 * 1000
};

const NOMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabriela', 'Heitor', 'Isabela', 'João',
  'Karina', 'Lucas', 'Marina', 'Nicolas', 'Olívia', 'Paulo', 'Quésia', 'Rodrigo', 'Sabrina', 'Tiago',
  'Úrsula', 'Vinícius', 'Wanda', 'Yuri', 'Zélia', 'Renata', 'Márcio', 'Patrícia', 'Leandro', 'Juliana'];
const INICIAIS = 'ABCDEFGHIJLMNOPRSTV';
const AREAS = ['TI', 'JUR', 'RH', 'OPE', 'SAU', 'EDU', 'COM', 'FIN', 'DIEX'];

// ---------------------------------------------------------------------------
// Pontuação de uma resposta do duelo (função pura — espelhar no servidor)
// ---------------------------------------------------------------------------
export function pontuarResposta({ correta, tempoMs, indice }) {
  if (!correta) return 0;
  const t = Math.min(REGRAS_DUELO.TEMPO_MS, Math.max(0, Number(tempoMs) || 0));
  const bonus = Math.round(REGRAS_DUELO.BONUS_VELOCIDADE * (1 - t / REGRAS_DUELO.TEMPO_MS));
  const base = REGRAS_DUELO.PTS_ACERTO + bonus;
  return indice === REGRAS_DUELO.PERGUNTAS - 1 ? base * REGRAS_DUELO.MULT_PERGUNTA_FINAL : base;
}

export function resultadoDuelo(totalEu, totalAdv) {
  if (totalEu > totalAdv) return 'vitoria';
  if (totalEu < totalAdv) return 'derrota';
  return 'empate';
}

export function deltaPontosLiga(resultado) {
  if (resultado === 'vitoria') return REGRAS_DUELO.PREMIO_VITORIA;
  if (resultado === 'derrota') return -REGRAS_DUELO.PERDA_DERROTA;
  return REGRAS_DUELO.PREMIO_EMPATE;
}

// ---------------------------------------------------------------------------
// Utilidades de tempo
// ---------------------------------------------------------------------------
function inicioSemana(agora = new Date()) {
  const d = new Date(agora);
  const dia = d.getDay() || 7; // segunda = 1
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (dia - 1));
  return d.getTime();
}

export function fracaoSemana(agora = Date.now()) {
  const ini = inicioSemana(new Date(agora));
  return Math.min(1, Math.max(0.06, (agora - ini) / (7 * 86400000)));
}

export function tempoRestanteTemporada(agora = Date.now()) {
  const fim = inicioSemana(new Date(agora)) + 7 * 86400000;
  const ms = Math.max(0, fim - agora);
  const dias = Math.floor(ms / 86400000);
  const horas = Math.floor((ms % 86400000) / 3600000);
  return dias > 0 ? `${dias}d ${horas}h` : `${horas}h`;
}

function chaveDia(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// ---------------------------------------------------------------------------
// Banco de perguntas (cartas de múltipla escolha: desafio + pense_antes)
// ---------------------------------------------------------------------------
let bancoCache = null;

export async function carregarBancoPerguntas() {
  if (bancoCache) return bancoCache;
  const cartas = await carregarCartas();
  bancoCache = cartas.filter(c => Array.isArray(c.opcoes) && c.opcoes.length >= 2 && c.opcoes.some(o => o.correta));
  return bancoCache;
}

export function perguntaPorId(id) {
  return (bancoCache || []).find(c => c.id === id) || null;
}

/** Ordem embaralhada (determinística) das opções de uma pergunta dentro de um duelo. */
export function opcoesEmbaralhadas(duelo, carta) {
  const rng = criarRng(`${duelo.semente}_op_${carta.id}`);
  return rng.embaralhar(carta.opcoes.map((op, i) => ({ ...op, indexOriginal: i })));
}

function sortearPerguntas(semente) {
  const rng = criarRng(`${semente}_perguntas`);
  const banco = bancoCache || [];
  const desafios = rng.embaralhar(banco.filter(c => c.categoria === 'desafio'));
  const outras = rng.embaralhar(banco.filter(c => c.categoria !== 'desafio'));
  // Mistura garantindo maioria de "desafio" (perguntas conceituais objetivas)
  const escolhidas = [...desafios.slice(0, 5), ...outras.slice(0, 2)];
  return rng.embaralhar(escolhidas).slice(0, REGRAS_DUELO.PERGUNTAS).map(c => c.id);
}

// ---------------------------------------------------------------------------
// Colegas simulados
// ---------------------------------------------------------------------------
function gerarGrupo(semente, liga) {
  const rng = criarRng(`${semente}_grupo`);
  const nomes = rng.embaralhar(NOMES);
  const nivelLiga = LIGAS.findIndex(l => l.id === liga);
  const bots = [];
  for (let i = 0; i < REGRAS_DUELO.TAM_GRUPO - 1; i++) {
    const habilidade = Math.min(0.93, 0.5 + rng.proximo() * 0.32 + nivelLiga * 0.04);
    bots.push({
      id: `bot_${i}`,
      nome: `${nomes[i % nomes.length]} ${INICIAIS[rng.inteiro(0, INICIAIS.length - 1)]}.`,
      area: AREAS[rng.inteiro(0, AREAS.length - 1)],
      avatar: gerarAvatarAleatorio(),
      habilidade,
      velocidadeMs: rng.inteiro(3800, 10500),
      pontosSemana: Math.round(rng.proximo() * rng.proximo() * 340) // muitos com pouco, poucos com muito
    });
  }
  return bots;
}

function simularRespostasBot(bot, duelo) {
  const rng = criarRng(`${duelo.semente}_bot_${bot.id}`);
  const respostas = duelo.perguntas.map((id, indice) => {
    const carta = perguntaPorId(id);
    const nivel = carta?.nivel || 1;
    const chanceAcerto = Math.max(0.2, bot.habilidade - (nivel - 1) * 0.07);
    const estourou = rng.proximo() < 0.06;
    const correta = !estourou && rng.proximo() < chanceAcerto;
    const tempoMs = estourou ? REGRAS_DUELO.TEMPO_MS
      : Math.min(14500, Math.max(2200, Math.round(bot.velocidadeMs + (rng.proximo() - 0.5) * 6000)));
    let opcaoIdx = null;
    if (carta && !estourou) {
      const certos = carta.opcoes.map((o, i) => (o.correta ? i : -1)).filter(i => i >= 0);
      const errados = carta.opcoes.map((o, i) => (!o.correta ? i : -1)).filter(i => i >= 0);
      opcaoIdx = correta ? certos[0] : errados[rng.inteiro(0, Math.max(0, errados.length - 1))];
    }
    return { correta, tempoMs, opcaoIdx, pontos: pontuarResposta({ correta, tempoMs, indice }) };
  });
  return { respostas, total: respostas.reduce((s, r) => s + r.pontos, 0) };
}

// ---------------------------------------------------------------------------
// Estado persistido
// ---------------------------------------------------------------------------
function ler() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (_) { return null; }
}

function gravar(estado) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(estado)); } catch (_) {}
}

function novaSemente() {
  return `liga_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

function estadoInicial(liga = 'bronze', historico = []) {
  const semente = novaSemente();
  return {
    versao: 1,
    semana: semanaAtual(),
    liga,
    pontos: 0,
    grupoSemente: semente,
    grupo: gerarGrupo(semente, liga),
    ajustesBots: {},
    duelos: [],
    seq: 0,
    ultimoRecebidoEm: 0,
    historicoLigas: historico,
    mudancaLiga: null
  };
}

export function reiniciarLiga() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}

/**
 * Carrega o estado da liga, aplicando virada de temporada e gerando desafios recebidos.
 * Requer o banco de perguntas carregado (carregarBancoPerguntas).
 */
export function obterLiga(agora = Date.now()) {
  let est = ler();
  if (!est || est.versao !== 1 || !Array.isArray(est.grupo)) {
    est = estadoInicial();
  }

  // Virada de temporada: promove / rebaixa com base na posição final
  if (est.semana !== semanaAtual(new Date(agora))) {
    const pos = posicaoJogador(est, agora, true);
    const idx = LIGAS.findIndex(l => l.id === est.liga);
    let novoIdx = idx;
    if (pos <= REGRAS_DUELO.SOBEM && idx < LIGAS.length - 1) novoIdx = idx + 1;
    else if (pos > REGRAS_DUELO.TAM_GRUPO - REGRAS_DUELO.DESCEM && idx > 0) novoIdx = idx - 1;
    const hist = [...(est.historicoLigas || []), { semana: est.semana, liga: est.liga, posicao: pos, pontos: est.pontos }].slice(-12);
    const mudanca = novoIdx > idx ? 'subiu' : (novoIdx < idx ? 'desceu' : 'manteve');
    est = estadoInicial(LIGAS[novoIdx].id, hist);
    est.mudancaLiga = { tipo: mudanca, de: LIGAS[idx].id, para: LIGAS[novoIdx].id, posicao: pos };
  }

  garantirDesafiosRecebidos(est, agora);
  gravar(est);
  return est;
}

export function limparAvisoMudanca() {
  const est = ler();
  if (est) { est.mudancaLiga = null; gravar(est); }
}

function pontosBot(est, bot, agora, fimSemana = false) {
  const frac = fimSemana ? 1 : fracaoSemana(agora);
  return Math.max(0, Math.round(bot.pontosSemana * frac) + (est.ajustesBots[bot.id] || 0));
}

/** Classificação do grupo (inclui o jogador como id "eu"). */
export function classificacao(est, jogador = {}, agora = Date.now(), fimSemana = false) {
  const linhas = est.grupo.map(b => ({
    id: b.id, nome: b.nome, area: b.area, avatar: b.avatar, pontos: pontosBot(est, b, agora, fimSemana), eu: false
  }));
  linhas.push({ id: 'eu', nome: jogador.nome || 'Você', area: jogador.area || 'Convidado', avatar: jogador.avatar || null, pontos: est.pontos, eu: true });
  // Empate: o jogador fica à frente (incentivo)
  linhas.sort((a, b) => b.pontos - a.pontos || (a.eu ? -1 : b.eu ? 1 : 0));
  return linhas.map((l, i) => ({ ...l, posicao: i + 1 }));
}

function posicaoJogador(est, agora, fimSemana = false) {
  return classificacao(est, {}, agora, fimSemana).find(l => l.eu).posicao;
}

// ---------------------------------------------------------------------------
// Duelos
// ---------------------------------------------------------------------------
export function statusDuelo(duelo, agora = Date.now()) {
  if (duelo.revelado) return 'finalizado';
  if (!duelo.eu) {
    return agora > duelo.prazo ? 'expirado' : 'aguardando_voce';
  }
  if (!duelo.adv || duelo.adv.concluidoEm == null || duelo.adv.concluidoEm > agora) {
    return agora > duelo.prazo ? 'expirado' : 'aguardando_adversario';
  }
  return 'resultado_disponivel';
}

function criarDuelo(est, bot, tipo, agora) {
  est.seq = (est.seq || 0) + 1;
  const semente = `${est.grupoSemente}_duelo_${est.seq}_${agora}`;
  const duelo = {
    id: `d${est.seq}_${agora}`,
    tipo, // 'enviado' (eu desafiei) | 'recebido' (fui desafiado)
    adversarioId: bot.id,
    semente,
    perguntas: [],
    criadoEm: agora,
    prazo: agora + REGRAS_DUELO.PRAZO_HORAS * 3600000,
    eu: null,
    adv: null,
    revelado: false,
    resultado: null,
    delta: 0
  };
  duelo.perguntas = sortearPerguntas(semente);
  const sim = simularRespostasBot(bot, duelo);
  const atraso = tipo === 'enviado'
    ? REGRAS_DUELO.ATRASO_BOT_MIN_MS + Math.round(criarRng(`${semente}_atraso`).proximo() * (REGRAS_DUELO.ATRASO_BOT_MAX_MS - REGRAS_DUELO.ATRASO_BOT_MIN_MS))
    : 0;
  // Para desafios enviados, o atraso só começa a contar quando EU terminar a bateria
  duelo.adv = { ...sim, concluidoEm: tipo === 'recebido' ? agora : null, atrasoMs: atraso };
  return duelo;
}

function garantirDesafiosRecebidos(est, agora) {
  if (!bancoCache || bancoCache.length < REGRAS_DUELO.PERGUNTAS) return;
  const pendentes = est.duelos.filter(d => d.tipo === 'recebido' && statusDuelo(d, agora) === 'aguardando_voce');
  const primeiraVez = !est.ultimoRecebidoEm;
  if (pendentes.length >= REGRAS_DUELO.MAX_RECEBIDOS_PENDENTES) return;
  if (!primeiraVez && agora - est.ultimoRecebidoEm < REGRAS_DUELO.INTERVALO_NOVO_RECEBIDO_MS) return;

  const ocupados = new Set(est.duelos.filter(d => !['finalizado', 'expirado'].includes(statusDuelo(d, agora))).map(d => d.adversarioId));
  const rng = criarRng(`${est.grupoSemente}_recebido_${est.seq}`);
  const livres = rng.embaralhar(est.grupo.filter(b => !ocupados.has(b.id)));
  const quantos = primeiraVez ? 1 : 1;
  for (let i = 0; i < quantos && i < livres.length; i++) {
    est.duelos.unshift(criarDuelo(est, livres[i], 'recebido', agora));
  }
  est.ultimoRecebidoEm = agora;
}

/** Verifica se é possível desafiar um colega agora. */
export function podeDesafiar(est, botId, agora = Date.now()) {
  const hoje = chaveDia(agora);
  const enviadosHoje = est.duelos.filter(d => d.tipo === 'enviado' && chaveDia(d.criadoEm) === hoje).length;
  if (enviadosHoje >= REGRAS_DUELO.LIMITE_ENVIADOS_DIA) {
    return { ok: false, motivo: `Limite de ${REGRAS_DUELO.LIMITE_ENVIADOS_DIA} desafios por dia atingido` };
  }
  const emAndamento = est.duelos.find(d => d.adversarioId === botId && !['finalizado', 'expirado'].includes(statusDuelo(d, agora)));
  if (emAndamento) return { ok: false, motivo: 'Já existe um duelo em andamento com esta pessoa' };
  const jaDesafiouSemana = est.duelos.find(d => d.tipo === 'enviado' && d.adversarioId === botId);
  if (jaDesafiouSemana) return { ok: false, motivo: 'Você já desafiou esta pessoa nesta temporada' };
  return { ok: true, enviadosHoje };
}

export function enviadosHoje(est, agora = Date.now()) {
  const hoje = chaveDia(agora);
  return est.duelos.filter(d => d.tipo === 'enviado' && chaveDia(d.criadoEm) === hoje).length;
}

/** Cria um desafio enviado (o jogador responde a bateria em seguida). */
export function lancarDesafio(botId, agora = Date.now()) {
  const est = ler() || obterLiga(agora);
  const bot = est.grupo.find(b => b.id === botId);
  if (!bot) throw new Error('Adversário não encontrado');
  const pode = podeDesafiar(est, botId, agora);
  if (!pode.ok) throw new Error(pode.motivo);
  const duelo = criarDuelo(est, bot, 'enviado', agora);
  est.duelos.unshift(duelo);
  gravar(est);
  return duelo;
}

/** Registra a bateria respondida pelo jogador. */
export function registrarBateria(dueloId, respostas, agora = Date.now()) {
  const est = ler();
  const duelo = est?.duelos.find(d => d.id === dueloId);
  if (!duelo) throw new Error('Duelo não encontrado');
  if (duelo.eu) return duelo; // já respondido (evita reenvio)
  const normalizadas = respostas.map((r, indice) => ({
    correta: !!r.correta,
    tempoMs: Math.min(REGRAS_DUELO.TEMPO_MS, Math.max(0, Math.round(r.tempoMs))),
    opcaoIdx: r.opcaoIdx ?? null,
    pontos: pontuarResposta({ correta: !!r.correta, tempoMs: r.tempoMs, indice }),
    tema: macroTema(perguntaPorId(duelo.perguntas[indice])?.tema)
  }));
  duelo.eu = { respostas: normalizadas, total: normalizadas.reduce((s, r) => s + r.pontos, 0), concluidoEm: agora };
  if (duelo.tipo === 'enviado') {
    duelo.adv.concluidoEm = agora + duelo.adv.atrasoMs;
  }
  gravar(est);
  return duelo;
}

/** Aplica o resultado (uma única vez) e marca como revelado. */
export function revelarDuelo(dueloId, agora = Date.now()) {
  const est = ler();
  const duelo = est?.duelos.find(d => d.id === dueloId);
  if (!duelo) throw new Error('Duelo não encontrado');
  if (!duelo.revelado && statusDuelo(duelo, agora) === 'resultado_disponivel') {
    const res = resultadoDuelo(duelo.eu.total, duelo.adv.total);
    const delta = deltaPontosLiga(res);
    duelo.resultado = res;
    duelo.delta = delta;
    duelo.revelado = true;
    duelo.reveladoEm = agora;
    est.pontos = Math.max(0, est.pontos + delta);
    // O colega simulado também ganha/perde pontos de liga
    const deltaBot = res === 'vitoria' ? -REGRAS_DUELO.PERDA_DERROTA : (res === 'derrota' ? REGRAS_DUELO.PREMIO_VITORIA : REGRAS_DUELO.PREMIO_EMPATE);
    est.ajustesBots[duelo.adversarioId] = (est.ajustesBots[duelo.adversarioId] || 0) + deltaBot;
    gravar(est);
  }
  return duelo;
}

/** Contagem para badges: desafios aguardando o jogador + resultados disponíveis. */
export function pendenciasLiga(est, agora = Date.now()) {
  let aguardando = 0;
  let resultados = 0;
  for (const d of est.duelos) {
    const s = statusDuelo(d, agora);
    if (s === 'aguardando_voce') aguardando++;
    if (s === 'resultado_disponivel') resultados++;
  }
  return { aguardando, resultados, total: aguardando + resultados };
}
