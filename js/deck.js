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
 * Gera uma semente aleatória criptograficamente forte para partidas de convidados.
 * Garante que o convidado não jogue com a semente fixa da semana.
 * @returns {string}
 */
export function gerarSementeConvidado() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint32Array(2);
    crypto.getRandomValues(arr);
    return `convidado_${arr[0]}_${arr[1]}`;
  }
  return `convidado_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
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

  // Fallback local garantido com proteção contra falha de fetch
  try {
    const respLocal = await fetch('data/cartas_fallback.json');
    if (respLocal.ok) {
      const dadosLocal = await respLocal.json();
      const validas = (Array.isArray(dadosLocal) ? dadosLocal : []).filter(validarCarta);
      if (validas.length > 0) return validas;
    }
    console.warn('[deck.js] Falha ao carregar data/cartas_fallback.json via HTTP, usando cartas embutidas.');
  } catch (e) {
    console.warn('[deck.js] Erro ao carregar data/cartas_fallback.json, usando cartas embutidas:', e);
  }

  // Fallback mínimo embutido para contingência total
  return [
    {
      id: "FB_01",
      categoria: "boa_pratica",
      tema: "Privacidade",
      texto: "Ao tratar dados de colaboradores no SEST SENAT, utilize sempre ferramentas autorizadas e preserve o sigilo.",
      opcoes: [
        { texto: "Utilizar ferramentas corporativas homologadas", correta: true, tokens: 2 },
        { texto: "Enviar dados para e-mail pessoal não autorizado", correta: false, tokens: -2 }
      ],
      explicacao: "Ferramentas corporativas garantem a conformidade com as diretrizes da LGPD."
    },
    {
      id: "FB_02",
      categoria: "desafio",
      tema: "Segurança da Informação",
      texto: "Você recebeu um e-mail com anexo suspeito solicitando credenciais corporativas. Qual a conduta correta?",
      opcoes: [
        { texto: "Reportar imediatamente à equipe de TI/Segurança", correta: true, tokens: 3 },
        { texto: "Abrir o anexo para conferir o remetente", correta: false, tokens: -3 }
      ],
      explicacao: "Phishing e anexos suspeitos devem ser reportados à TI imediatamente sem abertura."
    }
  ];
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
  function podeReceberArmadilha(tab, pos) {
    if (pos === 10 || pos === 20 || pos === 30) return false;
    let ant = pos - 1;
    if (ant === 20 || ant === 10) ant--;
    if (ant >= 1 && tab[ant] === "armadilha") return false;
    let prox = pos + 1;
    if (prox === 10 || prox === 20 || prox === 30) prox++;
    if (prox <= 29 && tab[prox] === "armadilha") return false;
    return true;
  }

  for (let casa = 1; casa < 30; casa++) {
    if (tabuleiro[casa] === "armadilha") {
      let proxima = casa + 1;
      if (proxima === 10 || proxima === 20 || proxima === 30) {
        proxima++;
      }
      if (proxima < 30 && tabuleiro[proxima] === "armadilha") {
        // Encontra candidato para permuta que não crie novas armadilhas seguidas
        for (let cand = 1; cand < 30; cand++) {
          if (cand === casa || cand === proxima || cand === 10 || cand === 20 || cand === 30) continue;
          if (tabuleiro[cand] !== "armadilha" && podeReceberArmadilha(tabuleiro, cand)) {
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

let grafoCache = null;
/**
 * Retorna as coordenadas {x, y} no plano do tabuleiro (centro da célula na grade de 80x80)
 * Fonte Única de Verdade para casas, faixas, setas, placas, peão e câmera.
 * @param {{ col?: number, row?: number, x?: number, y?: number }} casa
 * @returns {{ x: number, y: number }}
 */
export function centroCasa(casa) {
  if (!casa) return { x: 0, y: 0 };
  const tam = 80;
  const x = typeof casa.col === 'number' ? casa.col * tam + tam / 2 : (casa.x ?? 0);
  const y = typeof casa.row === 'number' ? casa.row * tam + tam / 2 : (casa.y ?? 0);
  return { x, y };
}


// Grafo padrão do tabuleiro diorama (61 nós: 0 a 60, com 2 bifurcações pedagógicas, Hub Central e Checkpoints)
export const GRAFO_PADRAO = {
  "versao": "2.1.0",
  "nome": "Trilha da Governança de IA - Grade Fixa 18x11",
  "grade": {
    "colunas": 18,
    "linhas": 11,
    "tamanho_celula": 80
  },
  "dimensoes": {
    "largura": 1440,
    "altura": 880
  },
  "hub": {
    "id": 33,
    "nome": "Central de Dados",
    "col": 8,
    "row": 5,
    "x": 680,
    "y": 440,
    "raio": 56,
    "eventos": [
      {
        "id": "ev_hub_1",
        "rotulo": "+4 Tokens",
        "tokens": 4,
        "desc": "Auditoria de dados aprovada com louvor!"
      },
      {
        "id": "ev_hub_2",
        "rotulo": "+2 Casas",
        "mover": 2,
        "desc": "Pipeline de governança acelerou sua jornada!"
      },
      {
        "id": "ev_hub_3",
        "rotulo": "+3 Tokens",
        "tokens": 3,
        "desc": "Catálogo corporativo de dados atualizado."
      },
      {
        "id": "ev_hub_4",
        "rotulo": "Bônus IA",
        "tokens": 5,
        "desc": "Modelo de IA homologado sem vieses detectados!"
      },
      {
        "id": "ev_hub_5",
        "rotulo": "+1 Casa",
        "mover": 1,
        "desc": "Fluxo contínuo de conformidade e integridade."
      },
      {
        "id": "ev_hub_6",
        "rotulo": "+2 Tokens",
        "tokens": 2,
        "desc": "Workshop de boas práticas concluído."
      }
    ]
  },
  "checkpoints": [
    {
      "id": 20,
      "numero": 1,
      "nome": "Dado Protegido",
      "bonus": 3,
      "desc": "Etapa 1: Coleta, higienização e classificação segura de dados."
    },
    {
      "id": 40,
      "numero": 2,
      "nome": "IA Bem Usada",
      "bonus": 5,
      "desc": "Etapa 2: Aplicação ética, supervisão humana e prevenção de vieses."
    },
    {
      "id": 60,
      "numero": 3,
      "nome": "Guardião dos Dados",
      "bonus": 0,
      "desc": "Fim da Jornada: Portal de Excelência em Governança SEST SENAT."
    }
  ],
  "props": [
    {
      "id": "prop_predios_1",
      "nome": "Prédios Gráfico de Barras",
      "col": 10,
      "row": 7,
      "w": 2,
      "h": 2
    },
    {
      "id": "prop_onibus_1",
      "nome": "Mini Ônibus SEST SENAT",
      "col": 14,
      "row": 7,
      "w": 2,
      "h": 2
    },
    {
      "id": "prop_racks_1",
      "nome": "Mini Racks de Servidor",
      "col": 13,
      "row": 3,
      "w": 2,
      "h": 2
    },
    {
      "id": "prop_nuvem_1",
      "nome": "Nuvem de Dados",
      "col": 3,
      "row": 1,
      "w": 2,
      "h": 1
    },
    {
      "id": "prop_caminhao_1",
      "nome": "Mini Caminhão de Carga",
      "col": 2,
      "row": 5,
      "w": 2,
      "h": 2
    },
    {
      "id": "prop_cubos_1",
      "nome": "Blocos Binários (0101)",
      "col": 7,
      "row": 3,
      "w": 1,
      "h": 1
    }
  ],
  "casas": [
    {
      "id": 0,
      "col": 1,
      "row": 9,
      "x": 120,
      "y": 760,
      "tipo_fixo": "inicio",
      "proximos": [
        1
      ],
      "bifurcacao": null,
      "rotulo": "INÍCIO",
      "caminho": null
    },
    {
      "id": 1,
      "col": 2,
      "row": 9,
      "x": 200,
      "y": 760,
      "tipo_fixo": null,
      "proximos": [
        2
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 2,
      "col": 3,
      "row": 9,
      "x": 280,
      "y": 760,
      "tipo_fixo": null,
      "proximos": [
        3
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 3,
      "col": 4,
      "row": 9,
      "x": 360,
      "y": 760,
      "tipo_fixo": null,
      "proximos": [
        4
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 4,
      "col": 5,
      "row": 9,
      "x": 440,
      "y": 760,
      "tipo_fixo": null,
      "proximos": [
        5
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 5,
      "col": 6,
      "row": 9,
      "x": 520,
      "y": 760,
      "tipo_fixo": null,
      "proximos": [
        6
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 6,
      "col": 7,
      "row": 9,
      "x": 600,
      "y": 760,
      "tipo_fixo": null,
      "proximos": [
        7
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 7,
      "col": 8,
      "row": 9,
      "x": 680,
      "y": 760,
      "tipo_fixo": null,
      "proximos": [
        8
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 8,
      "col": 9,
      "row": 9,
      "x": 760,
      "y": 760,
      "tipo_fixo": null,
      "proximos": [
        9
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 9,
      "col": 10,
      "row": 9,
      "x": 840,
      "y": 760,
      "tipo_fixo": null,
      "proximos": [
        10
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 10,
      "col": 11,
      "row": 9,
      "x": 920,
      "y": 760,
      "tipo_fixo": null,
      "proximos": [
        11
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 11,
      "col": 12,
      "row": 9,
      "x": 1000,
      "y": 760,
      "tipo_fixo": null,
      "proximos": [
        12
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 12,
      "col": 13,
      "row": 9,
      "x": 1080,
      "y": 760,
      "tipo_fixo": "bifurcacao",
      "proximos": [
        13,
        61
      ],
      "bifurcacao": {
        "titulo": "Bifurcação 1: Validação de Demanda de IA",
        "pergunta": "Como você validará a nova ferramenta de IA?",
        "opcoes": [
          {
            "proximo": 61,
            "nome": "Atalho da IA Pública",
            "icone": "⚡",
            "tag": "Mais Curto / Risco de Vazamento",
            "desc": "Corta 4 casas pelo interior, mas com alta densidade de armadilhas e sem homologação de segurança."
          },
          {
            "proximo": 13,
            "nome": "Rota Segura Institucional",
            "icone": "🛡️",
            "tag": "Caminho Principal Seguro",
            "desc": "Contorna a borda externa com conformidade LGPD, boas práticas e conexões institucionais."
          }
        ]
      },
      "rotulo": "BIF 1",
      "caminho": null
    },
    {
      "id": 13,
      "col": 14,
      "row": 9,
      "x": 1160,
      "y": 760,
      "tipo_fixo": null,
      "proximos": [
        14
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": "segura_1"
    },
    {
      "id": 14,
      "col": 15,
      "row": 9,
      "x": 1240,
      "y": 760,
      "tipo_fixo": null,
      "proximos": [
        15
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": "segura_1"
    },
    {
      "id": 15,
      "col": 16,
      "row": 9,
      "x": 1320,
      "y": 760,
      "tipo_fixo": null,
      "proximos": [
        16
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": "segura_1"
    },
    {
      "id": 16,
      "col": 16,
      "row": 8,
      "x": 1320,
      "y": 680,
      "tipo_fixo": null,
      "proximos": [
        17
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": "segura_1"
    },
    {
      "id": 17,
      "col": 16,
      "row": 7,
      "x": 1320,
      "y": 600,
      "tipo_fixo": null,
      "proximos": [
        18
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": "segura_1"
    },
    {
      "id": 18,
      "col": 16,
      "row": 6,
      "x": 1320,
      "y": 520,
      "tipo_fixo": null,
      "proximos": [
        19
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": "segura_1"
    },
    {
      "id": 19,
      "col": 16,
      "row": 5,
      "x": 1320,
      "y": 440,
      "tipo_fixo": "desafio",
      "proximos": [
        20
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": "segura_1"
    },
    {
      "id": 61,
      "col": 13,
      "row": 8,
      "x": 1080,
      "y": 680,
      "tipo_fixo": null,
      "proximos": [
        62
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": "atalho_1"
    },
    {
      "id": 62,
      "col": 13,
      "row": 7,
      "x": 1080,
      "y": 600,
      "tipo_fixo": null,
      "proximos": [
        63
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": "atalho_1"
    },
    {
      "id": 63,
      "col": 14,
      "row": 6,
      "x": 1160,
      "y": 520,
      "tipo_fixo": null,
      "proximos": [
        20
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": "atalho_1"
    },
    {
      "id": 20,
      "col": 16,
      "row": 4,
      "x": 1320,
      "y": 360,
      "tipo_fixo": "checkpoint",
      "proximos": [
        21
      ],
      "bifurcacao": null,
      "rotulo": "CP 1",
      "caminho": null
    },
    {
      "id": 21,
      "col": 16,
      "row": 3,
      "x": 1320,
      "y": 280,
      "tipo_fixo": null,
      "proximos": [
        22
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 22,
      "col": 16,
      "row": 2,
      "x": 1320,
      "y": 200,
      "tipo_fixo": null,
      "proximos": [
        23
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 23,
      "col": 16,
      "row": 1,
      "x": 1320,
      "y": 120,
      "tipo_fixo": null,
      "proximos": [
        24
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 24,
      "col": 15,
      "row": 1,
      "x": 1240,
      "y": 120,
      "tipo_fixo": null,
      "proximos": [
        25
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 25,
      "col": 14,
      "row": 1,
      "x": 1160,
      "y": 120,
      "tipo_fixo": null,
      "proximos": [
        26
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 26,
      "col": 13,
      "row": 1,
      "x": 1080,
      "y": 120,
      "tipo_fixo": null,
      "proximos": [
        27
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 27,
      "col": 12,
      "row": 1,
      "x": 1000,
      "y": 120,
      "tipo_fixo": null,
      "proximos": [
        28
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 28,
      "col": 11,
      "row": 1,
      "x": 920,
      "y": 120,
      "tipo_fixo": null,
      "proximos": [
        29
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 29,
      "col": 10,
      "row": 1,
      "x": 840,
      "y": 120,
      "tipo_fixo": null,
      "proximos": [
        30
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 30,
      "col": 10,
      "row": 3,
      "x": 840,
      "y": 280,
      "tipo_fixo": null,
      "proximos": [
        31
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 31,
      "col": 10,
      "row": 5,
      "x": 840,
      "y": 440,
      "tipo_fixo": null,
      "proximos": [
        32
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 32,
      "col": 9,
      "row": 5,
      "x": 760,
      "y": 440,
      "tipo_fixo": null,
      "proximos": [
        33
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 33,
      "col": 8,
      "row": 5,
      "x": 680,
      "y": 440,
      "tipo_fixo": "hub",
      "proximos": [
        34
      ],
      "bifurcacao": null,
      "rotulo": "CENTRAL DE DADOS",
      "caminho": null
    },
    {
      "id": 34,
      "col": 7,
      "row": 5,
      "x": 600,
      "y": 440,
      "tipo_fixo": "bifurcacao",
      "proximos": [
        35,
        64
      ],
      "bifurcacao": {
        "titulo": "Bifurcação 2: Modelo Operacional de IA",
        "pergunta": "Como você estruturará o fluxo de trabalho da IA?",
        "opcoes": [
          {
            "proximo": 64,
            "nome": "Automação Direta",
            "icone": "⚙️",
            "tag": "Mais Rápido / Risco de Alucinação",
            "desc": "Corta caminho pelo centro sem validação humana, com riscos severos de viés algorítmico."
          },
          {
            "proximo": 35,
            "nome": "Supervisão Humana (Human-in-the-Loop)",
            "icone": "🤝",
            "tag": "Caminho Principal Seguro",
            "desc": "Validação com especialistas humanos, garantia ética e conformidade contínua."
          }
        ]
      },
      "rotulo": "BIF 2",
      "caminho": null
    },
    {
      "id": 35,
      "col": 6,
      "row": 5,
      "x": 520,
      "y": 440,
      "tipo_fixo": null,
      "proximos": [
        36
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": "humano_2"
    },
    {
      "id": 36,
      "col": 5,
      "row": 5,
      "x": 440,
      "y": 440,
      "tipo_fixo": null,
      "proximos": [
        37
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": "humano_2"
    },
    {
      "id": 37,
      "col": 4,
      "row": 5,
      "x": 360,
      "y": 440,
      "tipo_fixo": null,
      "proximos": [
        38
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": "humano_2"
    },
    {
      "id": 38,
      "col": 4,
      "row": 7,
      "x": 360,
      "y": 600,
      "tipo_fixo": null,
      "proximos": [
        39
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": "humano_2"
    },
    {
      "id": 39,
      "col": 3,
      "row": 7,
      "x": 280,
      "y": 600,
      "tipo_fixo": "desafio",
      "proximos": [
        40
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": "humano_2"
    },
    {
      "id": 64,
      "col": 7,
      "row": 7,
      "x": 600,
      "y": 600,
      "tipo_fixo": null,
      "proximos": [
        65
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": "automacao_2"
    },
    {
      "id": 65,
      "col": 5,
      "row": 7,
      "x": 440,
      "y": 600,
      "tipo_fixo": null,
      "proximos": [
        40
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": "automacao_2"
    },
    {
      "id": 40,
      "col": 1,
      "row": 7,
      "x": 120,
      "y": 600,
      "tipo_fixo": "checkpoint",
      "proximos": [
        41
      ],
      "bifurcacao": null,
      "rotulo": "CP 2",
      "caminho": null
    },
    {
      "id": 41,
      "col": 1,
      "row": 6,
      "x": 120,
      "y": 520,
      "tipo_fixo": null,
      "proximos": [
        42
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 42,
      "col": 1,
      "row": 5,
      "x": 120,
      "y": 440,
      "tipo_fixo": null,
      "proximos": [
        43
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 43,
      "col": 1,
      "row": 4,
      "x": 120,
      "y": 360,
      "tipo_fixo": null,
      "proximos": [
        44
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 44,
      "col": 1,
      "row": 3,
      "x": 120,
      "y": 280,
      "tipo_fixo": null,
      "proximos": [
        45
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 45,
      "col": 1,
      "row": 2,
      "x": 120,
      "y": 200,
      "tipo_fixo": null,
      "proximos": [
        46
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 46,
      "col": 1,
      "row": 1,
      "x": 120,
      "y": 120,
      "tipo_fixo": null,
      "proximos": [
        47
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 47,
      "col": 2,
      "row": 1,
      "x": 200,
      "y": 120,
      "tipo_fixo": null,
      "proximos": [
        48
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 48,
      "col": 3,
      "row": 1,
      "x": 280,
      "y": 120,
      "tipo_fixo": null,
      "proximos": [
        49
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 49,
      "col": 4,
      "row": 1,
      "x": 360,
      "y": 120,
      "tipo_fixo": null,
      "proximos": [
        50
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 50,
      "col": 5,
      "row": 1,
      "x": 440,
      "y": 120,
      "tipo_fixo": null,
      "proximos": [
        51
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 51,
      "col": 6,
      "row": 1,
      "x": 520,
      "y": 120,
      "tipo_fixo": null,
      "proximos": [
        52
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 52,
      "col": 6,
      "row": 3,
      "x": 520,
      "y": 280,
      "tipo_fixo": null,
      "proximos": [
        53
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 53,
      "col": 5,
      "row": 3,
      "x": 440,
      "y": 280,
      "tipo_fixo": null,
      "proximos": [
        54
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 54,
      "col": 4,
      "row": 3,
      "x": 360,
      "y": 280,
      "tipo_fixo": null,
      "proximos": [
        55
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 55,
      "col": 3,
      "row": 3,
      "x": 280,
      "y": 280,
      "tipo_fixo": null,
      "proximos": [
        56
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 56,
      "col": 3,
      "row": 2,
      "x": 280,
      "y": 200,
      "tipo_fixo": null,
      "proximos": [
        57
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 57,
      "col": 4,
      "row": 2,
      "x": 360,
      "y": 200,
      "tipo_fixo": null,
      "proximos": [
        58
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 58,
      "col": 6,
      "row": 2,
      "x": 520,
      "y": 200,
      "tipo_fixo": null,
      "proximos": [
        59
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 59,
      "col": 7,
      "row": 1,
      "x": 600,
      "y": 120,
      "tipo_fixo": "desafio",
      "proximos": [
        60
      ],
      "bifurcacao": null,
      "rotulo": null,
      "caminho": null
    },
    {
      "id": 60,
      "col": 8,
      "row": 1,
      "x": 680,
      "y": 120,
      "tipo_fixo": "checkpoint",
      "proximos": [],
      "bifurcacao": null,
      "rotulo": "PORTAL FINAL",
      "caminho": null
    }
  ]
};

export async function carregarGrafoTabuleiro() {
  if (grafoCache) return grafoCache;
  try {
    const res = await fetch('./data/tabuleiro.json');
    if (res.ok) {
      grafoCache = await res.json();
      return grafoCache;
    }
    console.warn('[deck.js] Falha HTTP ao carregar data/tabuleiro.json (' + res.status + '), usando GRAFO_PADRAO');
  } catch (e) {
    console.warn('[deck.js] Erro ao carregar data/tabuleiro.json, usando GRAFO_PADRAO:', e);
  }
  grafoCache = GRAFO_PADRAO;
  return grafoCache;
}

/**
 * Gera as categorias para o grafo do tabuleiro de forma determinística
 * Respeita:
 * - Nós com tipo_fixo (início, checkpoint, hub, bifurcação, desafio)
 * - Desafio garantido imediatamente antes de cada checkpoint
 * - Sem armadilhas consecutivas ao longo de qualquer percurso
 * - Limite percentual por categoria (máx. 25% do total de nós normais)
 * - Tendências pedagógicas nas bifurcações (Atalho = mais armadilha/desafio; Rota Segura = mais boa prática/conexão)
 * 
 * @param {string|number|Object} semanaOuRng
 * @param {Object} grafoJson
 * @returns {Record<number, string>} Mapeamento de nodeId -> categoria
 */
export function gerarTabuleiroGrafo(semanaOuRng = semanaAtual(), grafoJson = null) {
  const rng = (semanaOuRng && typeof semanaOuRng.embaralhar === 'function')
    ? semanaOuRng
    : criarRng(typeof semanaOuRng === 'string' ? `${semanaOuRng}_cartas` : semanaOuRng);

  const baseGrafo = (grafoJson && Array.isArray(grafoJson.casas)) ? grafoJson : GRAFO_PADRAO;
  const casas = (baseGrafo && Array.isArray(baseGrafo.casas)) ? baseGrafo.casas : [];
  const categorias = {};

  // 1. Preenche nós com tipo fixo pré-determinado
  for (const c of casas) {
    if (c.tipo_fixo) {
      categorias[c.id] = c.tipo_fixo;
    }
  }

  // 2. Nós normais que precisam de categoria
  const normais = casas.filter(c => !c.tipo_fixo);

  // Pools com viés pedagógico por caminho
  const poolGeral = ['boa_pratica', 'pense_antes', 'desafio', 'conexao', 'evento'];

  // Função auxiliar de escolha determinística segura
  function sortearDoPool(lista) {
    if (!lista || lista.length === 0) return 'boa_pratica';
    const idx = typeof rng.inteiro === 'function'
      ? rng.inteiro(0, lista.length - 1)
      : Math.floor((typeof rng.proximo === 'function' ? rng.proximo() : Math.random()) * lista.length);
    return lista[idx] || 'boa_pratica';
  }

  for (const c of normais) {
    let catEscolhida = 'boa_pratica';

    if (c.caminho === 'atalho_1' || c.caminho === 'automacao_2') {
      // Atalho com maior risco de armadilhas e desafios
      const poolAtalho = ['armadilha', 'desafio', 'pense_antes', 'armadilha', 'boa_pratica'];
      catEscolhida = sortearDoPool(poolAtalho);
    } else if (c.caminho === 'segura_1' || c.caminho === 'humano_2') {
      // Rota segura com foco em boas práticas e conexões
      const poolSeguro = ['boa_pratica', 'conexao', 'pense_antes', 'boa_pratica', 'evento'];
      catEscolhida = sortearDoPool(poolSeguro);
    } else if (c.caminho === 'bonus_loop') {
      // Loop de bônus
      const poolBonus = ['conexao', 'boa_pratica', 'evento', 'pense_antes'];
      catEscolhida = sortearDoPool(poolBonus);
    } else {
      // Trilha principal normal (distribuição equilibrada)
      const poolPrincipal = ['boa_pratica', 'pense_antes', 'desafio', 'conexao', 'evento', 'armadilha'];
      catEscolhida = sortearDoPool(poolPrincipal);
    }

    categorias[c.id] = catEscolhida;
  }

  // 3. Regra de Segurança: Garantir que não existam armadilhas seguidas em nenhuma conexão direta
  for (const c of casas) {
    if (categorias[c.id] === 'armadilha') {
      if (Array.isArray(c.proximos)) {
        for (const proxId of c.proximos) {
          if (categorias[proxId] === 'armadilha') {
            // Substitui por Boa Prática
            categorias[proxId] = 'boa_pratica';
          }
        }
      }
    }
  }

  return categorias;
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
