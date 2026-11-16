// js/main.js - Inicialização e Roteador SPA com transições suaves e tratamento robusto de erros
import { state } from './state.js';
import { Api } from './api.js';
import { Audio } from './audio.js';
import * as TelaInicio from './ui/inicio.js';
import * as TelaTabuleiro from './ui/tabuleiro.js';
import * as TelaCarta from './ui/carta.js';
import * as TelaResultado from './ui/resultado.js';
import * as TelaRanking from './ui/ranking.js';
import * as TelaLiga from './ui/liga.js';

const TELAS = {
  inicio: TelaInicio,
  tabuleiro: TelaTabuleiro,
  carta: TelaCarta,
  resultado: TelaResultado,
  ranking: TelaRanking,
  liga: TelaLiga
};

let telaAtiva = null;
let telaNomeAtiva = null;

function exibirErroNaTela(nomeTela, fase, erro) {
  console.error(`[main.js] Erro crítico na tela "${nomeTela}" durante a fase "${fase}":`, erro);
  if (typeof window.mostrarErroGlobal === 'function') {
    window.mostrarErroGlobal(
      `Falha na tela "${nomeTela}" (${fase}): ${erro?.message || erro}`,
      erro?.stack || '',
      `js/ui/${nomeTela}.js`
    );
  } else {
    const container = document.getElementById('tela-container');
    if (container) {
      container.innerHTML = `
        <div style="max-width: 600px; margin: 40px auto; padding: 24px; background: #0A223E; border: 2px solid #E8484F; border-radius: 12px; color: #FFF;">
          <h2 style="color: #FF7A3D; margin-top: 0;">⚠️ Erro ao carregar tela: ${nomeTela}</h2>
          <p style="color: #CBD5E1;">${erro?.message || erro}</p>
          <button onclick="window.location.reload()" style="background: #00B4D8; color: #05101F; padding: 8px 16px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
            Recarregar
          </button>
        </div>
      `;
    }
  }
}

/**
 * Transiciona para uma nova tela com animação suave
 * @param {string} nomeTela
 */
export function navegarPara(nomeTela) {
  const container = document.getElementById('tela-container');
  if (!container) {
    console.error('[main.js] Container #tela-container não encontrado no DOM!');
    return;
  }

  const moduloNovo = TELAS[nomeTela];
  if (!moduloNovo) {
    console.error(`[main.js] Tela não encontrada no registro TELAS: "${nomeTela}"`);
    return;
  }

  // Desmonta tela anterior se houver
  if (telaAtiva && typeof telaAtiva.desmontar === 'function') {
    try {
      telaAtiva.desmontar(container);
    } catch (e) {
      console.warn(`[main.js] Aviso ao desmontar tela anterior "${telaNomeAtiva}":`, e);
    }
  }

  // Transição suave com GSAP (se disponível) ou direto
  if (window.gsap && container.children.length > 0) {
    try {
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
      return;
    } catch (e) {
      console.warn('[main.js] Falha na transição GSAP, aplicando tela diretamente:', e);
    }
  }

  aplicarNovaTela(moduloNovo, nomeTela, container);
}

function aplicarNovaTela(modulo, nomeTela, container) {
  telaAtiva = modulo;
  telaNomeAtiva = nomeTela;

  // 1. Renderização HTML do módulo
  try {
    container.innerHTML = modulo.render(state.get());
  } catch (errRender) {
    exibirErroNaTela(nomeTela, 'render', errRender);
    return;
  }

  // 2. Montagem de eventos e interatividade
  if (typeof modulo.montar === 'function') {
    try {
      const resMontar = modulo.montar(container, state.get(), navegarPara);
      if (resMontar && typeof resMontar.catch === 'function') {
        resMontar.catch(errAsyncMontar => {
          exibirErroNaTela(nomeTela, 'montar (async)', errAsyncMontar);
        });
      }
    } catch (errSyncMontar) {
      exibirErroNaTela(nomeTela, 'montar', errSyncMontar);
      return;
    }
  }

  try {
    state.set({ telaAtual: nomeTela });
  } catch (errState) {
    console.warn('[main.js] Aviso ao atualizar state.telaAtual:', errState);
  }

  try {
    window.scrollTo(0, 0);
  } catch (_) {}
}

window.addEventListener('DOMContentLoaded', async () => {
  console.log('Trilha Inteligente • Inicializando SPA...');

  // Parte 1: Inicialização do Áudio / Botão Mudo
  try {
    const btnAudio = document.getElementById('btn-toggle-audio');
    if (btnAudio) {
      btnAudio.onclick = () => Audio.toggleMudo();
      Audio.atualizarIconeBotao();
    }
  } catch (errAudio) {
    console.warn('[main.js] Aviso na inicialização do áudio:', errAudio);
  }

  // Parte 2: Inicialização da API (Supabase ou Mock contingencial)
  try {
    await Api.inicializar();
  } catch (errApi) {
    console.warn('[main.js] Aviso ao inicializar Api (modo mock permanece ativo):', errApi);
  }

  // Parte 3: Registro do Roteador SPA no escopo global
  try {
    window.navegarPara = navegarPara;
  } catch (errGlobal) {
    console.warn('[main.js] Aviso ao expor navegarPara:', errGlobal);
  }

  // Parte 4: Renderização da Tela Inicial
  try {
    navegarPara('inicio');
  } catch (errInicio) {
    exibirErroNaTela('inicio', 'inicialização', errInicio);
  }
});
