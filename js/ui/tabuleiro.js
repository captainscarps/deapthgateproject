// js/ui/tabuleiro.js - Mecânica Visual da Trilha, Peão GSAP, Dado e HUD
import { state } from '../state.js';
import { CONSTANTES, limitarPosicao } from '../regras.js';
import { abrirModalCarta } from './carta.js';
import { Audio } from '../audio.js';

let containerRef = null;
let navigateRef = null;
let emAnimacao = false;

// SVGs inline compactos e limpos para cada categoria
const ICONES_SVG = {
  inicio: `<svg viewBox="0 0 24 24" fill="none" stroke="#00B4D8" stroke-width="2.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
  checkpoint: `<svg viewBox="0 0 24 24" fill="#FFD166" stroke="#FFB703" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  boa_pratica: `<svg viewBox="0 0 24 24" fill="none" stroke="#06D6A0" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></svg>`,
  pense_antes: `<svg viewBox="0 0 24 24" fill="none" stroke="#B5179E" stroke-width="2.5"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>`,
  desafio: `<svg viewBox="0 0 24 24" fill="none" stroke="#F4A261" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  armadilha: `<svg viewBox="0 0 24 24" fill="none" stroke="#EF476F" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  conexao: `<svg viewBox="0 0 24 24" fill="none" stroke="#457B9D" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  evento: `<svg viewBox="0 0 24 24" fill="none" stroke="#E76F51" stroke-width="2.5"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>`
};

const NOMES_CATEGORIAS = {
  inicio: "Partida",
  checkpoint: "Checkpoint",
  boa_pratica: "Boa Prática",
  pense_antes: "Pense Antes",
  desafio: "Desafio",
  armadilha: "Armadilha",
  conexao: "Conexão",
  evento: "Evento"
};

const DADO_GLIFOS = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

// Ordem das 31 casas em serpente (6 colunas):
// L0: 0, 1, 2, 3, 4, 5
// L1: 11, 10, 9, 8, 7, 6
// L2: 12, 13, 14, 15, 16, 17
// L3: 23, 22, 21, 20, 19, 18
// L4: 24, 25, 26, 27, 28, 29
// L5: 30
function gerarOrdemSerpente() {
  const ordem = [];
  const linhas = [
    [0, 1, 2, 3, 4, 5],
    [11, 10, 9, 8, 7, 6],
    [12, 13, 14, 15, 16, 17],
    [23, 22, 21, 20, 19, 18],
    [24, 25, 26, 27, 28, 29],
    [30]
  ];
  linhas.forEach(linha => ordem.push(...linha));
  return ordem;
}

export function render(currentState) {
  const tabuleiro = currentState.tabuleiro && currentState.tabuleiro.length === 31
    ? currentState.tabuleiro
    : new Array(31).fill("boa_pratica");

  const posAtual = currentState.posicao || 0;
  const proxCheckpoint = posAtual < 10 ? "Casa 10 (Dado Protegido)" : (posAtual < 20 ? "Casa 20 (IA Bem Usada)" : "Casa 30 (Final)");
  const ordemSerpente = gerarOrdemSerpente();

  return `
    <div class="tela-tabuleiro fade-in">
      
      <!-- HUD SUPERIOR -->
      <header class="tabuleiro-hud">
        <div class="hud-linha-topo">
          <div class="hud-jogador-info">
            <span class="hud-nome">${currentState.jogador || 'Colaborador'}</span>
            <span class="hud-area">${currentState.area || 'SEST SENAT'}</span>
          </div>

          <div class="hud-tokens-box" id="hud-tokens-box">
            <span style="font-size: 1.2rem;">🪙</span>
            <span class="hud-tokens-valor" id="hud-tokens-valor">${currentState.tokens}</span>
            <span class="flutuante-token" id="flutuante-tokens">+0</span>
          </div>
        </div>

        <div class="hud-linha-status">
          <span>Posição: <strong>Casa ${posAtual} de 30</strong></span>
          <span class="hud-checkpoint-aviso">Próximo: ${proxCheckpoint}</span>
        </div>
      </header>

      ${currentState.pular_proxima_rodada ? `
        <div class="alerta-pular-box" id="aviso-pular-rodada">
          ⚠️ Você precisa pular esta rodada devido a um efeito de carta!
        </div>
      ` : ''}

      <!-- ÁREA DE ROLAGEM DA TRILHA -->
      <section class="trilha-wrapper" id="trilha-wrapper">
        <div class="tabuleiro-grid">
          ${ordemSerpente.map(numCasa => {
            const cat = numCasa === 0 ? 'inicio' : ((numCasa === 10 || numCasa === 20 || numCasa === 30) ? 'checkpoint' : (tabuleiro[numCasa] || 'boa_pratica'));
            const isAtiva = numCasa === posAtual;
            const svgIcone = ICONES_SVG[cat] || ICONES_SVG.boa_pratica;

            return `
              <div class="casa-tile casa-${cat} ${isAtiva ? 'ativa' : ''}" id="casa-tile-${numCasa}" data-casa="${numCasa}" data-categoria="${cat}">
                <span class="casa-num">${numCasa === 0 ? 'INÍCIO' : (numCasa === 30 ? 'FIM' : numCasa)}</span>
                <div class="casa-icone">${svgIcone}</div>
                ${isAtiva ? `<div class="peao-jogador" id="peao-jogador">P</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <!-- BARRA DE AÇÃO DO DADO -->
      <section class="tabuleiro-acoes">
        <div class="dado-display-box" id="dado-box">
          ${currentState.dado_ultimo ? DADO_GLIFOS[currentState.dado_ultimo - 1] : '🎲'}
        </div>

        <button id="btn-rolar-dado" class="btn btn-primary" style="flex: 1; font-size: 1.25rem; padding: 14px;">
          ${currentState.pular_proxima_rodada ? 'PASSAR VEZ' : 'ROLAR DADO'}
        </button>
      </section>

      <!-- LEGENDA DAS CATEGORIAS -->
      <section class="legenda-tabuleiro">
        <div class="legenda-item">${ICONES_SVG.checkpoint} Checkpoint</div>
        <div class="legenda-item">${ICONES_SVG.boa_pratica} Boa Prática</div>
        <div class="legenda-item">${ICONES_SVG.pense_antes} Pense Antes</div>
        <div class="legenda-item">${ICONES_SVG.desafio} Desafio</div>
        <div class="legenda-item">${ICONES_SVG.armadilha} Armadilha</div>
      </section>

      <!-- MODAL DE CHECKPOINT -->
      <div id="modal-checkpoint" class="modal-backdrop" role="dialog" aria-modal="true">
        <div class="modal-dialog" style="text-align: center;">
          <div class="modal-header" style="justify-content: center;">
            <h3 id="cp-modal-titulo" style="color: var(--gold);">🛡️ Checkpoint Conquistado!</h3>
          </div>
          <div class="modal-body" style="align-items: center;">
            <div style="font-size: 3rem; margin: 4px 0;">✨</div>
            <h4 id="cp-modal-nome" style="font-size: 1.4rem; color: var(--text-white);"></h4>
            <p id="cp-modal-desc" style="color: var(--text-muted); font-size: 1.05rem;"></p>
            <div id="cp-modal-bonus" style="font-size: 1.8rem; font-weight: 700; color: var(--gold); margin: 6px 0;"></div>
          </div>
          <div class="modal-footer" style="justify-content: center;">
            <button type="button" class="btn btn-primary" id="btn-fechar-checkpoint">
              Continuar Jornada
            </button>
          </div>
        </div>
      </div>

    </div>
  `;
}

export function montar(container, currentState, navigate) {
  containerRef = container;
  navigateRef = navigate;
  emAnimacao = false;

  const btnRolar = container.querySelector('#btn-rolar-dado');
  const dadoBox = container.querySelector('#dado-box');

  if (btnRolar) {
    btnRolar.onclick = async () => {
      if (emAnimacao) return;

      const st = state.get();

      // 1. Caso de rodada pulada
      if (st.pular_proxima_rodada) {
        state.set({ pular_proxima_rodada: false });
        btnRolar.textContent = 'ROLAR DADO';
        const aviso = container.querySelector('#aviso-pular-rodada');
        if (aviso) aviso.remove();
        return;
      }

      emAnimacao = true;
      btnRolar.disabled = true;

      // 2. Animação de rotação do dado (~0.6s)
      await animarDado(dadoBox);

      // 3. Obtém face do RNG determinístico
      const faceSorteada = state.rolarDado();
      dadoBox.textContent = DADO_GLIFOS[faceSorteada - 1];

      // 4. Move o peão casa a casa com GSAP
      const posInicial = st.posicao;
      const posFinal = Math.min(30, posInicial + faceSorteada);

      await animarMovimentoPeao(posInicial, posFinal);

      // 5. Aplica movimento no state (regras de checkpoints são avaliadas)
      const resMov = state.mover(faceSorteada);

      // Se conquistou checkpoint com bônus
      if (resMov.bonusTokens > 0) {
        Audio.tocarCheckpoint();
        mostrarTokensFlutuantes(resMov.bonusTokens);
        const novoSt = state.get();
        atualizarHUD(novoSt);

        const casaCP = resMov.novaPosicao >= 20 && !st.checkpoints_passados.includes(20) ? 20 : 10;
        await exibirModalCheckpoint(casaCP, resMov.bonusTokens);
      }

      // Se atingiu o final (casa 30)
      if (resMov.novaPosicao >= 30 || state.get().partida_finalizada) {
        setTimeout(() => {
          navigateRef('resultado');
        }, 500);
        return;
      }

      // Se parou em casa normal (não checkpoint e não início)
      if (resMov.novaPosicao > 0 && resMov.novaPosicao !== 10 && resMov.novaPosicao !== 20 && resMov.novaPosicao !== 30) {
        const cat = st.tabuleiro[resMov.novaPosicao] || 'boa_pratica';
        const deckManager = state.deckManager;
        let carta = deckManager ? deckManager.comprarCarta(cat) : null;
        if (!carta) {
          carta = {
            id: `fb_${cat}`,
            categoria: cat,
            tema: "Governança",
            texto: `Você parou em uma casa de ${NOMES_CATEGORIAS[cat] || cat}. Mantenha as boas práticas no uso de IA!`,
            efeito: { tokens: 2, mover: 0, feedback: "Muito bem! Continue atento às diretrizes." }
          };
        }

        const posAntesCarta = resMov.novaPosicao;
        const resCarta = await abrirModalCarta(carta);

        // Se a carta alterou tokens
        if (resCarta && resCarta.deltaTokens !== 0) {
          mostrarTokensFlutuantes(resCarta.deltaTokens);
          atualizarHUD(state.get());
        }

        // Se a carta moveu o peão (inclusive para trás!)
        const posDepoisCarta = state.get().posicao;
        if (posDepoisCarta !== posAntesCarta) {
          await animarMovimentoPeao(posAntesCarta, posDepoisCarta);
          atualizarHUD(state.get());

          if (posDepoisCarta >= 30 || state.get().partida_finalizada) {
            setTimeout(() => {
              navigateRef('resultado');
            }, 500);
            return;
          }
        }

        // Se os tokens acabaram
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
        if (stFinal.pular_proxima_rodada) {
          btnRolar.textContent = 'PASSAR VEZ';
        } else {
          btnRolar.textContent = 'ROLAR DADO';
        }
      }
    };
  }

  // Posiciona scroll no peão inicial
  ajustarScrollPeao(currentState.posicao);
}

// Animação de rolagem rápida das faces do dado
async function animarDado(dadoBox) {
  if (!dadoBox) return;

  Audio.tocarDado();

  if (window.gsap) {
    gsap.to(dadoBox, { rotation: 360, scale: 1.15, duration: 0.6, ease: "power1.inOut" });
  }

  const trocas = 7;
  const intervalo = 600 / trocas;

  for (let i = 0; i < trocas; i++) {
    const faceTemp = Math.floor(Math.random() * 6);
    dadoBox.textContent = DADO_GLIFOS[faceTemp];
    await new Promise(r => setTimeout(r, intervalo));
  }

  if (window.gsap) {
    gsap.set(dadoBox, { rotation: 0, scale: 1 });
  }
}

// Animação casa a casa do peão (GSAP hop)
async function animarMovimentoPeao(de, para) {
  const passo = de < para ? 1 : -1;
  let atual = de;

  let peao = containerRef.querySelector('#peao-jogador');
  if (!peao) {
    peao = document.createElement('div');
    peao.className = 'peao-jogador';
    peao.id = 'peao-jogador';
    peao.textContent = 'P';
  }

  while (atual !== para) {
    atual += passo;
    const destinoTile = containerRef.querySelector(`#casa-tile-${atual}`);
    if (destinoTile) {
      destinoTile.appendChild(peao);

      if (window.gsap) {
        gsap.fromTo(peao, 
          { y: -16, scale: 1.3 }, 
          { y: 0, scale: 1, duration: 0.16, ease: "bounce.out" }
        );
      }

      // Atualiza classe ativa no tile
      containerRef.querySelectorAll('.casa-tile').forEach(t => t.classList.remove('ativa'));
      destinoTile.classList.add('ativa');

      // Scroll suave se necessário
      destinoTile.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      await new Promise(r => setTimeout(r, 180));
    }
  }
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

    if (casa === 10) {
      nomeEl.textContent = "Checkpoint 1: Dado Protegido";
      descEl.textContent = "Parabéns! Seus dados foram validados segundo os padrões corporativos de governança.";
      bonusEl.textContent = `+${bonus} Tokens`;
    } else if (casa === 20) {
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

// Indicador animado flutuante (+N / -N)
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

// Atualiza o HUD
function atualizarHUD(st) {
  const tokensEl = containerRef.querySelector('#hud-tokens-valor');
  if (tokensEl) tokensEl.textContent = st.tokens;
}

// Scroll automático para focar o peão
function ajustarScrollPeao(posicao) {
  setTimeout(() => {
    const tile = containerRef.querySelector(`#casa-tile-${posicao}`);
    if (tile) {
      tile.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 100);
}

export function desmontar() {
  emAnimacao = false;
}
