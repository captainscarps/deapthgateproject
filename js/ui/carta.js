// js/ui/carta.js - Modal Interativo de Carta (Opções, Feedback, Efeitos e Flip 3D)
import { state } from '../state.js';
import { criarRng } from '../rng.js';
import { Audio } from '../audio.js';

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

const CORES_CATEGORIAS = {
  boa_pratica: "var(--green)",
  pense_antes: "var(--amber)",
  desafio: "var(--cyan)",
  armadilha: "var(--coral)",
  conexao: "#457B9D",
  evento: "#E76F51",
  checkpoint: "var(--gold)"
};

/**
 * Abre o modal interativo da carta sobre o tabuleiro
 * @param {Object} carta - Objeto completo da carta
 * @param {Object} [opcoes]
 * @returns {Promise<{ deltaTokens: number, deltaMover: number }>}
 */
export function abrirModalCarta(carta, { rng = null } = {}) {
  return new Promise((resolve) => {
    let modalEl = document.getElementById('modal-carta-global');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'modal-carta-global';
      modalEl.className = 'modal-backdrop';
      modalEl.setAttribute('role', 'dialog');
      modalEl.setAttribute('aria-modal', 'true');
      document.body.appendChild(modalEl);
    }

    const st = state.get();
    const rngEfetivo = rng || (state.deckManager?.rng) || criarRng(`${st.semana_partida}_carta_${carta.id}`);

    // Verifica se possui opções ou é efeito direto
    const temOpcoes = Array.isArray(carta.opcoes) && carta.opcoes.length > 0;

    // Se tem opções, mapeia com índice original e embaralha determinísticamente
    let opcoesParaExibir = [];
    if (temOpcoes) {
      const mapeadas = carta.opcoes.map((op, idx) => ({ ...op, indexOriginal: idx }));
      opcoesParaExibir = rngEfetivo.embaralhar(mapeadas);
    }

    const catNome = NOMES_CATEGORIAS[carta.categoria] || carta.categoria.toUpperCase();
    const corCat = CORES_CATEGORIAS[carta.categoria] || "var(--cyan)";

    // Renderiza HTML inicial
    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-carta" id="modal-dialog-carta">
        <div class="carta-flip-conteudo">
          
          <!-- CABEÇALHO -->
          <div class="carta-header">
            <div class="carta-categoria-tag" style="color: ${corCat};">
              <span>●</span>
              <span>${catNome}</span>
            </div>
            <div class="carta-tema-tag">
              Tema: ${carta.tema ? carta.tema.toUpperCase() : 'GERAL'}
            </div>
          </div>

          <!-- CORPO -->
          <div class="carta-body">
            <p class="carta-texto-situacao" id="carta-texto-situacao">
              ${carta.texto}
            </p>

            ${temOpcoes ? `
              <div class="carta-opcoes-lista" id="lista-opcoes-carta">
                ${opcoesParaExibir.map((op, idx) => `
                  <button type="button" class="btn-opcao-carta" data-idx-original="${op.indexOriginal}" data-idx-shuffled="${idx}" id="btn-opcao-${idx}">
                    <span class="opcao-letra">${String.fromCharCode(65 + idx)}</span>
                    <span style="flex: 1;">${op.texto}</span>
                  </button>
                `).join('')}
              </div>
            ` : ''}

            <!-- CONTAINER DINÂMICO DE FEEDBACK E IMPACTOS -->
            <div id="container-feedback-carta" style="${temOpcoes ? 'display: none;' : ''}">
              ${!temOpcoes && carta.efeito ? renderEfeitoDireto(carta.efeito) : ''}
            </div>
          </div>

          <!-- RODAPÉ COM BOTÃO CONTINUAR -->
          <div class="modal-footer" id="carta-modal-footer" style="${temOpcoes ? 'display: none;' : 'display: flex;'}">
            <button type="button" class="btn btn-primary btn-block" id="btn-carta-continuar">
              Continuar
            </button>
          </div>

        </div>
      </div>
    `;

    // Exibe backdrop
    modalEl.classList.add('ativo');

    const dialog = modalEl.querySelector('#modal-dialog-carta');
    // Animação 3D de Flip na entrada
    if (window.gsap && dialog) {
      gsap.fromTo(dialog, 
        { rotationY: 85, opacity: 0, scale: 0.9 }, 
        { rotationY: 0, opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.2)" }
      );
    }

    let resultadoFinal = { deltaTokens: 0, deltaMover: 0 };

    // Limpeza de listeners e fechamento
    const fechar = () => {
      document.removeEventListener('keydown', onKeyDown);
      modalEl.classList.remove('ativo');
      resolve(resultadoFinal);
    };

    const btnContinuar = modalEl.querySelector('#btn-carta-continuar');
    if (btnContinuar) {
      btnContinuar.onclick = fechar;
    }

    // Navegação por teclado
    const onKeyDown = (e) => {
      if (!temOpcoes) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          e.preventDefault();
          fechar();
        }
        return;
      }

      // Atalhos numéricos 1, 2, 3 para opções
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= opcoesParaExibir.length) {
        const btn = modalEl.querySelector(`#btn-opcao-${num - 1}`);
        if (btn && !btn.disabled) {
          btn.click();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);

    // Se é efeito direto (sem opções)
    if (!temOpcoes && carta.efeito) {
      if (carta.categoria === 'armadilha' || (carta.efeito.tokens || 0) < 0) {
        Audio.tocarErro();
      } else {
        Audio.tocarAcerto();
      }

      resultadoFinal = {
        deltaTokens: Number(carta.efeito.tokens || 0),
        deltaMover: Number(carta.efeito.mover || 0)
      };
      // Registra no histórico (índice 0 para efeito direto)
      state.registrarEscolha(carta.id, 0);
      // Aplica efeito
      state.aplicarEfeito(carta.efeito);

      setTimeout(() => {
        if (btnContinuar) btnContinuar.focus();
      }, 100);
      return;
    }

    // Se tem opções: gerencia clique nas alternativas
    const botoesOpcoes = modalEl.querySelectorAll('.btn-opcao-carta');
    botoesOpcoes.forEach((btn, idxClicado) => {
      btn.onclick = () => {
        // Desativa todas as opções
        botoesOpcoes.forEach(b => b.disabled = true);

        const opEscolhida = opcoesParaExibir[idxClicado];
        const isCorreta = opEscolhida.correta === true;

        if (isCorreta) {
          Audio.tocarAcerto();
        } else {
          Audio.tocarErro();
        }

        resultadoFinal = {
          deltaTokens: Number(opEscolhida.tokens || 0),
          deltaMover: Number(opEscolhida.mover || 0)
        };

        // 1. Estiliza botões com feedback visual (verde para correta, âmbar para incorreta)
        botoesOpcoes.forEach((b, i) => {
          const op = opcoesParaExibir[i];
          if (i === idxClicado) {
            b.classList.add(isCorreta ? 'opcao-correta' : 'opcao-incorreta');
          } else if (op.correta) {
            // Revela sutilmente a alternativa correta educativa
            b.style.borderColor = 'rgba(6, 214, 160, 0.4)';
          } else {
            b.classList.add('opcao-apagada');
          }
        });

        // 2. Registra no histórico com o índice ORIGINAL da carta
        state.registrarEscolha(carta.id, opEscolhida.indexOriginal);

        // 3. Aplica efeito ao state
        state.aplicarEfeito(opEscolhida);

        // 4. Exibe painel de feedback explicativo e pílulas de impacto
        const feedbackContainer = modalEl.querySelector('#container-feedback-carta');
        if (feedbackContainer) {
          feedbackContainer.innerHTML = renderFeedbackOpcao(opEscolhida, isCorreta);
          feedbackContainer.style.display = 'block';
        }

        // 5. Exibe botão Continuar e define foco nele
        const footer = modalEl.querySelector('#carta-modal-footer');
        if (footer) {
          footer.style.display = 'flex';
          const btnCont = footer.querySelector('#btn-carta-continuar');
          if (btnCont) {
            btnCont.focus();
            if (window.gsap) {
              gsap.from(btnCont, { y: 10, opacity: 0, duration: 0.25 });
            }
          }
        }
      };
    });

    // Foca primeira opção acessível
    setTimeout(() => {
      const primeiro = modalEl.querySelector('#btn-opcao-0');
      if (primeiro) primeiro.focus();
    }, 150);
  });
}

function renderFeedbackOpcao(opcao, isCorreta) {
  const classeTipo = isCorreta ? 'sucesso' : 'alerta';
  const iconeStatus = isCorreta ? '✅ Conduta Exemplar' : '⚠️ Atenção / Risco Identificado';
  const deltaTokens = Number(opcao.tokens || 0);
  const deltaMover = Number(opcao.mover || 0);

  return `
    <div class="carta-feedback-box ${classeTipo}">
      <div style="font-weight: 700; color: ${isCorreta ? 'var(--green)' : 'var(--amber)'};">
        ${iconeStatus}
      </div>
      <div>${opcao.feedback || ''}</div>
      <div class="impactos-container">
        ${deltaTokens !== 0 ? `
          <span class="impacto-pill ${deltaTokens > 0 ? 'impacto-positivo' : 'impacto-negativo'}">
            ${deltaTokens > 0 ? '+' : ''}${deltaTokens} Tokens
          </span>
        ` : ''}
        ${deltaMover !== 0 ? `
          <span class="impacto-pill ${deltaMover > 0 ? 'impacto-positivo' : 'impacto-negativo'}">
            ${deltaMover > 0 ? 'Avança' : 'Volta'} ${Math.abs(deltaMover)} casa${Math.abs(deltaMover) > 1 ? 's' : ''}
          </span>
        ` : ''}
        ${opcao.bonus_pense_antes ? `
          <span class="impacto-pill impacto-neutro">
            💡 +1 Pense Antes
          </span>
        ` : ''}
      </div>
    </div>
  `;
}

function renderEfeitoDireto(efeito) {
  const deltaTokens = Number(efeito.tokens || 0);
  const deltaMover = Number(efeito.mover || 0);
  const isPositivo = deltaTokens >= 0 && !efeito.armadilha;
  const classeTipo = efeito.armadilha ? 'perigo' : (isPositivo ? 'sucesso' : 'alerta');

  return `
    <div class="carta-feedback-box ${classeTipo}">
      <div style="font-weight: 700;">
        ${efeito.armadilha ? '⚠️ Armadilha de Governança' : (isPositivo ? '✅ Boa Prática Reconhecida' : '📢 Evento da Trilha')}
      </div>
      <div>${efeito.feedback || ''}</div>
      <div class="impactos-container">
        ${deltaTokens !== 0 ? `
          <span class="impacto-pill ${deltaTokens > 0 ? 'impacto-positivo' : 'impacto-negativo'}">
            ${deltaTokens > 0 ? '+' : ''}${deltaTokens} Tokens
          </span>
        ` : ''}
        ${deltaMover !== 0 ? `
          <span class="impacto-pill ${deltaMover > 0 ? 'impacto-positivo' : 'impacto-negativo'}">
            ${deltaMover > 0 ? 'Avança' : 'Volta'} ${Math.abs(deltaMover)} casa${Math.abs(deltaMover) > 1 ? 's' : ''}
          </span>
        ` : ''}
        ${efeito.pular_rodada ? `
          <span class="impacto-pill impacto-negativo">
            ⏳ Perde a próxima rodada
          </span>
        ` : ''}
        ${efeito.armadilha ? `
          <span class="impacto-pill impacto-negativo">
            ⚠️ Armadilha registrada
          </span>
        ` : ''}
      </div>
    </div>
  `;
}
