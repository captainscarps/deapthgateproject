// js/regras.js - Efeitos, checkpoints, pontuação e limites (funções puras)
// NUNCA ACESSA O DOM

export const CONSTANTES = {
  TOKENS_INICIAIS: 20,
  CASA_INICIAL: 0,
  CASA_FINAL: 30,
  DADO_MIN: 1,
  DADO_MAX: 6,
  BONUS_CHECKPOINT_10: 3,
  BONUS_CHECKPOINT_20: 5,
  BONUS_CHECKPOINT_30: 0,
  MAX_RODADAS: 35
};

/**
 * Garante que a posição permaneça estritamente entre CASA_INICIAL (0) e CASA_FINAL (30)
 * @param {number} pos
 * @returns {number}
 */
export function limitarPosicao(pos) {
  if (typeof pos !== 'number' || isNaN(pos)) return CONSTANTES.CASA_INICIAL;
  return Math.max(CONSTANTES.CASA_INICIAL, Math.min(CONSTANTES.CASA_FINAL, Math.floor(pos)));
}

/**
 * Verifica passagem ou parada em checkpoints.
 * Regra: O bônus é concedido APENAS na PRIMEIRA vez que o peão alcança ou ultrapassa o checkpoint.
 * Voltar casas e passar novamente NÃO concede bônus.
 * 
 * @param {number} posicaoAnterior
 * @param {number} novaPosicao
 * @param {Iterable<number>|Array<number>} checkpointsPassados - Lista ou Set dos checkpoints já premiados
 * @returns {{ bonusTokens: number, novosCheckpoints: number[], fimDePartida: boolean }}
 */
export function verificarCheckpoints(posicaoAnterior, novaPosicao, checkpointsPassados = []) {
  const visitados = new Set(checkpointsPassados || []);
  const novos = [];
  let bonusTokens = 0;

  // Só verifica avanço para frente
  if (novaPosicao > posicaoAnterior) {
    if (posicaoAnterior < 10 && novaPosicao >= 10 && !visitados.has(10)) {
      bonusTokens += CONSTANTES.BONUS_CHECKPOINT_10;
      novos.push(10);
      visitados.add(10);
    }
    if (posicaoAnterior < 20 && novaPosicao >= 20 && !visitados.has(20)) {
      bonusTokens += CONSTANTES.BONUS_CHECKPOINT_20;
      novos.push(20);
      visitados.add(20);
    }
    if (novaPosicao >= 30 && !visitados.has(30)) {
      bonusTokens += CONSTANTES.BONUS_CHECKPOINT_30;
      novos.push(30);
      visitados.add(30);
    }
  }

  const fimDePartida = novaPosicao >= CONSTANTES.CASA_FINAL;

  return {
    bonusTokens,
    novosCheckpoints: Array.from(visitados),
    fimDePartida
  };
}

/**
 * Aplica um efeito de carta ou evento sobre o estado (função pura).
 * @param {Object} estado
 * @param {Object} efeito
 * @returns {Object} Novo estado atualizado
 */
export function aplicarEfeito(estado, efeito = {}) {
  const copia = { ...estado };
  const checkpointsPassados = new Set(copia.checkpoints_passados || []);

  const deltaTokens = Number(efeito.tokens || 0);
  const deltaMover = Number(efeito.mover || 0);

  // Movimento de casas
  let novaPosicao = copia.posicao;
  let bonusCheckpoints = 0;

  if (deltaMover !== 0) {
    const posCalculada = limitarPosicao(copia.posicao + deltaMover);
    const cpRes = verificarCheckpoints(copia.posicao, posCalculada, checkpointsPassados);
    novaPosicao = posCalculada;
    bonusCheckpoints = cpRes.bonusTokens;
    cpRes.novosCheckpoints.forEach(cp => checkpointsPassados.add(cp));
  }

  // Tokens (nunca negativos)
  const tokensCalculados = Math.max(0, (copia.tokens ?? CONSTANTES.TOKENS_INICIAIS) + deltaTokens + bonusCheckpoints);

  // Atualização de contadores
  let acertos = copia.acertos_desafio || 0;
  if (efeito.correta === true) {
    acertos++;
  }

  let bonusPenseAntes = copia.bonus_pense_antes || 0;
  if (efeito.bonus_pense_antes === true) {
    bonusPenseAntes++;
  }

  let armadilhas = copia.armadilhas || 0;
  if (efeito.armadilha === true) {
    armadilhas++;
  }

  const pularRodada = efeito.pular_rodada === true ? true : (copia.pular_proxima_rodada || false);

  return {
    ...copia,
    posicao: novaPosicao,
    tokens: tokensCalculados,
    acertos_desafio: acertos,
    bonus_pense_antes: bonusPenseAntes,
    armadilhas: armadilhas,
    pular_proxima_rodada: pularRodada,
    checkpoints_passados: Array.from(checkpointsPassados)
  };
}

/**
 * Verifica se a partida terminou por qualquer uma das condições de parada
 * @param {{ posicao: number, tokens: number, rodada?: number }} params
 * @returns {boolean}
 */
export function isFimDePartida({ posicao, tokens, rodada = 0 }) {
  if (posicao >= CONSTANTES.CASA_FINAL) return true;
  if (tokens <= 0) return true;
  if (rodada >= CONSTANTES.MAX_RODADAS) return true;
  return false;
}

/**
 * Fórmula auditada oficial de pontuação:
 * (tokens * 10) + (acertos * 50) + (bonusPenseAntes * 30) + (armadilhas === 0 ? 100 : 0)
 * Retorna no mínimo 0.
 * 
 * @param {{ tokens?: number, acertos?: number, acertos_desafio?: number, bonusPenseAntes?: number, bonus_pense_antes?: number, armadilhas?: number }} params
 * @returns {number}
 */
export function calcularPontuacao(params = {}) {
  const tokens = Math.max(0, Number(params.tokens ?? params.tokensFinais ?? 0));
  const acertos = Math.max(0, Number(params.acertos ?? params.acertos_desafio ?? 0));
  const bonusPenseAntes = Math.max(0, Number(params.bonusPenseAntes ?? params.bonus_pense_antes ?? 0));
  const armadilhas = Math.max(0, Number(params.armadilhas ?? 0));

  const ptsTokens = tokens * 10;
  const ptsDesafios = acertos * 50;
  const ptsPenseAntes = bonusPenseAntes * 30;
  const bonusZeroArmadilhas = armadilhas === 0 ? 100 : 0;

  return Math.max(0, ptsTokens + ptsDesafios + ptsPenseAntes + bonusZeroArmadilhas);
}
