// js/perguntas.js - Banco de perguntas da Roleta da Governança (data/perguntas.json)
// Formato de cada pergunta:
//   { id, categoria, nivel, pergunta, alternativas: string[], correta: number, explicacao, status? }

export const CATEGORIAS = [
  { id: 'lgpd', nome: 'LGPD', nomeLongo: 'LGPD e Privacidade', cor: '#3CCB7F', escura: '#1F8A52', icone: 'escudo' },
  { id: 'ia', nome: 'IA', nomeLongo: 'IA Responsável', cor: '#00B4D8', escura: '#0077B6', icone: 'raio' },
  { id: 'seguranca', nome: 'Segurança', nomeLongo: 'Segurança da Informação', cor: '#FF7A3D', escura: '#C4501B', icone: 'alerta' },
  { id: 'governanca', nome: 'Governança', nomeLongo: 'Governança de Dados', cor: '#FFC93C', escura: '#C99616', icone: 'ranking' },
  { id: 'politicas', nome: 'Políticas', nomeLongo: 'Políticas SEST SENAT', cor: '#B98CFF', escura: '#7B4FCF', icone: 'livro' },
  { id: 'pense_antes', nome: 'Pense Antes', nomeLongo: 'Pense Antes', cor: '#FF5D8F', escura: '#C2315F', icone: 'lampada' }
];

export function categoria(id) {
  return CATEGORIAS.find(c => c.id === id) || CATEGORIAS[0];
}

let cache = null;

/** Status que entram no jogo. 'rascunho' e 'revisao' ficam só na área do admin. */
export const STATUS_NO_JOGO = ['aprovada', 'exemplo'];
export const CHAVE_BANCO_LOCAL = 'roleta_admin_banco_v1';

/** Modo de teste do admin: index.html?banco=local usa o banco salvo na área do admin. */
export function usandoBancoLocal() {
  try {
    return new URLSearchParams(location.search).get('banco') === 'local' && !!localStorage.getItem(CHAVE_BANCO_LOCAL);
  } catch (_) { return false; }
}

async function lerJson(url) {
  try {
    const r = await fetch(url);
    if (r.ok) return await r.json();
  } catch (_) {}
  return null;
}

/** Carrega (uma vez) o banco completo, agrupado por categoria. */
export async function carregarBanco() {
  if (cache) return cache;
  let dados = null;
  if (usandoBancoLocal()) {
    try { dados = JSON.parse(localStorage.getItem(CHAVE_BANCO_LOCAL)); } catch (_) { dados = null; }
  }
  if (!dados) dados = await lerJson('data/perguntas.json');
  const lista = ((dados && dados.perguntas) || []).filter(p =>
    STATUS_NO_JOGO.includes(p.status || 'aprovada') &&
    Array.isArray(p.alternativas) && p.alternativas.length >= 2 && p.correta >= 0 && p.correta < p.alternativas.length);

  const porCategoria = Object.fromEntries(CATEGORIAS.map(c => [c.id, []]));
  lista.forEach(p => { if (porCategoria[p.categoria]) porCategoria[p.categoria].push(p); });
  cache = { lista, porCategoria };
  return cache;
}
