// js/duelos_ui.js - Telas dos duelos com aposta (Roleta da Governança)
import * as D from './duelos.js';
import { categoria } from './perguntas.js';
import { renderAvatarSVG, AVATAR_PADRAO } from './avatar.js';
import { ico } from './icones.js';
import { mascote } from './mascotes.js';
import { confete, flash, tremer } from './fx.js';
import { Audio } from './audio.js';

const R = D.REGRAS_DUELO;
let app = null;
let voltarInicio = null;
let meuAvatar = () => AVATAR_PADRAO;
let vista = 'painel';
let poll = null;
let bateria = null;
let timersRev = [];
let disponiveisAntes = new Set();

const som = (n) => { try { Audio[n](); } catch (_) {} };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const busto = (av, t = 44) => `<span class="duelo-busto" style="width:${t}px;height:${t}px">${renderAvatarSVG(av || AVATAR_PADRAO, { modo: 'busto' })}</span>`;
const fichas = (n) => `<span class="fichas">${ico('token')} ${n}</span>`;

function toast(html) {
  const el = document.createElement('div');
  el.className = 'roleta-toast';
  el.innerHTML = html;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('saindo'), 3000);
  setTimeout(() => el.remove(), 3500);
}

function limpar() {
  clearInterval(poll); poll = null;
  timersRev.forEach(clearTimeout); timersRev = [];
  if (bateria?.raf) cancelAnimationFrame(bateria.raf);
}

/** Abre a área de duelos. */
export async function abrirDuelos(opcoes) {
  app = opcoes.app;
  voltarInicio = opcoes.voltar;
  if (opcoes.avatar) meuAvatar = opcoes.avatar;
  await D.atualizarDuelos();
  disponiveisAntes = new Set(D.estadoDuelos().duelos.filter(d => D.statusDuelo(d) === 'resultado').map(d => d.id));
  painel();
}

function sair() {
  // Abandonou a bateria no meio: restantes contam como tempo esgotado
  if (bateria && bateria.respostas.length < R.PERGUNTAS) {
    while (bateria.respostas.length < R.PERGUNTAS) bateria.respostas.push({ correta: false, tempoMs: R.TEMPO_MS, opcao: null });
    D.registrarBateria(bateria.duelo.id, bateria.respostas);
  }
  bateria = null;
  limpar();
  voltarInicio();
}

function cabecalho(titulo) {
  const est = D.estadoDuelos();
  const retidos = D.tokensRetidos();
  return `
    <header class="duelo-topo">
      <button type="button" class="hud-sair" id="duelo-voltar" aria-label="Voltar">${ico('voltar')}</button>
      <h1>${titulo}</h1>
      <div class="carteira" title="Saldo de tokens">
        ${ico('token')} <strong>${est.saldo}</strong>
        ${retidos ? `<small>+${retidos} em jogo</small>` : ''}
      </div>
    </header>`;
}

// ---------------------------------------------------------------------------
// PAINEL
// ---------------------------------------------------------------------------
async function painel() {
  limpar();
  vista = 'painel';
  await D.atualizarDuelos();
  const est = D.estadoDuelos();
  const grupos = { convite: [], aguardando_voce: [], resultado: [], aguardando_adversario: [], fim: [] };
  est.duelos.forEach(d => {
    const s = D.statusDuelo(d);
    if (grupos[s]) grupos[s].push(d);
    else grupos.fim.push(d);
  });
  const min = D.apostaMinima(est.saldo);

  const cartao = (d) => {
    const c = D.colega(d.colegaId);
    const s = D.statusDuelo(d);
    let info = '', acao = '';
    if (s === 'convite') {
      const podePagar = est.saldo >= d.aposta;
      info = `Te desafiou valendo ${fichas(d.aposta)}. Prêmio: ${fichas(d.aposta * 2)}`;
      acao = `<button type="button" class="duelo-btn duelo-btn-ok" data-aceitar="${d.id}" ${podePagar ? '' : 'disabled'}>${podePagar ? 'Aceitar' : 'Saldo insuficiente'}</button>
              <button type="button" class="duelo-btn duelo-btn-sec" data-recusar="${d.id}">Recusar</button>`;
    } else if (s === 'aguardando_voce') {
      info = `Valendo ${fichas(d.aposta)}. Sua bateria ainda não foi respondida.`;
      acao = `<button type="button" class="duelo-btn duelo-btn-ok" data-jogar="${d.id}">${ico('raio')} Responder</button>`;
    } else if (s === 'resultado') {
      info = `Os dois responderam. Valendo ${fichas(d.aposta * 2)}!`;
      acao = `<button type="button" class="duelo-btn duelo-btn-ouro" data-revelar="${d.id}">${ico('trofeu')} Ver resultado</button>`;
    } else if (s === 'aguardando_adversario') {
      info = `Placar selado · ${fichas(d.aposta * 2)} em jogo. <span class="duelo-espera" data-espera="${d.id}"></span>`;
    } else if (d.encerrado === 'finalizado') {
      const t = { vitoria: 'Vitória', derrota: 'Derrota', empate: 'Empate' }[d.resultado];
      info = `<span class="res-${d.resultado}">${t} ${d.liquido > 0 ? '+' : ''}${d.liquido} tokens</span> · ${d.eu.total} × ${d.adv.total}`;
      acao = `<button type="button" class="duelo-btn duelo-btn-sec" data-revelar="${d.id}" data-rever="1">Rever</button>`;
    } else if (d.encerrado === 'recusado') {
      info = 'Convite recusado. Ninguém perdeu tokens.';
    } else {
      info = 'Prazo expirado. Apostas devolvidas.';
    }
    return `<div class="duelo-cartao st-${s}">
      ${busto(c?.avatar)}
      <div class="duelo-cartao-info"><div class="duelo-cartao-nome">${d.tipo === 'recebido' ? 'Desafio de' : 'Você desafiou'} <strong>${esc(c?.nome)}</strong></div><div class="duelo-cartao-txt">${info}</div></div>
      <div class="duelo-cartao-acoes">${acao}</div>
    </div>`;
  };

  const secao = (titulo, lista) => lista.length ? `<section class="duelo-secao"><h2>${titulo} <span>${lista.length}</span></h2>${lista.map(cartao).join('')}</section>` : '';

  app.innerHTML = `
    <div class="roleta-tela tela-duelos">
      ${cabecalho('Duelos')}
      <div class="duelo-regras-box">
        <div class="duelo-regras-mascote">${mascote('coroa', { humor: 'piscando' })}</div>
        <div>
          <strong>Aposte e leve tudo!</strong>
          <span>Desafie um colega apostando no mínimo <b>20% dos seus tokens</b>. Ele precisa ter o mesmo valor. Quem vencer a bateria de 7 perguntas fica com os tokens do outro.</span>
        </div>
      </div>
      <div class="duelo-aviso">${ico('alerta')} Protótipo: os colegas são simulados. Com o login institucional, os duelos serão entre colegas reais.</div>

      ${secao('Convites para você', grupos.convite)}
      ${secao('Sua vez de responder', grupos.aguardando_voce)}
      ${secao('Resultados disponíveis', grupos.resultado)}
      ${secao('Aguardando o adversário', grupos.aguardando_adversario)}

      <section class="duelo-secao">
        <h2>Desafiar um colega <span class="duelo-min">aposta mínima: ${fichas(min)}</span></h2>
        <div class="duelo-colegas">
          ${est.colegas.slice().sort((a, b) => b.saldo - a.saldo).map(c => {
            const p = D.podeDesafiarColega(c.id);
            return `<div class="duelo-colega ${p.ok ? '' : 'bloqueado'}">
              ${busto(c.avatar, 46)}
              <div class="duelo-colega-info"><strong>${esc(c.nome)}</strong><span>${esc(c.area)} · ${fichas(c.saldo)}</span></div>
              ${p.ok ? `<button type="button" class="duelo-btn duelo-btn-ok" data-desafiar="${c.id}">${ico('espadas')} Desafiar</button>` : `<span class="duelo-motivo">${esc(p.motivo)}</span>`}
            </div>`;
          }).join('')}
        </div>
      </section>

      ${secao('Histórico', grupos.fim.slice(0, 8))}

      <details class="duelo-extrato">
        <summary>${ico('livro')} Extrato de tokens</summary>
        <ul>${est.extrato.slice(0, 15).map(e => `<li><span>${new Date(e.quando).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span><span>${esc(e.descricao)}</span><strong class="${e.valor > 0 ? 'mais' : e.valor < 0 ? 'menos' : ''}">${e.valor > 0 ? '+' : ''}${e.valor || '—'}</strong></li>`).join('')}</ul>
        <button type="button" class="duelo-btn duelo-btn-sec" id="duelo-reiniciar">Reiniciar carteira de teste</button>
      </details>
    </div>`;

  app.querySelector('#duelo-voltar').onclick = sair;
  app.querySelectorAll('[data-desafiar]').forEach(b => { b.onclick = () => telaAposta(b.dataset.desafiar); });
  app.querySelectorAll('[data-aceitar]').forEach(b => {
    b.onclick = () => {
      try { const d = D.aceitarConvite(b.dataset.aceitar); som('tocarPasso'); preBateria(d); } catch (e) { toast(`${ico('alerta')} ${esc(e.message)}`); }
    };
  });
  app.querySelectorAll('[data-recusar]').forEach(b => {
    b.onclick = () => { if (confirm('Recusar o desafio? Ninguém perde tokens.')) { D.recusarConvite(b.dataset.recusar); painel(); } };
  });
  app.querySelectorAll('[data-jogar]').forEach(b => { b.onclick = () => preBateria(D.estadoDuelos().duelos.find(d => d.id === b.dataset.jogar)); });
  app.querySelectorAll('[data-revelar]').forEach(b => { b.onclick = () => revelacao(b.dataset.revelar, b.dataset.rever === '1'); });
  app.querySelector('#duelo-reiniciar').onclick = () => {
    if (confirm('Reiniciar a carteira de teste? Saldo volta a 100 e os duelos são apagados.')) { D.reiniciarDuelos(); painel(); }
  };

  atualizarEsperas();
  poll = setInterval(async () => {
    if (vista !== 'painel') return;
    const est2 = await D.atualizarDuelos();
    const disp = est2.duelos.filter(d => D.statusDuelo(d) === 'resultado');
    const novo = disp.find(d => !disponiveisAntes.has(d.id));
    disponiveisAntes = new Set(disp.map(d => d.id));
    if (novo) {
      toast(`${ico('espadas')} <strong>${esc(D.colega(novo.colegaId).nome)}</strong> respondeu! Resultado disponível.`);
      som('tocarCheckpoint');
      painel();
    } else atualizarEsperas();
  }, 3000);
}

function atualizarEsperas() {
  app.querySelectorAll('[data-espera]').forEach(el => {
    const d = D.estadoDuelos().duelos.find(x => x.id === el.dataset.espera);
    if (!d?.adv?.concluidoEm) return;
    const s = Math.max(0, Math.round((d.adv.concluidoEm - Date.now()) / 1000));
    el.textContent = s > 0 ? `simulação: responde em ~${s}s` : 'respondendo...';
  });
}

// ---------------------------------------------------------------------------
// APOSTA
// ---------------------------------------------------------------------------
function telaAposta(colegaId) {
  limpar();
  vista = 'aposta';
  const est = D.estadoDuelos();
  const c = D.colega(colegaId);
  const p = D.podeDesafiarColega(colegaId);
  if (!p.ok) { toast(`${ico('alerta')} ${esc(p.motivo)}`); painel(); return; }
  let aposta = p.min;

  app.innerHTML = `
    <div class="roleta-tela tela-aposta">
      ${cabecalho('Fazer aposta')}
      <div class="aposta-vs">
        <div class="aposta-lado">${busto(meuAvatar(), 76)}<strong>Você</strong>${fichas(est.saldo)}</div>
        <div class="aposta-x">VS</div>
        <div class="aposta-lado">${busto(c.avatar, 76)}<strong>${esc(c.nome)}</strong>${fichas(c.saldo)}</div>
      </div>
      <div class="aposta-caixa">
        <div class="aposta-rotulo">Sua aposta</div>
        <div class="aposta-valor"><button type="button" class="aposta-menos" aria-label="Diminuir">−</button><span id="aposta-num">${aposta}</span><button type="button" class="aposta-mais" aria-label="Aumentar">+</button></div>
        <input type="range" id="aposta-range" min="${p.min}" max="${p.max}" step="1" value="${aposta}" aria-label="Valor da aposta">
        <div class="aposta-limites"><span>mín. ${p.min} (20%)</span><span>máx. ${p.max}</span></div>
        <div class="aposta-atalhos">
          ${[['Mínimo', p.min], ['Metade', Math.max(p.min, Math.floor(Math.min(est.saldo, c.saldo) / 2))], ['Tudo', p.max]].map(([n, v]) => `<button type="button" class="duelo-btn duelo-btn-sec" data-v="${v}">${n}</button>`).join('')}
        </div>
        <div class="aposta-premio">Prêmio para quem vencer: <strong id="aposta-premio">${fichas(aposta * 2)}</strong></div>
        <p class="aposta-regra">Os ${'<b id="aposta-retido">' + aposta + '</b>'} tokens ficam retidos dos dois lados até o resultado. Empate devolve as apostas.</p>
      </div>
      <button type="button" class="roleta-btn-principal" id="aposta-confirmar">${ico('espadas')} Desafiar e responder</button>
      <button type="button" class="roleta-btn-secundario" id="aposta-cancelar">Cancelar</button>
    </div>`;

  const range = app.querySelector('#aposta-range');
  const atualizar = (v) => {
    aposta = Math.max(p.min, Math.min(p.max, Math.round(v)));
    range.value = aposta;
    app.querySelector('#aposta-num').textContent = aposta;
    app.querySelector('#aposta-premio').innerHTML = fichas(aposta * 2);
    app.querySelector('#aposta-retido').textContent = aposta;
  };
  range.oninput = () => atualizar(Number(range.value));
  app.querySelector('.aposta-menos').onclick = () => atualizar(aposta - 1);
  app.querySelector('.aposta-mais').onclick = () => atualizar(aposta + 1);
  app.querySelectorAll('[data-v]').forEach(b => { b.onclick = () => atualizar(Number(b.dataset.v)); });
  app.querySelector('#duelo-voltar').onclick = painel;
  app.querySelector('#aposta-cancelar').onclick = painel;
  app.querySelector('#aposta-confirmar').onclick = async (ev) => {
    ev.currentTarget.disabled = true;
    try {
      const d = await D.lancarDesafio(colegaId, aposta);
      som('tocarDado');
      preBateria(d);
    } catch (e) {
      toast(`${ico('alerta')} ${esc(e.message)}`);
      ev.currentTarget.disabled = false;
    }
  };
}

// ---------------------------------------------------------------------------
// BATERIA
// ---------------------------------------------------------------------------
function preBateria(d) {
  limpar();
  vista = 'pre';
  const c = D.colega(d.colegaId);
  app.innerHTML = `
    <div class="roleta-tela tela-pre-bateria">
      <div class="aposta-vs">
        <div class="aposta-lado">${busto(meuAvatar(), 76)}<strong>Você</strong></div>
        <div class="aposta-x">VS</div>
        <div class="aposta-lado">${busto(c.avatar, 76)}<strong>${esc(c.nome)}</strong></div>
      </div>
      <div class="pre-pote">${ico('token')} ${d.aposta * 2} <small>tokens em jogo</small></div>
      <ul class="pre-regras">
        <li>${ico('lampada')} <span><b>${R.PERGUNTAS} perguntas</b> de todas as categorias</span></li>
        <li>${ico('relogio')} <span><b>${R.TEMPO_MS / 1000} segundos</b> cada</span></li>
        <li>${ico('raio')} <span>Acerto = <b>100</b> + até <b>50</b> pela rapidez</span></li>
        <li>${ico('coroa')} <span>A <b>última vale o dobro</b></span></li>
        <li>${ico('escudo')} <span>Você só vê o resultado na revelação</span></li>
      </ul>
      <button type="button" class="roleta-btn-principal" id="pre-comecar">${ico('raio')} Começar</button>
      <p class="pre-nota">Sair no meio conta as perguntas restantes como tempo esgotado.</p>
    </div>`;
  app.querySelector('#pre-comecar').onclick = async () => {
    const perguntas = await D.perguntasDoDuelo(d);
    bateria = { duelo: d, perguntas, idx: 0, respostas: [], inicio: 0, raf: null, bloqueada: true };
    contagem();
  };
}

function contagem() {
  vista = 'bateria';
  let n = 3;
  const passo = () => {
    if (!bateria) return;
    if (n === 0) { pergunta(); return; }
    app.innerHTML = `<div class="duelo-contagem"><span>${n}</span></div>`;
    som('tocarPasso');
    n--; setTimeout(passo, 650);
  };
  passo();
}

function pergunta() {
  const { duelo, perguntas, idx } = bateria;
  const p = perguntas[idx];
  const cat = categoria(p.categoria);
  const alts = D.alternativasEmbaralhadas(duelo, p);
  const final = idx === R.PERGUNTAS - 1;
  bateria.alts = alts;
  app.innerHTML = `
    <div class="roleta-tela tela-jogo tela-pergunta tela-bateria" style="--cor: ${cat.cor}; --escura: ${cat.escura};">
      <div class="bateria-progresso">${perguntas.map((_, i) => `<span class="bp ${i < idx ? 'feito' : ''} ${i === idx ? 'atual' : ''} ${i === R.PERGUNTAS - 1 ? 'final' : ''}">${i === R.PERGUNTAS - 1 ? ico('coroa') : i + 1}</span>`).join('')}</div>
      <div class="pergunta-cartao">
        <div class="pergunta-cabecalho">
          <div class="pergunta-mascote">${mascote(p.categoria)}</div>
          <div class="pergunta-titulos">
            <span class="pergunta-cat">${cat.nomeLongo}</span>
            <div class="pergunta-tags">${final ? `<span class="pergunta-selo">${ico('coroa')} Última · ×2</span>` : `<span class="pergunta-num">Pergunta ${idx + 1} de ${R.PERGUNTAS}</span>`}</div>
          </div>
          <div class="pergunta-relogio"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" class="relogio-fundo"/><circle cx="22" cy="22" r="18" class="relogio-arco" id="b-arco" pathLength="100"/></svg><span id="b-num">${R.TEMPO_MS / 1000}</span></div>
        </div>
        <p class="pergunta-texto">${esc(p.pergunta)}</p>
        <div class="pergunta-alternativas">
          ${alts.map((a, k) => `<button type="button" class="alternativa" data-k="${k}"><span class="alt-letra">${'ABCD'[k]}</span><span class="alt-texto">${esc(a.t)}</span></button>`).join('')}
        </div>
      </div>
    </div>`;
  app.querySelectorAll('.alternativa').forEach(b => { b.onclick = () => responder(Number(b.dataset.k)); });
  bateria.bloqueada = false;
  bateria.inicio = performance.now();
  const arco = app.querySelector('#b-arco');
  const num = app.querySelector('#b-num');
  const tick = (t) => {
    if (!bateria || bateria.bloqueada) return;
    const resta = Math.max(0, R.TEMPO_MS - (t - bateria.inicio));
    arco.style.strokeDashoffset = `${100 - (resta / R.TEMPO_MS) * 100}`;
    arco.classList.toggle('urgente', resta < 5000);
    num.textContent = Math.ceil(resta / 1000);
    if (resta <= 0) { responder(null); return; }
    bateria.raf = requestAnimationFrame(tick);
  };
  bateria.raf = requestAnimationFrame(tick);
}

function responder(k) {
  if (!bateria || bateria.bloqueada) return;
  bateria.bloqueada = true;
  cancelAnimationFrame(bateria.raf);
  const p = bateria.perguntas[bateria.idx];
  const tempoMs = Math.min(R.TEMPO_MS, performance.now() - bateria.inicio);
  const escolha = k == null ? null : bateria.alts[k];
  bateria.respostas.push({ correta: !!escolha && escolha.i === p.correta, tempoMs: escolha ? tempoMs : R.TEMPO_MS, opcao: escolha ? escolha.i : null });
  if (escolha) {
    const b = app.querySelector(`.alternativa[data-k="${k}"]`);
    b?.classList.add('registrada');
    app.querySelectorAll('.alternativa').forEach(x => { if (x !== b) x.classList.add('apagada'); });
    som('tocarPasso');
  } else {
    tremer(app.querySelector('.pergunta-cartao'));
  }
  setTimeout(() => {
    if (!bateria) return;
    bateria.idx++;
    if (bateria.idx < R.PERGUNTAS) pergunta();
    else {
      const d = D.registrarBateria(bateria.duelo.id, bateria.respostas);
      bateria = null;
      if (d.tipo === 'recebido') revelacao(d.id);
      else enviado(d);
    }
  }, escolha ? 420 : 700);
}

function enviado(d) {
  vista = 'enviado';
  const c = D.colega(d.colegaId);
  const s = Math.max(10, Math.round((d.adv.concluidoEm - Date.now()) / 1000));
  app.innerHTML = `
    <div class="roleta-tela tela-enviado">
      <div class="enviado-mascote">${mascote('coroa', { humor: 'piscando' })}</div>
      <h2>Bateria enviada!</h2>
      <p>Seu placar está <b>selado</b>. ${esc(c.nome)} tem ${R.PRAZO_HORAS}h para responder as mesmas perguntas. ${fichas(d.aposta * 2)} em jogo.</p>
      <p class="pre-nota">No protótipo, o colega simulado responde em cerca de ${s} segundos.</p>
      <button type="button" class="roleta-btn-principal" id="enviado-ok">${ico('espadas')} Voltar aos duelos</button>
    </div>`;
  confete({ quantidade: 40 });
  app.querySelector('#enviado-ok').onclick = painel;
}

// ---------------------------------------------------------------------------
// REVELAÇÃO
// ---------------------------------------------------------------------------
async function revelacao(id, instantaneo = false) {
  limpar();
  vista = 'revelacao';
  const saldoAntes = D.saldo();
  const d = D.revelar(id);
  if (d.encerrado !== 'finalizado') { painel(); return; }
  const c = D.colega(d.colegaId);
  const perguntas = await D.perguntasDoDuelo(d);
  const celula = (r, final) => `<div class="rv-cel ${r.correta ? 'ok' : 'erro'}">${r.correta ? ico('check') : ico('x')}<b>${r.correta ? '+' + r.pontos : '0'}</b><small>${r.opcao == null ? 'tempo' : (r.tempoMs / 1000).toFixed(1) + 's'}</small></div>`;
  const titulos = { vitoria: 'Vitória!', derrota: 'Derrota', empate: 'Empate!' };
  const subt = {
    vitoria: `Você ganhou os ${d.aposta} tokens de ${esc(c.nome.split(' ')[0])}!`,
    derrota: `${esc(c.nome.split(' ')[0])} levou os seus ${d.aposta} tokens.`,
    empate: 'Placar igual: cada um recebe a aposta de volta.'
  };

  app.innerHTML = `
    <div class="roleta-tela tela-revelacao">
      <div class="rv-placar">
        <div class="rv-lado" id="rv-eu">${busto(meuAvatar(), 60)}<span>Você</span><b id="rv-t-eu">${instantaneo ? d.eu.total : 0}</b></div>
        <div class="rv-pote">${ico('token')}<b>${d.aposta * 2}</b><small>em jogo</small></div>
        <div class="rv-lado" id="rv-adv">${busto(c.avatar, 60)}<span>${esc(c.nome)}</span><b id="rv-t-adv">${instantaneo ? d.adv.total : 0}</b></div>
      </div>
      <div class="rv-linhas">
        ${perguntas.map((p, i) => `
          <div class="rv-linha ${i === R.PERGUNTAS - 1 ? 'final' : ''} ${instantaneo ? 'visivel' : ''}" data-i="${i}" style="--cor: ${categoria(p.categoria).cor};">
            ${celula(d.eu.respostas[i])}
            <div class="rv-q"><span class="rv-q-m">${mascote(p.categoria)}</span><span class="rv-q-t">${esc(p.pergunta.length > 80 ? p.pergunta.slice(0, 78) + '…' : p.pergunta)}</span></div>
            ${celula(d.adv.respostas[i])}
          </div>`).join('')}
      </div>
      <div class="rv-final rv-${d.resultado} ${instantaneo ? 'visivel' : ''}" id="rv-final">
        <div class="rv-final-t">${titulos[d.resultado]}</div>
        <div class="rv-final-s">${subt[d.resultado]}</div>
        <div class="rv-final-d">${d.liquido > 0 ? '+' : ''}${d.liquido} tokens · saldo: ${instantaneo ? D.saldo() : saldoAntes} ${ico('seta')} <b>${D.saldo()}</b></div>
      </div>
      <div class="rv-acoes ${instantaneo ? 'visivel' : ''}" id="rv-acoes">
        <button type="button" class="roleta-btn-principal" id="rv-voltar">${ico('espadas')} Voltar aos duelos</button>
        <details class="rv-exp"><summary>${ico('livro')} Ver respostas e explicações</summary>
          ${perguntas.map((p, i) => `<div class="rv-exp-item ${d.eu.respostas[i].correta ? 'ok' : 'erro'}"><b>${i + 1}. ${esc(p.pergunta)}</b><span class="rv-certa">${ico('check')} ${esc(p.alternativas[p.correta])}</span>${!d.eu.respostas[i].correta ? `<span class="rv-sua">${ico('x')} Sua resposta: ${d.eu.respostas[i].opcao == null ? 'tempo esgotado' : esc(p.alternativas[d.eu.respostas[i].opcao])}</span>` : ''}<small>${esc(p.explicacao)}</small></div>`).join('')}
        </details>
      </div>
      ${instantaneo ? '' : `<button type="button" class="rv-pular" id="rv-pular">Pular animação ${ico('seta')}</button>`}
    </div>`;
  app.querySelector('#rv-voltar').onclick = painel;
  if (instantaneo) return;

  let te = 0, ta = 0;
  const elE = app.querySelector('#rv-t-eu'), elA = app.querySelector('#rv-t-adv');
  const ladoE = app.querySelector('#rv-eu'), ladoA = app.querySelector('#rv-adv');
  const fim = () => {
    timersRev.forEach(clearTimeout); timersRev = [];
    app.querySelectorAll('.rv-linha').forEach(l => l.classList.add('visivel'));
    elE.textContent = d.eu.total; elA.textContent = d.adv.total;
    ladoE.classList.toggle('lider', d.eu.total > d.adv.total);
    ladoA.classList.toggle('lider', d.adv.total > d.eu.total);
    app.querySelector('#rv-final').classList.add('visivel');
    app.querySelector('#rv-acoes').classList.add('visivel');
    app.querySelector('#rv-pular')?.remove();
    if (d.resultado === 'vitoria') { confete({ quantidade: 180 }); som('tocarCheckpoint'); }
    else if (d.resultado === 'derrota') { flash('perigo'); tremer(app.querySelector('.rv-placar')); som('tocarErro'); }
    else flash('sucesso');
  };
  app.querySelector('#rv-pular').onclick = fim;
  let atraso = 500;
  perguntas.forEach((_, i) => {
    const final = i === R.PERGUNTAS - 1;
    if (final) atraso += 700;
    timersRev.push(setTimeout(() => {
      app.querySelector(`.rv-linha[data-i="${i}"]`)?.classList.add('visivel');
      te += d.eu.respostas[i].pontos; ta += d.adv.respostas[i].pontos;
      elE.textContent = te; elA.textContent = ta;
      ladoE.classList.toggle('lider', te > ta); ladoA.classList.toggle('lider', ta > te);
      som(d.eu.respostas[i].pontos ? 'tocarAcerto' : 'tocarPasso');
    }, atraso));
    atraso += final ? 1200 : 800;
  });
  timersRev.push(setTimeout(fim, atraso + 200));
}
