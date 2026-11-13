// js/audio.js - Efeitos Sonoros Sintetizados (Web Audio API) e Controle de Mudo
// SEM DEPENDÊNCIAS DE ARQUIVOS EXTERNOS

const STORAGE_KEY = 'trilha_audio_mudo';

let audioCtx = null;
let estaMudo = false;

// Inicializa estado de mudo a partir de localStorage
try {
  if (typeof localStorage !== 'undefined') {
    estaMudo = localStorage.getItem(STORAGE_KEY) === 'true';
  }
} catch (e) {}

function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const Audio = {
  isMudo() {
    return estaMudo;
  },

  setMudo(valor) {
    estaMudo = !!valor;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, String(estaMudo));
      }
    } catch (e) {}
    this.atualizarIconeBotao();
    return estaMudo;
  },

  toggleMudo() {
    return this.setMudo(!estaMudo);
  },

  atualizarIconeBotao() {
    if (typeof document === 'undefined') return;
    const btn = document.getElementById('btn-toggle-audio');
    if (btn) {
      btn.textContent = estaMudo ? '🔇' : '🔊';
      btn.setAttribute('aria-label', estaMudo ? 'Ativar som' : 'Desativar som');
      btn.title = estaMudo ? 'Ativar som' : 'Desativar som';
    }
  },

  /**
   * Efeito sonoro do dado rolando (cliques ritmados simulando dado de madeira)
   */
  tocarDado() {
    if (estaMudo) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const tempos = [0, 0.12, 0.24, 0.38, 0.52];
    tempos.forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320 + i * 40, ctx.currentTime + t);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + t + 0.05);

      gain.gain.setValueAtTime(0.25, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.06);
    });
  },

  /**
   * Efeito sonoro de passo do peão pelo tabuleiro
   */
  tocarPasso() {
    if (estaMudo) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.06);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.07);
    } catch (e) {}
  },

  /**
   * Efeito sonoro de acerto / resposta correta (arpejo harmonioso C5 -> E5 -> G5)
   */
  tocarAcerto() {
    if (estaMudo) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const notas = [523.25, 659.25, 783.99]; // C5, E5, G5
    notas.forEach((freq, idx) => {
      const t = ctx.currentTime + idx * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.3);
    });
  },

  /**
   * Efeito sonoro de erro / armadilha (tom descendente suave de atenção)
   */
  tocarErro() {
    if (estaMudo) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.35);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    // Filtro passa-baixa para suavizar o timbre da onda dente-de-serra
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.setValueAtTime(600, t);

    osc.connect(filtro);
    filtro.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.36);
  },

  /**
   * Efeito sonoro de checkpoint alcançado
   */
  tocarCheckpoint() {
    if (estaMudo) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const notas = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notas.forEach((freq, idx) => {
      const t = ctx.currentTime + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.36);
    });
  }
};
