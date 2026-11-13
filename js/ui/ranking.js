// js/ui/ranking.js - Tela de Ranking Semanal de Áreas e Individual (Etapa 8)
import { state } from '../state.js';
import { Api } from '../api.js';
import { semanaAtual, semanaAnterior } from '../deck.js';
import { renderAvatarSVG, AVATAR_PADRAO } from '../avatar.js';

let containerRef = null;
let navigateRef = null;

// Estado local da tela de ranking
let rankingState = {
  abaAtiva: 'areas', // 'areas' | 'minha_area'
  semanaSelecionada: semanaAtual(),
  status: 'carregando', // 'carregando' | 'sucesso' | 'vazio' | 'erro'
  dados: [],
  erroMsg: ''
};

function formatarSemana(semanaIso) {
  const semAtual = semanaAtual();
  const match = semanaIso.match(/^(\d{4})-W(\d{2})$/);
  const label = match ? `Semana ${parseInt(match[2], 10)} (${match[1]})` : semanaIso;
  return semanaIso === semAtual ? `${label} • Atual` : `${label} • Anterior`;
}

export function render(currentState) {
  const semAtual = semanaAtual();
  const semAnterior = semanaAnterior();
  const semSelecionada = rankingState.semanaSelecionada;
  const aba = rankingState.abaAtiva;

  return `
    <div class="tela-ranking fade-in">
      
      <!-- CABEÇALHO DO RANKING -->
      <section class="painel" style="padding: 14px 16px; margin-bottom: 2px;">
        <div class="ranking-top-bar">
          <div>
            <h2 class="titulo-secao" style="margin-bottom: 2px; font-size: 1.6rem; display: flex; align-items: center; gap: 8px;">
              <span>🏅</span> Ranking Oficial
            </h2>
            <p style="color: var(--text-muted); font-size: 0.92rem;">
              Governança de IA • SEST SENAT
            </p>
          </div>

          <!-- SELETOR DE SEMANA -->
          <div>
            <select id="select-semana-ranking" class="ranking-seletor-semana" aria-label="Selecione a semana">
              <option value="${semAtual}" ${semSelecionada === semAtual ? 'selected' : ''}>
                ${formatarSemana(semAtual)}
              </option>
              <option value="${semAnterior}" ${semSelecionada === semAnterior ? 'selected' : ''}>
                ${formatarSemana(semAnterior)}
              </option>
            </select>
          </div>
        </div>

        <!-- ABAS DE NAVEGAÇÃO -->
        <nav class="ranking-tabs-nav" role="tablist" style="margin-top: 10px;">
          <button id="tab-ranking-areas" class="ranking-tab-btn ${aba === 'areas' ? 'active' : ''}" role="tab" aria-selected="${aba === 'areas'}">
            <span>🏢</span> Classificação de Áreas
          </button>
          <button id="tab-ranking-minha-area" class="ranking-tab-btn ${aba === 'minha_area' ? 'active' : ''}" role="tab" aria-selected="${aba === 'minha_area'}">
            <span>👤</span> ${currentState.modo_convidado ? 'Visão por Área' : 'Minha Área'}
          </button>
        </nav>

        ${currentState.modo_convidado ? `
          <div style="font-size: 0.85rem; color: #94A3B8; background: rgba(0, 180, 216, 0.1); border: 1px solid rgba(0, 180, 216, 0.25); padding: 8px 12px; border-radius: 6px; margin-top: 10px;">
            👀 <strong>Visualização de Convidado:</strong> você está acompanhando o ranking oficial em modo somente leitura.
          </div>
        ` : ''}
      </section>

      <!-- CONTEÚDO DO RANKING (ATUALIZADO DINAMICAMENTE) -->
      <section id="ranking-conteudo-dinamico">
        ${renderConteudoRanking(currentState)}
      </section>

      <!-- BOTÕES DE NAVEGAÇÃO -->
      <section style="display: flex; gap: 10px; margin-top: 4px;">
        <button id="btn-ranking-voltar" class="btn btn-secondary btn-block">
          ⬅ Voltar ao Início
        </button>
        <button id="btn-ranking-jogar" class="btn btn-primary btn-block">
          🎮 Jogar Partida
        </button>
      </section>

    </div>
  `;
}

function renderConteudoRanking(currentState) {
  const { status, dados, abaAtiva, erroMsg } = rankingState;

  // 1. ESTADO DE CARREGANDO
  if (status === 'carregando') {
    return `
      <div class="ranking-estado-box">
        <span class="spinner-circulo" style="width: 28px; height: 28px; border-width: 3px;"></span>
        <p class="ranking-estado-msg">Carregando classificação oficial da semana...</p>
      </div>
    `;
  }

  // 2. ESTADO DE ERRO
  if (status === 'erro') {
    return `
      <div class="ranking-estado-box erro">
        <span style="font-size: 2rem;">⚠️</span>
        <p class="ranking-estado-msg" style="color: var(--coral);">
          ${erroMsg || 'Falha ao sincronizar ranking com o servidor.'}
        </p>
        <button id="btn-ranking-tentar-novamente" class="btn btn-secondary" style="min-height: 38px; padding: 6px 16px;">
          🔄 Tentar Novamente
        </button>
      </div>
    `;
  }

  // 3. ESTADO VAZIO
  if (status === 'vazio' || !dados || dados.length === 0) {
    return `
      <div class="ranking-estado-box">
        <span style="font-size: 2.2rem;">🏆</span>
        <p class="ranking-estado-msg">
          Nenhuma partida oficial computada nesta semana ainda.<br>
          <strong>Seja o primeiro a pontuar pelo seu time!</strong>
        </p>
      </div>
    `;
  }

  // 4. ESTADO DE SUCESSO - ABA "ÁREAS"
  if (abaAtiva === 'areas') {
    return renderListaAreas(dados, currentState);
  }

  // 5. ESTADO DE SUCESSO - ABA "MINHA ÁREA"
  return renderListaMinhaArea(dados, currentState);
}

function renderListaAreas(listaAreas, currentState) {
  const ehConvidado = currentState.modo_convidado === true;
  const userAreaId = !ehConvidado && currentState.area_id ? Number(currentState.area_id) : null;
  const userAreaSigla = !ehConvidado && currentState.area ? currentState.area.split('-')[0].trim() : '';

  // Verifica se a área do usuário está no ranking consolidado
  const areaUsuarioNaLista = userAreaId 
    ? listaAreas.find(a => (a.area_id && a.area_id === userAreaId) || a.area_sigla === userAreaSigla)
    : null;

  let alertaQuorum = '';
  // Se o usuário possui área mas ela NÃO está na lista consolidada (HAVING count >= 3)
  if (!ehConvidado && userAreaId && !areaUsuarioNaLista) {
    alertaQuorum = `
      <div class="ranking-aviso-quorum" style="margin-bottom: 8px;">
        <span class="aviso-icone">⚠️</span>
        <div>
          Sua área (<strong>${userAreaSigla || 'Sua Diretoria'}</strong>) precisa de <strong>mais participantes</strong> para entrar no ranking consolidado!
          <span style="display: block; font-size: 0.85rem; opacity: 0.9; margin-top: 2px;">
            Regra oficial: no mínimo 3 colaboradores por área para compor a média semanal.
          </span>
        </div>
      </div>
    `;
  }

  const cardsHtml = listaAreas.map((item, idx) => {
    const pos = item.posicao || (idx + 1);
    const ehDestaque = userAreaId && (item.area_id === userAreaId || item.area_sigla === userAreaSigla);
    const mediaFormatada = Number(item.pontuacao_media || 0).toFixed(1);
    const totalJogadores = item.total_jogadores || 0;

    let classePos = 'posicao-outros';
    let iconePos = `${pos}º`;
    if (pos === 1) { classePos = 'posicao-1'; iconePos = '🥇'; }
    else if (pos === 2) { classePos = 'posicao-2'; iconePos = '🥈'; }
    else if (pos === 3) { classePos = 'posicao-3'; iconePos = '🥉'; }

    return `
      <div class="ranking-card ${ehDestaque ? 'destaque' : ''}">
        <div class="ranking-posicao-badge ${classePos}">
          ${iconePos}
        </div>
        
        <div class="ranking-info">
          <div class="ranking-nome-principal">
            <span>${item.area_sigla} • ${item.area_nome}</span>
            ${ehDestaque ? `<span class="badge-tag-sua-area">SUA ÁREA</span>` : ''}
          </div>
          <div class="ranking-nome-sub">
            👥 ${totalJogadores} colaborador${totalJogadores !== 1 ? 'es' : ''} participante${totalJogadores !== 1 ? 's' : ''}
          </div>
        </div>

        <div class="ranking-pontos-box">
          <div class="ranking-pontos-valor">${mediaFormatada}</div>
          <div class="ranking-pontos-label">pts médios</div>
        </div>
      </div>
    `;
  }).join('');

  return `
    ${alertaQuorum}
    <div class="ranking-lista">
      ${cardsHtml}
    </div>
  `;
}

function renderListaMinhaArea(listaColaboradores, currentState) {
  const ehConvidado = currentState.modo_convidado === true;
  const userNome = (!ehConvidado && currentState.jogador ? currentState.jogador : '').trim().toLowerCase();
  const userAreaStr = currentState.area || 'Sua Área';
  const totalParticipantes = listaColaboradores.length;

  // Aviso de quórum na própria área se houver menos de 3 jogadores
  let alertaQuorum = '';
  if (!ehConvidado && totalParticipantes < 3) {
    const faltam = 3 - totalParticipantes;
    alertaQuorum = `
      <div class="ranking-aviso-quorum" style="margin-bottom: 8px;">
        <span class="aviso-icone">📢</span>
        <div>
          Sua área possui <strong>${totalParticipantes} participante${totalParticipantes !== 1 ? 's' : ''}</strong>.
          <strong>Faltam ${faltam} colaborador${faltam !== 1 ? 'es' : ''}</strong> para que sua área pontue no ranking geral de áreas!
        </div>
      </div>
    `;
  }

  // PÓDIO DOS 3 PRIMEIROS COLOCADOS DA ÁREA COM MINIATURAS CHIBI
  const top1 = listaColaboradores[0];
  const top2 = listaColaboradores[1];
  const top3 = listaColaboradores[2];

  let podioHtml = '';
  if (top1) {
    podioHtml = `
      <div class="ranking-podio-container">
        <!-- 2º LUGAR (ESQUERDA) -->
        ${top2 ? `
          <div class="podio-coluna lugar-2">
            <div class="podio-miniatura-box">
              ${renderAvatarSVG(top2.avatar || AVATAR_PADRAO, { modo: 'completo', tamanho: 85 })}
            </div>
            <div class="podio-bloco">
              <span class="podio-numero">2</span>
              <span class="podio-jogador-nome" title="${top2.jogador_nome}">${top2.jogador_nome}</span>
              <span class="podio-pontos">${top2.pontos} pts</span>
            </div>
          </div>
        ` : `<div class="podio-coluna" style="opacity: 0.25;"></div>`}

        <!-- 1º LUGAR (CENTRO - MAIS ALTO) -->
        <div class="podio-coluna lugar-1">
          <div class="podio-miniatura-box" style="transform: scale(1.08); margin-bottom: -4px;">
            ${renderAvatarSVG(top1.avatar || AVATAR_PADRAO, { modo: 'completo', reacao: 'comemorando', tamanho: 95 })}
          </div>
          <div class="podio-bloco">
            <span class="podio-numero">1</span>
            <span class="podio-jogador-nome" title="${top1.jogador_nome}">${top1.jogador_nome}</span>
            <span class="podio-pontos">${top1.pontos} pts</span>
          </div>
        </div>

        <!-- 3º LUGAR (DIREITA) -->
        ${top3 ? `
          <div class="podio-coluna lugar-3">
            <div class="podio-miniatura-box">
              ${renderAvatarSVG(top3.avatar || AVATAR_PADRAO, { modo: 'completo', tamanho: 75 })}
            </div>
            <div class="podio-bloco">
              <span class="podio-numero">3</span>
              <span class="podio-jogador-nome" title="${top3.jogador_nome}">${top3.jogador_nome}</span>
              <span class="podio-pontos">${top3.pontos} pts</span>
            </div>
          </div>
        ` : `<div class="podio-coluna" style="opacity: 0.25;"></div>`}
      </div>
    `;
  }

  const cardsHtml = listaColaboradores.map((item, idx) => {
    const pos = item.posicao_area || (idx + 1);
    const ehUsuarioAtual = userNome && item.jogador_nome && item.jogador_nome.trim().toLowerCase() === userNome;
    const avatarBusto = renderAvatarSVG(item.avatar || AVATAR_PADRAO, { modo: 'busto', tamanho: 42 });

    let classePos = 'posicao-outros';
    let iconePos = `${pos}º`;
    if (pos === 1) { classePos = 'posicao-1'; iconePos = '🥇'; }
    else if (pos === 2) { classePos = 'posicao-2'; iconePos = '🥈'; }
    else if (pos === 3) { classePos = 'posicao-3'; iconePos = '🥉'; }

    return `
      <div class="ranking-card ${ehUsuarioAtual ? 'destaque' : ''}">
        <div class="ranking-posicao-badge ${classePos}">
          ${iconePos}
        </div>

        <div class="avatar-busto-moldura ranking-item" style="width: 42px; height: 42px; flex-shrink: 0; margin: 0 4px;" title="${item.jogador_nome}">
          ${avatarBusto}
        </div>

        <div class="ranking-info">
          <div class="ranking-nome-principal">
            <span>${item.jogador_nome}</span>
            ${ehUsuarioAtual ? `<span class="badge-tag-voce">VOCÊ</span>` : ''}
          </div>
          <div class="ranking-nome-sub">
            🎯 ${item.acertos ?? 0} acerto${(item.acertos ?? 0) !== 1 ? 's' : ''} em desafios
          </div>
        </div>

        <div class="ranking-pontos-box">
          <div class="ranking-pontos-valor">${item.pontos}</div>
          <div class="ranking-pontos-label">pontos</div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="font-size: 0.92rem; color: var(--cyan); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; padding-left: 2px;">
      📍 Disputa Interna: ${userAreaStr}
    </div>
    ${alertaQuorum}
    ${podioHtml}
    <div class="ranking-lista">
      ${cardsHtml}
    </div>
  `;
}

export async function montar(container, currentState, navigate) {
  containerRef = container;
  navigateRef = navigate;

  // 1. Configura troca de abas
  const tabAreas = container.querySelector('#tab-ranking-areas');
  const tabMinhaArea = container.querySelector('#tab-ranking-minha-area');

  if (tabAreas) {
    tabAreas.onclick = () => {
      if (rankingState.abaAtiva === 'areas') return;
      rankingState.abaAtiva = 'areas';
      atualizarAbas();
      carregarDadosERenderizar(currentState);
    };
  }

  if (tabMinhaArea) {
    tabMinhaArea.onclick = () => {
      if (rankingState.abaAtiva === 'minha_area') return;
      rankingState.abaAtiva = 'minha_area';
      atualizarAbas();
      carregarDadosERenderizar(currentState);
    };
  }

  // 2. Seletor de semana
  const selectSemana = container.querySelector('#select-semana-ranking');
  if (selectSemana) {
    selectSemana.onchange = (e) => {
      rankingState.semanaSelecionada = e.target.value;
      carregarDadosERenderizar(currentState);
    };
  }

  // 3. Botões de Ação
  const btnVoltar = container.querySelector('#btn-ranking-voltar');
  if (btnVoltar) {
    btnVoltar.onclick = () => navigate('inicio');
  }

  const btnJogar = container.querySelector('#btn-ranking-jogar');
  if (btnJogar) {
    btnJogar.onclick = () => navigate('inicio');
  }

  // Carregamento inicial de dados
  await carregarDadosERenderizar(currentState);
}

function atualizarAbas() {
  if (!containerRef) return;
  const tabAreas = containerRef.querySelector('#tab-ranking-areas');
  const tabMinhaArea = containerRef.querySelector('#tab-ranking-minha-area');
  
  if (tabAreas) {
    const ativa = rankingState.abaAtiva === 'areas';
    tabAreas.className = `ranking-tab-btn ${ativa ? 'active' : ''}`;
    tabAreas.setAttribute('aria-selected', ativa);
  }
  if (tabMinhaArea) {
    const ativa = rankingState.abaAtiva === 'minha_area';
    tabMinhaArea.className = `ranking-tab-btn ${ativa ? 'active' : ''}`;
    tabMinhaArea.setAttribute('aria-selected', ativa);
  }
}

async function carregarDadosERenderizar(currentState) {
  if (!containerRef) return;
  const areaConteudo = containerRef.querySelector('#ranking-conteudo-dinamico');
  if (!areaConteudo) return;

  rankingState.status = 'carregando';
  areaConteudo.innerHTML = renderConteudoRanking(currentState);

  try {
    const sem = rankingState.semanaSelecionada;
    let resultado = [];

    if (rankingState.abaAtiva === 'areas') {
      resultado = await Api.obterRankingAreas(sem);
    } else {
      const areaId = currentState.area_id || 1;
      resultado = await Api.obterRankingArea(sem, areaId);
    }

    rankingState.dados = Array.isArray(resultado) ? resultado : [];
    rankingState.status = rankingState.dados.length > 0 ? 'sucesso' : 'vazio';
    rankingState.erroMsg = '';
  } catch (err) {
    console.warn('[RANKING] Erro ao carregar dados:', err);
    rankingState.status = 'erro';
    rankingState.erroMsg = 'Não foi possível carregar a classificação. Verifique sua conexão.';
    rankingState.dados = [];
  }

  // Renderiza conteúdo atualizado com transição suave GSAP
  areaConteudo.innerHTML = renderConteudoRanking(currentState);

  if (window.gsap) {
    gsap.fromTo(areaConteudo.children, 
      { opacity: 0, y: 6 }, 
      { opacity: 1, y: 0, duration: 0.25, stagger: 0.04, ease: 'power1.out' }
    );
  }

  // Reanexa evento do botão tentar novamente se estiver no estado de erro
  const btnRetry = areaConteudo.querySelector('#btn-ranking-tentar-novamente');
  if (btnRetry) {
    btnRetry.onclick = () => carregarDadosERenderizar(currentState);
  }
}

export function desmontar() {
  containerRef = null;
  navigateRef = null;
}
