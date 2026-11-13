// js/regras.js - Efeitos, checkpoints, pontuação e limites (funções puras)
// NUNCA ACESSA O DOM

export const CONSTANTES = {
  TOKENS_INICIAIS: 20,
  CASA_INICIAL: 0,
  CASA_FINAL: 60,
  CASA_FINAL_LEGADO: 30,
  DADO_MIN: 1,
  DADO_MAX: 6,
  BONUS_CHECKPOINT_1: 3,
  BONUS_CHECKPOINT_2: 5,
  BONUS_CHECKPOINT_3: 0,
  BONUS_CHECKPOINT_10: 3,
  BONUS_CHECKPOINT_20: 5,
  BONUS_CHECKPOINT_30: 0,
  CHECKPOINT_1_NODO: 27,
  CHECKPOINT_2_NODO: 53,
  CHECKPOINT_3_NODO: 60,
  MAX_RODADAS: 45
};

/**
 * Garante que a posição permaneça estritamente entre CASA_INICIAL (0) e maxPos (padrão 60)
 * @param {number} pos
 * @param {number} [maxPos]
 * @returns {number}
 */
export function limitarPosicao(pos, maxPos = CONSTANTES.CASA_FINAL) {
  if (typeof pos !== 'number' || isNaN(pos)) return CONSTANTES.CASA_INICIAL;
  return Math.max(CONSTANTES.CASA_INICIAL, Math.min(maxPos, Math.floor(pos)));
}

/**
 * Verifica passagem ou parada em checkpoints.
 * Suporta o novo tabuleiro em grafo (nós 27, 53, 60) e legado (10, 20, 30).
 * Regra: O bônus é concedido APENAS na PRIMEIRA vez que o peão alcança ou ultrapassa o checkpoint.
 * Voltar casas e passar novamente NÃO concede bônus.
 * 
 * @param {number} posicaoAnterior
 * @param {number} novaPosicao
 * @param {Iterable<number>|Array<number>} checkpointsPassados - Lista ou Set dos checkpoints já premiados
 * @param {boolean} [modoGrafo=true]
 * @returns {{ bonusTokens: number, novosCheckpoints: number[], fimDePartida: boolean }}
 */
export function verificarCheckpoints(posicaoAnterior, novaPosicao, checkpointsPassados = [], modoGrafo = true) {
  const visitados = new Set(checkpointsPassados || []);
  const novos = [];
  let bonusTokens = 0;

  // Checkpoints no grafo (27: CP1, 53: CP2, 60: CP3) e legado (10, 20, 30)
  if (novaPosicao > posicaoAnterior) {
    // Checkpoint 1 (Nó 27 no grafo ou 10 no legado)
    const atingiuCp1 = (posicaoAnterior < 27 && novaPosicao >= 27) || (posicaoAnterior < 10 && novaPosicao >= 10);
    if (atingiuCp1 && !visitados.has(27) && !visitados.has(10)) {
      bonusTokens += CONSTANTES.BONUS_CHECKPOINT_1;
      novos.push(27);
      visitados.add(27);
      visitados.add(10);
    }

    // Checkpoint 2 (Nó 53 no grafo ou 20 no legado)
    const atingiuCp2 = (posicaoAnterior < 53 && novaPosicao >= 53) || (posicaoAnterior < 20 && novaPosicao >= 20);
    if (atingiuCp2 && !visitados.has(53) && !visitados.has(20)) {
      bonusTokens += CONSTANTES.BONUS_CHECKPOINT_2;
      novos.push(53);
      visitados.add(53);
      visitados.add(20);
    }

    // Checkpoint 3 / Portal Final (Nó 60 no grafo ou 30 no legado)
    const atingiuCp3 = (novaPosicao >= 60) || (!modoGrafo && novaPosicao >= 30);
    if (atingiuCp3 && !visitados.has(60) && !visitados.has(30)) {
      bonusTokens += CONSTANTES.BONUS_CHECKPOINT_3;
      novos.push(60);
      visitados.add(60);
      visitados.add(30);
    }
  }

  const fimDePartida = novaPosicao >= (modoGrafo ? 60 : 30);

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

/**
 * Auditoria oficial determinística de histórico de partida.
 * Idêntica à Edge Function registrar-partida do Supabase.
 *
 * @param {Array<{ carta_id: string, opcao_index?: number }>} historico
 * @param {Record<string, any>} [cartasDicionario]
 * @returns {{ valido: boolean, status: number, sucesso: boolean, erro?: string, tokens?: number, acertos?: number, bonus_pense_antes?: number, armadilhas?: number, pontos?: number }}
 */
export function auditarHistorico(historico, cartasDicionario = {}) {
  if (!Array.isArray(historico) || historico.length === 0) {
    return { valido: false, status: 400, sucesso: false, erro: "Histórico de jogadas vazio ou ausente." };
  }

  if (historico.length > 35) {
    return { valido: false, status: 400, sucesso: false, erro: "Número de jogadas excede o limite máximo permitido por partida (35)." };
  }

  let tokens = CONSTANTES.TOKENS_INICIAIS; // 20
  let acertos = 0;
  let bonusPenseAntes = 0;
  let armadilhas = 0;

  for (let i = 0; i < historico.length; i++) {
    const item = historico[i];
    const cartaId = String(item?.carta_id || "");
    const opIdx = Number(item?.opcao_index ?? 0);

    const carta = cartasDicionario[cartaId];
    if (!carta) {
      return {
        valido: false,
        status: 400,
        sucesso: false,
        erro: `Carta inexistente ou não autorizada no histórico: '${cartaId}'.`
      };
    }

    if (carta.opcoes && Array.isArray(carta.opcoes) && carta.opcoes.length > 0) {
      if (opIdx < 0 || opIdx >= carta.opcoes.length) {
        return {
          valido: false,
          status: 400,
          sucesso: false,
          erro: `Índice de opção inválido (${opIdx}) para a carta '${cartaId}'.`
        };
      }
      const opcao = carta.opcoes[opIdx];
      tokens += Number(opcao?.tokens || 0);

      if (carta.categoria === "desafio" && opcao?.correta === true) {
        acertos++;
      }
      if (opcao?.bonus_pense_antes === true) {
        bonusPenseAntes++;
      }
    } else if (carta.efeito) {
      tokens += Number(carta.efeito?.tokens || 0);
      if (carta.categoria === "armadilha" || carta.efeito?.armadilha === true) {
        armadilhas++;
      }
    }
  }

  // Bônus oficiais dos checkpoints: Casa 10 (+3), Casa 20 (+5), Casa 30 (+0)
  tokens += CONSTANTES.BONUS_CHECKPOINT_10 + CONSTANTES.BONUS_CHECKPOINT_20;
  tokens = Math.max(0, tokens);

  const pontos = calcularPontuacao({
    tokens,
    acertos,
    bonusPenseAntes,
    armadilhas
  });

  return {
    valido: true,
    status: 200,
    sucesso: true,
    tokens,
    acertos,
    bonus_pense_antes: bonusPenseAntes,
    armadilhas,
    pontos
  };
}
