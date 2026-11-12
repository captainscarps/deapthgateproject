// js/deck.js - Carga de cartas, validação, geração de tabuleiro e compra
// NUNCA ACESSA O DOM

import { criarRng } from './rng.js';

export const CATEGORIAS_VALIDAS = [
  "pense_antes",
  "boa_pratica",
  "armadilha",
  "desafio",
  "conexao",
  "evento"
];

/**
 * Retorna a semana ISO atual no formato "YYYY-Www" (ex: "2026-W46")
 * @param {Date} [data=new Date()]
 * @returns {string}
 */
export function semanaAtual(data = new Date()) {
  const d = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
  const diaNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - diaNum);
  const anoInicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const semanaNo = Math.ceil((((d.getTime() - anoInicio.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(semanaNo).padStart(2, '0')}`;
}

/**
 * Retorna a semana ISO imediatamente anterior
 * @param {Date} [data=new Date()]
 * @returns {string}
 */
export function semanaAnterior(data = new Date()) {
  const passada = new Date(data.getTime() - (7 * 24 * 60 * 60 * 1000));
  return semanaAtual(passada);
}

/**
 * Valida a integridade da estrutura de uma carta
 * @param {Object} carta
 * @returns {boolean}
 */
export function validarCarta(carta) {
  if (!carta || typeof carta !== 'object') return false;
  const obrigatorios = ['id', 'categoria', 'tema', 'texto'];
  for (const c of obrigatorios) {
    if (!carta[c] || String(carta[c]).trim() === '') return false;
  }
  if (!CATEGORIAS_VALIDAS.includes(carta.categoria)) return false;

  // Deve possuir 'opcoes' válidas ou 'efeito'
  const temOpcoes = Array.isArray(carta.opcoes) && carta.opcoes.length > 0;
  const temEfeito = carta.efeito && typeof carta.efeito === 'object';
  return temOpcoes || temEfeito;
}

/**
 * Carrega a lista de cartas, tentando URL remota e fazendo fallback local
 * @param {string} [urlRemota]
 * @returns {Promise<Array<Object>>}
 */
export async function carregarCartas(urlRemota = null) {
  if (urlRemota) {
    try {
      const resp = await fetch(urlRemota);
      if (resp.ok) {
        const dados = await resp.json();
        const lista = Array.isArray(dados) ? dados : (dados.json || []);
        const validas = lista.filter(validarCarta);
        if (validas.length > 0) return validas;
      }
    } catch (e) {
      // Falha silenciosa, segue para o fallback local
    }
  }

  // Fallback local garantido
  const respLocal = await fetch('data/cartas_fallback.json');
  const dadosLocal = await respLocal.json();
  return (Array.isArray(dadosLocal) ? dadosLocal : []).filter(validarCarta);
}

/**
 * Gera um tabuleiro determinístico de 31 casas (0 a 30)
 * Regras:
 * - Casa 0: "inicio"
 * - Casas 10, 20, 30: "checkpoint"
 * - 27 casas normais distribuídas nas 6 categorias
 * - Máx. 5 por categoria
 * - Nenhuma categoria com mais casas do que cartas disponíveis
 * - Sem armadilhas seguidas
 * 
 * @param {string|number|Object} sementeOuRng - Semente semanal ou instância do RNG
 * @param {Object<string, Array>} [cartasPorCategoria] - Opcional para validação de contagem
 * @returns {string[]} Array com 31 posições (índices 0 a 30)
 */
export function gerarTabuleiro(semanaOuRng = semanaAtual(), cartasPorCategoria = null) {
  const rng = (semanaOuRng && typeof semanaOuRng.embaralhar === 'function')
    ? semanaOuRng
    : criarRng(typeof semanaOuRng === 'string' ? `${semanaOuRng}_cartas` : semanaOuRng);

  const tabuleiro = new Array(31).fill(null);
  tabuleiro[0] = "inicio";
  tabuleiro[10] = "checkpoint";
  tabuleiro[20] = "checkpoint";
  tabuleiro[30] = "checkpoint";

  // Alvo de 27 casas: 4 para cada uma das 6 categorias (24) + 1 para 3 categorias (27)
  // Cada categoria terá no máximo 5 casas
  const contagemAlvo = {};
  for (const cat of CATEGORIAS_VALIDAS) {
    contagemAlvo[cat] = 4;
  }
  contagemAlvo["pense_antes"] = 5;
  contagemAlvo["boa_pratica"] = 5;
  contagemAlvo["desafio"] = 5;

  const pool = [];
  for (const cat of CATEGORIAS_VALIDAS) {
    let qtd = contagemAlvo[cat];
    if (cartasPorCategoria && Array.isArray(cartasPorCategoria[cat])) {
      qtd = Math.min(qtd, cartasPorCategoria[cat].length);
    }
    for (let i = 0; i < qtd; i++) {
      pool.push(cat);
    }
  }

  // Se faltar para completar 27 casas, preenche respeitando limite de 5 por categoria
  while (pool.length < 27) {
    let preencheu = false;
    for (const cat of CATEGORIAS_VALIDAS) {
      const usadas = pool.filter(c => c === cat).length;
      const limite = cartasPorCategoria && Array.isArray(cartasPorCategoria[cat])
        ? Math.min(5, cartasPorCategoria[cat].length)
        : 5;
      if (usadas < limite) {
        pool.push(cat);
        preencheu = true;
        if (pool.length === 27) break;
      }
    }
    if (!preencheu) {
      pool.push("boa_pratica");
    }
  }

  // Embaralhamento determinístico
  const poolEmbaralhado = rng.embaralhar(pool);

  // Preenche posições não-checkpoints
  let idxPool = 0;
  for (let c = 1; c <= 30; c++) {
    if (c === 10 || c === 20 || c === 30) continue;
    tabuleiro[c] = poolEmbaralhado[idxPool++];
  }

  // Regra: Sem duas armadilhas seguidas
  for (let casa = 1; casa < 30; casa++) {
    if (tabuleiro[casa] === "armadilha") {
      let proxima = casa + 1;
      if (proxima === 10 || proxima === 20 || proxima === 30) {
        proxima++;
      }
      if (proxima < 30 && tabuleiro[proxima] === "armadilha") {
        // Encontra o próximo candidato que não seja armadilha nem checkpoint
        for (let cand = proxima + 1; cand < 30; cand++) {
          if (cand === 10 || cand === 20 || cand === 30) continue;
          if (tabuleiro[cand] !== "armadilha") {
            tabuleiro[proxima] = tabuleiro[cand];
            tabuleiro[cand] = "armadilha";
            break;
          }
        }
      }
    }
  }

  return tabuleiro;
}

/**
 * Gerenciador de Deck com suporte a compra determinística e reembaralho automático ao esgotar
 */
export class DeckManager {
  /**
   * @param {Array<Object>} cartas - Lista de cartas válidas
   * @param {string|number|Object} [sementeOuRng] - Semente ou RNG
   */
  constructor(cartas = [], sementeOuRng = semanaAtual()) {
    this.rng = (sementeOuRng && typeof sementeOuRng.embaralhar === 'function')
      ? sementeOuRng
      : criarRng(typeof sementeOuRng === 'string' ? `${sementeOuRng}_cartas` : sementeOuRng);

    this.todasCartas = cartas.filter(validarCarta);
    this.cartasPorCategoria = {};
    this.cartasDisponiveis = {};
    this.cartasUsadas = {};

    for (const cat of CATEGORIAS_VALIDAS) {
      this.cartasPorCategoria[cat] = [];
      this.cartasDisponiveis[cat] = [];
      this.cartasUsadas[cat] = [];
    }

    for (const c of this.todasCartas) {
      if (this.cartasPorCategoria[c.categoria]) {
        this.cartasPorCategoria[c.categoria].push(c);
      }
    }

    this.reiniciar();
  }

  /**
   * Reinicia o deck embaralhando todas as cartas por categoria
   */
  reiniciar() {
    for (const cat of CATEGORIAS_VALIDAS) {
      this.cartasUsadas[cat] = [];
      this.cartasDisponiveis[cat] = this.rng.embaralhar(this.cartasPorCategoria[cat]);
    }
  }

  /**
   * Compra a próxima carta da categoria.
   * Se as disponíveis esgotarem, reembaralha automaticamente as cartas usadas daquela categoria.
   * 
   * @param {string} categoria
   * @returns {Object|null}
   */
  comprarCarta(categoria) {
    if (!CATEGORIAS_VALIDAS.includes(categoria)) return null;

    let disponiveis = this.cartasDisponiveis[categoria];

    // Se acabou, reembaralha as usadas
    if (!disponiveis || disponiveis.length === 0) {
      const usadas = this.cartasUsadas[categoria] || [];
      if (usadas.length === 0) {
        // Fallback: se não havia nem usadas, busca do catálogo base
        const base = this.cartasPorCategoria[categoria] || [];
        if (base.length === 0) return null;
        this.cartasDisponiveis[categoria] = this.rng.embaralhar(base);
      } else {
        this.cartasDisponiveis[categoria] = this.rng.embaralhar(usadas);
        this.cartasUsadas[categoria] = [];
      }
      disponiveis = this.cartasDisponiveis[categoria];
    }

    const carta = disponiveis.shift();
    if (carta) {
      this.cartasUsadas[categoria].push(carta);
    }
    return carta || null;
  }
}
