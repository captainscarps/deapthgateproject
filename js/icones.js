// js/icones.js - Ícones SVG da interface (substituem emojis, conforme regra de design)
// Traço consistente: currentColor, stroke-width 2.2, cantos arredondados.

const base = (paths, vb = '0 0 24 24') =>
  `<svg class="ico" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const ICO = {
  dado: base('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>'),
  token: base('<path d="M12 2.8 20 7.4v9.2L12 21.2 4 16.6V7.4Z"/><path d="M12 7.5v9M9.5 9.5h4a1.8 1.8 0 0 1 0 3.5h-3a1.8 1.8 0 0 0 0 3.5h4"/>'),
  parar: base('<rect x="5" y="5" width="14" height="14" rx="3"/>'),
  escudo: base('<path d="M12 3 19.5 6v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6Z"/><path d="m8.8 12 2.2 2.2 4.4-4.4"/>'),
  lupa: base('<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/>'),
  alvo: base('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.8" fill="currentColor"/>'),
  plano: base('<path d="M3 20h18M4 20 12 4l8 16"/>'),
  trofeu: base('<path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H4.5v1.5A3 3 0 0 0 7.5 10.5M17 6h2.5v1.5a3 3 0 0 1-3 3"/><path d="M12 14v3.5M8.5 20.5h7M9.5 17.5h5v3h-5z"/>'),
  ranking: base('<path d="M4 20V13h4v7M10 20V8h4v12M16 20v-5h4v5"/>'),
  espadas: base('<path d="M14.5 4.5 20 4l-.5 5.5L9 20l-2-2Z"/><path d="M9.5 4.5 4 4l.5 5.5L15 20l2-2Z" opacity=".55"/><path d="m5 15 4 4M15 19l4-4"/>'),
  relogio: base('<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M9.5 2.8h5"/>'),
  raio: base('<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6Z"/>'),
  check: base('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  x: base('<path d="M6 6l12 12M18 6 6 18"/>'),
  alerta: base('<path d="M12 3.5 21.5 20h-19Z"/><path d="M12 10v4.5M12 17.4v.1"/>'),
  lampada: base('<path d="M9 17.5h6M10 20.5h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z"/>'),
  seta: base('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  voltar: base('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  repetir: base('<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7M20 4v4.7h-4.7M20 12a8 8 0 0 1-13.7 5.6L4 15.3M4 20v-4.7h4.7"/>'),
  coroa: base('<path d="M3.5 8 7.5 12 12 5l4.5 7 4-4-1.8 10.5H5.3Z"/>'),
  setaCima: base('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  setaBaixo: base('<path d="M12 5v14M6 13l6 6 6-6"/>'),
  usuarios: base('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>'),
  caixa: base('<path d="M3.5 13.5 6 5h12l2.5 8.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19Z"/><path d="M3.5 13.5H9l1 2h4l1-2h5.5"/>'),
  livro: base('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>'),
  fogo: base('<path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-4.5-4-6.5-4.5-11-3 2-4.5 5-4.5 7-1-.5-2-2-2-3.5-1.5 1.5-2 4-2 7.5A6.5 6.5 0 0 0 12 21Z"/>')
};

/** Retorna o SVG de um ícone pelo nome (string vazia se não existir). */
export function ico(nome) {
  return ICO[nome] || '';
}
