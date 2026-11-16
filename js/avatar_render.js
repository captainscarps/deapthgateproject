// js/avatar_render.js - Renderizador da miniatura de tabuleiro (v2)
// ---------------------------------------------------------------------------
// Princípios do desenho:
//  - Proporção chibi de miniatura: cabeça grande, corpo compacto, base redonda.
//  - O cabelo é sempre dividido em CAMADA DE TRÁS (atrás da cabeça/corpo) e
//    CAMADA DA FRENTE (franja recortada pelo crânio): nunca cobre os olhos.
//  - Rosto (olhos, boca) é sempre desenhado; barba nunca esconde a boca.
//  - Contorno navy único (#05101F), cores chapadas + 1 tom de sombra.
// Mantém o mesmo esquema de configuração (v: 1) de js/avatar.js.
// ---------------------------------------------------------------------------

const C = '#05101F';           // contorno
const SW = 2.4;                // espessura principal
const CALCA = '#1B2B44';       // calça padrão
let contadorId = 0;

const st = (w = SW) => `stroke="${C}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

function clarear(hex, f = 0.25) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) + (255 - ((n >> 16) & 255)) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) + (255 - ((n >> 8) & 255)) * f));
  const b = Math.min(255, Math.round((n & 255) + (255 - (n & 255)) * f));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function escurecer(hex, f = 0.25) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - f));
  const g = Math.round(((n >> 8) & 255) * (1 - f));
  const b = Math.round((n & 255) * (1 - f));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function luminancia(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

/**
 * @param {Object} cfg - configuração já validada/normalizada
 * @param {{ modo: string, reacao: string, pele: object, roupa: object, cabelo: object }} ctx
 */
export function desenharMiniatura(cfg, ctx) {
  const { modo, reacao } = ctx;
  const uid = `av${++contadorId}`;
  const pele = ctx.pele.hex;
  const peleSombra = ctx.pele.sombra;
  const roupa = ctx.roupa.hex;
  const roupa2 = ctx.roupa.secundaria;
  const hc = ctx.cabelo.hex;
  const hb = ctx.cabelo.brilho;
  const busto = modo === 'busto';
  const cadeira = cfg.mobilidade === 'cadeira_rodas';
  const comemorando = reacao === 'comemorando';
  const assustado = reacao === 'assustado';
  const pulando = reacao === 'pulando';
  const fem = cfg.corpo === 'f';
  const turbante = cfg.cabeca === 'lenco_turbante';

  // Cabeça
  const HX = 60, HY = 40, HR = 25;
  const corSobrancelha = luminancia(hc) > 0.72 ? escurecer(hc, 0.45) : hc;

  // ---------------------------------------------------------------- BASE
  const base = () => busto ? '' : `
    <g class="mini-base">
      <ellipse cx="60" cy="121" rx="40" ry="6" fill="#020814" opacity="0.45"/>
      <path d="M26 112 L26 118 A34 8 0 0 0 94 118 L94 112 Z" fill="#0A2240" ${st(2.2)}/>
      <path d="M26 115.5 A34 8 0 0 0 94 115.5" fill="none" stroke="${roupa2}" stroke-width="1.6" opacity="0.9"/>
      <ellipse cx="60" cy="112" rx="34" ry="8" fill="#16406B" ${st(2.2)}/>
      <ellipse cx="60" cy="111.5" rx="27" ry="5.5" fill="#1D5185" opacity="0.8"/>
    </g>`;

  // ----------------------------------------------------- MOBILIDADE (trás)
  const cadeiraTras = () => !cadeira || busto ? '' : `
    <g class="mini-cadeira">
      <rect x="40" y="70" width="40" height="26" rx="5" fill="#0E2C4D" ${st(2)}/>
      ${[28, 92].map(x => `
        <circle cx="${x}" cy="97" r="15" fill="#0B1A2E" ${st(2.4)}/>
        <circle cx="${x}" cy="97" r="11" fill="none" stroke="#5E7896" stroke-width="1.6"/>
        <path d="M${x} 86 V108 M${x - 11} 97 H${x + 11}" stroke="#5E7896" stroke-width="1.2"/>
        <circle cx="${x}" cy="97" r="3.2" fill="${roupa2}" ${st(1.2)}/>`).join('')}
    </g>`;

  // ------------------------------------------------------ CABELO DE TRÁS
  const cabeloTras = () => {
    if (turbante) return '';
    const s = st();
    switch (cfg.cabelo) {
      case 'liso_medio':
      case 'franja':
        return `<path d="M31 40 C31 1 89 1 89 40 L89 63 Q89 69 83 69 L37 69 Q31 69 31 63 Z" fill="${hc}" ${s}/>`;
      case 'longo':
        return `<path d="M30 40 C30 0 90 0 90 40 L91 86 Q86 93 79 88 L77 62 L43 62 L41 88 Q34 93 29 86 Z" fill="${hc}" ${s}/>
                <path d="M36 66 L37 84 M84 66 L83 84" stroke="${escurecer(hc, 0.25)}" stroke-width="1.6" stroke-linecap="round"/>`;
      case 'coque':
        return `<circle cx="60" cy="14" r="9.5" fill="${hc}" ${s}/><path d="M55 11 Q60 7 65 11" stroke="${hb}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
      case 'rabo_cavalo':
        return `<path d="M78 24 C98 24 101 52 91 72 C88 58 86 44 76 36 Z" fill="${hc}" ${s}/>
                <circle cx="80" cy="27" r="3.4" fill="${roupa2}" ${st(1.4)}/>`;
      case 'cacheado': {
        const pts = [[33, 50], [31, 38], [36, 26], [45, 18], [56, 14], [67, 15], [77, 20], [85, 29], [89, 41], [87, 52]];
        return pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8.5" fill="${hc}" ${s}/>`).join('') +
          pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8.5" fill="${hc}"/>`).join('');
      }
      case 'crespo_black':
        return `<circle cx="60" cy="35" r="33" fill="${hc}" ${s}/>
                <path d="M38 18 q4 -3 8 0 M70 10 q4 -3 8 0 M83 26 q3 -3 6 1 M30 36 q2 -4 6 -2" stroke="${hb}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.7"/>`;
      case 'trancas':
        return [30.5, 89.5].map(x => `
          ${[50, 57, 64, 71, 78].map(y => `<ellipse cx="${x}" cy="${y}" rx="5.2" ry="4.6" fill="${hc}" ${st(1.8)}/>`).join('')}
          <rect x="${x - 3}" y="82" width="6" height="3.5" rx="1.5" fill="${roupa2}" ${st(1.2)}/>
          <path d="M${x - 2.5} 86 L${x} 91 L${x + 2.5} 86 Z" fill="${hc}" ${st(1.4)}/>`).join('');
      case 'dreads':
        return [[29, 72], [35, 77], [41, 70], [79, 70], [85, 77], [91, 72]].map(([x, yf]) =>
          `<path d="M${x} 30 L${x} ${yf}" stroke="${C}" stroke-width="8.4" stroke-linecap="round"/>
           <path d="M${x} 30 L${x} ${yf}" stroke="${hc}" stroke-width="4.6" stroke-linecap="round"/>
           <path d="M${x - 1.6} ${yf - 12} h3.2 M${x - 1.6} ${yf - 24} h3.2" stroke="${hb}" stroke-width="1" opacity="0.7"/>`).join('');
      default:
        return '';
    }
  };

  // --------------------------------------------------------------- CORPO
  const mangaCor = (cfg.roupa === 'jaleco' || cfg.roupa === 'colete') ? '#EEF2F7' : roupa;
  const calcaCor = cfg.roupa === 'macacao' ? roupa : CALCA;

  const pernas = () => {
    if (busto) return '';
    if (cadeira) {
      return `
        <path d="M49 94 L49 101 L45 106" stroke="${C}" stroke-width="10.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M71 94 L71 101 L75 106" stroke="${C}" stroke-width="10.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M49 94 L49 101 L45 106" stroke="${calcaCor}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M71 94 L71 101 L75 106" stroke="${calcaCor}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <ellipse cx="44" cy="108" rx="6" ry="3.4" fill="#0B1220" ${st(1.6)}/>
        <ellipse cx="76" cy="108" rx="6" ry="3.4" fill="#0B1220" ${st(1.6)}/>`;
    }
    const sapato = cfg.roupa === 'macacao' ? '#3B2A1A' : '#0B1220';
    return `
      <rect x="46" y="94" width="11" height="16" rx="4" fill="${calcaCor}" ${st()}/>
      <rect x="63" y="94" width="11" height="16" rx="4" fill="${calcaCor}" ${st()}/>
      <path d="M43 112 Q43 106 51 106 Q58 106 58 110 Q58 113 50 113 Z" fill="${sapato}" ${st(1.8)}/>
      <path d="M77 112 Q77 106 69 106 Q62 106 62 110 Q62 113 70 113 Z" fill="${sapato}" ${st(1.8)}/>`;
  };

  const torsoPath = fem
    ? 'M41 75 Q41 66 50 65 L70 65 Q79 66 79 75 L77 97 Q77 101 73 101 L47 101 Q43 101 43 97 Z'
    : 'M40 75 Q40 66 49 65 L71 65 Q80 66 80 75 L79 97 Q79 101 75 101 L45 101 Q41 101 41 97 Z';

  const roupaDetalhes = () => {
    const linha = st(1.4);
    switch (cfg.roupa) {
      case 'terno':
        return `
          <path d="M53 65 L60 81 L67 65 Z" fill="#F4F7FB" ${linha}/>
          <path d="M58.4 67 H61.6 L62.6 79 L60 83 L57.4 79 Z" fill="${roupa2}" ${st(1.2)}/>
          <path d="M53 65 L56.5 81 L52 85 M67 65 L63.5 81 L68 85" fill="none" ${linha}/>
          <circle cx="60" cy="90" r="1.3" fill="${C}"/><circle cx="60" cy="95" r="1.3" fill="${C}"/>`;
      case 'blazer':
        return `
          <path d="M54 65 L60 77 L66 65 Z" fill="${roupa2}" ${linha}/>
          <path d="M54 65 L57 82 L53 86 M66 65 L63 82 L67 86" fill="none" ${linha}/>
          <circle cx="60" cy="88" r="1.4" fill="${C}"/>
          <path d="M68 76 h5" stroke="${clarear(roupa, 0.5)}" stroke-width="1.6" stroke-linecap="round"/>`;
      case 'camisa_social':
        return `
          <path d="M53 65 L57 71 L60 66 L63 71 L67 65 Z" fill="${clarear(roupa, 0.35)}" ${linha}/>
          <path d="M60 67 V99" stroke="${escurecer(roupa, 0.3)}" stroke-width="1.2"/>
          ${[74, 81, 88, 95].map(y => `<circle cx="60" cy="${y}" r="1" fill="${C}"/>`).join('')}
          <rect x="64" y="74" width="7" height="6" rx="1" fill="none" ${st(1.1)}/>`;
      case 'colete':
        return `
          <path d="M44 71 L54 65 L60 82 L66 65 L76 71 L76 98 Q76 100 74 100 L46 100 Q44 100 44 98 Z" fill="${roupa}" ${linha}/>
          <path d="M54 65 L60 82 L66 65" fill="none" stroke="#C9D2DE" stroke-width="1"/>
          ${[86, 92].map(y => `<circle cx="60" cy="${y}" r="1.2" fill="${roupa2}"/>`).join('')}`;
      case 'tailleur':
        return `
          <path d="M51 65 Q60 76 69 65 Z" fill="#F4F7FB" ${linha}/>
          <path d="M51 65 Q55 80 50 92 M69 65 Q65 80 70 92" fill="none" ${linha}/>
          ${[80, 87].map(y => `<circle cx="56.5" cy="${y}" r="1.2" fill="${roupa2}"/><circle cx="63.5" cy="${y}" r="1.2" fill="${roupa2}"/>`).join('')}`;
      case 'polo_ss':
        return `
          <path d="M53 65 L57 71 L60 67 L63 71 L67 65 Z" fill="${roupa2}" ${linha}/>
          <path d="M60 67 V77" stroke="${C}" stroke-width="1.2"/>
          <circle cx="60" cy="72" r="0.9" fill="${C}"/><circle cx="60" cy="75.5" r="0.9" fill="${C}"/>
          <text x="69" y="80" font-family="'Barlow Condensed', sans-serif" font-size="6" font-weight="900" fill="${roupa2}" text-anchor="middle">SS</text>
          <path d="M42 96 H78" stroke="${escurecer(roupa, 0.25)}" stroke-width="1.4"/>`;
      case 'jaleco':
        return `
          <path d="M54 65 L60 78 L66 65 Z" fill="${roupa}" ${linha}/>
          <path d="M54 65 L58 84 L60 100 M66 65 L62 84" fill="none" ${linha}/>
          <rect x="46" y="86" width="8" height="7" rx="1.2" fill="none" ${st(1.2)}/>
          <rect x="66" y="86" width="8" height="7" rx="1.2" fill="none" ${st(1.2)}/>
          <path d="M67 75 v5" stroke="${roupa2}" stroke-width="1.8" stroke-linecap="round"/>`;
      case 'macacao':
        return `
          <rect x="41.5" y="82" width="37" height="4" fill="#FFC93C"/>
          <rect x="41.5" y="83.4" width="37" height="1.2" fill="#E2E8F0"/>
          <rect x="41.5" y="92" width="37" height="4" fill="#FFC93C"/>
          <rect x="41.5" y="93.4" width="37" height="1.2" fill="#E2E8F0"/>
          <path d="M50 65 V82 M70 65 V82" stroke="${escurecer(roupa, 0.35)}" stroke-width="2"/>
          <rect x="55" y="70" width="10" height="7" rx="1.5" fill="${escurecer(roupa, 0.2)}" ${st(1.2)}/>`;
      default:
        return '';
    }
  };

  const torso = () => {
    const corTorso = cfg.roupa === 'jaleco' ? '#EEF2F7' : (cfg.roupa === 'colete' ? '#EEF2F7' : roupa);
    const saia = cfg.roupa === 'tailleur' && !busto && !cadeira
      ? `<path d="M43 97 H77 L80 106 Q80 108 78 108 H42 Q40 108 40 106 Z" fill="${roupa}" ${st()}/>` : '';
    return `
      <g class="mini-torso">
        <path d="${torsoPath}" fill="${corTorso}" ${st()}/>
        <path d="${torsoPath}" fill="#000" opacity="0.12" clip-path="url(#${uid}-lado)"/>
        ${roupaDetalhes()}
        ${saia}
      </g>`;
  };

  // ---------------------------------------------------------------- BRAÇOS
  const bracos = () => {
    let esq, dir;
    if (comemorando) {
      esq = { de: [44, 70], ate: [30, 52] };
      dir = { de: [76, 70], ate: [90, 52] };
    } else if (assustado) {
      esq = { de: [43, 71], ate: [31, 84] };
      dir = { de: [77, 71], ate: [89, 84] };
    } else {
      esq = { de: [43, 70], ate: [36, 92] };
      dir = { de: [77, 70], ate: [84, 92] };
    }
    const braco = (b) => `
      <path d="M${b.de[0]} ${b.de[1]} L${b.ate[0]} ${b.ate[1]}" stroke="${C}" stroke-width="11.5" stroke-linecap="round"/>
      <path d="M${b.de[0]} ${b.de[1]} L${b.ate[0]} ${b.ate[1]}" stroke="${mangaCor}" stroke-width="7.2" stroke-linecap="round"/>`;
    const mao = (b) => `<circle cx="${b.ate[0]}" cy="${b.ate[1] + 1.5}" r="4.6" fill="${pele}" ${st(2)}/>`;
    return { svg: braco(esq) + braco(dir), maos: mao(esq) + mao(dir), esq, dir };
  };

  // ---------------------------------------------------------------- CABEÇA
  const cabeca = () => `
    <circle cx="${HX - HR + 0.5}" cy="45" r="5.6" fill="${pele}" ${st()}/>
    <circle cx="${HX + HR - 0.5}" cy="45" r="5.6" fill="${pele}" ${st()}/>
    <circle cx="${HX - HR + 0.5}" cy="45" r="2.4" fill="${peleSombra}"/>
    <circle cx="${HX + HR - 0.5}" cy="45" r="2.4" fill="${peleSombra}"/>
    <circle cx="${HX}" cy="${HY}" r="${HR}" fill="${pele}"/>
    <g clip-path="url(#${uid}-cranio)">
      <ellipse cx="${HX + 14}" cy="${HY + 18}" rx="20" ry="11" fill="${peleSombra}" opacity="0.32"/>
      <ellipse cx="${HX - 9}" cy="${HY - 12}" rx="10" ry="6" fill="#FFFFFF" opacity="0.18"/>
    </g>`;

  const cabeloFrenteRecortado = () => {
    if (turbante) return '';
    switch (cfg.cabelo) {
      case 'raspado':
        return `<path d="M30 36 C31 6 89 6 90 36 C80 28 70 26 60 26 C50 26 40 28 30 36 Z" fill="${hc}" opacity="0.78"/>
                ${[[44, 22], [52, 19], [60, 18], [68, 19], [76, 22], [48, 26], [72, 26]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.7" fill="${hb}" opacity="0.6"/>`).join('')}`;
      case 'cacheado':
        return [[38, 31], [46, 24], [55, 21], [65, 21], [74, 24], [82, 31]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7.4" fill="${hc}" ${st(1.6)}/>`).join('');
      case 'crespo_black':
        return `<path d="M33 34 Q36 20 46 18 Q52 14 60 15 Q68 14 74 18 Q84 20 87 34 Q84 30 78 30 Q74 26 68 28 Q64 25 60 27 Q56 25 52 28 Q46 26 42 30 Q36 30 33 34 Z" fill="${hc}" ${st(1.6)}/>`;
      default:
        return '';
    }
  };

  // Franja desenhada POR CIMA da cabeça, com contorno (não recortada)
  const cabeloFrente = () => {
    if (turbante) return '';
    const s = st();
    const brilho = (d) => `<path d="${d}" stroke="${hb}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.85"/>`;
    switch (cfg.cabelo) {
      case 'curto':
        return `<path d="M34 44 C30 3 90 3 86 44 C85 37 81 32 75 30 C71 34 63 35 56 31 C49 34 42 37 34 44 Z" fill="${hc}" ${s}/>
                <path d="M35.5 44 L36 51" stroke="${hc}" stroke-width="3" stroke-linecap="round"/>
                <path d="M84.5 44 L84 51" stroke="${hc}" stroke-width="3" stroke-linecap="round"/>
                ${brilho('M45 17 Q53 13 61 14')}`;
      case 'liso_medio':
        return `<path d="M34 47 C29 1 91 1 86 47 C84 36 77 28 66 28 C58 34 46 38 34 47 Z" fill="${hc}" ${s}/>
                ${brilho('M44 18 Q52 13 60 14')}`;
      case 'longo':
        return `<path d="M34 48 C29 1 91 1 86 48 C83 36 73 27 60 30 C47 27 37 36 34 48 Z" fill="${hc}" ${s}/>
                <path d="M60 12 L60 30" stroke="${escurecer(hc, 0.3)}" stroke-width="1.4"/>
                ${brilho('M44 18 Q50 14 56 14')}`;
      case 'coque':
      case 'rabo_cavalo':
      case 'trancas':
      case 'dreads':
        return `<path d="M34 43 C31 3 89 3 86 43 C80 33 71 28 60 28 C49 28 40 33 34 43 Z" fill="${hc}" ${s}/>
                ${cfg.cabelo === 'trancas' ? `<path d="M60 12 L60 28" stroke="${escurecer(hc, 0.3)}" stroke-width="1.4"/>` : ''}
                ${brilho('M45 17 Q53 13 61 14')}`;
      case 'franja':
        return `<path d="M33 40 C31 3 89 3 87 40 Q74 35 60 35.5 Q46 35 33 40 Z" fill="${hc}" ${s}/>
                <path d="M46 36 L47 30 M60 35.5 V29 M74 36 L73 30" stroke="${escurecer(hc, 0.3)}" stroke-width="1.3" stroke-linecap="round"/>
                ${brilho('M45 17 Q53 13 61 14')}`;
      case 'careca':
        return `<ellipse cx="50" cy="23" rx="6" ry="3" fill="#FFFFFF" opacity="0.35" transform="rotate(-20 50 23)"/>`;
      default:
        return '';
    }
  };

  // ------------------------------------------------------------------ ROSTO
  const temBarbaGrossa = ['curta', 'cheia', 'bigode', 'cavanhaque'].includes(cfg.barba);
  const bocaY = temBarbaGrossa ? 57 : 55;

  const olhos = () => {
    const xs = [50, 70];
    const y = 45;
    const tapaEsq = cfg.rosto === 'tapa_olho';
    const exp = comemorando ? 'animado' : cfg.expressao;
    if (assustado) {
      return xs.map(x => `<ellipse cx="${x}" cy="${y}" rx="4.6" ry="5.4" fill="#FFF" ${st(1.6)}/><circle cx="${x}" cy="${y}" r="1.8" fill="${C}"/>`).join('');
    }
    if (exp === 'animado') {
      return xs.map((x, i) => (tapaEsq && i === 0) ? '' :
        `<path d="M${x - 4.2} ${y + 1.5} Q${x} ${y - 4.5} ${x + 4.2} ${y + 1.5}" stroke="${C}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`).join('');
    }
    const ry = exp === 'concentrado' ? 3.6 : 4.8;
    return xs.map((x, i) => {
      if (tapaEsq && i === 0) return '';
      let s = `<ellipse cx="${x}" cy="${y}" rx="4.1" ry="${ry}" fill="#FFF" ${st(1.5)}/>
               <circle cx="${x + 0.4}" cy="${y + 0.6}" r="2.7" fill="${C}"/>
               <circle cx="${x + 1.5}" cy="${y - 1.1}" r="1" fill="#FFF"/>`;
      if (exp === 'confiante') {
        s += `<path d="M${x - 4.6} ${y - 1.2} Q${x} ${y - 3.2} ${x + 4.6} ${y - 1.2} L${x + 4.6} ${y - 6} L${x - 4.6} ${y - 6} Z" fill="${pele}"/>
              <path d="M${x - 4.4} ${y - 1.2} Q${x} ${y - 3.2} ${x + 4.4} ${y - 1.2}" stroke="${C}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
      }
      if (fem) {
        const lado = i === 0 ? -1 : 1;
        s += `<path d="M${x + lado * 3.4} ${y - 3.4} l${lado * 2.8} -2.2 M${x + lado * 4.2} ${y - 1.4} l${lado * 2.8} -1" stroke="${C}" stroke-width="1.5" stroke-linecap="round"/>`;
      }
      return s;
    }).join('');
  };

  const sobrancelhas = () => {
    if (cfg.cabelo === 'franja' && !turbante) return '';
    const exp = comemorando ? 'animado' : (assustado ? 'assustado' : cfg.expressao);
    const forma = {
      sorriso: ['M45 37.5 Q50 35.5 54 37', 'M66 37 Q70 35.5 75 37.5'],
      confiante: ['M45 37 Q50 37 54 38.5', 'M66 36 Q70 34.5 75 36'],
      concentrado: ['M45 37 L54 39', 'M66 39 L75 37'],
      animado: ['M45 36 Q50 33.5 54 35.5', 'M66 35.5 Q70 33.5 75 36'],
      assustado: ['M45 35 Q50 32 54 34', 'M66 34 Q70 32 75 35']
    }[exp] || ['M45 37.5 Q50 35.5 54 37', 'M66 37 Q70 35.5 75 37.5'];
    return forma.map(d => `<path d="${d}" stroke="${corSobrancelha}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`).join('');
  };

  const nariz = () => `<path d="M58.5 50.5 Q60 52 61.5 50.5" stroke="${escurecer(peleSombra, 0.15)}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;

  const bochechas = () => assustado ? '' : `
    <ellipse cx="44" cy="52" rx="3.8" ry="2.4" fill="#FF7A8A" opacity="0.32"/>
    <ellipse cx="76" cy="52" rx="3.8" ry="2.4" fill="#FF7A8A" opacity="0.32"/>`;

  const boca = () => {
    const y = bocaY;
    const exp = comemorando ? 'animado' : cfg.expressao;
    if (assustado) return `<ellipse cx="60" cy="${y + 1}" rx="3" ry="3.8" fill="#5A1420" ${st(1.4)}/>`;
    switch (exp) {
      case 'confiante':
        return `<path d="M55 ${y} Q61 ${y + 4} 66 ${y - 1.5}" stroke="${C}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      case 'concentrado':
        return `<path d="M56 ${y + 0.5} Q60 ${y - 0.5} 64 ${y + 0.5}" stroke="${C}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      case 'animado':
        return `<path d="M53.5 ${y - 1.5} Q60 ${y + 8} 66.5 ${y - 1.5} Z" fill="#6B1A26" ${st(1.6)}/>
                <path d="M55.5 ${y - 1} H64.5 L63.8 ${y + 1} H56.2 Z" fill="#FFF"/>
                <path d="M57 ${y + 3.6} Q60 ${y + 1.8} 63 ${y + 3.6}" fill="#E8667A"/>`;
      default:
        return fem
          ? `<path d="M54.5 ${y - 0.5} Q60 ${y + 5} 65.5 ${y - 0.5} Q60 ${y + 1.5} 54.5 ${y - 0.5} Z" fill="#C4485A" ${st(1.6)}/>`
          : `<path d="M54.5 ${y - 0.5} Q60 ${y + 4.5} 65.5 ${y - 0.5}" stroke="${C}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    }
  };

  const barba = () => {
    const b = cfg.barba;
    if (b === 'nenhum') return '';
    const bc = hc;
    const bigode = `<path d="M52.5 54 Q56 50.8 60 52.6 Q64 50.8 67.5 54 Q64 55.6 60 54.6 Q56 55.6 52.5 54 Z" fill="${bc}" ${st(1.4)}/>`;
    switch (b) {
      case 'por_fazer':
        return `<g clip-path="url(#${uid}-cranio)"><path d="M35 46 Q37 67 60 67 Q83 67 85 46 Q80 60 60 61 Q40 60 35 46 Z" fill="${bc}" opacity="0.3"/>
                <path d="M53 53.5 Q60 51.5 67 53.5" stroke="${bc}" stroke-width="2.4" opacity="0.3" fill="none" stroke-linecap="round"/></g>`;
      case 'bigode':
        return bigode;
      case 'cavanhaque':
        return `${bigode}<path d="M55 61 Q60 69 65 61 Q60 63.5 55 61 Z" fill="${bc}" ${st(1.4)}/>`;
      case 'curta':
        return `<path d="M36 47 Q37 68 60 68.5 Q83 68 84 47 L81 47 Q80 61 68 61.5 Q64 60 60 60.5 Q56 60 52 61.5 Q40 61 39 47 Z" fill="${bc}" ${st(1.6)}/>${bigode}`;
      case 'cheia':
        return `<path d="M35 44 Q34 74 60 75 Q86 74 85 44 L81 45 Q81 58 71 60 Q66 58.5 60 59 Q54 58.5 49 60 Q39 58 39 45 Z" fill="${bc}" ${st(1.6)}/>
                <path d="M54 68 Q60 70 66 68" stroke="${escurecer(bc, 0.3)}" stroke-width="1.2" fill="none"/>${bigode}`;
      default:
        return '';
    }
  };

  // ----------------------------------------------------- ACESSÓRIO DE ROSTO
  const acessorioRosto = () => {
    switch (cfg.rosto) {
      case 'oculos_grau':
        return `<circle cx="50" cy="45" r="6.6" fill="#BFE9FF" fill-opacity="0.18" ${st(2)}/>
                <circle cx="70" cy="45" r="6.6" fill="#BFE9FF" fill-opacity="0.18" ${st(2)}/>
                <path d="M56.6 44.5 Q60 42.5 63.4 44.5 M43.4 44 L36 42.5 M76.6 44 L84 42.5" stroke="${C}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      case 'oculos_escuros':
        return `<path d="M42 41 H57 Q57 51 49.5 51 Q42 51 42 41 Z" fill="#0B1220" ${st(1.8)}/>
                <path d="M63 41 H78 Q78 51 70.5 51 Q63 51 63 41 Z" fill="#0B1220" ${st(1.8)}/>
                <path d="M57 42.5 H63 M42 41.5 L36 40 M78 41.5 L84 40" stroke="${C}" stroke-width="2" stroke-linecap="round"/>
                <path d="M44.5 43.5 L48 43.5 M65.5 43.5 L69 43.5" stroke="#FFF" stroke-width="1.4" opacity="0.6" stroke-linecap="round"/>`;
      case 'monoculo':
        return `<circle cx="70" cy="45" r="6.8" fill="#BFE9FF" fill-opacity="0.2" stroke="#D4A325" stroke-width="2.2"/>
                <path d="M75 50 Q80 58 76 66" stroke="#D4A325" stroke-width="1.2" fill="none"/>`;
      case 'tapa_olho':
        return `<path d="M35 36 L85 52" stroke="${C}" stroke-width="1.8"/>
                <ellipse cx="50" cy="45" rx="6.4" ry="5.6" fill="#0B1220" ${st(1.6)}/>`;
      case 'oculos_leitura':
        return `<path d="M43.5 45 H56.5 Q56.5 51.5 50 51.5 Q43.5 51.5 43.5 45 Z" fill="#BFE9FF" fill-opacity="0.2" ${st(1.8)}/>
                <path d="M63.5 45 H76.5 Q76.5 51.5 70 51.5 Q63.5 51.5 63.5 45 Z" fill="#BFE9FF" fill-opacity="0.2" ${st(1.8)}/>
                <path d="M56.5 45.5 H63.5 M43.5 45 L36 43.5 M76.5 45 L84 43.5" stroke="${C}" stroke-width="1.8" stroke-linecap="round"/>`;
      default:
        return '';
    }
  };

  // ---------------------------------------------------- ACESSÓRIO DE CABEÇA
  const acessorioCabeca = () => {
    switch (cfg.cabeca) {
      case 'bone_ss':
        return `<path d="M34 36 C33 1 87 1 86 36 Z" fill="#0B2545" ${st()}/>
                <path d="M34 35 Q60 30 93 35 Q96 40 88 41 Q60 37 34 39 Z" fill="#0B2545" ${st(2)}/>
                <path d="M60 11 V35" stroke="#16406B" stroke-width="1.4"/>
                <circle cx="60" cy="11" r="2" fill="#00B4D8" ${st(1.2)}/>
                <text x="60" y="30" font-family="'Barlow Condensed', sans-serif" font-size="9" font-weight="900" fill="#FFC93C" text-anchor="middle">SS</text>`;
      case 'chapeu_ss':
        return `<ellipse cx="60" cy="27" rx="38" ry="7.5" fill="#F4F1EA" ${st()}/>
                <path d="M41 27 L42 11 Q60 4 78 11 L79 27 Z" fill="#F4F1EA" ${st()}/>
                <path d="M41.6 20 Q60 23 78.4 20 L78.8 25.5 Q60 28.5 41.2 25.5 Z" fill="${roupa2}" ${st(1.4)}/>`;
      case 'capacete_seguranca':
        return `<path d="M33 35 C32 -1 88 -1 87 35 Z" fill="#FFC93C" ${st()}/>
                <path d="M30 35 H90 Q92 39 88 40 H32 Q28 39 30 35 Z" fill="#F2B21C" ${st(2)}/>
                <path d="M60 10 V34 M48 13 L50 34 M72 13 L70 34" stroke="#D99A12" stroke-width="1.6"/>
                <path d="M41 19 Q46 13 53 12" stroke="#FFF2C2" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      case 'fone_ouvido':
        return `<path d="M33 42 C31 1 89 1 87 42" stroke="${C}" stroke-width="6.4" fill="none" stroke-linecap="round"/>
                <path d="M33 42 C31 1 89 1 87 42" stroke="#334155" stroke-width="3" fill="none" stroke-linecap="round"/>
                <rect x="27" y="37" width="11" height="17" rx="5" fill="#00B4D8" ${st(2)}/>
                <rect x="82" y="37" width="11" height="17" rx="5" fill="#00B4D8" ${st(2)}/>
                <path d="M30 51 Q30 60 44 60" stroke="${C}" stroke-width="1.6" fill="none"/>
                <circle cx="45" cy="60" r="1.8" fill="#334155" ${st(1)}/>`;
      case 'aparelho_auditivo':
        return `<path d="M33 39 Q29 41 30 47 Q31 51 34 51" fill="none" stroke="#00B4D8" stroke-width="3.2" stroke-linecap="round"/>
                <circle cx="34" cy="51" r="1.6" fill="#E2E8F0" ${st(1)}/>`;
      case 'lenco_turbante':
        return `<path d="M32 42 C27 -2 93 -2 88 42 C84 36 74 32 60 32 C46 32 36 36 32 42 Z" fill="${roupa2}" ${st()}/>
                <path d="M40 26 Q60 14 82 30 M38 34 Q58 22 84 36" stroke="${escurecer(roupa2, 0.25)}" stroke-width="1.6" fill="none"/>
                <circle cx="73" cy="17" r="6" fill="${escurecer(roupa2, 0.15)}" ${st(1.8)}/>`;
      default:
        return '';
    }
  };

  // ------------------------------------------------------------ ITEM NA MÃO
  const itemMao = (dir) => {
    if (busto) return cfg.item === 'cracha' ? cracha() : '';
    const [hx, hy] = dir.ate;
    switch (cfg.item) {
      case 'cracha':
        return cracha();
      case 'mala_ss':
        if (comemorando) return '';
        return `<g><rect x="${hx - 3}" y="96" width="17" height="15" rx="2.5" fill="#0B2545" ${st(2)}/>
                <path d="M${hx + 1.5} 96 V${hy + 2} H${hx + 9.5} V96" fill="none" ${st(1.8)}/>
                <rect x="${hx - 3}" y="101" width="17" height="3" fill="#FFC93C"/>
                <circle cx="${hx}" cy="111.5" r="1.4" fill="${C}"/><circle cx="${hx + 11}" cy="111.5" r="1.4" fill="${C}"/></g>`;
      case 'notebook':
        return `<g transform="translate(${hx - 2} ${hy - 13}) rotate(8)">
                <rect x="0" y="0" width="17" height="12" rx="1.6" fill="#334155" ${st(1.8)}/>
                <rect x="2" y="2" width="13" height="8" rx="0.8" fill="#38BDF8"/>
                <path d="M-2 12 H19 L17 15 H0 Z" fill="#475569" ${st(1.6)}/></g>`;
      case 'prancheta':
        return `<g transform="translate(${hx - 1} ${hy - 18}) rotate(6)">
                <rect x="0" y="0" width="13" height="17" rx="1.6" fill="#B07A47" ${st(1.8)}/>
                <rect x="2" y="3" width="9" height="12" fill="#FFF"/>
                <rect x="4" y="-1.5" width="5" height="3" rx="1" fill="#94A3B8" ${st(1)}/>
                <path d="M3.5 7 H9.5 M3.5 10 H9.5 M3.5 13 H7.5" stroke="#64748B" stroke-width="0.9"/></g>`;
      case 'caneca_cafe':
        return `<g transform="translate(${hx - 2} ${hy - 11})">
                <rect x="0" y="0" width="9" height="10" rx="1.6" fill="#FFF" ${st(1.8)}/>
                <path d="M9 2.5 Q13 2.5 13 5.5 Q13 8 9 8" fill="none" ${st(1.6)}/>
                <rect x="0" y="3" width="9" height="2.4" fill="#00B4D8"/>
                <path d="M2.5 -2 Q4 -4 2.5 -6 M6 -2 Q7.5 -4 6 -6" stroke="#CBD5E1" stroke-width="1.2" fill="none" stroke-linecap="round"/></g>`;
      case 'tablet_grafico':
        return `<g transform="translate(${hx - 2} ${hy - 17}) rotate(5)">
                <rect x="0" y="0" width="13" height="17" rx="2" fill="#0F172A" ${st(1.8)}/>
                <rect x="1.8" y="1.8" width="9.4" height="13.4" rx="0.8" fill="#0B2545"/>
                <rect x="3" y="10" width="2" height="4" fill="#00B4D8"/>
                <rect x="5.6" y="7" width="2" height="7" fill="#3CCB7F"/>
                <rect x="8.2" y="4" width="2" height="10" fill="#FFC93C"/></g>`;
      default:
        return '';
    }
  };

  const cracha = () => `
    <path d="M51.5 70 V76.5" stroke="${C}" stroke-width="1.4"/>
    <rect x="50" y="68.5" width="3" height="2.6" rx="0.8" fill="#94A3B8" ${st(1)}/>
    <rect x="46.5" y="76.5" width="10" height="12" rx="1.6" fill="#FFF" ${st(1.4)}/>
    <rect x="48" y="78.5" width="7" height="3" fill="#00B4D8"/>
    <path d="M48.5 84.5 H54.5 M48.5 86.5 H52.5" stroke="#64748B" stroke-width="0.9"/>`;

  const bengala = (esq) => cfg.mobilidade !== 'bengala' || busto ? '' : `
    <path d="M${esq.ate[0] + 2} ${esq.ate[1] - 3} Q${esq.ate[0] + 2} ${esq.ate[1] - 9} ${esq.ate[0] - 4} ${esq.ate[1] - 7} M${esq.ate[0] + 2} ${esq.ate[1] - 3} L${esq.ate[0] - 4} 112"
          stroke="${C}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M${esq.ate[0] + 2} ${esq.ate[1] - 3} Q${esq.ate[0] + 2} ${esq.ate[1] - 9} ${esq.ate[0] - 4} ${esq.ate[1] - 7} M${esq.ate[0] + 2} ${esq.ate[1] - 3} L${esq.ate[0] - 4} 112"
          stroke="#E8EEF5" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M${esq.ate[0] - 3.4} 104 L${esq.ate[0] - 4} 108" stroke="#E8484F" stroke-width="2.4" stroke-linecap="round"/>`;

  const extrasReacao = () => {
    if (assustado) return `<path d="M86 30 Q83 35 86 38 Q89 35 86 30 Z" fill="#9BE7FF" ${st(1.2)}/>`;
    if (comemorando) return `
      <path d="M22 40 l2 -5 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 Z" fill="#FFC93C" ${st(1)}/>
      <path d="M96 30 l1.5 -4 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 Z" fill="#FFC93C" ${st(1)}/>`;
    return '';
  };

  // ------------------------------------------------------------- MONTAGEM
  const br = bracos();
  const cadeiraBraco = cadeira && !busto ? `<path d="M38 82 H50 M70 82 H82" stroke="${C}" stroke-width="3" stroke-linecap="round"/>` : '';
  const deslocY = pulando ? -6 : (cadeira ? 2 : 0);

  const figura = `
    ${cadeiraTras()}
    <g transform="translate(0 ${deslocY})">
      ${cabeloTras()}
      ${pernas()}
      ${torso()}
      ${busto ? '' : br.svg}
      ${cadeiraBraco}
      ${cabeca()}
      <g clip-path="url(#${uid}-cranio)">${cabeloFrenteRecortado()}</g>
      <circle cx="${HX}" cy="${HY}" r="${HR}" fill="none" ${st()}/>
      ${bochechas()}
      ${barba()}
      ${olhos()}
      ${sobrancelhas()}
      ${nariz()}
      ${boca()}
      ${cabeloFrente()}
      ${acessorioRosto()}
      ${acessorioCabeca()}
      ${itemMao(br.dir)}
      ${busto ? '' : br.maos}
      ${bengala(br.esq)}
      ${extrasReacao()}
    </g>`;

  const viewBox = busto ? '18 4 84 84' : '0 0 120 130';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" class="avatar-chibi-svg modo-${modo} reacao-${reacao}" shape-rendering="geometricPrecision">
    <defs>
      <clipPath id="${uid}-cranio"><circle cx="${HX}" cy="${HY}" r="${HR - 1}"/></clipPath>
      <clipPath id="${uid}-lado"><rect x="62" y="60" width="30" height="50"/></clipPath>
    </defs>
    ${base()}
    ${figura}
  </svg>`;
}
