// js/rng.js - RNG determinístico mulberry32 e hash cyrb53
// NUNCA ACESSA O DOM

/**
 * Função de hash determinística de 53 bits (cyrb53)
 * @param {string} str - String a ser hasheada
 * @param {number} seed - Semente opcional
 * @returns {number} Inteiro positivo determinístico
 */
export function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * Gerador de números pseudoaleatórios mulberry32
 * @param {number} a - Semente inteira de 32 bits
 * @returns {() => number} Função que retorna número float no intervalo [0, 1)
 */
export function mulberry32(a) {
  let s = Math.floor(a) >>> 0;
  return function() {
    let t = s += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Cria uma instância de RNG determinístico
 * @param {string|number} semente - Semente numérica ou texto (ex: "2026-W46")
 * @returns {{ proximo: () => number, inteiro: (min: number, max: number) => number, embaralhar: <T>(arr: T[]) => T[] }}
 */
export function criarRng(semente) {
  const seedNum = typeof semente === 'string' ? cyrb53(semente) : (semente || 0);
  const rawRng = mulberry32(seedNum);

  return {
    /**
     * Retorna número float no intervalo [0, 1)
     */
    proximo() {
      return rawRng();
    },

    /**
     * Retorna inteiro inclusivo no intervalo [min, max]
     */
    inteiro(min, max) {
      const mn = Math.ceil(min);
      const mx = Math.floor(max);
      return Math.floor(rawRng() * (mx - mn + 1)) + mn;
    },

    /**
     * Embaralha um array de forma determinística (Fisher-Yates) e retorna nova cópia
     */
    embaralhar(array) {
      const copia = [...array];
      for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(rawRng() * (i + 1));
        const temp = copia[i];
        copia[i] = copia[j];
        copia[j] = temp;
      }
      return copia;
    }
  };
}
