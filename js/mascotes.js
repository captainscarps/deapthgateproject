// js/mascotes.js - Mascotes das categorias da Roleta da Governança
// Cada categoria tem um personagem "blob" com acessório próprio (estilo party game).
//   mascote(id, { humor: 'feliz' | 'triste' | 'surpreso' | 'piscando' })
const C = '#05101F';

const CORES = {
  lgpd: ['#3CCB7F', '#7BE3A9'],
  ia: ['#00B4D8', '#6FE3FF'],
  seguranca: ['#FF7A3D', '#FFB08A'],
  governanca: ['#FFC93C', '#FFE38F'],
  politicas: ['#B98CFF', '#DCC6FF'],
  pense_antes: ['#FF5D8F', '#FFA3C0'],
  coroa: ['#FFFFFF', '#FFFFFF']
};

const NOMES = {
  lgpd: 'Lia, a Guardiã da Privacidade',
  ia: 'Bit, o Robô Consciente',
  seguranca: 'Duda, a Vigia da Rede',
  governanca: 'Gus, o Curador de Dados',
  politicas: 'Polly, a Conselheira',
  pense_antes: 'Pipo, o Pensador',
  coroa: 'Coroa'
};

export function nomeMascote(id) {
  return NOMES[id] || '';
}

function olhos(humor) {
  if (humor === 'piscando') {
    return `<path d="M30 50 Q38 44 46 50" stroke="${C}" stroke-width="4" fill="none" stroke-linecap="round"/>
            <ellipse cx="62" cy="50" rx="8" ry="10" fill="#FFF" stroke="${C}" stroke-width="3"/>
            <circle cx="63.5" cy="52" r="4.6" fill="${C}"/><circle cx="65.5" cy="49" r="1.6" fill="#FFF"/>`;
  }
  const ry = humor === 'surpreso' ? 11.5 : 10;
  const pr = humor === 'surpreso' ? 3.4 : 4.6;
  const py = humor === 'triste' ? 54 : 52;
  return [38, 62].map(x => `
    <ellipse cx="${x}" cy="50" rx="8" ry="${ry}" fill="#FFF" stroke="${C}" stroke-width="3"/>
    <circle cx="${x + 1.5}" cy="${py}" r="${pr}" fill="${C}"/>
    <circle cx="${x + 3.4}" cy="${py - 3}" r="1.6" fill="#FFF"/>`).join('') +
    (humor === 'triste' ? `<path d="M29 38 L45 42 M71 38 L55 42" stroke="${C}" stroke-width="3.4" stroke-linecap="round"/>` : '');
}

function boca(humor) {
  switch (humor) {
    case 'triste': return `<path d="M42 72 Q50 66 58 72" stroke="${C}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case 'surpreso': return `<ellipse cx="50" cy="71" rx="5" ry="6" fill="#6B1A26" stroke="${C}" stroke-width="3"/>`;
    default: return `<path d="M39 66 Q50 79 61 66 Z" fill="#6B1A26" stroke="${C}" stroke-width="3" stroke-linejoin="round"/>
                     <path d="M44 72 Q50 75 56 72" fill="#FF7A8A"/>`;
  }
}

function acessorio(id) {
  switch (id) {
    case 'lgpd': // cadeado na cabeça + escudo na barriga
      return {
        tras: `<path d="M41 16 V9 a9 9 0 0 1 18 0 V16" fill="none" stroke="${C}" stroke-width="8" stroke-linecap="round"/>
               <path d="M41 16 V9 a9 9 0 0 1 18 0 V16" fill="none" stroke="#CBD5E1" stroke-width="4" stroke-linecap="round"/>`,
        frente: `<rect x="37" y="12" width="26" height="16" rx="4" fill="#FFC93C" stroke="${C}" stroke-width="3"/>
                 <circle cx="50" cy="19" r="2.6" fill="${C}"/><rect x="49" y="19" width="2" height="5" fill="${C}"/>`
      };
    case 'ia': // antena + parafusos
      return {
        tras: `<path d="M50 16 V4" stroke="${C}" stroke-width="3.5"/>
               <rect x="9" y="46" width="7" height="14" rx="2" fill="#94A3B8" stroke="${C}" stroke-width="2.6"/>
               <rect x="84" y="46" width="7" height="14" rx="2" fill="#94A3B8" stroke="${C}" stroke-width="2.6"/>`,
        frente: `<circle cx="50" cy="5" r="5" fill="#FFC93C" stroke="${C}" stroke-width="2.6"/>
                 <path d="M30 34 H70" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.6"/>`
      };
    case 'seguranca': // capacete com faixa
      return {
        tras: '',
        frente: `<path d="M17 38 C17 8 83 8 83 38 Z" fill="#FFC93C" stroke="${C}" stroke-width="3.5"/>
                 <path d="M12 38 H88 Q90 43 86 44 H14 Q10 43 12 38 Z" fill="#F2B21C" stroke="${C}" stroke-width="3"/>
                 <path d="M50 12 V37" stroke="#D99A12" stroke-width="4"/>
                 <circle cx="50" cy="25" r="5" fill="#FF7A3D" stroke="${C}" stroke-width="2.4"/>`
      };
    case 'governanca': // óculos quadrados + gráfico no peito
      return {
        tras: '',
        frente: `<rect x="27" y="40" width="22" height="19" rx="4" fill="#FFFFFF" fill-opacity="0.15" stroke="${C}" stroke-width="3.4"/>
                 <rect x="51" y="40" width="22" height="19" rx="4" fill="#FFFFFF" fill-opacity="0.15" stroke="${C}" stroke-width="3.4"/>
                 <path d="M49 48 H51" stroke="${C}" stroke-width="3.4"/>
                 <path d="M14 30 Q20 18 30 20 M86 30 Q80 18 70 20" stroke="${C}" stroke-width="3" fill="none" stroke-linecap="round"/>`
      };
    case 'politicas': // capelo (chapéu de formatura) com borla
      return {
        tras: '',
        frente: `<path d="M24 22 Q50 30 76 22 L76 30 Q50 38 24 30 Z" fill="#1E293B" stroke="${C}" stroke-width="3"/>
                 <path d="M50 4 L90 18 L50 30 L10 18 Z" fill="#1E293B" stroke="${C}" stroke-width="3" stroke-linejoin="round"/>
                 <path d="M50 17 L82 22 L82 38" stroke="#FFC93C" stroke-width="2.6" fill="none"/>
                 <circle cx="82" cy="40" r="3.6" fill="#FFC93C" stroke="${C}" stroke-width="2"/>`
      };
    case 'pense_antes': // lâmpada acesa na cabeça
      return {
        tras: `<g stroke="#FFE38F" stroke-width="3" stroke-linecap="round"><path d="M50 -4 V-10 M33 2 L29 -3 M67 2 L71 -3"/></g>`,
        frente: `<path d="M50 0 a11 11 0 0 1 7 19.5 V24 H43 V19.5 A11 11 0 0 1 50 0 Z" fill="#FFF3A6" stroke="${C}" stroke-width="3"/>
                 <rect x="43" y="23" width="14" height="6" rx="1.5" fill="#94A3B8" stroke="${C}" stroke-width="2.4"/>
                 <path d="M46 12 Q50 8 54 12" stroke="#FFB703" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
      };
    case 'coroa':
      return {
        tras: '',
        frente: `<path d="M24 30 L22 8 L36 18 L50 2 L64 18 L78 8 L76 30 Z" fill="#FFC93C" stroke="${C}" stroke-width="3.4" stroke-linejoin="round"/>
                 <circle cx="50" cy="20" r="3.6" fill="#E8484F" stroke="${C}" stroke-width="2"/>
                 <circle cx="34" cy="24" r="2.6" fill="#00B4D8" stroke="${C}" stroke-width="1.8"/>
                 <circle cx="66" cy="24" r="2.6" fill="#3CCB7F" stroke="${C}" stroke-width="1.8"/>`
      };
    default:
      return { tras: '', frente: '' };
  }
}

/**
 * @param {string} id - id da categoria (ou 'coroa')
 * @param {{ humor?: string, classe?: string }} [opcoes]
 */
export function mascote(id, { humor = 'feliz', classe = '' } = {}) {
  const [cor, clara] = CORES[id] || CORES.lgpd;
  const corpoCor = id === 'coroa' ? '#FFE38F' : cor;
  const barrigaCor = id === 'coroa' ? '#FFF6D0' : clara;
  const a = acessorio(id);
  return `
    <svg viewBox="0 -12 100 112" class="mascote mascote-${id} ${classe}" aria-hidden="true">
      <ellipse cx="50" cy="96" rx="28" ry="5" fill="#000" opacity="0.25"/>
      ${a.tras}
      <path d="M50 16 C77 16 89 32 89 56 C89 80 73 92 50 92 C27 92 11 80 11 56 C11 32 23 16 50 16 Z" fill="${corpoCor}" stroke="${C}" stroke-width="4"/>
      <ellipse cx="50" cy="74" rx="22" ry="13" fill="${barrigaCor}" opacity="0.55"/>
      <ellipse cx="33" cy="30" rx="9" ry="5" fill="#FFFFFF" opacity="0.35" transform="rotate(-25 33 30)"/>
      <path d="M14 66 Q6 70 9 78" stroke="${C}" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M14 66 Q6 70 9 78" stroke="${corpoCor}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <path d="M86 66 Q94 70 91 78" stroke="${C}" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M86 66 Q94 70 91 78" stroke="${corpoCor}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <ellipse cx="26" cy="63" rx="5" ry="3" fill="#FF7A8A" opacity="0.5"/>
      <ellipse cx="74" cy="63" rx="5" ry="3" fill="#FF7A8A" opacity="0.5"/>
      ${olhos(humor)}
      ${boca(humor)}
      ${a.frente}
    </svg>`;
}
