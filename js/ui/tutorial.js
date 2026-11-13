// js/ui/tutorial.js - Tutorial de 3 passos na 1ª vez e reexibição
import { state } from '../state.js';

const PASSOS = [
  {
    icone: "🔄",
    titulo: "1. Trilha em Loop Contínuo",
    texto: "A Cidade dos Dados opera em circuito contínuo de 61 nós com 2 bifurcações e Central de Dados. O Portal Final não encerra o jogo: ele completa 1 volta com bônus e leva seu personagem de volta ao início para continuar!"
  },
  {
    icone: "🪙",
    titulo: "2. Custo de Rolagem e Sustentabilidade",
    texto: "Cada rolagem consome tokens: 1 na Volta 1, 2 na Volta 2 e 3 nas Voltas 3+. A partida termina somente quando seus tokens chegam a 0 (ou ao escolher 'Encerrar Partida'). Toda IA consome recursos — use com consciência!"
  },
  {
    icone: "🏆",
    titulo: "3. Escalada, Checkpoints e Pontuação",
    texto: "A cada volta, o desafio sobe (+1 armadilha e cartas mais complexas). Checkpoints dão bônus 1 vez por volta. Sua pontuação final soma casas avançadas (x5), voltas completadas (x150), acertos em desafios (x50) e boas práticas!"
  }
];

export function renderTutorialModalHTML() {
  return `
    <div id="modal-tutorial" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="tutorial-passo-titulo">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 id="tutorial-passo-titulo">Como Jogar • Passo <span id="tut-num-passo">1</span>/3</h3>
          <button type="button" class="btn-outline btn-sm" id="btn-fechar-tut-x" aria-label="Fechar">✕</button>
        </div>
        <div class="modal-body">
          <div class="tutorial-slide" id="tut-slide-conteudo">
            <!-- Conteúdo dinâmico -->
          </div>

          <div class="tutorial-indicadores">
            <span class="tutorial-ponto ativo" id="tut-dot-0"></span>
            <span class="tutorial-ponto" id="tut-dot-1"></span>
            <span class="tutorial-ponto" id="tut-dot-2"></span>
          </div>

          <label class="tutorial-toggle-box">
            <input type="checkbox" id="chk-tut-nao-mostrar" />
            <span>Não mostrar este tutorial automaticamente nas próximas partidas</span>
          </label>
        </div>
        <div class="modal-footer" style="justify-content: space-between;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-tut-anterior" disabled>Anterior</button>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-tut-pular">Pular</button>
            <button type="button" class="btn btn-primary" id="btn-tut-proximo">Próximo</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function abrirModalTutorial({ onConcluir, forcarAbertura = false } = {}) {
  let modalEl = document.getElementById('modal-tutorial');
  if (!modalEl) {
    const div = document.createElement('div');
    div.innerHTML = renderTutorialModalHTML();
    document.body.appendChild(div.firstElementChild);
    modalEl = document.getElementById('modal-tutorial');
  }

  let passoAtual = 0;

  const slideEl = modalEl.querySelector('#tut-slide-conteudo');
  const numPassoEl = modalEl.querySelector('#tut-num-passo');
  const btnAnterior = modalEl.querySelector('#btn-tut-anterior');
  const btnProximo = modalEl.querySelector('#btn-tut-proximo');
  const btnPular = modalEl.querySelector('#btn-tut-pular');
  const btnFecharX = modalEl.querySelector('#btn-fechar-tut-x');
  const chkNaoMostrar = modalEl.querySelector('#chk-tut-nao-mostrar');

  chkNaoMostrar.checked = !!state.get().tutorial_visto;

  const atualizarSlide = () => {
    const p = PASSOS[passoAtual];
    numPassoEl.textContent = String(passoAtual + 1);
    slideEl.innerHTML = `
      <div class="tutorial-icone">${p.icone}</div>
      <h4 class="tutorial-titulo">${p.titulo}</h4>
      <p class="tutorial-texto">${p.texto}</p>
    `;

    for (let i = 0; i < 3; i++) {
      const dot = modalEl.querySelector(`#tut-dot-${i}`);
      if (dot) dot.classList.toggle('ativo', i === passoAtual);
    }

    btnAnterior.disabled = (passoAtual === 0);
    if (passoAtual === PASSOS.length - 1) {
      btnProximo.textContent = 'Começar a Jogar';
      btnProximo.classList.remove('btn-primary');
      btnProximo.classList.add('btn-success');
    } else {
      btnProximo.textContent = 'Próximo';
      btnProximo.classList.remove('btn-success');
      btnProximo.classList.add('btn-primary');
    }
  };

  const fechar = () => {
    modalEl.classList.remove('ativo');
    if (chkNaoMostrar.checked) {
      state.set({ tutorial_visto: true });
      state.salvarJogadorLocal();
    }
    if (typeof onConcluir === 'function') {
      onConcluir();
    }
  };

  btnAnterior.onclick = () => {
    if (passoAtual > 0) {
      passoAtual--;
      atualizarSlide();
    }
  };

  btnProximo.onclick = () => {
    if (passoAtual < PASSOS.length - 1) {
      passoAtual++;
      atualizarSlide();
    } else {
      fechar();
    }
  };

  btnPular.onclick = fechar;
  btnFecharX.onclick = fechar;

  atualizarSlide();
  modalEl.classList.add('ativo');
}
