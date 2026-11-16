// js/roleta.js - Roleta da Governança (modo solo, mobile-first)
// ---------------------------------------------------------------------------
// Regras (inspiradas no Perguntados):
//  - Gire a roleta: 6 categorias + Coroa.
//  - Pergunta da categoria, 4 alternativas, 20 segundos.
//  - Acertou: pontos (100 + até 50 pela rapidez) e +1 moeda. A barra da Coroa enche.
//  - 3 acertos seguidos (ou cair na Coroa) = escolha um Selo e responda valendo o dobro.
//  - Errou: perde 1 vida (3 no total). Junte os 6 selos para vencer.
//  - Ajudas compradas com moedas: Consultar o DPO, +10 s, Pular, Segunda chance.
// ---------------------------------------------------------------------------
import { carregarBanco, CATEGORIAS, categoria } from './perguntas.js';
import { renderAvatarSVG, AVATAR_PADRAO } from './avatar.js';
import { ico } from './icones.js';
import { confete, flash, tremer, seloCentral } from './fx.js';
import { Audio } from './audio.js';

const REGRAS = {
  VIDAS: 3,
  TEMPO_MS: 20000,
  PTS_ACERTO: 100,
  BONUS_VELOCIDADE: 50,
  MULT_SELO: 2,
  ACERTOS_PARA_COROA: 3,
  MOEDAS_INICIAIS: 5,
  BONUS_VITORIA: 500,
  BONUS_POR_VIDA: 100
};

const AJUDAS = [
  { id: 'dpo', nome: 'Consultar o DPO', curto: 'DPO', custo: 3, icone: 'usuarios', desc: 'Elimina 2 alternativas erradas' },
  { id: 'tempo', nome: 'Mais tempo', curto: '+10s', custo: 2, icone: 'relogio', desc: '+10 segundos' },
  { id: 'pular', nome: 'Pular', curto: 'Pular', custo: 2, icone: 'seta', desc: 'Troca a pergunta' },
  { id: 'segunda', nome: 'Segunda chance', curto: '2ª chance', custo: 3, icone: 'repetir', desc: 'Se errar, tenta de novo' }
];

const STORAGE = 'roleta_governanca_v1';
const app = document.getElementById('roleta-app');
const SETORES = [...CATEGORIAS.map(c => ({ ...c, tipo: 'categoria' })), { id: 'coroa', nome: 'Coroa', cor: '#FFFFFF', escura: '#C9D6E3', icone: 'coroa', tipo: 'coroa' }];
const ANG = 360 / SETORES.length;

let banco = null;
let jogo = null;
let rotacaoAtual = 0;
let timer = null;

// ---------------------------------------------------------------------------
// Persistência
// ---------------------------------------------------------------------------
function lerSalvo() {
  try { return JSON.parse(localStorage.getItem(STORAGE)) || {}; } catch (_) { return {}; }
}
function salvar(dados) {
  try { localStorage.setItem(STORAGE, JSON.stringify({ ...lerSalvo(), ...dados })); } catch (_) {}
}
function avatarJogador() {
  try {
    const conv = JSON.parse(localStorage.getItem('trilha_avatar_convidado') || 'null');
    if (conv) return conv;
    const jog = JSON.parse(localStorage.getItem('trilha_jogador') || 'null');
    if (jog && jog.avatar) return jog.avatar;
  } catch (_) {}
  return AVATAR_PADRAO;
}

function som(nome) {
  try { Audio[nome](); } catch (_) {}
}

// ---------------------------------------------------------------------------
// Componentes visuais
// ---------------------------------------------------------------------------
function icoEm(nome, x, y, tam) {
  return ico(nome).replace('<svg class="ico"', `<svg x="${x}" y="${y}" width="${tam}" height="${tam}" class="ico"`);
}

function svgRoleta() {
  const R = 150, cx = 160, cy = 160;
  const fatias = SETORES.map((s, i) => {
    const a0 = (i * ANG - 90) * Math.PI / 180;
    const a1 = ((i + 1) * ANG - 90) * Math.PI / 180;
    const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    const meio = ((i + 0.5) * ANG - 90) * Math.PI / 180;
    const ix = cx + R * 0.66 * Math.cos(meio), iy = cy + R * 0.66 * Math.sin(meio);
    const tx = cx + R * 0.88 * Math.cos(meio), ty = cy + R * 0.88 * Math.sin(meio);
    const corIcone = s.tipo === 'coroa' ? '#C99616' : '#FFFFFF';
    return `
      <path d="M${cx} ${cy} L${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z" fill="${s.cor}" stroke="#05101F" stroke-width="3"/>
      <path d="M${cx} ${cy} L${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z" fill="url(#roleta-brilho)"/>
      <g color="${corIcone}" transform="rotate(${(i + 0.5) * ANG} ${ix.toFixed(2)} ${iy.toFixed(2)})">${icoEm(s.icone, (ix - 17).toFixed(2), (iy - 17).toFixed(2), 34)}</g>
      <text x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" transform="rotate(${(i + 0.5) * ANG} ${tx.toFixed(2)} ${ty.toFixed(2)})" text-anchor="middle" dominant-baseline="middle"
        font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="12.5" fill="${s.tipo === 'coroa' ? '#05101F' : '#05101F'}" opacity="0.75">${s.nome.toUpperCase()}</text>`;
  }).join('');
  const pinos = SETORES.map((_, i) => {
    const a = (i * ANG - 90) * Math.PI / 180;
    return `<circle cx="${(cx + (R + 5) * Math.cos(a)).toFixed(2)}" cy="${(cy + (R + 5) * Math.sin(a)).toFixed(2)}" r="4.5" fill="#FFF3C4" stroke="#05101F" stroke-width="2"/>`;
  }).join('');
  return `
    <svg viewBox="0 0 320 320" class="roleta-svg" aria-hidden="true">
      <defs>
        <radialGradient id="roleta-brilho" cx="50%" cy="50%" r="50%">
          <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/>
          <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.18"/>
        </radialGradient>
      </defs>
      <circle cx="160" cy="160" r="158" fill="#0B2545" stroke="#05101F" stroke-width="4"/>
      <g class="roleta-disco" id="roleta-disco" style="transform: rotate(${rotacaoAtual}deg)">${fatias}</g>
      ${pinos}
    </svg>`;
}

function hud() {
  const vidas = Array.from({ length: REGRAS.VIDAS }, (_, i) => `<span class="hud-vida ${i < jogo.vidas ? '' : 'perdida'}">${coracao()}</span>`).join('');
  const selos = CATEGORIAS.map(c => `<span class="hud-selo ${jogo.selos.has(c.id) ? 'ganho' : ''}" style="--cor: ${c.cor};" title="${c.nomeLongo}">${ico(c.icone)}</span>`).join('');
  const coroa = Array.from({ length: REGRAS.ACERTOS_PARA_COROA }, (_, i) => `<span class="coroa-passo ${i < jogo.seq ? 'cheio' : ''}"></span>`).join('');
  return `
    <header class="roleta-hud">
      <div class="hud-linha">
        <button type="button" class="hud-sair" id="btn-sair" aria-label="Sair da partida">${ico('voltar')}</button>
        <div class="hud-vidas" aria-label="${jogo.vidas} vidas">${vidas}</div>
        <div class="hud-pontos"><span>${jogo.pontos}</span> pts</div>
        <div class="hud-moedas" title="Moedas para ajudas">${ico('token')} <span>${jogo.moedas}</span></div>
      </div>
      <div class="hud-linha hud-linha-2">
        <div class="hud-selos">${selos}</div>
        <div class="hud-coroa" title="3 acertos seguidos = Coroa">${ico('coroa')}<div class="coroa-barra">${coroa}</div></div>
      </div>
    </header>`;
}

function coracao() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3.1 1.7-1.9 3.2-3.1 5.3-3.1 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21Z" stroke="#05101F" stroke-width="2.2"/></svg>';
}

// ---------------------------------------------------------------------------
// TELA INICIAL
// ---------------------------------------------------------------------------
function telaInicio() {
  pararTimer();
  const salvo = lerSalvo();
  const avatar = avatarJogador();
  app.innerHTML = `
    <div class="roleta-tela tela-inicio-roleta">
      <a class="roleta-link-trilha" href="index.html">${ico('voltar')} Trilha Inteligente</a>
      <div class="inicio-marca">
        <div class="inicio-roleta-mini">${svgRoleta()}</div>
        <h1>Roleta da<br><span>Governança</span></h1>
        <p>Gire, responda e conquiste os 6 selos de governança, IA e segurança.</p>
      </div>

      <div class="inicio-jogador">
        <div class="inicio-avatar">${renderAvatarSVG(avatar, { modo: 'busto' })}</div>
        <div>
          <div class="inicio-recorde-rotulo">Seu recorde</div>
          <div class="inicio-recorde">${salvo.recorde || 0} <small>pts</small></div>
          <div class="inicio-partidas">${salvo.partidas || 0} partida${(salvo.partidas || 0) === 1 ? '' : 's'} · ${salvo.vitorias || 0} vitória${(salvo.vitorias || 0) === 1 ? '' : 's'}</div>
        </div>
      </div>

      <button type="button" class="roleta-btn-principal" id="btn-jogar">${ico('dado')} Jogar</button>

      <div class="inicio-categorias">
        ${CATEGORIAS.map(c => `<div class="inicio-cat" style="--cor: ${c.cor};"><span>${ico(c.icone)}</span>${c.nomeLongo}</div>`).join('')}
      </div>

      <details class="inicio-regras">
        <summary>${ico('lampada')} Como jogar</summary>
        <ul>
          <li>Gire a roleta e responda a pergunta da categoria em até <strong>20 segundos</strong>.</li>
          <li>Acerto vale <strong>100 pontos + até 50</strong> pela rapidez, e <strong>1 moeda</strong>.</li>
          <li><strong>3 acertos seguidos</strong> (ou cair na Coroa) liberam a disputa de um <strong>selo</strong>, valendo o dobro.</li>
          <li>Cada erro custa <strong>1 vida</strong>. Você tem 3.</li>
          <li>Junte os <strong>6 selos</strong> para vencer. Use moedas para pedir ajuda.</li>
        </ul>
      </details>
      <p class="inicio-nota">Protótipo: a categoria Políticas SEST SENAT usa perguntas de exemplo até recebermos as políticas oficiais.</p>
    </div>`;
  app.querySelector('#btn-jogar').onclick = novoJogo;
}

// ---------------------------------------------------------------------------
// PARTIDA
// ---------------------------------------------------------------------------
function novoJogo() {
  jogo = {
    vidas: REGRAS.VIDAS,
    pontos: 0,
    moedas: REGRAS.MOEDAS_INICIAIS,
    seq: 0,
    selos: new Set(),
    usadas: new Set(),
    acertos: 0,
    erros: 0,
    porCategoria: Object.fromEntries(CATEGORIAS.map(c => [c.id, { acertos: 0, total: 0 }])),
    rodada: 0
  };
  som('tocarDado');
  telaRoleta();
}

function confirmarSair() {
  if (confirm('Sair da partida? Seu progresso nesta partida será perdido.')) telaInicio();
}

function telaRoleta() {
  pararTimer();
  const coroaPronta = jogo.seq >= REGRAS.ACERTOS_PARA_COROA;
  app.innerHTML = `
    <div class="roleta-tela tela-jogo">
      ${hud()}
      <div class="roleta-centro">
        <div class="roleta-rodada">Rodada ${jogo.rodada + 1}</div>
        <div class="roleta-wrap ${coroaPronta ? 'coroa-pronta' : ''}">
          <div class="roleta-ponteiro" aria-hidden="true"></div>
          ${svgRoleta()}
          <button type="button" class="roleta-botao-girar" id="btn-girar">${coroaPronta ? ico('coroa') : 'GIRAR'}</button>
        </div>
        <div class="roleta-dica" id="roleta-dica">${coroaPronta ? 'Coroa liberada! Toque para escolher um selo.' : 'Toque no centro para girar'}</div>
      </div>
    </div>`;
  app.querySelector('#btn-sair').onclick = confirmarSair;
  const btn = app.querySelector('#btn-girar');
  btn.onclick = () => {
    btn.disabled = true;
    if (coroaPronta) { telaEscolherSelo(); return; }
    girar();
  };
}

function girar() {
  const disco = app.querySelector('#roleta-disco');
  const i = Math.floor(Math.random() * SETORES.length);
  const centro = i * ANG + ANG / 2;
  const variacao = (Math.random() - 0.5) * ANG * 0.6;
  const voltas = 5 + Math.floor(Math.random() * 2);
  const base = rotacaoAtual - (rotacaoAtual % 360);
  rotacaoAtual = base + voltas * 360 + (360 - centro) + variacao;
  som('tocarDado');
  const dur = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 3200;
  disco.style.transition = dur ? `transform ${dur}ms cubic-bezier(0.12, 0.6, 0.12, 1)` : 'none';
  requestAnimationFrame(() => { disco.style.transform = `rotate(${rotacaoAtual}deg)`; });
  setTimeout(() => {
    const setor = SETORES[i];
    const dica = app.querySelector('#roleta-dica');
    if (dica) dica.innerHTML = `<span class="dica-resultado" style="--cor: ${setor.cor};">${ico(setor.icone)} ${setor.tipo === 'coroa' ? 'Coroa!' : setor.nomeLongo}</span>`;
    som('tocarPasso');
    setTimeout(() => {
      if (setor.tipo === 'coroa') telaEscolherSelo();
      else telaPergunta(setor.id, false);
    }, 900);
  }, dur + 80);
}

function telaEscolherSelo() {
  pararTimer();
  const faltam = CATEGORIAS.filter(c => !jogo.selos.has(c.id));
  seloCentral('COROA!', 'combo');
  som('tocarCheckpoint');
  app.innerHTML = `
    <div class="roleta-tela tela-jogo">
      ${hud()}
      <div class="escolher-selo">
        <div class="escolher-coroa">${ico('coroa')}</div>
        <h2>Escolha um selo para disputar</h2>
        <p>A pergunta vale o <strong>dobro</strong>. Acertou, o selo é seu.</p>
        <div class="escolher-grade">
          ${faltam.map(c => `<button type="button" class="escolher-cat" data-cat="${c.id}" style="--cor: ${c.cor}; --escura: ${c.escura};"><span>${ico(c.icone)}</span>${c.nomeLongo}</button>`).join('')}
        </div>
      </div>
    </div>`;
  app.querySelector('#btn-sair').onclick = confirmarSair;
  app.querySelectorAll('.escolher-cat').forEach(b => { b.onclick = () => telaPergunta(b.dataset.cat, true); });
}

function sortearPergunta(cat, valendoSelo) {
  const lista = banco.porCategoria[cat] || [];
  let disponiveis = lista.filter(p => !jogo.usadas.has(p.id));
  if (!disponiveis.length) {
    lista.forEach(p => jogo.usadas.delete(p.id));
    disponiveis = lista;
  }
  if (valendoSelo) {
    const dificeis = disponiveis.filter(p => (p.nivel || 1) >= 2);
    if (dificeis.length) disponiveis = dificeis;
  }
  const p = disponiveis[Math.floor(Math.random() * disponiveis.length)];
  jogo.usadas.add(p.id);
  // Embaralha alternativas mantendo a referência da correta
  const ordem = p.alternativas.map((t, i) => ({ t, i })).sort(() => Math.random() - 0.5);
  return { ...p, ordem };
}

function telaPergunta(cat, valendoSelo) {
  pararTimer();
  const c = categoria(cat);
  const p = sortearPergunta(cat, valendoSelo);
  const estado = { cat, valendoSelo, p, inicio: performance.now(), limite: REGRAS.TEMPO_MS, segunda: false, eliminadas: new Set(), respondida: false };
  jogo.perguntaAtual = estado;

  app.innerHTML = `
    <div class="roleta-tela tela-jogo tela-pergunta" style="--cor: ${c.cor}; --escura: ${c.escura};">
      ${hud()}
      <div class="pergunta-cartao">
        <div class="pergunta-topo">
          <span class="pergunta-cat">${ico(c.icone)} ${c.nomeLongo}</span>
          ${valendoSelo ? `<span class="pergunta-selo">${ico('coroa')} Valendo selo · ×2</span>` : ''}
          ${p.status === 'exemplo' ? '<span class="pergunta-exemplo">exemplo</span>' : ''}
        </div>
        <div class="pergunta-timer"><div class="pergunta-timer-barra" id="timer-barra"></div><span id="timer-num">${REGRAS.TEMPO_MS / 1000}</span></div>
        <p class="pergunta-texto">${p.pergunta}</p>
        <div class="pergunta-alternativas">
          ${p.ordem.map((o, k) => `<button type="button" class="alternativa" data-k="${k}"><span class="alt-letra">${'ABCD'[k]}</span><span class="alt-texto">${o.t}</span></button>`).join('')}
        </div>
        <div class="pergunta-feedback" id="feedback" hidden></div>
      </div>
      <div class="ajudas" id="ajudas">
        ${AJUDAS.map(a => `<button type="button" class="ajuda" data-ajuda="${a.id}" title="${a.desc}" ${jogo.moedas < a.custo ? 'disabled' : ''}>
            <span class="ajuda-ico">${ico(a.icone)}</span><span class="ajuda-nome">${a.curto}</span><span class="ajuda-custo">${ico('token')}${a.custo}</span></button>`).join('')}
      </div>
    </div>`;

  app.querySelector('#btn-sair').onclick = confirmarSair;
  app.querySelectorAll('.alternativa').forEach(b => { b.onclick = () => responder(Number(b.dataset.k)); });
  app.querySelectorAll('.ajuda').forEach(b => { b.onclick = () => usarAjuda(b.dataset.ajuda); });
  iniciarTimer();
}

function iniciarTimer() {
  const barra = app.querySelector('#timer-barra');
  const num = app.querySelector('#timer-num');
  const tick = (t) => {
    const e = jogo && jogo.perguntaAtual;
    if (!e || e.respondida) return;
    const resta = Math.max(0, e.limite - (t - e.inicio));
    barra.style.transform = `scaleX(${Math.min(1, resta / REGRAS.TEMPO_MS)})`;
    barra.classList.toggle('urgente', resta < 6000);
    num.textContent = Math.ceil(resta / 1000);
    if (resta <= 0) { responder(null); return; }
    timer = requestAnimationFrame(tick);
  };
  timer = requestAnimationFrame(tick);
}

function pararTimer() {
  if (timer) cancelAnimationFrame(timer);
  timer = null;
}

function atualizarHud() {
  const h = app.querySelector('.roleta-hud');
  if (h) h.outerHTML = hud();
  const sair = app.querySelector('#btn-sair');
  if (sair) sair.onclick = confirmarSair;
}

function usarAjuda(id) {
  const e = jogo.perguntaAtual;
  const a = AJUDAS.find(x => x.id === id);
  if (!e || e.respondida || !a || jogo.moedas < a.custo) return;
  const btn = app.querySelector(`.ajuda[data-ajuda="${id}"]`);
  if (id === 'dpo') {
    const erradas = e.p.ordem.map((o, k) => ({ o, k })).filter(x => x.o.i !== e.p.correta && !e.eliminadas.has(x.k));
    if (erradas.length < 1) return;
    erradas.sort(() => Math.random() - 0.5).slice(0, Math.min(2, erradas.length)).forEach(x => {
      e.eliminadas.add(x.k);
      const b = app.querySelector(`.alternativa[data-k="${x.k}"]`);
      if (b) { b.disabled = true; b.classList.add('eliminada'); }
    });
  } else if (id === 'tempo') {
    e.limite += 10000;
  } else if (id === 'pular') {
    jogo.moedas -= a.custo;
    pararTimer();
    e.respondida = true;
    jogo.usadas.add(e.p.id);
    telaPergunta(e.cat, e.valendoSelo);
    return;
  } else if (id === 'segunda') {
    e.segunda = true;
  }
  jogo.moedas -= a.custo;
  som('tocarPasso');
  if (btn) { btn.classList.add('usada'); btn.disabled = true; }
  atualizarHud();
  app.querySelectorAll('.ajuda').forEach(b => { if (!b.classList.contains('usada')) b.disabled = jogo.moedas < AJUDAS.find(x => x.id === b.dataset.ajuda).custo; });
}

function responder(k) {
  const e = jogo.perguntaAtual;
  if (!e || e.respondida) return;
  const correta = k != null && e.p.ordem[k].i === e.p.correta;

  // Segunda chance: primeiro erro só elimina a alternativa
  if (!correta && k != null && e.segunda) {
    e.segunda = false;
    const b = app.querySelector(`.alternativa[data-k="${k}"]`);
    if (b) { b.disabled = true; b.classList.add('eliminada', 'errada-leve'); tremer(b); }
    som('tocarErro');
    return;
  }

  e.respondida = true;
  pararTimer();
  const tempoMs = Math.min(e.limite, performance.now() - e.inicio);
  const kCerta = e.p.ordem.findIndex(o => o.i === e.p.correta);
  const stats = jogo.porCategoria[e.cat];
  stats.total++;
  jogo.rodada++;

  app.querySelectorAll('.alternativa').forEach((b, idx) => {
    b.disabled = true;
    if (idx === kCerta) b.classList.add('certa');
    else if (idx === k) b.classList.add('errada');
    else b.classList.add('apagada');
  });
  app.querySelectorAll('.ajuda').forEach(b => { b.disabled = true; });

  let pontos = 0;
  let titulo = '';
  if (correta) {
    const resta = Math.max(0, REGRAS.TEMPO_MS - Math.min(REGRAS.TEMPO_MS, tempoMs));
    pontos = REGRAS.PTS_ACERTO + Math.round(REGRAS.BONUS_VELOCIDADE * (resta / REGRAS.TEMPO_MS));
    if (e.valendoSelo) pontos *= REGRAS.MULT_SELO;
    jogo.pontos += pontos;
    jogo.moedas += 1;
    jogo.acertos++;
    stats.acertos++;
    if (e.valendoSelo) {
      jogo.selos.add(e.cat);
      jogo.seq = 0;
      titulo = `Selo ${categoria(e.cat).nome} conquistado!`;
      confete({ quantidade: 140 });
      som('tocarCheckpoint');
    } else {
      jogo.seq = Math.min(REGRAS.ACERTOS_PARA_COROA, jogo.seq + 1);
      titulo = jogo.seq >= REGRAS.ACERTOS_PARA_COROA ? 'Acertou! Coroa liberada' : 'Acertou!';
      som('tocarAcerto');
      flash('sucesso');
    }
  } else {
    jogo.vidas--;
    jogo.erros++;
    jogo.seq = 0;
    titulo = k == null ? 'Tempo esgotado!' : 'Errou!';
    som('tocarErro');
    flash('perigo');
    tremer(app.querySelector('.pergunta-cartao'));
  }
  atualizarHud();

  const venceu = jogo.selos.size === CATEGORIAS.length;
  const acabou = jogo.vidas <= 0;
  const fb = app.querySelector('#feedback');
  fb.hidden = false;
  fb.className = `pergunta-feedback ${correta ? 'ok' : 'erro'}`;
  fb.innerHTML = `
    <div class="fb-titulo">${correta ? ico('check') : ico('x')} ${titulo} ${pontos ? `<span class="fb-pontos">+${pontos}</span>` : ''}</div>
    ${!correta ? `<div class="fb-certa">Resposta certa: <strong>${e.p.alternativas[e.p.correta]}</strong></div>` : ''}
    <div class="fb-explicacao">${e.p.explicacao || ''}</div>
    <button type="button" class="roleta-btn-principal" id="btn-continuar">${venceu || acabou ? 'Ver resultado' : 'Continuar'} ${ico('seta')}</button>`;
  fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  app.querySelector('#btn-continuar').onclick = () => {
    if (venceu || acabou) telaFim(venceu);
    else telaRoleta();
  };
}

// ---------------------------------------------------------------------------
// FIM DE PARTIDA
// ---------------------------------------------------------------------------
function telaFim(venceu) {
  pararTimer();
  if (venceu) jogo.pontos += REGRAS.BONUS_VITORIA + jogo.vidas * REGRAS.BONUS_POR_VIDA;
  const salvo = lerSalvo();
  const novoRecorde = jogo.pontos > (salvo.recorde || 0);
  salvar({
    recorde: Math.max(salvo.recorde || 0, jogo.pontos),
    partidas: (salvo.partidas || 0) + 1,
    vitorias: (salvo.vitorias || 0) + (venceu ? 1 : 0)
  });
  if (venceu || novoRecorde) confete({ quantidade: 180 });

  const linhas = CATEGORIAS.map(c => {
    const s = jogo.porCategoria[c.id];
    const pct = s.total ? Math.round((s.acertos / s.total) * 100) : 0;
    return `<div class="fim-cat">
      <span class="fim-cat-ico" style="--cor: ${c.cor};">${ico(c.icone)}</span>
      <span class="fim-cat-nome">${c.nomeLongo} ${jogo.selos.has(c.id) ? `<span class="fim-selo-tag">${ico('coroa')} selo</span>` : ''}</span>
      <span class="fim-cat-num">${s.acertos}/${s.total}</span>
      <span class="fim-cat-barra"><span style="width: ${pct}%; background: ${c.cor};"></span></span>
    </div>`;
  }).join('');

  const respondidas = Object.values(jogo.porCategoria).filter(s => s.total > 0);
  const pior = CATEGORIAS.filter(c => jogo.porCategoria[c.id].total > 0)
    .sort((a, b) => (jogo.porCategoria[a.id].acertos / jogo.porCategoria[a.id].total) - (jogo.porCategoria[b.id].acertos / jogo.porCategoria[b.id].total))[0];

  app.innerHTML = `
    <div class="roleta-tela tela-fim">
      <div class="fim-avatar">${renderAvatarSVG(avatarJogador(), { modo: 'completo', reacao: venceu ? 'comemorando' : 'neutro' })}</div>
      <h2 class="fim-titulo ${venceu ? 'vitoria' : ''}">${venceu ? 'Você conquistou os 6 selos!' : 'Fim de jogo'}</h2>
      <div class="fim-pontos">${jogo.pontos} <small>pts</small></div>
      ${novoRecorde ? `<div class="fim-recorde">${ico('trofeu')} Novo recorde!</div>` : `<div class="fim-recorde-antigo">Recorde: ${Math.max(salvo.recorde || 0, jogo.pontos)} pts</div>`}
      <div class="fim-resumo">
        <div><strong>${jogo.acertos}</strong><span>acertos</span></div>
        <div><strong>${jogo.selos.size}/6</strong><span>selos</span></div>
        <div><strong>${jogo.rodada}</strong><span>rodadas</span></div>
      </div>
      <div class="fim-categorias">${linhas}</div>
      ${pior && respondidas.length > 1 && jogo.porCategoria[pior.id].acertos < jogo.porCategoria[pior.id].total
        ? `<div class="fim-dica">${ico('lampada')} Vale reforçar: <strong>${pior.nomeLongo}</strong></div>` : ''}
      <button type="button" class="roleta-btn-principal" id="btn-de-novo">${ico('repetir')} Jogar de novo</button>
      <button type="button" class="roleta-btn-secundario" id="btn-inicio">Início</button>
    </div>`;
  app.querySelector('#btn-de-novo').onclick = novoJogo;
  app.querySelector('#btn-inicio').onclick = telaInicio;
}

// ---------------------------------------------------------------------------
// Teclado (desktop): 1–4 / A–D respondem; Espaço gira
// ---------------------------------------------------------------------------
document.addEventListener('keydown', (ev) => {
  const e = jogo && jogo.perguntaAtual;
  const mapa = { '1': 0, '2': 1, '3': 2, '4': 3, a: 0, b: 1, c: 2, d: 3 };
  const k = mapa[ev.key.toLowerCase()];
  if (k != null && e && !e.respondida) {
    const b = app.querySelector(`.alternativa[data-k="${k}"]`);
    if (b && !b.disabled) { ev.preventDefault(); b.click(); }
  } else if ((ev.key === ' ' || ev.key === 'Enter')) {
    const girar = app.querySelector('#btn-girar:not([disabled])');
    const cont = app.querySelector('#btn-continuar');
    if (girar) { ev.preventDefault(); girar.click(); }
    else if (cont && document.activeElement !== cont) { ev.preventDefault(); cont.click(); }
  }
});

// ---------------------------------------------------------------------------
(async function iniciar() {
  try {
    banco = await carregarBanco();
    telaInicio();
  } catch (err) {
    app.innerHTML = `<div class="roleta-tela"><p>Não foi possível carregar as perguntas. Recarregue a página.</p></div>`;
    console.error(err);
  }
})();
