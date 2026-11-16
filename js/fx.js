// js/fx.js - Efeitos de "juice": confete, tremor de tela, tokens voando e selo de combo.
// Todos respeitam prefers-reduced-motion e falham em silêncio.

const reduzido = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
};

/** Confete em canvas sobre a tela inteira. */
export function confete({ quantidade = 90, duracao = 1600, cores } = {}) {
  if (reduzido()) return;
  try {
    const canvas = document.createElement('canvas');
    canvas.className = 'fx-confete-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const paleta = cores || ['#00B4D8', '#FFC93C', '#3CCB7F', '#FF7A3D', '#FFFFFF', '#7B9CFF'];
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.42;
    const parts = Array.from({ length: quantidade }, () => {
      const ang = Math.random() * Math.PI * 2;
      const vel = 4 + Math.random() * 9;
      return {
        x: cx, y: cy,
        vx: Math.cos(ang) * vel,
        vy: Math.sin(ang) * vel - 6,
        w: 6 + Math.random() * 6, h: 4 + Math.random() * 4,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
        cor: paleta[Math.floor(Math.random() * paleta.length)]
      };
    });
    const inicio = performance.now();
    const passo = (t) => {
      const dt = t - inicio;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = Math.max(0, 1 - dt / duracao);
      for (const p of parts) {
        p.vy += 0.32; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.cor; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (dt < duracao) requestAnimationFrame(passo); else canvas.remove();
    };
    requestAnimationFrame(passo);
  } catch (_) {}
}

/** Tremor curto em um elemento (armadilhas, erros). */
export function tremer(el, intensidade = 'media') {
  if (!el || reduzido()) return;
  el.classList.remove('fx-tremer', 'fx-tremer-forte');
  void el.offsetWidth;
  el.classList.add(intensidade === 'forte' ? 'fx-tremer-forte' : 'fx-tremer');
  setTimeout(() => el.classList.remove('fx-tremer', 'fx-tremer-forte'), 520);
}

/** Flash colorido nas bordas da tela (verde acerto / vermelho perigo). */
export function flash(tipo = 'sucesso') {
  if (reduzido()) return;
  const el = document.createElement('div');
  el.className = `fx-flash fx-flash-${tipo}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

/**
 * Faz moedas de token voarem de um ponto até o contador do HUD.
 * @param {number} delta - quantidade (positivo = ganha; negativo = perde)
 * @param {Element} alvo - elemento de destino (contador de tokens)
 * @param {{x:number,y:number}} [origem] - ponto de partida em px da tela
 */
export function tokensVoando(delta, alvo, origem) {
  if (!alvo || !delta || reduzido()) return;
  const r = alvo.getBoundingClientRect();
  const destino = { x: r.left + 26, y: r.top + r.height / 2 };
  const inicio = origem || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const qtd = Math.min(8, Math.max(2, Math.abs(delta)));
  const ganho = delta > 0;
  for (let i = 0; i < qtd; i++) {
    const m = document.createElement('div');
    m.className = `fx-moeda ${ganho ? '' : 'fx-moeda-perda'}`;
    document.body.appendChild(m);
    const de = ganho ? inicio : destino;
    const para = ganho ? destino : { x: destino.x + (Math.random() - 0.5) * 120, y: destino.y + 140 };
    const meio = { x: (de.x + para.x) / 2 + (Math.random() - 0.5) * 160, y: Math.min(de.y, para.y) - 60 - Math.random() * 60 };
    const atraso = i * 55;
    const dur = 620 + Math.random() * 160;
    const t0 = performance.now() + atraso;
    const anim = (t) => {
      const k = Math.min(1, Math.max(0, (t - t0) / dur));
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const x = (1 - e) * (1 - e) * de.x + 2 * (1 - e) * e * meio.x + e * e * para.x;
      const y = (1 - e) * (1 - e) * de.y + 2 * (1 - e) * e * meio.y + e * e * para.y;
      m.style.transform = `translate(${x - 9}px, ${y - 9}px) scale(${1 - k * 0.35})`;
      m.style.opacity = ganho ? 1 : String(1 - k);
      if (k < 1) requestAnimationFrame(anim); else {
        m.remove();
        if (ganho && i === qtd - 1) {
          alvo.classList.remove('fx-pulsar'); void alvo.offsetWidth; alvo.classList.add('fx-pulsar');
        }
      }
    };
    requestAnimationFrame(anim);
  }
}

/** Selo flutuante grande (ex.: "COMBO ×2") no centro da tela. */
export function seloCentral(texto, tipo = 'combo') {
  const el = document.createElement('div');
  el.className = `fx-selo-central fx-selo-${tipo}`;
  el.textContent = texto;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}
