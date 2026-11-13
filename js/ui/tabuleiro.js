// js/ui/tabuleiro.js - Visual 2.5D: Party Game Retro Arcade + Cidade dos Dados
// Tabuleiro em Grafo (61 nós) • 2 Bifurcações Pedagógicas • Hub Central • Câmera que Segue o Peão
import { state } from '../state.js';
import { CONSTANTES, limitarPosicao } from '../regras.js';
import { abrirModalCarta } from './carta.js';
import { Audio } from '../audio.js';
import { GRAFO_PADRAO } from '../deck.js';

let containerRef = null;
let navigateRef = null;
let emAnimacao = false;

// Rotações acumuladas para o giro físico do dado 3D
let acumuladoRotX = 0;
let acumuladoRotY = 0;

// ÍCONES SVG ORIGINAIS CONTORNADOS COM BORDA NAVY (SEM EMOJIS NA UI)
export const ICONES_SVG = {
  inicio: `<svg viewBox="0 0 24 24" fill="none" stroke="#00B4D8" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
  checkpoint: `<svg viewBox="0 0 24 24" fill="#FFC93C" stroke="#05101F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polygon points="12 8 13.5 11.5 17 12 14.5 14.5 15 18 12 16 9 18 9.5 14.5 7 12 10.5 11.5 12 8" fill="#05101F"/></svg>`,
  pense_antes: `<svg viewBox="0 0 24 24" fill="#FFC93C" stroke="#05101F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6m-4 3h2"/><path d="M12 2a7 7 0 0 0-4.5 12.4c.9.8 1.5 2 1.5 3.1h6c0-1.1.6-2.3 1.5-3.1A7 7 0 0 0 12 2z"/><line x1="12" y1="6" x2="12" y2="10" stroke="#05101F" stroke-width="2"/></svg>`,
  boa_pratica: `<svg viewBox="0 0 24 24" fill="#3CCB7F" stroke="#05101F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4" stroke="#05101F" stroke-width="2.5" fill="none"/></svg>`,
  armadilha: `<svg viewBox="0 0 24 24" fill="#E8484F" stroke="#05101F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  desafio: `<svg viewBox="0 0 24 24" fill="#FF7A3D" stroke="#05101F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="#05101F" stroke-width="2.5" fill="none"/><circle cx="12" cy="17" r="1.2" fill="#05101F"/></svg>`,
  conexao: `<svg viewBox="0 0 24 24" fill="none" stroke="#4361EE" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  evento: `<svg viewBox="0 0 24 24" fill="#7209B7" stroke="#05101F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v3a1 1 0 0 0 1 1h2l5 4V5L6 9H4a1 1 0 0 0-1 1z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke="#05101F" stroke-width="2.5" fill="none"/></svg>`,
  bifurcacao: `<svg viewBox="0 0 24 24" fill="none" stroke="#FFC93C" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>`,
  hub: `<svg viewBox="0 0 24 24" fill="#FFC93C" stroke="#05101F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="12 2 15 8 22 9 17 14 18 21 12 17 6 21 7 14 2 9 9 8 12 2" fill="#05101F"/></svg>`
};

const NOMES_CHECKPOINTS = {
  20: "🚩 Checkpoint 1: Dado Protegido",
  40: "🚩 Checkpoint 2: IA Bem Usada",
  60: "🏛️ Checkpoint 3: Portal Final"
};

const NOMES_CATEGORIAS = {
  inicio: "Partida",
  checkpoint: "Checkpoint",
  boa_pratica: "Boa Prática",
  pense_antes: "Pense Antes",
  desafio: "Desafio",
  armadilha: "Armadilha",
  conexao: "Conexão",
  evento: "Evento",
  bifurcacao: "Bifurcação",
  hub: "Central de Dados"
};

// Mapeamento de rotação exata para cada face do cubo 3D
const ROTACAO_FACES_DADO = {
  1: { rx: 0, ry: 0 },
  2: { rx: 0, ry: -90 },
  3: { rx: 0, ry: -180 },
  4: { rx: 0, ry: 90 },
  5: { rx: -90, ry: 0 },
  6: { rx: 90, ry: 0 }
};

function renderFichaTokenHex() {
  return `
    <span class="ficha-hex-token" title="Ficha de Token">
      <svg viewBox="0 0 32 36" fill="none" class="ficha-hex-svg" style="width: 26px; height: 30px;">
        <polygon points="16,2 30,10 30,26 16,34 2,26 2,10" fill="#FFC93C" stroke="#05101F" stroke-width="2.5"/>
        <polygon points="16,5 27,11 27,25 16,31 5,25 5,11" fill="#FFE082" stroke="#D4A325" stroke-width="1"/>
        <text x="16" y="22" font-family="'Silkscreen', monospace" font-size="10" font-weight="700" fill="#05101F" text-anchor="middle">01</text>
      </svg>
    </span>
  `;
}

// Gera o traçado contínuo em SVG das conexões do grafo
function gerarTrilhosSVG(casas) {
  let paths = '';
  let chevrons = '';

  for (const c of casas) {
    if (!c.proximos || c.proximos.length === 0) continue;
    for (const proxId of c.proximos) {
      const p = casas.find(n => n.id === proxId);
      if (!p) continue;

      let d = '';
      if (c.x === p.x || c.y === p.y) {
        d = `M ${c.x} ${c.y} L ${p.x} ${p.y}`;
      } else {
        // Curva em 90 graus
        if (Math.abs(c.x - p.x) > Math.abs(c.y - p.y)) {
          d = `M ${c.x} ${c.y} L ${p.x} ${c.y} L ${p.x} ${p.y}`;
        } else {
          d = `M ${c.x} ${c.y} L ${c.x} ${p.y} L ${p.x} ${p.y}`;
        }
      }

      // Trilho base 3D + faixa escura + superfície ciano
      paths += `
        <path d="${d}" stroke="#05101F" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${d}" stroke="#00B4D8" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${d}" stroke="#0A1C30" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      `;

      // Setas direcionais no meio do percurso
      const mx = (c.x + p.x) / 2;
      const my = (c.y + p.y) / 2;
      const ang = Math.atan2(p.y - c.y, p.x - c.x) * 180 / Math.PI;

      chevrons += `
        <g transform="translate(${mx}, ${my}) rotate(${ang})">
          <polygon points="-7,-7 5,0 -7,7" fill="#FFFFFF" opacity="0.9" filter="drop-shadow(0 2px 2px rgba(0,0,0,0.8))"/>
        </g>
      `;
    }
  }

  return paths + chevrons;
}

export function render(currentState) {
  const grafo = currentState.grafoTabuleiro || GRAFO_PADRAO;
  const casas = grafo.casas || [];
  const posAtual = currentState.posicao || 0;
  const faceInicial = currentState.dado_ultimo || 1;
  const rotInicial = ROTACAO_FACES_DADO[faceInicial] || { rx: 0, ry: 0 };
  const tokensNum = currentState.tokens || 20;

  // Estado dos 3 checkpoints para a barra lateral (Casas 20, 40 e 60)
  const cp1 = posAtual >= 20;
  const cp2 = posAtual >= 40;
  const cp3 = posAtual >= 60;

  const svgTrilhos = gerarTrilhosSVG(casas);

  return `
    <div class="tela-tabuleiro fade-in">
      
      <!-- =========================================================================
           COLUNA ESQUERDA (DESKTOP) / HUD COMPACTO (MOBILE)
           ========================================================================= -->
      <aside class="painel-lateral-esquerdo painel-arcade">
        <span class="parafuso-canto top-left"></span>
        <span class="parafuso-canto top-right"></span>
        <span class="parafuso-canto bottom-left"></span>
        <span class="parafuso-canto bottom-right"></span>

        <!-- Identificação do Jogador & Selo -->
        <div class="hud-jogador-bloco">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.25rem;">👤</span>
              <div>
                <div class="hud-nome" style="font-weight: 800; font-size: 1.15rem; color: var(--text-white);">${currentState.jogador || 'Colaborador'}</div>
                <div class="hud-area" style="font-size: 0.85rem; color: var(--text-muted);">${currentState.area || 'SEST SENAT'}</div>
              </div>
            </div>
            
            ${currentState.modo_convidado ? `
              <span class="badge badge-treino" style="font-size: 0.75rem;">CONVIDADO</span>
            ` : (currentState.partida_vale_ranking === false ? `
              <span class="badge badge-treino" style="font-size: 0.75rem;">TREINO</span>
            ` : `
              <span class="badge badge-oficial" style="font-size: 0.75rem;">OFICIAL</span>
            `)}
          </div>
        </div>

        <!-- Bloco de Tokens Grande em Fonte Pixel -->
        <div class="hud-tokens-destaque" id="hud-tokens-box">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${renderFichaTokenHex()}
            <div>
              <div class="token-rotulo">Saldo de Tokens</div>
              <div class="token-numero" id="hud-tokens-valor">${tokensNum}</div>
            </div>
          </div>
          <span class="flutuante-token" id="flutuante-tokens">+0</span>
        </div>

        <!-- Posição Atual do Peão no Grafo -->
        <div class="card item-desktop-only" style="padding: 10px 12px; text-align: center;">
          <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 800;">Posição na Trilha</div>
          <div style="font-family: var(--font-pixel); font-size: 1.35rem; color: var(--cyan); margin-top: 2px;">
            CASA ${posAtual} <span style="font-size: 0.85rem; color: var(--text-muted);">/ 60</span>
          </div>
        </div>

        <!-- Progresso dos 3 Checkpoints de Governança -->
        <div class="progresso-checkpoints-card item-desktop-only">
          <div style="font-family: var(--font-title); font-size: 0.85rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">
            🛡️ Checkpoints de Governança
          </div>
          
          <div class="checkpoint-prog-item ${cp1 ? 'conquistado' : (posAtual < 20 ? 'ativo-proximo' : '')}">
            <span class="cp-prog-icon">${cp1 ? '✓' : '1'}</span>
            <div style="line-height: 1.2;">
              <div style="font-weight: 800;">Casa 20: Dado Protegido (CP 1)</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">Etapa 1: Coleta e Classificação</div>
            </div>
          </div>

          <div class="checkpoint-prog-item ${cp2 ? 'conquistado' : (posAtual >= 20 && posAtual < 40 ? 'ativo-proximo' : '')}">
            <span class="cp-prog-icon">${cp2 ? '✓' : '2'}</span>
            <div style="line-height: 1.2;">
              <div style="font-weight: 800;">Casa 40: IA Bem Usada (CP 2)</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">Etapa 2: Supervisão Ética e Métricas</div>
            </div>
          </div>

          <div class="checkpoint-prog-item ${cp3 ? 'conquistado' : (posAtual >= 40 ? 'ativo-proximo' : '')}">
            <span class="cp-prog-icon">${cp3 ? '✓' : '3'}</span>
            <div style="line-height: 1.2;">
              <div style="font-weight: 800;">Casa 60: Guardião dos Dados (CP 3)</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">Etapa 3: Portal Final de Excelência</div>
            </div>
          </div>
        </div>

        <!-- Controles de Acessibilidade no Rodapé -->
        <div class="btn-rodape-esquerdo">
          <button id="btn-toggle-visao" class="btn btn-secondary btn-block" style="padding: 10px 12px; font-size: 0.95rem;" title="Alternar visão 2.5D / Plana">
            <span id="icone-visao-modo">📐</span>
            <span id="rotulo-visao-modo">Visão Plana</span>
          </button>
        </div>
      </aside>

      <!-- =========================================================================
           COLUNA CENTRAL: CENA DIORAMA 2.5D SOBRE MESA DE MADEIRA
           ========================================================================= -->
      <main class="painel-central-tabuleiro">
        ${currentState.pular_proxima_rodada ? `
          <div class="alerta-pular-box" id="aviso-pular-rodada">
            ⚠️ Você precisa pular esta rodada devido a um efeito de carta!
          </div>
        ` : ''}

        <section class="trilha-wrapper" id="trilha-wrapper">
          <!-- Botão Flutuante: "Ver Tabuleiro Todo (3s)" -->
          <button id="btn-visao-geral" class="btn-visao-geral-3s" title="Afastar câmera e visualizar tabuleiro completo">
            🔍 Ver Tabuleiro Todo (3s)
          </button>

          <div class="cena-tabuleiro-3d" id="cena-tabuleiro-3d">
            <div class="tabuleiro-camera" id="tabuleiro-camera">
              <div class="tabuleiro-3d" id="tabuleiro-3d">
                
                <!-- PLACA BASE DO DIORAMA EM MÓDULOS DE IMPRESSÃO 3D (1500x1050 px) -->
                <div class="diorama-placa" id="diorama-placa">

                  <!-- Trilhos Contínuos em SVG -->
                  <svg class="trilha-caminho-svg" viewBox="0 0 1500 1050" fill="none">
                    ${svgTrilhos}
                  </svg>

                  <!-- =====================================================
                       OBJETOS DE CENÁRIO ORIGINAIS (DIORAMA FÍSICO)
                       ===================================================== -->

                  <!-- 1. Mini Ônibus SEST SENAT -->
                  <div class="cenario-prop" style="left: 1160px; top: 600px; width: 68px; height: 46px;" title="Mini Ônibus SEST SENAT">
                    <div class="cenario-prop-sombra" style="width: 54px; height: 16px;"></div>
                    <svg viewBox="0 0 64 42" fill="none" style="width: 100%; height: 100%;">
                      <rect x="4" y="8" width="56" height="24" rx="5" fill="#00B4D8" stroke="#05101F" stroke-width="2.5"/>
                      <rect x="4" y="20" width="56" height="6" fill="#07203E"/>
                      <rect x="8" y="11" width="10" height="7" rx="1.5" fill="#E2F1FF"/>
                      <rect x="21" y="11" width="10" height="7" rx="1.5" fill="#E2F1FF"/>
                      <rect x="34" y="11" width="10" height="7" rx="1.5" fill="#E2F1FF"/>
                      <rect x="47" y="11" width="10" height="7" rx="1.5" fill="#E2F1FF"/>
                      <circle cx="16" cy="32" r="5" fill="#05101F" stroke="#CBD5E1" stroke-width="1.5"/>
                      <circle cx="48" cy="32" r="5" fill="#05101F" stroke="#CBD5E1" stroke-width="1.5"/>
                      <circle cx="16" cy="32" r="2" fill="#FFFFFF"/>
                      <circle cx="48" cy="32" r="2" fill="#FFFFFF"/>
                      <circle cx="58" cy="24" r="1.8" fill="#FFC93C"/>
                    </svg>
                  </div>

                  <!-- 2. Mini Caminhão SEST SENAT -->
                  <div class="cenario-prop" style="left: 200px; top: 440px; width: 62px; height: 42px;" title="Mini Caminhão de Cargas">
                    <div class="cenario-prop-sombra" style="width: 48px; height: 14px;"></div>
                    <svg viewBox="0 0 60 40" fill="none" style="width: 100%; height: 100%;">
                      <rect x="4" y="6" width="34" height="22" rx="3" fill="#0E2D52" stroke="#05101F" stroke-width="2"/>
                      <text x="7" y="20" fill="#90E0EF" font-size="7" font-weight="900" font-family="'Silkscreen', sans-serif">SEST</text>
                      <path d="M38 14 L48 14 L54 22 L54 28 L38 28 Z" fill="#00B4D8" stroke="#05101F" stroke-width="2"/>
                      <rect x="40" y="16" width="9" height="6" rx="1" fill="#E2F1FF"/>
                      <circle cx="12" cy="28" r="4.5" fill="#05101F" stroke="#CBD5E1" stroke-width="1.2"/>
                      <circle cx="26" cy="28" r="4.5" fill="#05101F" stroke="#CBD5E1" stroke-width="1.2"/>
                      <circle cx="47" cy="28" r="4.5" fill="#05101F" stroke="#CBD5E1" stroke-width="1.2"/>
                    </svg>
                  </div>

                  <!-- 3. Prédios em Gráfico de Barras -->
                  <div class="cenario-prop" style="left: 840px; top: 600px; width: 64px; height: 68px;" title="Prédios Gráfico de Barras">
                    <div class="cenario-prop-sombra" style="width: 60px; height: 16px;"></div>
                    <svg viewBox="0 0 60 64" fill="none" style="width: 100%; height: 100%;">
                      <rect x="4" y="32" width="14" height="30" rx="2" fill="#102A4E" stroke="#05101F" stroke-width="2"/>
                      <rect x="8" y="36" width="6" height="4" fill="#00B4D8"/>
                      <rect x="8" y="44" width="6" height="4" fill="#00B4D8"/>
                      <rect x="22" y="18" width="16" height="44" rx="2" fill="#15345F" stroke="#05101F" stroke-width="2"/>
                      <rect x="26" y="22" width="8" height="4" fill="#3CCB7F"/>
                      <rect x="26" y="30" width="8" height="4" fill="#3CCB7F"/>
                      <rect x="26" y="38" width="8" height="4" fill="#3CCB7F"/>
                      <rect x="42" y="4" width="14" height="58" rx="2" fill="#1E447B" stroke="#05101F" stroke-width="2"/>
                      <rect x="46" y="8" width="6" height="4" fill="#FFC93C"/>
                      <rect x="46" y="16" width="6" height="4" fill="#FFC93C"/>
                      <rect x="46" y="24" width="6" height="4" fill="#FFC93C"/>
                    </svg>
                  </div>

                  <!-- 4. Mini Racks de Servidor -->
                  <div class="cenario-prop" style="left: 1080px; top: 280px; width: 36px; height: 56px;" title="Servidor Corporativo">
                    <div class="cenario-prop-sombra" style="width: 32px; height: 12px;"></div>
                    <svg viewBox="0 0 36 54" fill="none" style="width: 100%; height: 100%;">
                      <rect x="3" y="3" width="30" height="48" rx="3" fill="#0A1C30" stroke="#05101F" stroke-width="2"/>
                      <rect x="6" y="8" width="24" height="6" rx="1" fill="#14365D"/>
                      <circle cx="10" cy="11" r="1.5" fill="#3CCB7F"/>
                      <circle cx="14" cy="11" r="1.5" fill="#00B4D8"/>
                      <rect x="6" y="20" width="24" height="6" rx="1" fill="#14365D"/>
                      <circle cx="10" cy="23" r="1.5" fill="#3CCB7F"/>
                      <circle cx="14" cy="23" r="1.5" fill="#FFC93C"/>
                      <rect x="6" y="32" width="24" height="6" rx="1" fill="#14365D"/>
                      <circle cx="10" cy="35" r="1.5" fill="#00B4D8"/>
                      <circle cx="14" cy="35" r="1.5" fill="#3CCB7F"/>
                    </svg>
                  </div>

                  <!-- 5. Nuvem de Dados -->
                  <div class="cenario-prop" style="left: 280px; top: 120px; width: 56px; height: 38px;" title="Nuvem de Dados">
                    <div class="cenario-prop-sombra" style="width: 48px; height: 12px;"></div>
                    <svg viewBox="0 0 54 36" fill="none" style="width: 100%; height: 100%;">
                      <path d="M12 28 H42 A10 10 0 0 0 42 8 A14 14 0 0 0 16 12 A10 10 0 0 0 12 28 Z" fill="#0E2D52" stroke="#00B4D8" stroke-width="2.5"/>
                      <path d="M22 28 V34 M32 28 V34" stroke="#FFC93C" stroke-width="2"/>
                    </svg>
                  </div>

                  <!-- 6. Blocos de Dados Binários (0101) -->
                  <div class="cenario-prop" style="left: 600px; top: 280px; width: 34px; height: 34px;" title="Bloco de Dados">
                    <div class="cenario-prop-sombra" style="width: 30px; height: 10px;"></div>
                    <svg viewBox="0 0 34 34" fill="none" style="width: 100%; height: 100%;">
                      <rect x="2" y="2" width="30" height="30" rx="4" fill="#0E2D52" stroke="#05101F" stroke-width="2"/>
                      <text x="6" y="14" fill="#00B4D8" font-size="8" font-family="'Silkscreen', monospace" font-weight="700">010</text>
                      <text x="6" y="26" fill="#3CCB7F" font-size="8" font-family="'Silkscreen', monospace" font-weight="700">101</text>
                    </svg>
                  </div>

                  <!-- 7. HUB CENTRAL: "CENTRAL DE DADOS" COM MOSTRADOR GIRATÓRIO (Nó 33) -->
                  <div class="hub-central-box" style="left: 680px; top: 440px;" id="hub-central-box" title="Central de Dados">
                    <div class="hub-anel-elevado">
                      <svg viewBox="0 0 120 120" class="hub-mostrador-svg">
                        <circle cx="60" cy="60" r="54" fill="#0A1C30" stroke="#FFC93C" stroke-width="3.5"/>
                        <circle cx="60" cy="60" r="46" fill="none" stroke="#00B4D8" stroke-width="1.5" stroke-dasharray="3 3"/>
                        
                        <line x1="60" y1="14" x2="60" y2="106" stroke="#16365C" stroke-width="1.5"/>
                        <line x1="20" y1="37" x2="100" y2="83" stroke="#16365C" stroke-width="1.5"/>
                        <line x1="20" y1="83" x2="100" y2="37" stroke="#16365C" stroke-width="1.5"/>

                        <text x="60" y="28" font-family="'Silkscreen', monospace" font-size="6.5" font-weight="700" fill="#FFC93C" text-anchor="middle">+4 TOK</text>
                        <text x="86" y="44" font-family="'Silkscreen', monospace" font-size="6.5" font-weight="700" fill="#3CCB7F" text-anchor="middle">+2 CASAS</text>
                        <text x="86" y="78" font-family="'Silkscreen', monospace" font-size="6.5" font-weight="700" fill="#00B4D8" text-anchor="middle">+3 TOK</text>
                        <text x="60" y="98" font-family="'Silkscreen', monospace" font-size="6.5" font-weight="700" fill="#FFC93C" text-anchor="middle">BÔNUS IA</text>
                        <text x="34" y="78" font-family="'Silkscreen', monospace" font-size="6.5" font-weight="700" fill="#3CCB7F" text-anchor="middle">+1 CASA</text>
                        <text x="34" y="44" font-family="'Silkscreen', monospace" font-size="6.5" font-weight="700" fill="#00B4D8" text-anchor="middle">+2 TOK</text>
                      </svg>

                      <div class="hub-ponteiro-agulha" id="hub-ponteiro-agulha"></div>
                      <div class="hub-centro-pivo"></div>
                    </div>
                    <div class="hub-placa-titulo">CENTRAL DE DADOS</div>
                  </div>

                  <!-- 8. PORTAL FINAL: "GUARDIÃO DOS DADOS" (Nó 60) -->
                  <div class="portal-guardiao-cenario" style="left: 680px; top: 120px;" title="Portal Guardião dos Dados">
                    <div class="cenario-prop-sombra" style="width: 74px; height: 18px;"></div>
                    <svg class="portal-arco-svg" viewBox="0 0 80 95" fill="none" style="width: 80px; height: 95px;">
                      <rect x="6" y="26" width="16" height="64" rx="3" fill="#0A2240" stroke="#05101F" stroke-width="2.5"/>
                      <rect x="58" y="26" width="16" height="64" rx="3" fill="#0A2240" stroke="#05101F" stroke-width="2.5"/>
                      <line x1="14" y1="32" x2="14" y2="82" stroke="#00B4D8" stroke-width="2" stroke-linecap="round"/>
                      <line x1="66" y1="32" x2="66" y2="82" stroke="#00B4D8" stroke-width="2" stroke-linecap="round"/>
                      <path d="M6 28 C6 6 74 6 74 28" fill="none" stroke="#00B4D8" stroke-width="8" stroke-linecap="round"/>
                      <path d="M6 28 C6 6 74 6 74 28" fill="none" stroke="#05101F" stroke-width="2.5" stroke-linecap="round"/>
                      <circle cx="40" cy="20" r="14" fill="#0A2240" stroke="#FFC93C" stroke-width="2.5"/>
                      <path d="M40 10 L48 14 V21 C48 26 40 29 40 29 C40 29 32 26 32 21 V14 Z" fill="#00B4D8" stroke="#05101F" stroke-width="1.8"/>
                      <rect x="37" y="18" width="6" height="6" rx="1" fill="#FFC93C"/>
                      <path d="M38.5 18 V16 A1.5 1.5 0 0 1 41.5 16 V18" stroke="#05101F" stroke-width="1.5" fill="none"/>
                    </svg>
                  </div>

                  <!-- =====================================================
                       CASAS EM GRAFO (COORDENADAS ABSOLUTAS EM PX)
                       ===================================================== -->
                  <div class="tabuleiro-grafo-casas" id="tabuleiro-grafo-casas">
                    ${casas.map(c => {
                      const cat = currentState.tabuleiro && currentState.tabuleiro[c.id]
                        ? currentState.tabuleiro[c.id]
                        : (c.tipo_fixo || 'boa_pratica');
                      const isAtiva = c.id === posAtual;
                      const isVisitada = c.id < posAtual;
                      const svgIcone = ICONES_SVG[cat] || ICONES_SVG.boa_pratica;
                      const nomeCheckpoint = NOMES_CHECKPOINTS[c.id] || null;

                      return `
                        <div class="casa-nodo-pos" style="left: ${c.x}px; top: ${c.y}px;" data-casa="${c.id}">
                          <div class="casa-tile casa-${cat} ${isAtiva ? 'ativa' : ''} ${isVisitada ? 'visitada' : ''}" id="casa-tile-${c.id}" data-casa="${c.id}" data-categoria="${cat}">
                            <div class="casa-disco-base">
                              <div class="casa-disco-topo">
                                <span class="casa-num billboard">${c.id}</span>
                                <div class="casa-icone billboard">
                                  ${svgIcone}
                                </div>
                              </div>
                              ${nomeCheckpoint ? `<div class="checkpoint-placa billboard">${nomeCheckpoint}</div>` : ''}
                            </div>
                            ${isAtiva ? renderHTMLPeao() : ''}
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>

                </div>
                <!-- FIM DIORAMA PLACA -->

              </div>
            </div>
          </div>
        </section>
      </main>

      <!-- =========================================================================
           COLUNA DIREITA (DESKTOP) / BARRA DE AÇÃO (MOBILE)
           ========================================================================= -->
      <aside class="painel-lateral-direito painel-arcade">
        <span class="parafuso-canto top-left"></span>
        <span class="parafuso-canto top-right"></span>
        <span class="parafuso-canto bottom-left"></span>
        <span class="parafuso-canto bottom-right"></span>

        <!-- TÍTULO ACIMA DO DADO -->
        <div class="titulo-podio-box" style="text-align: center;">
          <div style="font-family: var(--font-title); font-size: 1.15rem; font-weight: 900; color: var(--gold); text-transform: uppercase; letter-spacing: 0.5px;">
            🎲 PÓDIO DO DADO
          </div>
        </div>

        <!-- Pódio Redondo do Dado 3D (Grande ~96px) -->
        <div class="dado-podio-box" id="dado-box" style="margin: 0 auto; text-align: center;">
          <div class="dado-3d-scene">
            <div class="dado-cubo" id="dado-cubo" style="transform: rotateX(${rotInicial.rx}deg) rotateY(${rotInicial.ry}deg);" aria-label="Dado 3D">
              <div class="dado-face dado-face-1" data-face="1"><span class="pip pip-center"></span></div>
              <div class="dado-face dado-face-2" data-face="2"><span class="pip pip-tl"></span><span class="pip pip-br"></span></div>
              <div class="dado-face dado-face-3" data-face="3"><span class="pip pip-tl"></span><span class="pip pip-center"></span><span class="pip pip-br"></span></div>
              <div class="dado-face dado-face-4" data-face="4"><span class="pip pip-tl"></span><span class="pip pip-tr"></span><span class="pip pip-bl"></span><span class="pip pip-br"></span></div>
              <div class="dado-face dado-face-5" data-face="5"><span class="pip pip-tl"></span><span class="pip pip-tr"></span><span class="pip pip-center"></span><span class="pip pip-bl"></span><span class="pip pip-br"></span></div>
              <div class="dado-face dado-face-6" data-face="6"><span class="pip pip-tl"></span><span class="pip pip-tr"></span><span class="pip pip-ml"></span><span class="pip pip-mr"></span><span class="pip pip-bl"></span><span class="pip pip-br"></span></div>
            </div>
          </div>
        </div>

        <!-- Botão de Ação Arcade Logo Abaixo do Dado -->
        <div>
          <button id="btn-rolar-dado" class="btn btn-primary btn-block" style="font-size: 1.25rem; padding: 14px 16px; letter-spacing: 1px;">
            ${currentState.pular_proxima_rodada ? 'PASSAR VEZ' : 'ROLAR DADO'}
          </button>
          <div class="item-desktop-only" style="text-align: center; margin-top: 6px; font-size: 0.75rem; color: var(--text-muted);">
            Atalho: <span class="opcao-badge-atalho" style="font-size: 0.7rem;">ESPAÇO</span> ou <span class="opcao-badge-atalho" style="font-size: 0.7rem;">ENTER</span>
          </div>
        </div>

        <!-- Pilha Física de Fichas de Tokens em 3D -->
        <div class="mesa-lateral-desktop" id="mesa-tokens-box" style="margin: 0 auto; text-align: center;">
          <div class="pilha-tokens-mesa" id="pilha-fichas-tokens" title="Saldo de Tokens">
            ${renderFichasToken(tokensNum)}
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.2; margin-top: 6px;">
            <div style="font-family: var(--font-pixel); font-weight: 700; color: var(--gold);" id="texto-fichas-qtd">${tokensNum} Tokens</div>
            <div style="font-size: 0.72rem;">Fichas de Reserva</div>
          </div>
        </div>

        <!-- Legenda das Categorias no Rodapé -->
        <section class="legenda-tabuleiro-rodape" style="width: 100%;">
          <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; text-align: center;">
            Categorias do Tabuleiro
          </div>
          <div class="legenda-tabuleiro-grade">
            <div class="legenda-item-linha">${ICONES_SVG.checkpoint} Checkpoint</div>
            <div class="legenda-item-linha">${ICONES_SVG.boa_pratica} Boa Prática</div>
            <div class="legenda-item-linha">${ICONES_SVG.pense_antes} Pense Antes</div>
            <div class="legenda-item-linha">${ICONES_SVG.desafio} Desafio</div>
            <div class="legenda-item-linha">${ICONES_SVG.armadilha} Armadilha</div>
            <div class="legenda-item-linha">${ICONES_SVG.conexao} Conexão</div>
            <div class="legenda-item-linha" style="grid-column: span 2; justify-content: center;">${ICONES_SVG.hub} Central de Dados</div>
          </div>
        </section>
      </aside>

      <!-- =========================================================================
           MODAIS: CHECKPOINT, BIFURCAÇÃO PEDAGÓGICA E CENTRAL DE DADOS
           ========================================================================= -->

      <!-- 1. MODAL DE CHECKPOINT -->
      <div id="modal-checkpoint" class="modal-backdrop" role="dialog" aria-modal="true">
        <div class="modal-dialog" style="text-align: center;">
          <div class="modal-header" style="justify-content: center;">
            <h3 id="cp-modal-titulo" style="color: var(--gold);">🛡️ Checkpoint Conquistado!</h3>
          </div>
          <div class="modal-body" style="align-items: center;">
            <div style="font-size: 3rem; margin: 4px 0;">✨</div>
            <h4 id="cp-modal-nome" style="font-size: 1.4rem; color: var(--text-white);"></h4>
            <p id="cp-modal-desc" style="color: var(--text-muted); font-size: 1.05rem;"></p>
            <div id="cp-modal-bonus" style="font-family: var(--font-pixel); font-size: 1.8rem; font-weight: 700; color: var(--gold); margin: 6px 0;"></div>
          </div>
          <div class="modal-footer" style="justify-content: center;">
            <button type="button" class="btn btn-primary" id="btn-fechar-checkpoint">
              Continuar Jornada
            </button>
          </div>
        </div>
      </div>

      <!-- 2. MODAL DE BIFURCAÇÃO PEDAGÓGICA -->
      <div id="modal-bifurcacao" class="modal-backdrop" role="dialog" aria-modal="true">
        <div class="modal-dialog" style="max-width: 640px; text-align: center;">
          <div class="modal-header" style="justify-content: center;">
            <h3 id="bif-modal-titulo" style="color: var(--gold);">⚡ Escolha de Rota</h3>
          </div>
          <div class="modal-body">
            <p id="bif-modal-pergunta" style="color: var(--text-white); font-size: 1.1rem; font-weight: 700; margin-bottom: 8px;">
              Qual caminho você deseja seguir?
            </p>
            <div class="modal-bifurcacao-grade" id="bif-modal-grade"></div>
          </div>
        </div>
      </div>

      <!-- 3. MODAL DO HUB CENTRAL (CENTRAL DE DADOS) -->
      <div id="modal-hub-central" class="modal-backdrop" role="dialog" aria-modal="true">
        <div class="modal-dialog" style="text-align: center;">
          <div class="modal-header" style="justify-content: center;">
            <h3 style="color: var(--gold);">🎲 Central de Dados: Sorteio de Evento</h3>
          </div>
          <div class="modal-body" style="align-items: center;">
            <div class="hub-mostrador-modal-box">
              <svg viewBox="0 0 120 120" style="width: 100%; height: 100%;">
                <circle cx="60" cy="60" r="54" fill="#0A1C30" stroke="#FFC93C" stroke-width="3"/>
                <circle cx="60" cy="60" r="46" fill="none" stroke="#00B4D8" stroke-width="1.5" stroke-dasharray="3 3"/>
                <line x1="60" y1="14" x2="60" y2="106" stroke="#16365C" stroke-width="1.5"/>
                <line x1="20" y1="37" x2="100" y2="83" stroke="#16365C" stroke-width="1.5"/>
                <line x1="20" y1="83" x2="100" y2="37" stroke="#16365C" stroke-width="1.5"/>
                <circle cx="60" cy="60" r="10" fill="#FFC93C"/>
              </svg>
              <div class="hub-ponteiro-modal" id="hub-ponteiro-modal"></div>
            </div>
            <div id="hub-resultado-texto" style="margin-top: 10px; min-height: 50px;">
              Girando o mostrador de governança...
            </div>
          </div>
          <div class="modal-footer" style="justify-content: center;">
            <button type="button" class="btn btn-primary" id="btn-fechar-hub" style="display: none;">
              Coletar Bônus e Continuar
            </button>
          </div>
        </div>
      </div>

    </div>
  `;
}

function renderFichasToken(qtd) {
  const visualCount = Math.min(10, Math.max(2, Math.round(qtd / 3)));
  let html = '';
  for (let i = 0; i < visualCount; i++) {
    html += `<div class="ficha-token-item" style="z-index: ${i};"></div>`;
  }
  return html;
}

function renderHTMLPeao() {
  return `
    <div class="peao-container" id="peao-jogador">
      <div class="peao-sombra" id="peao-sombra"></div>
      <div class="peao-corpo-wrapper dadinho-neutro" id="peao-corpo">
        <svg class="dadinho-mascote-svg" viewBox="0 0 48 54" fill="none">
          <ellipse cx="24" cy="50" rx="16" ry="3.5" fill="#05101F" opacity="0.65"/>
          <rect class="perna-esq" x="14" y="42" width="6" height="8" rx="3" fill="#05101F"/>
          <rect class="perna-dir" x="28" y="42" width="6" height="8" rx="3" fill="#05101F"/>
          <rect x="6" y="8" width="36" height="36" rx="8" fill="#00B4D8" stroke="#05101F" stroke-width="3"/>
          <path d="M10 12 H38" stroke="#90E0EF" stroke-width="2" stroke-linecap="round"/>
          <circle cx="10" cy="15" r="2" fill="#FFFFFF" stroke="#05101F" stroke-width="1"/>
          <circle cx="38" cy="15" r="2" fill="#FFFFFF" stroke="#05101F" stroke-width="1"/>
          <circle cx="10" cy="37" r="2" fill="#FFFFFF" stroke="#05101F" stroke-width="1"/>
          <circle cx="38" cy="37" r="2" fill="#FFFFFF" stroke="#05101F" stroke-width="1"/>

          <g class="exp-neutro">
            <ellipse cx="18" cy="25" rx="3.5" ry="4.5" fill="#FFFFFF" stroke="#05101F" stroke-width="1.5"/>
            <circle cx="19" cy="24.5" r="2" fill="#05101F"/>
            <circle cx="18.2" cy="23.5" r="0.8" fill="#FFFFFF"/>
            <ellipse cx="30" cy="25" rx="3.5" ry="4.5" fill="#FFFFFF" stroke="#05101F" stroke-width="1.5"/>
            <circle cx="29" cy="24.5" r="2" fill="#05101F"/>
            <circle cx="29.8" cy="23.5" r="0.8" fill="#FFFFFF"/>
            <circle cx="13" cy="29" r="2" fill="#FF7A3D" opacity="0.6"/>
            <circle cx="35" cy="29" r="2" fill="#FF7A3D" opacity="0.6"/>
            <path d="M21 31 Q24 33.5 27 31" stroke="#05101F" stroke-width="2" stroke-linecap="round" fill="none"/>
          </g>

          <g class="exp-pulando">
            <circle cx="18" cy="23" r="5" fill="#FFFFFF" stroke="#05101F" stroke-width="1.5"/>
            <circle cx="18" cy="23" r="2.8" fill="#05101F"/>
            <circle cx="17" cy="21.5" r="1.2" fill="#FFFFFF"/>
            <circle cx="30" cy="23" r="5" fill="#FFFFFF" stroke="#05101F" stroke-width="1.5"/>
            <circle cx="30" cy="23" r="2.8" fill="#05101F"/>
            <circle cx="31" cy="21.5" r="1.2" fill="#FFFFFF"/>
            <ellipse cx="24" cy="32" rx="3" ry="4" fill="#05101F"/>
          </g>

          <g class="exp-feliz">
            <path d="M14 26 Q18 20 22 26" stroke="#05101F" stroke-width="2.8" stroke-linecap="round" fill="none"/>
            <path d="M26 26 Q30 20 34 26" stroke="#05101F" stroke-width="2.8" stroke-linecap="round" fill="none"/>
            <path d="M17 29 Q24 39 31 29 Z" fill="#05101F"/>
            <path d="M20 32 Q24 37 28 32 Z" fill="#E8484F"/>
            <path d="M6 14 L8 16 L6 18 L4 16 Z" fill="#FFC93C" stroke="#05101F" stroke-width="0.8"/>
            <path d="M42 14 L44 16 L42 18 L40 16 Z" fill="#FFC93C" stroke="#05101F" stroke-width="0.8"/>
          </g>

          <g class="exp-assustado">
            <circle cx="17" cy="24" r="5" fill="#FFFFFF" stroke="#05101F" stroke-width="1.8"/>
            <circle cx="17" cy="24" r="1.8" fill="#05101F"/>
            <circle cx="31" cy="24" r="5" fill="#FFFFFF" stroke="#05101F" stroke-width="1.8"/>
            <circle cx="31" cy="24" r="1.8" fill="#05101F"/>
            <path d="M19 33 L21 31 L23 33 L25 31 L27 33 L29 31" stroke="#05101F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <path d="M38 18 C38 18 36 22 36 23 C36 24.5 37 25.5 38.5 25.5 C40 25.5 41 24.5 41 23 C41 22 38 18 38 18 Z" fill="#90E0EF" stroke="#05101F" stroke-width="1.2"/>
          </g>
        </svg>
      </div>
    </div>
  `;
}

export function montar(container, currentState, navigate) {
  containerRef = container;
  navigateRef = navigate;
  emAnimacao = false;

  const trilhaWrapper = container.querySelector('#trilha-wrapper');
  const btnToggleVisao = container.querySelector('#btn-toggle-visao');
  const iconeVisao = container.querySelector('#icone-visao-modo');
  const rotuloVisao = container.querySelector('#rotulo-visao-modo');
  const btnRolar = container.querySelector('#btn-rolar-dado');
  const dadoCubo = container.querySelector('#dado-cubo');
  const cena3D = container.querySelector('#cena-tabuleiro-3d');
  const btnVisaoGeral = container.querySelector('#btn-visao-geral');

  // 1. Carrega e aplica preferência de Visão Plana salva
  const visaoPlanaSalva = localStorage.getItem('trilha_visao_plana') === 'true';
  if (visaoPlanaSalva && trilhaWrapper) {
    trilhaWrapper.classList.add('visao-plana');
    if (iconeVisao) iconeVisao.textContent = '📏';
    if (rotuloVisao) rotuloVisao.textContent = 'Visão Plana';
  }

  // 2. Alternador de Visão Diorama 2.5D / Plana
  if (btnToggleVisao && trilhaWrapper) {
    btnToggleVisao.onclick = () => {
      const estaPlana = trilhaWrapper.classList.toggle('visao-plana');
      if (estaPlana) {
        if (iconeVisao) iconeVisao.textContent = '📏';
        if (rotuloVisao) rotuloVisao.textContent = 'Visão Plana';
        localStorage.setItem('trilha_visao_plana', 'true');
      } else {
        if (iconeVisao) iconeVisao.textContent = '📐';
        if (rotuloVisao) rotuloVisao.textContent = 'Diorama 2.5D';
        localStorage.setItem('trilha_visao_plana', 'false');
      }
      atualizarCameraParaCasa(state.get().posicao, true);
    };
  }

  // 3. Botão "Ver Tabuleiro Todo (3s)"
  if (btnVisaoGeral) {
    btnVisaoGeral.onclick = () => {
      ativarVisaoGeralTabuleiro();
    };
  }

  // 4. Ação do Botão Rolar Dado com Suporte ao Grafo
  if (btnRolar) {
    btnRolar.onclick = async () => {
      if (emAnimacao) return;

      const st = state.get();
      if (st.pular_proxima_rodada) {
        state.set({ pular_proxima_rodada: false });
        btnRolar.textContent = 'ROLAR DADO';
        const aviso = container.querySelector('#aviso-pular-rodada');
        if (aviso) aviso.remove();
        return;
      }

      emAnimacao = true;
      btnRolar.disabled = true;

      // Obtém face do RNG determinístico
      const faceSorteada = state.rolarDado();

      // Giro físico do dado 3D
      await animarDadoCubo(dadoCubo, faceSorteada);

      // Movimenta no grafo
      let resMov = state.mover(faceSorteada);

      // Anima o peão passo a passo pelo caminho percorrido
      if (resMov.caminhoPercorrido && resMov.caminhoPercorrido.length > 1) {
        for (let i = 1; i < resMov.caminhoPercorrido.length; i++) {
          const de = resMov.caminhoPercorrido[i - 1];
          const para = resMov.caminhoPercorrido[i];
          await animarPassoGrafo(de, para);
        }
      }

      // Se parou em bifurcação que exige decisão do jogador
      if (resMov.parouEmBifurcacao && resMov.bifurcacaoPendente) {
        const escolha = await exibirModalBifurcacao(resMov.bifurcacaoPendente.bifurcacao);
        const resContinuacao = state.escolherCaminhoBifurcacao(
          resMov.bifurcacaoPendente.noOrigem,
          escolha.proximo,
          escolha.nome
        );

        if (resContinuacao.caminhoPercorrido && resContinuacao.caminhoPercorrido.length > 1) {
          for (let i = 1; i < resContinuacao.caminhoPercorrido.length; i++) {
            const de = resContinuacao.caminhoPercorrido[i - 1];
            const para = resContinuacao.caminhoPercorrido[i];
            await animarPassoGrafo(de, para);
          }
        }
        resMov = resContinuacao;
      }

      // Se ativou o Hub Central de Dados (Nó 33)
      if (resMov.hubAtivado || resMov.novaPosicao === 33) {
        Audio.tocarDado();
        const evSorteado = state.sortearEventoHub();
        await animarGiroHub(evSorteado);
        atualizarHUD(state.get());
        atualizarPilhaTokens(state.get().tokens);
      }

      // Se conquistou checkpoint com bônus
      if (resMov.bonusTokens > 0) {
        Audio.tocarCheckpoint();
        mostrarTokensFlutuantes(resMov.bonusTokens);
        atualizarHUD(state.get());
        atualizarPilhaTokens(state.get().tokens);
        await exibirModalCheckpoint(resMov.novaPosicao, resMov.bonusTokens);
      }

      // Se atingiu o final (Casa 60)
      if (resMov.novaPosicao >= 60 || state.get().partida_finalizada) {
        setTimeout(() => {
          navigateRef('resultado');
        }, 600);
        return;
      }

      // Se parou em casa normal (não início, não checkpoint, não hub)
      if (resMov.novaPosicao > 0 && resMov.novaPosicao !== 27 && resMov.novaPosicao !== 53 && resMov.novaPosicao !== 60 && resMov.novaPosicao !== 33) {
        const cat = (state.get().tabuleiro && state.get().tabuleiro[resMov.novaPosicao]) || 'boa_pratica';
        const deckManager = state.deckManager;
        let carta = deckManager ? deckManager.comprarCarta(cat) : null;
        if (!carta) {
          carta = {
            id: `fb_${cat}`,
            categoria: cat,
            tema: "Governança de IA",
            texto: `Você parou em uma casa de ${NOMES_CATEGORIAS[cat] || cat}. Mantenha a conformidade com as diretrizes de IA!`,
            efeito: { tokens: 2, mover: 0, feedback: "Muito bem! Continue atento às diretrizes." }
          };
        }

        const posAntesCarta = resMov.novaPosicao;

        if (cena3D) cena3D.classList.add('cena-foco-carta');
        const resCarta = await abrirModalCarta(carta);
        if (cena3D) cena3D.classList.remove('cena-foco-carta');

        // Expressão do Dadinho
        const peaoCorpo = containerRef.querySelector('#peao-corpo');
        if (peaoCorpo) {
          if (resCarta && resCarta.deltaTokens > 0) {
            peaoCorpo.className = 'peao-corpo-wrapper dadinho-feliz';
            setTimeout(() => { if (peaoCorpo) peaoCorpo.className = 'peao-corpo-wrapper dadinho-neutro'; }, 2200);
          } else if (resCarta && (resCarta.deltaTokens < 0 || resCarta.deltaMover < 0)) {
            peaoCorpo.className = 'peao-corpo-wrapper dadinho-assustado';
            setTimeout(() => { if (peaoCorpo) peaoCorpo.className = 'peao-corpo-wrapper dadinho-neutro'; }, 2200);
          }
        }

        if (resCarta && resCarta.deltaTokens !== 0) {
          mostrarTokensFlutuantes(resCarta.deltaTokens);
          atualizarHUD(state.get());
          atualizarPilhaTokens(state.get().tokens);
        }

        if (state.get().tokens <= 0 || state.get().partida_finalizada) {
          state.finalizarPartida();
          setTimeout(() => {
            navigateRef('resultado');
          }, 500);
          return;
        }
      }

      emAnimacao = false;
      const stFinal = state.get();
      if (!stFinal.partida_finalizada) {
        btnRolar.disabled = false;
        btnRolar.textContent = stFinal.pular_proxima_rodada ? 'PASSAR VEZ' : 'ROLAR DADO';
      }
    };
  }

  // 5. Atalhos Globais de Teclado
  const onKeyDownTabuleiro = (e) => {
    const modalCarta = document.getElementById('modal-carta-global');
    if (modalCarta && modalCarta.classList.contains('ativo')) return;

    const modalBif = container.querySelector('#modal-bifurcacao');
    if (modalBif && modalBif.classList.contains('ativo')) return;

    if (e.key === ' ' || e.key === 'Enter') {
      if (btnRolar && !btnRolar.disabled && !emAnimacao) {
        e.preventDefault();
        btnRolar.click();
      }
    }
  };
  document.addEventListener('keydown', onKeyDownTabuleiro);
  containerRef._limparTeclado = () => document.removeEventListener('keydown', onKeyDownTabuleiro);

  // Resize debounced
  let resizeTimeout = null;
  const onResizeDebounced = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      atualizarCameraParaCasa(state.get().posicao, false);
    }, 80);
  };
  window.addEventListener('resize', onResizeDebounced);
  containerRef._limparResize = () => {
    clearTimeout(resizeTimeout);
    window.removeEventListener('resize', onResizeDebounced);
  };

  // Centraliza câmera no peão inicial
  atualizarCameraParaCasa(currentState.posicao, false);
}

let cameraAtualX = -120;
let cameraAtualY = -680;

// Câmera segue o peão no grafo com antecipação e centralização rigorosa
function atualizarCameraParaCasa(casaNum, animar = true) {
  if (!containerRef) return;
  const planoEl = containerRef.querySelector('#tabuleiro-3d');
  const cameraEl = containerRef.querySelector('#tabuleiro-camera');
  if (!planoEl || !cameraEl) return;
  if (cameraEl.dataset.visaoGeralAtiva === 'true') return;

  const trilhaWrapper = containerRef.querySelector('#trilha-wrapper');
  const isVisaoPlana = trilhaWrapper && trilhaWrapper.classList.contains('visao-plana');

  const grafo = state.get().grafoTabuleiro || GRAFO_PADRAO;
  const nodo = grafo.casas.find(c => c.id === casaNum) || grafo.casas[0];
  const peaoX = nodo ? nodo.x : 120;
  const peaoY = nodo ? nodo.y : 760;

  // Plano com transform-origin: 0 0.
  // Transladamos (-peaoX, -peaoY + 80px) para centralizar a casa horizontalmente
  // e colocá-la levemente abaixo do centro vertical (~80px) para enquadrar o caminho à frente.
  const targetX = -peaoX;
  const targetY = -peaoY + 80;

  if (isVisaoPlana) {
    const cenaEl = containerRef.querySelector('#cena-tabuleiro-3d');
    const dispW = (cenaEl ? cenaEl.clientWidth : 1200) * 0.88;
    const dispH = (cenaEl ? cenaEl.clientHeight : 800) * 0.88;
    const scale = Math.min(dispW / 1440, dispH / 880);
    planoEl.style.transform = `scale(${scale.toFixed(3)}) rotateX(0deg) translate(-720px, -440px)`;
    return;
  }

  if (window.gsap && animar) {
    const camObj = { x: cameraAtualX, y: cameraAtualY };
    gsap.to(camObj, {
      x: targetX,
      y: targetY,
      duration: 0.65,
      ease: "power2.out",
      onUpdate: () => {
        cameraAtualX = camObj.x;
        cameraAtualY = camObj.y;
        planoEl.style.transform = `rotateX(var(--incl)) translate(${camObj.x.toFixed(1)}px, ${camObj.y.toFixed(1)}px)`;
      }
    });
  } else {
    cameraAtualX = targetX;
    cameraAtualY = targetY;
    planoEl.style.transform = `rotateX(var(--incl)) translate(${targetX.toFixed(1)}px, ${targetY.toFixed(1)}px)`;
  }
}

// Afasta câmera por 3 segundos para visão geral completa da mesa e tabuleiro
function ativarVisaoGeralTabuleiro() {
  if (!containerRef) return;
  const planoEl = containerRef.querySelector('#tabuleiro-3d');
  const cameraEl = containerRef.querySelector('#tabuleiro-camera');
  const btnVisao = containerRef.querySelector('#btn-visao-geral');
  if (!planoEl || !cameraEl) return;

  cameraEl.dataset.visaoGeralAtiva = 'true';
  if (btnVisao) btnVisao.classList.add('ativo-timer');

  const cenaEl = containerRef.querySelector('#cena-tabuleiro-3d');
  const dispW = (cenaEl ? cenaEl.clientWidth : 1200) * 0.90;
  const dispH = (cenaEl ? cenaEl.clientHeight : 800) * 0.90;
  const scaleGeral = Math.min(dispW / 1440, dispH / 880);

  const startObj = { x: cameraAtualX, y: cameraAtualY, s: 1.0 };
  if (window.gsap) {
    gsap.to(startObj, {
      x: -720,
      y: -440,
      s: scaleGeral,
      duration: 0.8,
      ease: "power2.inOut",
      onUpdate: () => {
        planoEl.style.transform = `scale(${startObj.s.toFixed(3)}) rotateX(var(--incl)) translate(${startObj.x.toFixed(1)}px, ${startObj.y.toFixed(1)}px)`;
      }
    });
  } else {
    planoEl.style.transform = `scale(${scaleGeral.toFixed(3)}) rotateX(var(--incl)) translate(-720px, -440px)`;
  }

  setTimeout(() => {
    cameraEl.dataset.visaoGeralAtiva = 'false';
    if (btnVisao) btnVisao.classList.remove('ativo-timer');
    const grafo = state.get().grafoTabuleiro || GRAFO_PADRAO;
    const nodo = grafo.casas.find(c => c.id === state.get().posicao) || grafo.casas[0];
    const targetX = -(nodo ? nodo.x : 120);
    const targetY = -(nodo ? nodo.y : 760) + 80;

    if (window.gsap) {
      const returnObj = { x: -720, y: -440, s: scaleGeral };
      gsap.to(returnObj, {
        x: targetX,
        y: targetY,
        s: 1.0,
        duration: 0.8,
        ease: "power2.inOut",
        onUpdate: () => {
          cameraAtualX = returnObj.x;
          cameraAtualY = returnObj.y;
          planoEl.style.transform = `scale(${returnObj.s.toFixed(3)}) rotateX(var(--incl)) translate(${returnObj.x.toFixed(1)}px, ${returnObj.y.toFixed(1)}px)`;
        },
        onComplete: () => {
          planoEl.style.transform = `rotateX(var(--incl)) translate(${targetX.toFixed(1)}px, ${targetY.toFixed(1)}px)`;
        }
      });
    } else {
      atualizarCameraParaCasa(state.get().posicao, false);
    }
  }, 3000);
}

// Anima um passo entre dois nós do grafo com arco parabólico e squash
async function animarPassoGrafo(deId, paraId) {
  if (!containerRef) return;
  const grafo = state.get().grafoTabuleiro || GRAFO_PADRAO;
  const deNodo = grafo.casas.find(c => c.id === deId);
  const paraNodo = grafo.casas.find(c => c.id === paraId);
  const peaoEl = containerRef.querySelector('#peao-jogador');
  const tileDestino = containerRef.querySelector(`#casa-tile-${paraId}`);

  if (!peaoEl || !tileDestino) return;

  Audio.tocarPasso();
  atualizarCameraParaCasa(paraId, true);

  const prefereReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefereReduzido || !window.gsap) {
    tileDestino.appendChild(peaoEl);
    return;
  }

  const corpo = peaoEl.querySelector('#peao-corpo');
  const sombra = peaoEl.querySelector('#peao-sombra');

  if (corpo) corpo.className = 'peao-corpo-wrapper dadinho-pulando';

  await new Promise(resolve => {
    const tl = gsap.timeline({
      onComplete: () => {
        tileDestino.appendChild(peaoEl);
        if (corpo) {
          gsap.fromTo(corpo, { scaleY: 0.75, scaleX: 1.25 }, { scaleY: 1, scaleX: 1, duration: 0.25, ease: "bounce.out" });
          corpo.className = 'peao-corpo-wrapper dadinho-neutro';
        }
        resolve();
      }
    });

    tl.to(corpo, { y: -28, duration: 0.22, ease: "power2.out" })
      .to(corpo, { y: 0, duration: 0.22, ease: "power2.in" });

    if (sombra) {
      tl.to(sombra, { scale: 0.6, opacity: 0.3, duration: 0.22 }, 0)
        .to(sombra, { scale: 1, opacity: 0.85, duration: 0.22 }, 0.22);
    }
  });
}

// Exibe modal pedagógico de bifurcação
function exibirModalBifurcacao(bifurcacaoData) {
  return new Promise((resolve) => {
    const modal = containerRef.querySelector('#modal-bifurcacao');
    if (!modal) {
      resolve(bifurcacaoData.opcoes[0]);
      return;
    }

    const tituloEl = modal.querySelector('#bif-modal-titulo');
    const perguntaEl = modal.querySelector('#bif-modal-pergunta');
    const gradeEl = modal.querySelector('#bif-modal-grade');

    tituloEl.textContent = bifurcacaoData.titulo || "⚡ Escolha de Rota";
    perguntaEl.textContent = bifurcacaoData.pergunta || "Qual caminho você deseja seguir?";

    gradeEl.innerHTML = bifurcacaoData.opcoes.map((op, idx) => `
      <div class="bifurcacao-card-opcao ${idx === 0 ? 'opcao-atalho' : 'opcao-segura'}" data-proximo="${op.proximo}" data-nome="${op.nome}">
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 1.6rem;">${op.icone}</span>
            <span class="badge ${idx === 0 ? 'badge-treino' : 'badge-oficial'}" style="font-size: 0.72rem;">${op.tag}</span>
          </div>
          <h4 style="font-size: 1.15rem; color: var(--text-white); font-weight: 800; margin-bottom: 6px;">${op.nome}</h4>
          <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.35;">${op.desc}</p>
        </div>
        <button class="btn btn-primary btn-block" style="margin-top: 8px; font-size: 0.85rem; padding: 8px;">
          Escolher Este Caminho
        </button>
      </div>
    `).join('');

    const cards = gradeEl.querySelectorAll('.bifurcacao-card-opcao');
    cards.forEach(card => {
      card.onclick = () => {
        const proxId = Number(card.dataset.proximo);
        const nome = card.dataset.nome;
        modal.classList.remove('ativo');
        resolve({ proximo: proxId, nome });
      };
    });

    modal.classList.add('ativo');
  });
}

// Anima o giro do mostrador na Central de Dados (Hub)
function animarGiroHub(evento) {
  return new Promise((resolve) => {
    const modal = containerRef.querySelector('#modal-hub-central');
    if (!modal) {
      resolve();
      return;
    }

    const agulha = modal.querySelector('#hub-ponteiro-modal');
    const agulhaPlaca = containerRef.querySelector('#hub-ponteiro-agulha');
    const resultadoEl = modal.querySelector('#hub-resultado-texto');
    const btnContinuar = modal.querySelector('#btn-fechar-hub');

    resultadoEl.textContent = "Girando o mostrador de governança...";
    btnContinuar.style.display = 'none';
    modal.classList.add('ativo');

    const anguloSorteado = 1080 + Math.floor(Math.random() * 360);

    if (window.gsap && agulha) {
      gsap.to(agulha, {
        rotation: anguloSorteado,
        duration: 1.6,
        ease: "power3.out",
        onComplete: () => {
          if (agulhaPlaca) agulhaPlaca.style.transform = `translate(-50%, -88%) rotate(${anguloSorteado % 360}deg)`;
          resultadoEl.innerHTML = `
            <div style="font-family: var(--font-pixel); font-size: 1.6rem; color: var(--gold);">${evento.rotulo}</div>
            <div style="font-size: 0.95rem; color: var(--text-muted); margin-top: 4px;">${evento.desc}</div>
          `;
          btnContinuar.style.display = 'inline-block';
        }
      });
    } else {
      resultadoEl.innerHTML = `
        <div style="font-family: var(--font-pixel); font-size: 1.6rem; color: var(--gold);">${evento.rotulo}</div>
        <div style="font-size: 0.95rem; color: var(--text-muted); margin-top: 4px;">${evento.desc}</div>
      `;
      btnContinuar.style.display = 'inline-block';
    }

    btnContinuar.onclick = () => {
      modal.classList.remove('ativo');
      resolve();
    };
  });
}

// Rotação física 3D do dado até a face sorteada
async function animarDadoCubo(cuboEl, faceSorteada) {
  if (!cuboEl) return;
  Audio.tocarDado();

  const prefereReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rotFace = ROTACAO_FACES_DADO[faceSorteada] || { rx: 0, ry: 0 };

  if (prefereReduzido || !window.gsap) {
    cuboEl.style.transform = `rotateX(${rotFace.rx}deg) rotateY(${rotFace.ry}deg)`;
    return;
  }

  acumuladoRotX += 720;
  acumuladoRotY += 1080;

  const targetX = acumuladoRotX + rotFace.rx;
  const targetY = acumuladoRotY + rotFace.ry;

  const podioBox = cuboEl.closest('.dado-podio-box');
  if (podioBox) {
    gsap.fromTo(podioBox,
      { y: 0, scale: 1 },
      { y: -12, scale: 1.12, duration: 0.28, yoyo: true, repeat: 1, ease: "power2.out" }
    );
  }

  await new Promise(resolve => {
    gsap.to(cuboEl, {
      rotateX: targetX,
      rotateY: targetY,
      duration: 0.85,
      ease: "power2.out",
      onComplete: resolve
    });
  });
}

// Modal de Checkpoint Conquistado
function exibirModalCheckpoint(casa, bonus) {
  return new Promise((resolve) => {
    const modal = containerRef.querySelector('#modal-checkpoint');
    if (!modal) {
      resolve();
      return;
    }

    const nomeEl = modal.querySelector('#cp-modal-nome');
    const descEl = modal.querySelector('#cp-modal-desc');
    const bonusEl = modal.querySelector('#cp-modal-bonus');
    const btnFechar = modal.querySelector('#btn-fechar-checkpoint');

    if (casa === 27 || casa === 10) {
      nomeEl.textContent = "Checkpoint 1: Dado Protegido";
      descEl.textContent = "Parabéns! Seus dados foram validados segundo os padrões corporativos de governança.";
      bonusEl.textContent = `+${bonus} Tokens`;
    } else if (casa === 53 || casa === 20) {
      nomeEl.textContent = "Checkpoint 2: IA Bem Usada";
      descEl.textContent = "Excelente! Você demonstrou maturidade no uso produtivo e seguro das ferramentas de IA.";
      bonusEl.textContent = `+${bonus} Tokens`;
    } else {
      nomeEl.textContent = "Checkpoint 3: Guardião dos Dados";
      descEl.textContent = "Fim da Trilha! Você alcançou o destino final com excelência e conformidade LGPD.";
      bonusEl.textContent = "";
    }

    const fechar = () => {
      modal.classList.remove('ativo');
      btnFechar.removeEventListener('click', fechar);
      resolve();
    };

    btnFechar.addEventListener('click', fechar);
    modal.classList.add('ativo');
  });
}

function atualizarPilhaTokens(novoSaldo) {
  if (!containerRef) return;
  const pilhaEl = containerRef.querySelector('#pilha-fichas-tokens');
  const textoEl = containerRef.querySelector('#texto-fichas-qtd');
  if (textoEl) textoEl.textContent = `${novoSaldo} Tokens`;
  if (pilhaEl) {
    pilhaEl.innerHTML = renderFichasToken(novoSaldo);
    if (window.gsap) {
      gsap.fromTo(pilhaEl.children,
        { scaleY: 1.3, y: -4 },
        { scaleY: 1, y: 0, stagger: 0.03, duration: 0.25, ease: "bounce.out" }
      );
    }
  }
}

function mostrarTokensFlutuantes(delta) {
  const flutuante = containerRef.querySelector('#flutuante-tokens');
  if (!flutuante) return;

  const positivo = delta >= 0;
  flutuante.textContent = `${positivo ? '+' : ''}${delta}`;
  flutuante.className = `flutuante-token ${positivo ? 'positivo' : 'negativo'}`;

  if (window.gsap) {
    gsap.fromTo(flutuante, 
      { opacity: 1, y: 0, scale: 1 }, 
      { opacity: 0, y: -24, scale: 1.25, duration: 1.0, ease: "power1.out" }
    );
  }
}

function atualizarHUD(st) {
  const tokensEl = containerRef.querySelector('#hud-tokens-valor');
  if (tokensEl) tokensEl.textContent = st.tokens;
}

export function desmontar() {
  emAnimacao = false;
  if (containerRef && typeof containerRef._limparTeclado === 'function') {
    containerRef._limparTeclado();
    containerRef._limparTeclado = null;
  }
  if (containerRef && typeof containerRef._limparResize === 'function') {
    containerRef._limparResize();
    containerRef._limparResize = null;
  }
}
