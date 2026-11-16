// js/duelos.js - Carteira de tokens e duelos com aposta (PROTÓTIPO)
// ---------------------------------------------------------------------------
// Regras:
//  - Cada jogador tem uma carteira de tokens (começa com 100; ganha jogando a Roleta).
//  - Quem desafia aposta NO MÍNIMO 20% do próprio saldo (arredondado para cima).
//  - O desafiado precisa ter, no mínimo, o mesmo valor da aposta.
//  - Os tokens apostados ficam RETIDOS até o resultado.
//  - Quem vencer leva o pote (a sua aposta de volta + a aposta do outro).
//  - Empate, recusa ou prazo expirado: cada um recebe a sua aposta de volta.
//  - Bateria: 7 perguntas × 15 s; acerto = 100 + até 50 pela rapidez; a última vale o dobro.
//
// Sem servidor: os colegas são SIMULADOS e tudo fica no localStorage.
// Em produção, carteira e duelos vão para o Supabase, com a liquidação feita no servidor.
// ---------------------------------------------------------------------------
import { carregarBanco, CATEGORIAS } from './perguntas.js';
import { gerarAvatarAleatorio } from './avatar.js';

const CHAVE = 'roleta_duelos_v1';

export const REGRAS_DUELO = {
  PERGUNTAS: 7,
  TEMPO_MS: 15000,
  PTS_ACERTO: 100,
  BONUS_VELOCIDADE: 50,
  MULT_PERGUNTA_FINAL: 2,
  APOSTA_MIN_PCT: 0.2,
  SALDO_INICIAL: 100,
  PRAZO_HORAS: 48,
  LIMITE_DESAFIOS_DIA: 5,
  // Protótipo: o colega simulado responde em segundos (em produção: até 48 h)
  ATRASO_MIN_MS: 20000,
  ATRASO_MAX_MS: 75000,
  MAX_CONVITES: 2,
  INTERVALO_CONVITE_MS: 8 * 60 * 1000,
  TOKENS_POR_PONTOS: 100 // a cada 100 pontos numa partida solo, +1 token
};

// ---------------------------------------------------------------------------
// RNG determinístico
// ---------------------------------------------------------------------------
function hash(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
}
export function rng(semente) {
  let a = hash(String(semente))();
  const prox = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return {
    proximo: prox,
    inteiro: (min, max) => Math.floor(prox() * (max - min + 1)) + min,
    embaralhar: (arr) => { const c = [...arr]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(prox() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; }
  };
}

// ---------------------------------------------------------------------------
// Regras puras (testáveis)
// ---------------------------------------------------------------------------
export function apostaMinima(saldo) {
  return Math.max(1, Math.ceil(Number(saldo || 0) * REGRAS_DUELO.APOSTA_MIN_PCT));
}

/** Valida uma aposta. Retorna { ok, motivo, min, max }. */
export function validarAposta({ saldoDesafiante, saldoDesafiado, aposta }) {
  const min = apostaMinima(saldoDesafiante);
  const max = Math.min(saldoDesafiante, saldoDesafiado);
  const base = { min, max };
  if (saldoDesafiante < 1) return { ok: false, motivo: 'Você não tem tokens para apostar', ...base };
  if (saldoDesafiado < min) return { ok: false, motivo: `O adversário precisa ter pelo menos ${min} tokens`, ...base };
  if (!Number.isInteger(aposta) || aposta < min) return { ok: false, motivo: `A aposta mínima é ${min} tokens (20% do seu saldo)`, ...base };
  if (aposta > saldoDesafiante) return { ok: false, motivo: 'Aposta maior que o seu saldo', ...base };
  if (aposta > saldoDesafiado) return { ok: false, motivo: 'O adversário não tem tokens para cobrir essa aposta', ...base };
  return { ok: true, motivo: '', ...base };
}

export function pontuarResposta({ correta, tempoMs, indice }) {
  if (!correta) return 0;
  const t = Math.min(REGRAS_DUELO.TEMPO_MS, Math.max(0, Number(tempoMs) || 0));
  const p = REGRAS_DUELO.PTS_ACERTO + Math.round(REGRAS_DUELO.BONUS_VELOCIDADE * (1 - t / REGRAS_DUELO.TEMPO_MS));
  return indice === REGRAS_DUELO.PERGUNTAS - 1 ? p * REGRAS_DUELO.MULT_PERGUNTA_FINAL : p;
}

/** Liquidação: quanto cada lado recebe do pote. */
export function liquidar(totalEu, totalAdv, aposta) {
  if (totalEu > totalAdv) return { resultado: 'vitoria', recebeEu: aposta * 2, recebeAdv: 0, saldoLiquidoEu: +aposta };
  if (totalEu < totalAdv) return { resultado: 'derrota', recebeEu: 0, recebeAdv: aposta * 2, saldoLiquidoEu: -aposta };
  return { resultado: 'empate', recebeEu: aposta, recebeAdv: aposta, saldoLiquidoEu: 0 };
}

export function tokensDaPartida(pontos) {
  return Math.max(1, Math.floor(Number(pontos || 0) / REGRAS_DUELO.TOKENS_POR_PONTOS));
}

// ---------------------------------------------------------------------------
// Estado persistido
// ---------------------------------------------------------------------------
const NOMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabriela', 'Heitor', 'Isabela', 'João', 'Karina', 'Lucas', 'Marina', 'Nicolas', 'Olívia', 'Paulo', 'Renata', 'Tiago'];
const INICIAIS = 'ABCDEFGHJLMNOPRSTV';
const AREAS = ['TI', 'JUR', 'RH', 'OPE', 'SAU', 'EDU', 'COM', 'FIN', 'DIEX'];

function gerarColegas(semente) {
  const r = rng(`${semente}_colegas`);
  const nomes = r.embaralhar(NOMES);
  return Array.from({ length: 12 }, (_, i) => ({
    id: `col_${i}`,
    nome: `${nomes[i]} ${INICIAIS[r.inteiro(0, INICIAIS.length - 1)]}.`,
    area: AREAS[r.inteiro(0, AREAS.length - 1)],
    avatar: gerarAvatarAleatorio(),
    saldo: [15, 30, 45, 60, 80, 100, 120, 150, 180, 220, 280, 350][i] + r.inteiro(0, 12),
    habilidade: 0.5 + r.proximo() * 0.35,
    velocidadeMs: r.inteiro(4000, 10000)
  }));
}

let estado = null;

function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (_) {}
}

function novoEstado() {
  const semente = `duelos_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
  return {
    versao: 1,
    semente,
    saldo: REGRAS_DUELO.SALDO_INICIAL,
    colegas: gerarColegas(semente),
    duelos: [],
    extrato: [{ quando: Date.now(), valor: REGRAS_DUELO.SALDO_INICIAL, descricao: 'Tokens iniciais' }],
    seq: 0,
    ultimoConvite: 0,
    ultimaAtualizacaoColegas: Date.now()
  };
}

function lancar(valor, descricao) {
  estado.saldo += valor;
  estado.extrato.unshift({ quando: Date.now(), valor, descricao });
  estado.extrato = estado.extrato.slice(0, 60);
}

export function estadoDuelos() {
  if (!estado) {
    try { estado = JSON.parse(localStorage.getItem(CHAVE)); } catch (_) { estado = null; }
    if (!estado || estado.versao !== 1) { estado = novoEstado(); salvar(); }
  }
  return estado;
}

export function reiniciarDuelos() {
  estado = novoEstado();
  salvar();
  return estado;
}

export function saldo() {
  return estadoDuelos().saldo;
}

/** Credita tokens ganhos numa partida solo. Retorna quantos tokens foram creditados. */
export function creditarPartida(pontos, venceu = false) {
  estadoDuelos();
  const t = tokensDaPartida(pontos);
  lancar(t, `Partida solo: ${pontos} pontos${venceu ? ' (6 selos)' : ''}`);
  salvar();
  return t;
}

export function colega(id) {
  return estadoDuelos().colegas.find(c => c.id === id) || null;
}

// ---------------------------------------------------------------------------
// Duelos
// ---------------------------------------------------------------------------
export function statusDuelo(d, agora = Date.now()) {
  if (d.encerrado) return d.encerrado; // 'finalizado' | 'recusado' | 'expirado'
  if (agora > d.prazo) return 'expirando';
  if (d.tipo === 'recebido' && !d.aceito) return 'convite';
  if (!d.eu) return 'aguardando_voce';
  if (!d.adv || d.adv.concluidoEm == null || d.adv.concluidoEm > agora) return 'aguardando_adversario';
  return 'resultado';
}

async function sortearPerguntas(semente) {
  const banco = await carregarBanco();
  const r = rng(`${semente}_perguntas`);
  const porCat = CATEGORIAS.map(c => r.embaralhar(banco.porCategoria[c.id] || []));
  const escolhidas = [];
  let i = 0;
  while (escolhidas.length < REGRAS_DUELO.PERGUNTAS && i < 50) {
    const fila = porCat[i % porCat.length];
    const p = fila.shift();
    if (p) escolhidas.push(p.id);
    i++;
  }
  return r.embaralhar(escolhidas);
}

export async function perguntasDoDuelo(d) {
  const banco = await carregarBanco();
  return d.perguntas.map(id => banco.lista.find(p => p.id === id)).filter(Boolean);
}

export function alternativasEmbaralhadas(d, p) {
  return rng(`${d.semente}_alt_${p.id}`).embaralhar(p.alternativas.map((t, i) => ({ t, i })));
}

async function simularBot(c, d) {
  const r = rng(`${d.semente}_bot`);
  const perguntas = await perguntasDoDuelo(d);
  const respostas = perguntas.map((p, indice) => {
    const chance = Math.max(0.25, c.habilidade - ((p.nivel || 1) - 1) * 0.07);
    const estourou = r.proximo() < 0.05;
    const correta = !estourou && r.proximo() < chance;
    const tempoMs = estourou ? REGRAS_DUELO.TEMPO_MS : Math.min(14500, Math.max(2200, Math.round(c.velocidadeMs + (r.proximo() - 0.5) * 6000)));
    let opcao = null;
    if (!estourou) {
      const erradas = p.alternativas.map((_, i) => i).filter(i => i !== p.correta);
      opcao = correta ? p.correta : erradas[r.inteiro(0, erradas.length - 1)];
    }
    return { correta, tempoMs, opcao, pontos: pontuarResposta({ correta, tempoMs, indice }) };
  });
  return { respostas, total: respostas.reduce((s, x) => s + x.pontos, 0) };
}

function desafiosHoje() {
  const hoje = new Date().toDateString();
  return estadoDuelos().duelos.filter(d => d.tipo === 'enviado' && new Date(d.criadoEm).toDateString() === hoje).length;
}

/** Pode desafiar este colega? (sem considerar o valor ainda) */
export function podeDesafiarColega(colegaId) {
  const est = estadoDuelos();
  const c = colega(colegaId);
  if (!c) return { ok: false, motivo: 'Colega não encontrado' };
  if (desafiosHoje() >= REGRAS_DUELO.LIMITE_DESAFIOS_DIA) return { ok: false, motivo: `Limite de ${REGRAS_DUELO.LIMITE_DESAFIOS_DIA} desafios por dia` };
  if (est.duelos.some(d => d.colegaId === colegaId && !d.encerrado)) return { ok: false, motivo: 'Já existe um duelo em andamento com esta pessoa' };
  const min = apostaMinima(est.saldo);
  if (est.saldo < 1) return { ok: false, motivo: 'Você está sem tokens. Jogue partidas solo para ganhar.' };
  if (c.saldo < min) return { ok: false, motivo: `Tem ${c.saldo} tokens; sua aposta mínima é ${min}` };
  return { ok: true, min, max: Math.min(est.saldo, c.saldo) };
}

export async function lancarDesafio(colegaId, aposta) {
  const est = estadoDuelos();
  const c = colega(colegaId);
  const pode = podeDesafiarColega(colegaId);
  if (!pode.ok) throw new Error(pode.motivo);
  const v = validarAposta({ saldoDesafiante: est.saldo, saldoDesafiado: c.saldo, aposta });
  if (!v.ok) throw new Error(v.motivo);
  est.seq++;
  const agora = Date.now();
  const d = {
    id: `d${est.seq}_${agora}`,
    tipo: 'enviado',
    colegaId,
    aposta,
    semente: `${est.semente}_${est.seq}_${agora}`,
    perguntas: [],
    criadoEm: agora,
    prazo: agora + REGRAS_DUELO.PRAZO_HORAS * 3600000,
    aceito: true,
    eu: null,
    adv: null
  };
  d.perguntas = await sortearPerguntas(d.semente);
  // Retém as apostas dos dois lados (o colega simulado aceita automaticamente)
  lancar(-aposta, `Aposta retida: duelo com ${c.nome}`);
  c.saldo -= aposta;
  const sim = await simularBot(c, d);
  const r = rng(`${d.semente}_atraso`);
  d.adv = { ...sim, concluidoEm: null, atrasoMs: REGRAS_DUELO.ATRASO_MIN_MS + Math.round(r.proximo() * (REGRAS_DUELO.ATRASO_MAX_MS - REGRAS_DUELO.ATRASO_MIN_MS)) };
  est.duelos.unshift(d);
  salvar();
  return d;
}

/** Gera convites de colegas simulados (respeitando a regra da aposta mínima). */
export async function atualizarDuelos(agora = Date.now()) {
  const est = estadoDuelos();
  // Colegas "jogam" com o tempo e ganham alguns tokens
  const horas = Math.min(24, Math.floor((agora - est.ultimaAtualizacaoColegas) / 3600000));
  if (horas > 0) {
    const r = rng(`${est.semente}_ganhos_${agora}`);
    est.colegas.forEach(c => { c.saldo += r.inteiro(0, 2 * horas); });
    est.ultimaAtualizacaoColegas = agora;
  }
  // Prazos vencidos: devolve as apostas
  est.duelos.forEach(d => {
    if (!d.encerrado && agora > d.prazo) {
      const c = colega(d.colegaId);
      if (d.aceito) lancar(d.aposta, `Duelo com ${c?.nome || 'colega'} expirou: aposta devolvida`);
      if (c) c.saldo += d.aposta;
      d.encerrado = 'expirado';
    }
  });
  // Novos convites
  const convites = est.duelos.filter(d => statusDuelo(d, agora) === 'convite').length;
  const podeConvidar = !est.ultimoConvite || agora - est.ultimoConvite > REGRAS_DUELO.INTERVALO_CONVITE_MS;
  if (convites < REGRAS_DUELO.MAX_CONVITES && podeConvidar) {
    const ocupados = new Set(est.duelos.filter(d => !d.encerrado).map(d => d.colegaId));
    const r = rng(`${est.semente}_convite_${est.seq}_${Math.floor(agora / 60000)}`);
    const candidatos = r.embaralhar(est.colegas.filter(c => !ocupados.has(c.id) && c.saldo >= 1 && est.saldo >= apostaMinima(c.saldo)));
    const c = candidatos[0];
    if (c) {
      const min = apostaMinima(c.saldo);
      const max = Math.min(c.saldo, est.saldo);
      const aposta = Math.min(max, min + r.inteiro(0, Math.max(0, Math.round(c.saldo * 0.15))));
      if (aposta >= min) {
        est.seq++;
        const d = {
          id: `d${est.seq}_${agora}`, tipo: 'recebido', colegaId: c.id, aposta,
          semente: `${est.semente}_${est.seq}_${agora}`, perguntas: [], criadoEm: agora,
          prazo: agora + REGRAS_DUELO.PRAZO_HORAS * 3600000, aceito: false, eu: null, adv: null
        };
        d.perguntas = await sortearPerguntas(d.semente);
        c.saldo -= aposta; // retido do colega
        d.adv = { ...(await simularBot(c, d)), concluidoEm: agora };
        est.duelos.unshift(d);
      }
    }
    est.ultimoConvite = agora;
  }
  salvar();
  return est;
}

export function aceitarConvite(id) {
  const est = estadoDuelos();
  const d = est.duelos.find(x => x.id === id);
  if (!d || statusDuelo(d) !== 'convite') throw new Error('Convite indisponível');
  if (est.saldo < d.aposta) throw new Error(`Você precisa de ${d.aposta} tokens para aceitar (tem ${est.saldo})`);
  lancar(-d.aposta, `Aposta retida: duelo com ${colega(d.colegaId).nome}`);
  d.aceito = true;
  salvar();
  return d;
}

export function recusarConvite(id) {
  const est = estadoDuelos();
  const d = est.duelos.find(x => x.id === id);
  if (!d || statusDuelo(d) !== 'convite') return;
  const c = colega(d.colegaId);
  if (c) c.saldo += d.aposta;
  d.encerrado = 'recusado';
  salvar();
}

export function registrarBateria(id, respostas) {
  const est = estadoDuelos();
  const d = est.duelos.find(x => x.id === id);
  if (!d) throw new Error('Duelo não encontrado');
  if (d.eu) return d;
  const r = respostas.map((x, indice) => ({ ...x, pontos: pontuarResposta({ correta: x.correta, tempoMs: x.tempoMs, indice }) }));
  d.eu = { respostas: r, total: r.reduce((s, x) => s + x.pontos, 0), concluidoEm: Date.now() };
  if (d.tipo === 'enviado') d.adv.concluidoEm = Date.now() + d.adv.atrasoMs;
  salvar();
  return d;
}

/** Revela e liquida (uma única vez). */
export function revelar(id) {
  const est = estadoDuelos();
  const d = est.duelos.find(x => x.id === id);
  if (!d) throw new Error('Duelo não encontrado');
  if (!d.encerrado && statusDuelo(d) === 'resultado') {
    const c = colega(d.colegaId);
    const liq = liquidar(d.eu.total, d.adv.total, d.aposta);
    if (liq.recebeEu) lancar(liq.recebeEu, liq.resultado === 'vitoria'
      ? `Vitória contra ${c.nome}: +${d.aposta} do adversário`
      : `Empate com ${c.nome}: aposta devolvida`);
    if (liq.resultado === 'derrota') estado.extrato.unshift({ quando: Date.now(), valor: 0, descricao: `Derrota para ${c.nome}: perdeu os ${d.aposta} apostados` });
    c.saldo += liq.recebeAdv;
    d.resultado = liq.resultado;
    d.liquido = liq.saldoLiquidoEu;
    d.encerrado = 'finalizado';
    d.reveladoEm = Date.now();
    salvar();
  }
  return d;
}

export function pendencias() {
  const est = estadoDuelos();
  let convites = 0, resultados = 0;
  est.duelos.forEach(d => {
    const s = statusDuelo(d);
    if (s === 'convite' || s === 'aguardando_voce') convites++;
    if (s === 'resultado') resultados++;
  });
  return { convites, resultados, total: convites + resultados };
}

export function tokensRetidos() {
  return estadoDuelos().duelos.filter(d => !d.encerrado && d.aceito).reduce((s, d) => s + d.aposta, 0);
}
