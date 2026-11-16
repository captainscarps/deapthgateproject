// js/perguntas.js - Banco de perguntas compartilhado entre os jogos
// Junta data/perguntas.json com as cartas de múltipla escolha da Trilha (cartas_fallback.json),
// convertendo tudo para o mesmo formato:
//   { id, categoria, nivel, pergunta, alternativas: string[], correta: number, explicacao, status? }
import { macroTema } from './temas.js';

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

async function lerJson(url) {
  try {
    const r = await fetch(url);
    if (r.ok) return await r.json();
  } catch (_) {}
  return null;
}

function converterCarta(c) {
  const correta = c.opcoes.findIndex(o => o.correta);
  if (correta < 0) return null;
  return {
    id: `carta_${c.id}`,
    categoria: c.categoria === 'pense_antes' ? 'pense_antes' : macroTema(c.tema),
    nivel: c.nivel || 1,
    pergunta: c.texto,
    alternativas: c.opcoes.map(o => o.texto),
    correta,
    explicacao: c.opcoes[correta].feedback || '',
    origem: 'trilha'
  };
}

/** Carrega (uma vez) o banco completo, agrupado por categoria. */
export async function carregarBanco() {
  if (cache) return cache;
  const [proprio, cartas] = await Promise.all([lerJson('data/perguntas.json'), lerJson('data/cartas_fallback.json')]);
  const lista = [...((proprio && proprio.perguntas) || [])];
  (Array.isArray(cartas) ? cartas : [])
    .filter(c => Array.isArray(c.opcoes) && c.opcoes.length >= 2)
    .forEach(c => { const p = converterCarta(c); if (p) lista.push(p); });

  const porCategoria = Object.fromEntries(CATEGORIAS.map(c => [c.id, []]));
  lista.forEach(p => { if (porCategoria[p.categoria]) porCategoria[p.categoria].push(p); });
  cache = { lista, porCategoria };
  return cache;
}
