// js/ui/liga.js - Tela da Liga semanal + Duelos assíncronos (protótipo convidado)
// Vistas internas: painel (classificação / desafios / regras) → bateria → enviado | revelação
import { state } from '../state.js';
import * as L from '../liga.js';
import { renderAvatarSVG, AVATAR_PADRAO } from '../avatar.js';
import { ico } from '../icones.js';
import { confete, flash, tremer } from '../fx.js';
import { Audio } from '../audio.js';
import { macroTema, MACRO_TEMAS } from '../temas.js';

let root = null;
let navigateRef = null;
let aba = 'classificacao';
let vista = 'painel';
let timerPoll = null;
let bateria = null; // { duelo, idx, respostas, inicio, raf, bloqueada }
let revelacaoTimers = [];
let ultimosDisponiveis = new Set();
let onKeyDown = null;

const R = L.REGRAS_DUELO;

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
function jogador() {
  const st = state.get();
  return {
    nome: st.jogador && st.jogador !== 'Convidado' ? st.jogador : 'Você',
    area: st.area && st.area !== 'Convidado' ? st.area.split(' - ')[0] : 'Convidado',
    avatar: st.avatar || AVATAR_PADRAO
  };
}

function ligaInfo(id) {
  return L.LIGAS.find(l => l.id === id) || L.LIGAS[0];
}

function escudoLiga(id, tamanho = 64) {
  const liga = ligaInfo(id);
  const nivel = L.LIGAS.findIndex(l => l.id === id) + 1;
  const estrelas = Array.from({ length: nivel }, (_, i) => {
    const x = 32 + (i - (nivel - 1) / 2) * 9;
    return `<circle cx="${x}" cy="50" r="2.6" fill="#05101F"/>`;
  }).join('');
  return `
    <svg viewBox="0 0 64 64" width="${tamanho}" height="${tamanho}" aria-hidden="true" style="--cor-liga: ${liga.cor};">
      <path d="M32 4 56 12v18c0 15-10.5 25.5-24 30C18.5 55.5 8 45 8 30V12Z" fill="var(--cor-liga)" stroke="#05101F" stroke-width="3"/>
      <path d="M32 11 50 17v13c0 11-7.6 19-18 22.6C21.6 49 14 41 14 30V17Z" fill="rgba(255,255,255,0.18)"/>
      <path d="M22 29l7 7 13-14" fill="none" stroke="#05101F" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      ${estrelas}
    </svg>`;
}

function busto(avatar, tamanho = 40) {
  return `<div class="liga-busto" style="width:${tamanho}px;height:${tamanho}px;">${renderAvatarSVG(avatar || AVATAR_PADRAO, { modo: 'busto', tamanho })}</div>`;
}

function botPorId(est, id) {
  return est.grupo.find(b => b.id === id) || { nome: 'Colega', area: '—', avatar: AVATAR_PADRAO };
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'liga-toast';
  el.innerHTML = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('saindo'), 3200);
  setTimeout(() => el.remove(), 3700);
}

function limparRevelacao() {
  revelacaoTimers.forEach(t => clearTimeout(t));
  revelacaoTimers = [];
}

function pararBateria() {
  if (bateria && bateria.raf) cancelAnimationFrame(bateria.raf);
}

// ---------------------------------------------------------------------------
// Ciclo de vida da tela
// ---------------------------------------------------------------------------
export function render() {
  return `
    <div class="tela-liga fade-in">
      <div id="liga-root" class="liga-root">
        <div class="liga-carregando">Carregando liga...</div>
      </div>
    </div>`;
}

export async function montar(container, _st, navigate) {
  root = container.querySelector('#liga-root');
  navigateRef = navigate;
  vista = 'painel';
  await L.carregarBancoPerguntas();
  const est = L.obterLiga();
  ultimosDisponiveis = new Set(est.duelos.filter(d => L.statusDuelo(d) === 'resultado_disponivel').map(d => d.id));
  mostrarPainel();

  timerPoll = setInterval(verificarNovidades, 3000);

  onKeyDown = (e) => {
    if (vista !== 'bateria' || !bateria || bateria.bloqueada) return;
    const n = parseInt(e.key, 10);
    if (!isNaN(n)) {
      const btn = root.querySelector(`.duelo-opcao[data-i="${n - 1}"]`);
      if (btn) { e.preventDefault(); btn.click(); }
    }
  };
  document.addEventListener('keydown', onKeyDown);
}

export function desmontar() {
  clearInterval(timerPoll);
  timerPoll = null;
  limparRevelacao();
  if (onKeyDown) document.removeEventListener('keydown', onKeyDown);
  // Saiu no meio da bateria: perguntas restantes contam como tempo esgotado
  if (bateria && bateria.respostas.length < R.PERGUNTAS) {
    pararBateria();
    while (bateria.respostas.length < R.PERGUNTAS) {
      bateria.respostas.push({ correta: false, tempoMs: R.TEMPO_MS, opcaoIdx: null });
    }
    try { L.registrarBateria(bateria.duelo.id, bateria.respostas); } catch (_) {}
  }
  bateria = null;
}

function verificarNovidades() {
  if (vista !== 'painel') return;
  const est = L.obterLiga();
  const disponiveis = est.duelos.filter(d => L.statusDuelo(d) === 'resultado_disponivel');
  let novidade = false;
  disponiveis.forEach(d => {
    if (!ultimosDisponiveis.has(d.id)) {
      novidade = true;
      const bot = botPorId(est, d.adversarioId);
      toast(`${ico('espadas')} <strong>${bot.nome}</strong> respondeu seu desafio! Resultado disponível.`);
      try { Audio.tocarCheckpoint(); } catch (_) {}
    }
  });
  ultimosDisponiveis = new Set(disponiveis.map(d => d.id));
  if (novidade) mostrarPainel();
  else atualizarContagens(est);
}

function atualizarContagens(est) {
  // Atualiza apenas os textos que dependem do tempo (sem redesenhar a tela inteira)
  root.querySelectorAll('[data-espera]').forEach(el => {
    const d = est.duelos.find(x => x.id === el.dataset.espera);
    if (!d || !d.adv || d.adv.concluidoEm == null) return;
    const s = Math.max(0, Math.round((d.adv.concluidoEm - Date.now()) / 1000));
    el.textContent = s > 0 ? `simulação: responde em ~${s}s` : 'respondendo...';
  });
}

// ---------------------------------------------------------------------------
// PAINEL
// ---------------------------------------------------------------------------
function mostrarPainel() {
  vista = 'painel';
  limparRevelacao();
  const est = L.obterLiga();
  const eu = jogador();
  const liga = ligaInfo(est.liga);
  const tabela = L.classificacao(est, eu);
  const minhaLinha = tabela.find(l => l.eu);
  const pend = L.pendenciasLiga(est);
  const hoje = L.enviadosHoje(est);

  root.innerHTML = `
    <header class="liga-topo painel-arcade" style="--cor-liga: ${liga.cor};">
      <button type="button" id="liga-voltar" class="btn btn-outline btn-sm liga-voltar">${ico('voltar')} Início</button>
      <div class="liga-escudo">${escudoLiga(est.liga, 72)}</div>
      <div class="liga-titulos">
        <div class="liga-rotulo">Liga semanal</div>
        <div class="liga-nome">${liga.nome}</div>
        <div class="liga-sub">${ico('relogio')} Temporada termina em <strong>${L.tempoRestanteTemporada()}</strong> · grupo de ${R.TAM_GRUPO} colegas</div>
      </div>
      <div class="liga-stats">
        <div class="liga-stat"><span class="liga-stat-valor">${est.pontos}</span><span class="liga-stat-rotulo">pontos de liga</span></div>
        <div class="liga-stat"><span class="liga-stat-valor">${minhaLinha.posicao}º</span><span class="liga-stat-rotulo">posição</span></div>
        <div class="liga-stat"><span class="liga-stat-valor">${hoje}/${R.LIMITE_ENVIADOS_DIA}</span><span class="liga-stat-rotulo">desafios hoje</span></div>
      </div>
    </header>

    ${renderMudancaLiga(est)}

    <div class="liga-aviso-prototipo">${ico('alerta')} Protótipo: os colegas são fictícios e as respostas deles são simuladas. Em produção, os duelos serão com colegas reais da instituição.</div>

    <nav class="liga-abas" role="tablist">
      <button type="button" class="liga-aba ${aba === 'classificacao' ? 'ativa' : ''}" data-aba="classificacao">${ico('ranking')} Classificação</button>
      <button type="button" class="liga-aba ${aba === 'desafios' ? 'ativa' : ''}" data-aba="desafios">${ico('caixa')} Desafios ${pend.total ? `<span class="badge-pendente">${pend.total}</span>` : ''}</button>
      <button type="button" class="liga-aba ${aba === 'regras' ? 'ativa' : ''}" data-aba="regras">${ico('lampada')} Como funciona</button>
    </nav>

    <section class="liga-conteudo" id="liga-conteudo">
      ${aba === 'classificacao' ? renderClassificacao(est, tabela) : ''}
      ${aba === 'desafios' ? renderDesafios(est) : ''}
      ${aba === 'regras' ? renderRegras() : ''}
    </section>
  `;

  root.querySelector('#liga-voltar').onclick = () => navigateRef('inicio');
  root.querySelectorAll('.liga-aba').forEach(b => {
    b.onclick = () => { aba = b.dataset.aba; mostrarPainel(); };
  });
  const fecharAviso = root.querySelector('#liga-fechar-mudanca');
  if (fecharAviso) fecharAviso.onclick = () => { L.limparAvisoMudanca(); mostrarPainel(); };

  root.querySelectorAll('[data-desafiar]').forEach(b => {
    b.onclick = () => {
      try {
        const duelo = L.lancarDesafio(b.dataset.desafiar);
        mostrarPreBateria(duelo);
      } catch (e) {
        toast(`${ico('alerta')} ${e.message}`);
      }
    };
  });
  root.querySelectorAll('[data-responder]').forEach(b => {
    b.onclick = () => {
      const d = L.obterLiga().duelos.find(x => x.id === b.dataset.responder);
      if (d) mostrarPreBateria(d);
    };
  });
  root.querySelectorAll('[data-revelar]').forEach(b => {
    b.onclick = () => mostrarRevelacao(b.dataset.revelar, b.dataset.instantaneo === '1');
  });
  const btnReset = root.querySelector('#liga-reiniciar');
  if (btnReset) {
    btnReset.onclick = () => {
      if (confirm('Reiniciar a liga de teste? Pontos e duelos do protótipo serão apagados.')) {
        L.reiniciarLiga();
        aba = 'classificacao';
        mostrarPainel();
      }
    };
  }
  atualizarContagens(est);
}

function renderMudancaLiga(est) {
  const m = est.mudancaLiga;
  if (!m) return '';
  const para = ligaInfo(m.para);
  const textos = {
    subiu: `Você terminou em ${m.posicao}º e <strong>subiu para a Liga ${para.nome}</strong>!`,
    desceu: `Você terminou em ${m.posicao}º e voltou para a Liga ${para.nome}. Bora recuperar!`,
    manteve: `Você terminou em ${m.posicao}º e continua na Liga ${para.nome}.`
  };
  return `
    <div class="liga-mudanca liga-mudanca-${m.tipo}">
      ${escudoLiga(m.para, 40)}
      <span>Nova temporada! ${textos[m.tipo]}</span>
      <button type="button" class="btn btn-outline btn-sm" id="liga-fechar-mudanca">OK</button>
    </div>`;
}

function renderClassificacao(est, tabela) {
  const idx = L.LIGAS.findIndex(l => l.id === est.liga);
  const temPromocao = idx < L.LIGAS.length - 1;
  const temRebaixamento = idx > 0;
  const limiteDesce = R.TAM_GRUPO - R.DESCEM;

  const linhas = tabela.map(l => {
    let zona = '';
    if (temPromocao && l.posicao <= R.SOBEM) zona = 'zona-sobe';
    if (temRebaixamento && l.posicao > limiteDesce) zona = 'zona-desce';

    let acao = '';
    if (!l.eu) {
      const pode = L.podeDesafiar(est, l.id);
      const disponivel = est.duelos.find(d => d.adversarioId === l.id && L.statusDuelo(d) === 'resultado_disponivel');
      const aguardandoVoce = est.duelos.find(d => d.adversarioId === l.id && L.statusDuelo(d) === 'aguardando_voce');
      if (disponivel) acao = `<button type="button" class="btn-duelo btn-duelo-resultado" data-revelar="${disponivel.id}">${ico('trofeu')} Resultado</button>`;
      else if (aguardandoVoce) acao = `<button type="button" class="btn-duelo btn-duelo-responder" data-responder="${aguardandoVoce.id}">${ico('raio')} Responder</button>`;
      else if (pode.ok) acao = `<button type="button" class="btn-duelo" data-desafiar="${l.id}">${ico('espadas')} Desafiar</button>`;
      else acao = `<span class="btn-duelo btn-duelo-off" title="${pode.motivo}">${ico('relogio')}</span>`;
    }

    const divisor = [];
    if (temPromocao && l.posicao === R.SOBEM + 1) divisor.push(`<div class="liga-divisor sobe">${ico('setaCima')} Zona de promoção acima</div>`);
    if (temRebaixamento && l.posicao === limiteDesce + 1) divisor.push(`<div class="liga-divisor desce">${ico('setaBaixo')} Zona de rebaixamento abaixo</div>`);

    return `
      ${divisor.join('')}
      <div class="liga-linha ${zona} ${l.eu ? 'eu' : ''}">
        <span class="liga-pos">${l.posicao <= 3 ? `<span class="liga-medalha m${l.posicao}">${l.posicao}</span>` : l.posicao}</span>
        ${busto(l.avatar, 38)}
        <span class="liga-pessoa">
          <span class="liga-pessoa-nome">${l.nome}${l.eu ? ' <span class="liga-tag-eu">VOCÊ</span>' : ''}</span>
          <span class="liga-pessoa-area">${l.area}</span>
        </span>
        <span class="liga-pontos">${l.pontos}</span>
        <span class="liga-acao">${acao}</span>
      </div>`;
  }).join('');

  return `
    <div class="liga-tabela">
      <div class="liga-tabela-cab">
        <span>#</span><span></span><span>Colega</span><span>Pontos</span><span></span>
      </div>
      ${linhas}
    </div>
    <div class="liga-rodape-tabela">
      <span>${temPromocao ? `Os ${R.SOBEM} primeiros sobem para a Liga ${L.LIGAS[idx + 1].nome}.` : 'Você está na liga mais alta!'} ${temRebaixamento ? `Os ${R.DESCEM} últimos descem.` : ''}</span>
      <button type="button" class="btn btn-outline btn-sm" id="liga-reiniciar">${ico('repetir')} Reiniciar liga de teste</button>
    </div>`;
}

function renderDesafios(est) {
  const grupos = { aguardando_voce: [], resultado_disponivel: [], aguardando_adversario: [], finalizado: [], expirado: [] };
  est.duelos.forEach(d => grupos[L.statusDuelo(d)].push(d));

  const cartao = (d) => {
    const bot = botPorId(est, d.adversarioId);
    const s = L.statusDuelo(d);
    const horasPrazo = Math.max(0, Math.round((d.prazo - Date.now()) / 3600000));
    let info = '';
    let acao = '';
    if (s === 'aguardando_voce') {
      info = d.tipo === 'recebido'
        ? `Te desafiou! A bateria dele já está selada. Prazo: ${horasPrazo}h`
        : 'Você começou este desafio e não terminou a bateria';
      acao = `<button type="button" class="btn btn-primary btn-sm" data-responder="${d.id}">${ico('raio')} Responder</button>`;
    } else if (s === 'resultado_disponivel') {
      info = 'Os dois já responderam. Hora da revelação!';
      acao = `<button type="button" class="btn btn-primary btn-sm btn-brilho" data-revelar="${d.id}">${ico('trofeu')} Ver resultado</button>`;
    } else if (s === 'aguardando_adversario') {
      info = `Seu placar está selado. Aguardando ${bot.nome.split(' ')[0]} responder. <span class="liga-espera" data-espera="${d.id}"></span>`;
    } else if (s === 'finalizado') {
      const rotulo = { vitoria: 'Vitória', derrota: 'Derrota', empate: 'Empate' }[d.resultado];
      info = `<span class="res-${d.resultado}">${rotulo} ${d.delta > 0 ? '+' : ''}${d.delta}</span> · ${d.eu.total} × ${d.adv.total}`;
      acao = `<button type="button" class="btn btn-outline btn-sm" data-revelar="${d.id}" data-instantaneo="1">Rever</button>`;
    } else {
      info = 'Prazo expirado: desafio cancelado, ninguém perdeu pontos.';
    }
    return `
      <div class="duelo-cartao status-${s}">
        ${busto(bot.avatar, 44)}
        <div class="duelo-cartao-info">
          <div class="duelo-cartao-nome">${d.tipo === 'recebido' ? 'Desafio de' : 'Você desafiou'} <strong>${bot.nome}</strong> <span class="duelo-cartao-area">${bot.area}</span></div>
          <div class="duelo-cartao-status">${info}</div>
        </div>
        <div class="duelo-cartao-acao">${acao}</div>
      </div>`;
  };

  const secao = (titulo, lista, vazio) => `
    <div class="duelo-secao">
      <h3 class="duelo-secao-titulo">${titulo} <span>${lista.length}</span></h3>
      ${lista.length ? lista.map(cartao).join('') : `<p class="duelo-vazio">${vazio}</p>`}
    </div>`;

  return `
    ${secao('Aguardando você', grupos.aguardando_voce, 'Nenhum desafio pendente. Novos desafios de colegas aparecem aqui.')}
    ${secao('Resultados disponíveis', grupos.resultado_disponivel, 'Nenhum resultado novo.')}
    ${secao('Aguardando o adversário', grupos.aguardando_adversario, 'Desafie alguém na aba Classificação.')}
    ${secao('Finalizados', grupos.finalizado.slice(0, 10), 'Seus duelos concluídos aparecem aqui.')}
    ${grupos.expirado.length ? secao('Expirados', grupos.expirado.slice(0, 5), '') : ''}
  `;
}

function renderRegras() {
  return `
    <div class="liga-regras">
      <div class="liga-regra">${ico('espadas')}<div><strong>Desafie alguém do seu grupo</strong>Escolha um colega na classificação e responda a bateria na hora: ${R.PERGUNTAS} perguntas, ${R.TEMPO_MS / 1000} segundos cada.</div></div>
      <div class="liga-regra">${ico('escudo')}<div><strong>Placar selado</strong>Ninguém vê o resultado — nem você — até os dois terminarem. O colega tem ${R.PRAZO_HORAS}h para responder as mesmas perguntas.</div></div>
      <div class="liga-regra">${ico('raio')}<div><strong>Acerto + rapidez</strong>Cada acerto vale ${R.PTS_ACERTO} pontos + até ${R.BONUS_VELOCIDADE} de bônus pela velocidade. A última pergunta vale o dobro.</div></div>
      <div class="liga-regra">${ico('trofeu')}<div><strong>Revelação e prêmio</strong>Vitória: +${R.PREMIO_VITORIA} pontos de liga. Derrota: −${R.PERDA_DERROTA}. Empate: +${R.PREMIO_EMPATE} para os dois. Duelar sempre compensa.</div></div>
      <div class="liga-regra">${ico('setaCima')}<div><strong>Sobe e desce</strong>A temporada vai de segunda a domingo. Os ${R.SOBEM} primeiros do grupo sobem de liga e os ${R.DESCEM} últimos descem. Bronze → Prata → Ouro → Diamante → Guardião dos Dados.</div></div>
      <div class="liga-regra">${ico('usuarios')}<div><strong>Convivência saudável</strong>Até ${R.LIMITE_ENVIADOS_DIA} desafios por dia e uma vez por temporada contra a mesma pessoa. Se o prazo expirar, o desafio é cancelado e ninguém perde nada.</div></div>
      <p class="liga-regras-nota">Os pontos de liga são separados do ranking por área: a liga mede a disputa individual; o ranking de área mede a instituição.</p>
    </div>`;
}

// ---------------------------------------------------------------------------
// BATERIA
// ---------------------------------------------------------------------------
function mostrarPreBateria(duelo) {
  vista = 'pre';
  const est = L.obterLiga();
  const bot = botPorId(est, duelo.adversarioId);
  const eu = jogador();
  root.innerHTML = `
    <div class="duelo-pre painel-arcade">
      <div class="duelo-pre-vs">
        <div class="duelo-pre-lado">${busto(eu.avatar, 72)}<span>${eu.nome}</span></div>
        <div class="duelo-pre-x">VS</div>
        <div class="duelo-pre-lado">${busto(bot.avatar, 72)}<span>${bot.nome}</span></div>
      </div>
      <h2 class="duelo-pre-titulo">${duelo.tipo === 'recebido' ? `${bot.nome.split(' ')[0]} te desafiou!` : 'Duelo de Governança'}</h2>
      <ul class="duelo-pre-regras">
        <li>${ico('lampada')} <span><strong>${R.PERGUNTAS} perguntas</strong> sobre dados, IA e segurança</span></li>
        <li>${ico('relogio')} <span><strong>${R.TEMPO_MS / 1000} segundos</strong> por pergunta</span></li>
        <li>${ico('raio')} <span>Acerto = <strong>${R.PTS_ACERTO}</strong> + até <strong>${R.BONUS_VELOCIDADE}</strong> pela rapidez</span></li>
        <li>${ico('coroa')} <span>A <strong>última pergunta vale o dobro</strong></span></li>
        <li>${ico('escudo')} <span>Você só verá se acertou na revelação</span></li>
      </ul>
      <div class="duelo-pre-acoes">
        <button type="button" class="btn btn-outline" id="duelo-cancelar">${ico('voltar')} Depois</button>
        <button type="button" class="btn btn-primary" id="duelo-comecar">${ico('raio')} Começar bateria</button>
      </div>
      <p class="duelo-pre-nota">Ao começar, a bateria precisa ir até o fim. Sair no meio conta as perguntas restantes como tempo esgotado.</p>
    </div>`;
  root.querySelector('#duelo-cancelar').onclick = () => mostrarPainel();
  root.querySelector('#duelo-comecar').onclick = () => contagemRegressiva(duelo);
}

function contagemRegressiva(duelo) {
  vista = 'bateria';
  bateria = { duelo, idx: 0, respostas: [], inicio: 0, raf: null, bloqueada: true };
  let n = 3;
  const passo = () => {
    if (!bateria) return;
    if (n === 0) { mostrarPergunta(); return; }
    root.innerHTML = `<div class="duelo-contagem"><span key="${n}">${n}</span></div>`;
    try { Audio.tocarPasso(); } catch (_) {}
    n--;
    setTimeout(passo, 650);
  };
  passo();
}

function mostrarPergunta() {
  if (!bateria) return;
  const { duelo, idx } = bateria;
  const carta = L.perguntaPorId(duelo.perguntas[idx]);
  const opcoes = L.opcoesEmbaralhadas(duelo, carta);
  const final = idx === R.PERGUNTAS - 1;
  const tema = MACRO_TEMAS[macroTema(carta.tema)];

  root.innerHTML = `
    <div class="duelo-bateria ${final ? 'pergunta-final' : ''}">
      <div class="duelo-progresso">
        ${duelo.perguntas.map((_, i) => `<span class="duelo-ponto ${i < idx ? 'feito' : ''} ${i === idx ? 'atual' : ''} ${i === R.PERGUNTAS - 1 ? 'final' : ''}">${i === R.PERGUNTAS - 1 ? ico('coroa') : i + 1}</span>`).join('')}
      </div>
      <div class="duelo-timer"><div class="duelo-timer-barra" id="duelo-timer-barra"></div><span class="duelo-timer-num" id="duelo-timer-num">${R.TEMPO_MS / 1000}</span></div>
      <div class="duelo-pergunta painel-arcade">
        <div class="duelo-pergunta-meta">
          <span class="duelo-pergunta-num">Pergunta ${idx + 1} de ${R.PERGUNTAS}</span>
          ${final ? `<span class="duelo-final-tag">${ico('coroa')} Pergunta final · vale o dobro</span>` : ''}
          <span class="duelo-tema" style="--cor-tema: ${tema.cor};">${tema.nome}</span>
        </div>
        <p class="duelo-pergunta-texto">${carta.texto}</p>
        <div class="duelo-opcoes">
          ${opcoes.map((op, i) => `
            <button type="button" class="duelo-opcao" data-i="${i}">
              <span class="duelo-opcao-tecla">${i + 1}</span>
              <span>${op.texto}</span>
            </button>`).join('')}
        </div>
      </div>
    </div>`;

  bateria.opcoes = opcoes;
  bateria.bloqueada = false;
  root.querySelectorAll('.duelo-opcao').forEach(b => {
    b.onclick = () => responder(Number(b.dataset.i));
  });

  const barra = root.querySelector('#duelo-timer-barra');
  const num = root.querySelector('#duelo-timer-num');
  bateria.inicio = performance.now();
  const tick = (t) => {
    if (!bateria || bateria.bloqueada) return;
    const dec = t - bateria.inicio;
    const resta = Math.max(0, R.TEMPO_MS - dec);
    barra.style.transform = `scaleX(${resta / R.TEMPO_MS})`;
    barra.classList.toggle('urgente', resta < 5000);
    num.textContent = Math.ceil(resta / 1000);
    if (resta <= 0) { responder(null); return; }
    bateria.raf = requestAnimationFrame(tick);
  };
  bateria.raf = requestAnimationFrame(tick);
}

function responder(iEmbaralhado) {
  if (!bateria || bateria.bloqueada) return;
  bateria.bloqueada = true;
  pararBateria();
  const tempoMs = Math.min(R.TEMPO_MS, performance.now() - bateria.inicio);
  const op = iEmbaralhado == null ? null : bateria.opcoes[iEmbaralhado];
  bateria.respostas.push({
    correta: !!(op && op.correta),
    tempoMs: op ? tempoMs : R.TEMPO_MS,
    opcaoIdx: op ? op.indexOriginal : null
  });

  if (op) {
    const btn = root.querySelector(`.duelo-opcao[data-i="${iEmbaralhado}"]`);
    if (btn) btn.classList.add('registrada');
    root.querySelectorAll('.duelo-opcao').forEach(b => { if (b !== btn) b.classList.add('apagada'); });
    try { Audio.tocarPasso(); } catch (_) {}
  } else {
    const p = root.querySelector('.duelo-pergunta');
    if (p) { p.classList.add('tempo-esgotado'); tremer(p); }
  }

  setTimeout(() => {
    if (!bateria) return;
    bateria.idx++;
    if (bateria.idx < R.PERGUNTAS) {
      mostrarPergunta();
    } else {
      finalizarBateria();
    }
  }, op ? 420 : 750);
}

function finalizarBateria() {
  const { duelo, respostas } = bateria;
  bateria = null;
  const atualizado = L.registrarBateria(duelo.id, respostas);
  if (atualizado.tipo === 'recebido') {
    mostrarRevelacao(atualizado.id);
  } else {
    mostrarEnviado(atualizado);
  }
}

function mostrarEnviado(duelo) {
  vista = 'enviado';
  const est = L.obterLiga();
  const bot = botPorId(est, duelo.adversarioId);
  const segundos = Math.round((duelo.adv.concluidoEm - Date.now()) / 1000);
  root.innerHTML = `
    <div class="duelo-enviado painel-arcade">
      <div class="duelo-selo">${ico('escudo')}</div>
      <h2>Bateria enviada!</h2>
      <p>Seu placar está <strong>selado</strong>. ${bot.nome} tem ${R.PRAZO_HORAS}h para responder as mesmas perguntas. Quando terminar, a revelação fica disponível na aba <strong>Desafios</strong>.</p>
      <p class="duelo-pre-nota">No protótipo, o colega simulado responde em cerca de ${Math.max(10, segundos)} segundos.</p>
      <div class="duelo-pre-acoes">
        <button type="button" class="btn btn-primary" id="duelo-voltar-liga">${ico('caixa')} Ir para Desafios</button>
      </div>
    </div>`;
  confete({ quantidade: 40, cores: ['#00B4D8', '#FFFFFF', '#B98CFF'] });
  root.querySelector('#duelo-voltar-liga').onclick = () => { aba = 'desafios'; mostrarPainel(); };
}

// ---------------------------------------------------------------------------
// REVELAÇÃO
// ---------------------------------------------------------------------------
function celula(r, final) {
  if (!r) return '<div class="rev-celula"></div>';
  const esgotado = r.opcaoIdx == null;
  return `
    <div class="rev-celula ${r.correta ? 'ok' : 'erro'} ${final ? 'final' : ''}">
      <span class="rev-icone">${r.correta ? ico('check') : ico('x')}</span>
      <span class="rev-pts">${r.correta ? `+${r.pontos}` : '0'}</span>
      <span class="rev-tempo">${esgotado ? 'tempo!' : `${(r.tempoMs / 1000).toFixed(1)}s`}</span>
    </div>`;
}

function mostrarRevelacao(dueloId, instantaneo = false) {
  vista = 'revelacao';
  limparRevelacao();
  const duelo = L.revelarDuelo(dueloId);
  if (!duelo.revelado) { mostrarPainel(); return; }
  const est = L.obterLiga();
  const bot = botPorId(est, duelo.adversarioId);
  const eu = jogador();
  const posicao = L.classificacao(est, eu).find(l => l.eu).posicao;

  const linhas = duelo.perguntas.map((id, i) => {
    const carta = L.perguntaPorId(id);
    const final = i === R.PERGUNTAS - 1;
    const texto = carta ? carta.texto : '';
    return `
      <div class="rev-linha ${final ? 'final' : ''} ${instantaneo ? 'visivel' : ''}" data-i="${i}">
        ${celula(duelo.eu.respostas[i], final)}
        <div class="rev-q"><span class="rev-q-num">${final ? `${ico('coroa')} ×2` : `P${i + 1}`}</span><span class="rev-q-texto">${texto.length > 90 ? texto.slice(0, 88) + '…' : texto}</span></div>
        ${celula(duelo.adv.respostas[i], final)}
      </div>`;
  }).join('');

  const titulos = { vitoria: 'Vitória!', derrota: 'Derrota', empate: 'Empate!' };
  const subtitulos = {
    vitoria: `Você venceu ${bot.nome.split(' ')[0]}.`,
    derrota: `${bot.nome.split(' ')[0]} levou essa. Revanche?`,
    empate: 'Placar idêntico. Os dois pontuam.'
  };

  root.innerHTML = `
    <div class="revelacao">
      <div class="rev-placar painel-arcade">
        <div class="rev-lado" id="rev-lado-eu">${busto(eu.avatar, 64)}<span class="rev-nome">${eu.nome}</span><span class="rev-total" id="rev-total-eu">${instantaneo ? duelo.eu.total : 0}</span></div>
        <div class="rev-vs">VS</div>
        <div class="rev-lado" id="rev-lado-adv">${busto(bot.avatar, 64)}<span class="rev-nome">${bot.nome}</span><span class="rev-total" id="rev-total-adv">${instantaneo ? duelo.adv.total : 0}</span></div>
      </div>
      <div class="rev-linhas">${linhas}</div>
      <div class="rev-final rev-${duelo.resultado} ${instantaneo ? 'visivel' : ''}" id="rev-final">
        <div class="rev-final-titulo">${titulos[duelo.resultado]}</div>
        <div class="rev-final-sub">${subtitulos[duelo.resultado]}</div>
        <div class="rev-final-delta">${duelo.delta > 0 ? '+' : ''}${duelo.delta} pontos de liga · você está em <strong>${posicao}º</strong></div>
      </div>
      <div class="rev-acoes ${instantaneo ? 'visivel' : ''}" id="rev-acoes">
        <button type="button" class="btn btn-outline" id="rev-explicacoes">${ico('livro')} Ver explicações</button>
        <button type="button" class="btn btn-secondary" id="rev-revanche">${ico('repetir')} Revanche</button>
        <button type="button" class="btn btn-primary" id="rev-voltar">${ico('voltar')} Voltar à liga</button>
      </div>
      <div class="rev-explicacoes" id="rev-lista-explicacoes" hidden>${renderExplicacoes(duelo)}</div>
      ${instantaneo ? '' : `<button type="button" class="rev-pular" id="rev-pular">Pular animação ${ico('seta')}</button>`}
    </div>`;

  root.querySelector('#rev-voltar').onclick = () => { aba = 'desafios'; mostrarPainel(); };
  root.querySelector('#rev-explicacoes').onclick = () => {
    const el = root.querySelector('#rev-lista-explicacoes');
    el.hidden = !el.hidden;
    if (!el.hidden) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const btnRev = root.querySelector('#rev-revanche');
  const pode = L.podeDesafiar(L.obterLiga(), duelo.adversarioId);
  if (!pode.ok) { btnRev.disabled = true; btnRev.title = pode.motivo; }
  btnRev.onclick = () => {
    try { mostrarPreBateria(L.lancarDesafio(duelo.adversarioId)); } catch (e) { toast(`${ico('alerta')} ${e.message}`); }
  };

  if (instantaneo) return;

  // Animação pergunta a pergunta
  let totalEu = 0;
  let totalAdv = 0;
  const elEu = root.querySelector('#rev-total-eu');
  const elAdv = root.querySelector('#rev-total-adv');
  const ladoEu = root.querySelector('#rev-lado-eu');
  const ladoAdv = root.querySelector('#rev-lado-adv');

  const animarNumero = (el, de, para) => {
    const t0 = performance.now();
    const dur = 450;
    const f = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(de + (para - de) * k);
      if (k < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  };

  const finalizar = () => {
    limparRevelacao();
    root.querySelectorAll('.rev-linha').forEach(l => l.classList.add('visivel'));
    elEu.textContent = duelo.eu.total;
    elAdv.textContent = duelo.adv.total;
    ladoEu.classList.toggle('liderando', duelo.eu.total > duelo.adv.total);
    ladoAdv.classList.toggle('liderando', duelo.adv.total > duelo.eu.total);
    root.querySelector('#rev-final').classList.add('visivel');
    root.querySelector('#rev-acoes').classList.add('visivel');
    const pular = root.querySelector('#rev-pular');
    if (pular) pular.remove();
    if (duelo.resultado === 'vitoria') {
      confete({ quantidade: 160 });
      try { Audio.tocarCheckpoint(); } catch (_) {}
    } else if (duelo.resultado === 'derrota') {
      flash('perigo');
      tremer(root.querySelector('.rev-placar'));
      try { Audio.tocarErro(); } catch (_) {}
    } else {
      flash('sucesso');
    }
  };

  root.querySelector('#rev-pular').onclick = finalizar;

  let atraso = 600;
  duelo.perguntas.forEach((_, i) => {
    const final = i === R.PERGUNTAS - 1;
    if (final) atraso += 700; // suspense antes da pergunta final
    revelacaoTimers.push(setTimeout(() => {
      const linha = root.querySelector(`.rev-linha[data-i="${i}"]`);
      if (!linha) return;
      linha.classList.add('visivel');
      const a = duelo.eu.respostas[i].pontos;
      const b = duelo.adv.respostas[i].pontos;
      animarNumero(elEu, totalEu, totalEu + a);
      animarNumero(elAdv, totalAdv, totalAdv + b);
      totalEu += a;
      totalAdv += b;
      ladoEu.classList.toggle('liderando', totalEu > totalAdv);
      ladoAdv.classList.toggle('liderando', totalAdv > totalEu);
      try { (a > 0 ? Audio.tocarAcerto : Audio.tocarPasso).call(Audio); } catch (_) {}
    }, atraso));
    atraso += final ? 1300 : 850;
  });
  revelacaoTimers.push(setTimeout(finalizar, atraso + 200));
}

function renderExplicacoes(duelo) {
  return duelo.perguntas.map((id, i) => {
    const carta = L.perguntaPorId(id);
    if (!carta) return '';
    const certa = carta.opcoes.find(o => o.correta);
    const minha = duelo.eu.respostas[i];
    const escolhida = minha.opcaoIdx != null ? carta.opcoes[minha.opcaoIdx] : null;
    return `
      <div class="rev-explicacao ${minha.correta ? 'ok' : 'erro'}">
        <div class="rev-explicacao-q"><strong>P${i + 1}.</strong> ${carta.texto}</div>
        <div class="rev-explicacao-certa">${ico('check')} ${certa ? certa.texto : ''}</div>
        ${!minha.correta ? `<div class="rev-explicacao-minha">${ico('x')} Sua resposta: ${escolhida ? escolhida.texto : 'tempo esgotado'}</div>` : ''}
        <div class="rev-explicacao-fb">${(!minha.correta && escolhida?.feedback) ? escolhida.feedback : (certa?.feedback || '')}</div>
      </div>`;
  }).join('');
}
