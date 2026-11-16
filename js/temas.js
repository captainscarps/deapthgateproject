// js/temas.js - Agrupamento dos temas das cartas em macro-temas pedagógicos
// Usado no relatório de aprendizagem (fim da partida) e no Duelo.

export const MACRO_TEMAS = {
  lgpd: { id: 'lgpd', nome: 'LGPD & Privacidade', cor: '#3CCB7F' },
  ia: { id: 'ia', nome: 'IA Responsável', cor: '#00B4D8' },
  seguranca: { id: 'seguranca', nome: 'Segurança da Informação', cor: '#FF7A3D' },
  governanca: { id: 'governanca', nome: 'Governança & Qualidade de Dados', cor: '#FFC93C' }
};

const PREFIXOS = [
  ['lgpd', 'lgpd'], ['privacidade', 'lgpd'], ['descarte', 'lgpd'], ['acesso', 'lgpd'],
  ['ia', 'ia'], ['vies', 'ia'], ['overfitting', 'ia'], ['alucina', 'ia'],
  ['senha', 'seguranca'], ['phishing', 'seguranca'], ['redes', 'seguranca'], ['pendrive', 'seguranca'],
  ['backup', 'seguranca'], ['software', 'seguranca'], ['vazamento', 'seguranca'],
  ['seguranca', 'seguranca'], ['resposta_incidentes', 'seguranca'],
  ['governanca', 'governanca'], ['qualidade', 'governanca'], ['reuso', 'governanca'],
  ['dados_desatualizados', 'governanca'], ['auditoria', 'governanca'], ['conformidade', 'governanca']
];

/**
 * Converte o tema bruto de uma carta (ex.: "ia_alucinacao") no macro-tema.
 * @param {string} tema
 * @returns {string} id do macro-tema
 */
export function macroTema(tema = '') {
  const t = String(tema || '').toLowerCase();
  // "governanca_ia" é governança de IA: conta para IA Responsável
  if (t === 'governanca_ia') return 'ia';
  for (const [prefixo, macro] of PREFIXOS) {
    if (t.startsWith(prefixo)) return macro;
  }
  return 'governanca';
}

/**
 * Gera o relatório de aprendizagem a partir das respostas por macro-tema.
 * @param {Record<string, {acertos:number,total:number}>} respostas
 * @returns {{ temas: Array<{id,nome,cor,acertos,total,taxa}>, forte: object|null, reforcar: object|null }}
 */
export function relatorioAprendizagem(respostas = {}) {
  const temas = Object.values(MACRO_TEMAS)
    .map(m => {
      const r = respostas[m.id] || { acertos: 0, total: 0 };
      return { ...m, acertos: r.acertos, total: r.total, taxa: r.total ? r.acertos / r.total : null };
    })
    .filter(t => t.total > 0)
    .sort((a, b) => b.taxa - a.taxa || b.total - a.total);

  const forte = temas.find(t => t.taxa >= 0.67) || null;
  const piores = [...temas].sort((a, b) => a.taxa - b.taxa || b.total - a.total);
  const reforcar = piores.find(t => t.taxa < 0.67 && t !== forte) || null;
  return { temas, forte, reforcar };
}
