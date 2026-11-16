// js/regras.js - Efeitos, checkpoints, voltas em loop, pontuação auditada e limites (funções puras)
// NUNCA ACESSA O DOM

export const CONSTANTES = {
  TOKENS_INICIAIS: 20,
  CASA_INICIAL: 0,
  CASA_FINAL: 60,
  DADO_MIN: 1,
  DADO_MAX: 6,
  BONUS_CHECKPOINT_1: 3,
  BONUS_CHECKPOINT_2: 5,
  BONUS_VOLTA_COMPLETA: 10,
  CHECKPOINT_1_NODO: 20,
  CHECKPOINT_2_NODO: 40,
  CHECKPOINT_3_NODO: 60,
  MAX_RODADAS: 400
};

// Constantes oficiais e fáceis de calibrar da nova pontuação
export const CONSTANTES_PONTUACAO = {
  PTS_POR_CASA: 5,
  PTS_POR_VOLTA: 150,
  PTS_ACERTO_DESAFIO: 50,
  PTS_BONUS_PENSE_ANTES: 30,
  PTS_BOA_PRATICA: 10,
  PENALIDADE_ARMADILHA: 20
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
 * Calcula o custo em tokens de cada rolagem do dado com base na volta atual.
 * - Volta 1 (voltas === 0): 1 token
 * - Volta 2 (voltas === 1): 2 tokens
 * - Volta 3+ (voltas >= 2): 3 tokens
 * @param {number} [voltas=0]
 * @returns {number}
 */
export function calcularCustoRolagem(voltas = 0) {
  const v = Math.max(0, Math.floor(voltas || 0));
  if (v <= 0) return 1;
  if (v === 1) return 2;
  return 3;
}

/**
 * Calcula o bônus de checkpoint aplicando a redução pela metade a cada volta completada.
 * @param {number} nodoId
 * @param {number} [voltas=0]
 * @returns {number}
 */
export function calcularBonusCheckpoint(nodoId, voltas = 0) {
  let base = 0;
  if (nodoId === 20 || nodoId === 27) {
    base = CONSTANTES.BONUS_CHECKPOINT_1; // 3
  } else if (nodoId === 40 || nodoId === 53) {
    base = CONSTANTES.BONUS_CHECKPOINT_2; // 5
  } else if (nodoId === 60) {
    base = CONSTANTES.BONUS_VOLTA_COMPLETA; // 10
  }

  if (base === 0) return 0;
  const v = Math.max(0, Math.floor(voltas || 0));
  if (v === 0) return base;
  return Math.max(1, Math.round(base / Math.pow(2, v)));
}

/**
 * Verifica passagem ou parada em checkpoints durante uma volta.
 * Suporta o novo tabuleiro em grafo (20, 40, 60) e compatibilidade com nós 27 e 53.
 * Checkpoints dão bônus 1 vez por volta.
 *
 * @param {number} posicaoAnterior
 * @param {number} novaPosicao
 * @param {Iterable<number>|Array<number>} checkpointsPassadosVolta - Checkpoints já visitados nesta volta
 * @param {number} [voltas=0] - Número de voltas completadas
 * @returns {{ bonusTokens: number, novosCheckpoints: number[], completouVolta: boolean }}
 */
export function verificarCheckpoints(posicaoAnterior, novaPosicao, checkpointsPassadosVolta = [], voltas = 0) {
  const visitados = new Set(checkpointsPassadosVolta || []);
  const novos = [];
  let bonusTokens = 0;
  let completouVolta = false;

  // Checkpoint 1 (Nó 20 / 27)
  const atingiuCp1 = (posicaoAnterior < 20 && novaPosicao >= 20) || (posicaoAnterior < 27 && novaPosicao >= 27);
  if (atingiuCp1 && !visitados.has(20) && !visitados.has(27)) {
    const b = calcularBonusCheckpoint(20, voltas);
    bonusTokens += b;
    novos.push(20);
    visitados.add(20);
  }

  // Checkpoint 2 (Nó 40 / 53)
  const atingiuCp2 = (posicaoAnterior < 40 && novaPosicao >= 40) || (posicaoAnterior < 53 && novaPosicao >= 53);
  if (atingiuCp2 && !visitados.has(40) && !visitados.has(53)) {
    const b = calcularBonusCheckpoint(40, voltas);
    bonusTokens += b;
    novos.push(40);
    visitados.add(40);
  }

  // Portal Final / Volta Completa (Nó 60)
  if (novaPosicao >= 60 && !visitados.has(60)) {
    const b = calcularBonusCheckpoint(60, voltas);
    bonusTokens += b;
    novos.push(60);
    visitados.add(60);
    completouVolta = true;
  }

  return {
    bonusTokens,
    novosCheckpoints: Array.from(visitados),
    completouVolta
  };
}

/**
 * Aplica um efeito de carta ou evento sobre o estado (função pura).
 * @param {Object} estado
 * @param {Object} efeito
 * @returns {Object} Novo estado atualizado
 */
/**
 * Sequência de acertos (combo): bônus de tokens por resposta correta consecutiva
 * em cartas de múltipla escolha (desafio e pense_antes). Erro zera a sequência.
 *  - 3ª e 4ª resposta correta seguida: +1 token
 *  - 5ª em diante: +2 tokens
 * Não altera a fórmula de pontos; afeta somente o saldo de tokens.
 * @param {number} sequencia - tamanho da sequência JÁ incluindo a resposta atual
 * @returns {number}
 */
export function calcularBonusSequencia(sequencia = 0) {
  if (sequencia >= 5) return 2;
  if (sequencia >= 3) return 1;
  return 0;
}

/**
 * Multiplicador exibido na interface para a sequência atual.
 * @param {number} sequencia
 * @returns {string|null}
 */
export function rotuloSequencia(sequencia = 0) {
  if (sequencia >= 5) return 'COMBO ×2';
  if (sequencia >= 3) return 'COMBO ×1,5';
  return null;
}

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
    const cpRes = verificarCheckpoints(copia.posicao, posCalculada, checkpointsPassados, copia.voltas_completas || 0);
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

  let boasPraticas = copia.boas_praticas || 0;
  if (efeito.boa_pratica === true || efeito.categoria === 'boa_pratica') {
    boasPraticas++;
  }

  let armadilhas = copia.armadilhas || 0;
  if (efeito.armadilha === true || efeito.categoria === 'armadilha') {
    armadilhas++;
  }

  const pularRodada = efeito.pular_rodada === true ? true : (copia.pular_proxima_rodada || false);

  return {
    ...copia,
    posicao: novaPosicao,
    tokens: tokensCalculados,
    acertos_desafio: acertos,
    bonus_pense_antes: bonusPenseAntes,
    boas_praticas: boasPraticas,
    armadilhas: armadilhas,
    pular_proxima_rodada: pularRodada,
    checkpoints_passados: Array.from(checkpointsPassados)
  };
}

/**
 * NOVA REGRA: A partida termina SOMENTE quando os tokens chegam a 0,
 * ou quando o jogador escolhe encerrar voluntariamente.
 * O Portal NÃO encerra a partida (conta volta e continua para a casa 0).
 *
 * @param {{ tokens: number, encerrouVoluntariamente?: boolean, rodada?: number }} params
 * @returns {boolean}
 */
export function isFimDePartida({ tokens, encerrouVoluntariamente = false, rodada = 0 }) {
  if (encerrouVoluntariamente === true) return true;
  if (typeof tokens === 'number' && tokens <= 0) return true;
  if (rodada >= CONSTANTES.MAX_RODADAS) return true;
  return false;
}

/**
 * Nova pontuação auditada oficial em loop:
 * pontos = casas_avancadas*5 + voltas*150 + acertos_desafio*50 + bonus_pense_antes*30
 *          + boas_praticas*10 - armadilhas*20 (mínimo 0)
 *
 * @param {{
 *   casas_avancadas?: number,
 *   casasAvancadas?: number,
 *   voltas?: number,
 *   voltas_completas?: number,
 *   acertos?: number,
 *   acertos_desafio?: number,
 *   bonusPenseAntes?: number,
 *   bonus_pense_antes?: number,
 *   boasPraticas?: number,
 *   boas_praticas?: number,
 *   armadilhas?: number
 * }} params
 * @returns {number}
 */
export function calcularPontuacao(params = {}) {
  const casasAvancadas = Math.max(0, Number(params.casas_avancadas ?? params.casasAvancadas ?? 0));
  const voltas = Math.max(0, Number(params.voltas ?? params.voltas_completas ?? 0));
  const acertos = Math.max(0, Number(params.acertos ?? params.acertos_desafio ?? 0));
  const bonusPenseAntes = Math.max(0, Number(params.bonusPenseAntes ?? params.bonus_pense_antes ?? 0));
  const boasPraticas = Math.max(0, Number(params.boas_praticas ?? params.boasPraticas ?? 0));
  const armadilhas = Math.max(0, Number(params.armadilhas ?? 0));

  const ptsCasas = casasAvancadas * CONSTANTES_PONTUACAO.PTS_POR_CASA;
  const ptsVoltas = voltas * CONSTANTES_PONTUACAO.PTS_POR_VOLTA;
  const ptsDesafios = acertos * CONSTANTES_PONTUACAO.PTS_ACERTO_DESAFIO;
  const ptsPenseAntes = bonusPenseAntes * CONSTANTES_PONTUACAO.PTS_BONUS_PENSE_ANTES;
  const ptsBoasPraticas = boasPraticas * CONSTANTES_PONTUACAO.PTS_BOA_PRATICA;
  const penalidadeArmadilhas = armadilhas * CONSTANTES_PONTUACAO.PENALIDADE_ARMADILHA;

  const total = ptsCasas + ptsVoltas + ptsDesafios + ptsPenseAntes + ptsBoasPraticas - penalidadeArmadilhas;
  return Math.max(0, total);
}

/**
 * Auditoria oficial determinística de histórico de partida.
 * Idêntica à Edge Function registrar-partida do Supabase (teto de segurança: 400 itens).
 *
 * @param {Array<{ carta_id?: string, opcao_index?: number, casas_andadas?: number, tipo?: string, custo_rolagem?: number }>} historico
 * @param {Record<string, any>} [cartasDicionario]
 * @param {Object} [metaPartida]
 * @returns {{ valido: boolean, status: number, sucesso: boolean, erro?: string, tokens?: number, acertos?: number, bonus_pense_antes?: number, boas_praticas?: number, armadilhas?: number, voltas?: number, casas_avancadas?: number, pontos?: number }}
 */
export function auditarHistorico(historico, cartasDicionario = {}, metaPartida = {}) {
  if (!Array.isArray(historico) || historico.length === 0) {
    return { valido: false, status: 400, sucesso: false, erro: "Histórico de jogadas vazio ou ausente." };
  }

  if (historico.length > CONSTANTES.MAX_RODADAS) {
    return { valido: false, status: 400, sucesso: false, erro: `Número de jogadas excede o teto de segurança permitido por partida (${CONSTANTES.MAX_RODADAS}).` };
  }

  let tokens = CONSTANTES.TOKENS_INICIAIS; // 20
  let acertos = 0;
  let bonusPenseAntes = 0;
  let boasPraticas = 0;
  let armadilhas = 0;
  let casasAvancadas = 0;
  let voltas = 0;
  let sequencia = 0;

  for (let i = 0; i < historico.length; i++) {
    const item = historico[i];
    
    // Contabiliza avanço de casas se informado
    if (item.casas_andadas) {
      casasAvancadas += Number(item.casas_andadas);
    }

    // Contabiliza dedução do custo da rolagem
    if (item.custo_rolagem) {
      tokens = Math.max(0, tokens - Number(item.custo_rolagem));
    }

    if (item.completou_volta) {
      voltas++;
      tokens += calcularBonusCheckpoint(60, voltas - 1);
    }
    if (item.checkpoint_atingido) {
      tokens += calcularBonusCheckpoint(item.checkpoint_atingido, voltas);
    }

    const cartaId = item?.carta_id ? String(item.carta_id) : "";
    if (!cartaId) continue;

    const carta = cartasDicionario[cartaId];
    if (!carta) {
      return {
        valido: false,
        status: 400,
        sucesso: false,
        erro: `Carta inexistente ou não autorizada no histórico: '${cartaId}'.`
      };
    }

    const opIdx = Number(item?.opcao_index ?? 0);

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
      // Sequência de acertos (combo) — espelha StateManager.registrarResposta
      if (opcao?.correta === true) {
        sequencia++;
        tokens += calcularBonusSequencia(sequencia);
      } else {
        sequencia = 0;
      }
      if (opcao?.bonus_pense_antes === true) {
        bonusPenseAntes++;
      }
    } else if (carta.efeito) {
      tokens += Number(carta.efeito?.tokens || 0);
      if (carta.categoria === "armadilha" || carta.efeito?.armadilha === true) {
        armadilhas++;
      }
      if (carta.categoria === "boa_pratica" || carta.efeito?.boa_pratica === true) {
        boasPraticas++;
      }
    }
    tokens = Math.max(0, tokens);
  }

  // Usa metas consolidadas se fornecidas
  casasAvancadas = Number(metaPartida.casas_avancadas ?? casasAvancadas);
  voltas = Number(metaPartida.voltas ?? voltas);
  boasPraticas = Number(metaPartida.boas_praticas ?? boasPraticas);

  const pontos = calcularPontuacao({
    casas_avancadas: casasAvancadas,
    voltas,
    acertos,
    bonus_pense_antes: bonusPenseAntes,
    boas_praticas: boasPraticas,
    armadilhas
  });

  return {
    valido: true,
    status: 200,
    sucesso: true,
    tokens,
    acertos,
    bonus_pense_antes: bonusPenseAntes,
    boas_praticas: boasPraticas,
    armadilhas,
    voltas,
    casas_avancadas: casasAvancadas,
    pontos
  };
}
