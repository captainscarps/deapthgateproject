// js/main.js - Inicialização e Roteador SPA com transições suaves
import { state } from './state.js';
import { Api } from './api.js';
import { Audio } from './audio.js';
import * as TelaInicio from './ui/inicio.js';
import * as TelaTabuleiro from './ui/tabuleiro.js';
import * as TelaCarta from './ui/carta.js';
import * as TelaResultado from './ui/resultado.js';
import * as TelaRanking from './ui/ranking.js';

const TELAS = {
  inicio: TelaInicio,
  tabuleiro: TelaTabuleiro,
  carta: TelaCarta,
  resultado: TelaResultado,
  ranking: TelaRanking
};

let telaAtiva = null;
let telaNomeAtiva = null;

/**
 * Transiciona para uma nova tela com animação suave
 * @param {string} nomeTela
 */
export function navegarPara(nomeTela) {
  const container = document.getElementById('tela-container');
  if (!container) return;

  const moduloNovo = TELAS[nomeTela];
  if (!moduloNovo) {
    console.error(`Tela não encontrada: ${nomeTela}`);
    return;
  }

  // Desmonta tela anterior se houver
  if (telaAtiva && typeof telaAtiva.desmontar === 'function') {
    telaAtiva.desmontar(container);
  }

  // Transição suave com GSAP (se disponível) ou direto
  if (window.gsap && container.children.length > 0) {
    gsap.to(container, {
      opacity: 0,
      y: -8,
      duration: 0.15,
      ease: 'power1.out',
      onComplete: () => {
        aplicarNovaTela(moduloNovo, nomeTela, container);
        gsap.fromTo(container, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power1.out' });
      }
    });
  } else {
    aplicarNovaTela(moduloNovo, nomeTela, container);
  }
}

function aplicarNovaTela(modulo, nomeTela, container) {
  telaAtiva = modulo;
  telaNomeAtiva = nomeTela;
  container.innerHTML = modulo.render(state.get());

  if (typeof modulo.montar === 'function') {
    modulo.montar(container, state.get(), navegarPara);
  }

  state.set({ telaAtual: nomeTela });
  window.scrollTo(0, 0);
}

window.addEventListener('DOMContentLoaded', async () => {
  console.log('Trilha Inteligente • Inicializando SPA...');
  
  // Inicializa botão de áudio / mudo
  const btnAudio = document.getElementById('btn-toggle-audio');
  if (btnAudio) {
    btnAudio.onclick = () => Audio.toggleMudo();
    Audio.atualizarIconeBotao();
  }

  try {
    await Api.inicializar();
  } catch (err) {
    console.warn('Erro ao inicializar Api:', err);
  }
  navegarPara('inicio');
});
