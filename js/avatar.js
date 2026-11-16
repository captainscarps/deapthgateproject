// js/avatar.js - Motor de Geração e Renderização de Avatares Chibi 3D
// Miniaturas colecionáveis de tabuleiro: proporção chibi, contorno escuro grosso, cores chapadas, camadas SVG
import { desenharMiniatura } from './avatar_render.js';

export const AVATAR_OPCOES = {
  versao: 1,
  corpo: ["m", "f"],
  pele: [
    { id: 1, hex: "#FFDFD3", sombra: "#E4BEB0", nome: "Pele 1 (Muito Clara)" },
    { id: 2, hex: "#F3C7B0", sombra: "#D9A88F", nome: "Pele 2 (Clara)" },
    { id: 3, hex: "#E2A988", sombra: "#C68D6A", nome: "Pele 3 (Média Clara)" },
    { id: 4, hex: "#C68A65", sombra: "#A96F4B", nome: "Pele 4 (Média)" },
    { id: 5, hex: "#A86D48", sombra: "#8A5331", nome: "Pele 5 (Morena)" },
    { id: 6, hex: "#885131", sombra: "#6D3B1F", nome: "Pele 6 (Escura)" },
    { id: 7, hex: "#63391F", sombra: "#492612", nome: "Pele 7 (Muito Escura)" },
    { id: 8, hex: "#3F2212", sombra: "#2B1408", nome: "Pele 8 (Retinta)" }
  ],
  expressao: ["sorriso", "confiante", "concentrado", "animado"],
  roupa: [
    "terno", "blazer", "camisa_social", "colete", 
    "tailleur", "polo_ss", "jaleco", "macacao"
  ],
  cor_roupa: [
    { id: "navy", hex: "#0B2545", secundaria: "#00B4D8", nome: "Azul Navy" },
    { id: "cinza", hex: "#475569", secundaria: "#94A3B8", nome: "Cinza" },
    { id: "preto", hex: "#1E293B", secundaria: "#FFC93C", nome: "Preto" },
    { id: "ciano", hex: "#00B4D8", secundaria: "#0A223E", nome: "Ciano" },
    { id: "branco", hex: "#F1F5F9", secundaria: "#475569", nome: "Branco" },
    { id: "vinho", hex: "#800E2B", secundaria: "#C9184A", nome: "Vinho" }
  ],
  cabelo: [
    "curto", "raspado", "careca", "liso_medio", "longo", "coque", 
    "rabo_cavalo", "cacheado", "crespo_black", "trancas", "dreads", "franja"
  ],
  cor_cabelo: [
    { id: "preto", hex: "#1A1D20", brilho: "#333A42", nome: "Preto" },
    { id: "castanho_escuro", hex: "#3E2723", brilho: "#5D4037", nome: "Castanho Escuro" },
    { id: "castanho_medio", hex: "#5D4037", brilho: "#8D6E63", nome: "Castanho Médio" },
    { id: "loiro", hex: "#D4A373", brilho: "#FAEDCD", nome: "Loiro" },
    { id: "ruivo", hex: "#A84218", brilho: "#D96B27", nome: "Ruivo" },
    { id: "grisalho", hex: "#8D99AE", brilho: "#CBD5E1", nome: "Grisalho" },
    { id: "platinado", hex: "#E0E1DD", brilho: "#FFFFFF", nome: "Platinado" },
    { id: "azul", hex: "#1D4ED8", brilho: "#60A5FA", nome: "Azul" },
    { id: "vinho", hex: "#7209B7", brilho: "#B5179E", nome: "Vinho" },
    { id: "branco", hex: "#F8FAFC", brilho: "#FFFFFF", nome: "Branco" }
  ],
  barba: ["nenhum", "por_fazer", "cavanhaque", "bigode", "curta", "cheia"],
  rosto: ["nenhum", "oculos_grau", "oculos_escuros", "monoculo", "tapa_olho", "oculos_leitura"],
  cabeca: ["nenhum", "bone_ss", "chapeu_ss", "capacete_seguranca", "fone_ouvido", "aparelho_auditivo", "lenco_turbante"],
  item: ["nenhum", "mala_ss", "notebook", "prancheta", "caneca_cafe", "tablet_grafico", "cracha"],
  mobilidade: ["nenhum", "cadeira_rodas", "bengala"]
};

// Cache de renderização em memória
const cacheRenderizacao = new Map();

/**
 * Avatar padrão inicial
 */
export const AVATAR_PADRAO = {
  v: 1,
  corpo: "m",
  pele: 3,
  expressao: "sorriso",
  roupa: "blazer",
  cor_roupa: "navy",
  cabelo: "curto",
  cor_cabelo: "castanho_escuro",
  barba: "nenhum",
  rosto: "nenhum",
  cabeca: "nenhum",
  item: "cracha",
  mobilidade: "nenhum"
};

/**
 * Validação rigorosa do JSON de configuração do avatar
 * @param {Object} cfg
 * @returns {{ valido: boolean, erro?: string, normalizado?: Object }}
 */
export function validarAvatar(cfg) {
  if (!cfg || typeof cfg !== 'object') {
    return { valido: false, erro: 'Configuração do avatar deve ser um objeto JSON' };
  }

  // Verifica tamanho máximo do JSON serializado (máx 1000 caracteres)
  const str = JSON.stringify(cfg);
  if (str.length > 1000) {
    return { valido: false, erro: 'Tamanho do JSON excede o limite permitido' };
  }

  if (cfg.v !== 1) {
    return { valido: false, erro: 'Versão de avatar inválida (esperado v: 1)' };
  }

  if (!AVATAR_OPCOES.corpo.includes(cfg.corpo)) {
    return { valido: false, erro: `Tipo de corpo inválido: ${cfg.corpo}` };
  }

  const peleNum = Number(cfg.pele);
  if (isNaN(peleNum) || peleNum < 1 || peleNum > 8) {
    return { valido: false, erro: `Tom de pele inválido: ${cfg.pele}` };
  }

  if (!AVATAR_OPCOES.expressao.includes(cfg.expressao)) {
    return { valido: false, erro: `Expressão inválida: ${cfg.expressao}` };
  }

  if (!AVATAR_OPCOES.roupa.includes(cfg.roupa)) {
    return { valido: false, erro: `Roupa inválida: ${cfg.roupa}` };
  }

  const idsCorRoupa = AVATAR_OPCOES.cor_roupa.map(c => c.id);
  if (!idsCorRoupa.includes(cfg.cor_roupa)) {
    return { valido: false, erro: `Cor de roupa inválida: ${cfg.cor_roupa}` };
  }

  if (!AVATAR_OPCOES.cabelo.includes(cfg.cabelo)) {
    return { valido: false, erro: `Cabelo inválido: ${cfg.cabelo}` };
  }

  // cor_cabelo pode ser string id ou número
  let corCabeloId = cfg.cor_cabelo;
  if (typeof corCabeloId === 'number') {
    corCabeloId = AVATAR_OPCOES.cor_cabelo[corCabeloId]?.id || "castanho_escuro";
  }
  const idsCorCabelo = AVATAR_OPCOES.cor_cabelo.map(c => c.id);
  if (!idsCorCabelo.includes(corCabeloId)) {
    return { valido: false, erro: `Cor de cabelo inválida: ${cfg.cor_cabelo}` };
  }

  if (!AVATAR_OPCOES.barba.includes(cfg.barba)) {
    return { valido: false, erro: `Barba inválida: ${cfg.barba}` };
  }

  if (!AVATAR_OPCOES.rosto.includes(cfg.rosto)) {
    return { valido: false, erro: `Acessório de rosto inválido: ${cfg.rosto}` };
  }

  if (!AVATAR_OPCOES.cabeca.includes(cfg.cabeca)) {
    return { valido: false, erro: `Acessório de cabeça inválido: ${cfg.cabeca}` };
  }

  if (!AVATAR_OPCOES.item.includes(cfg.item)) {
    return { valido: false, erro: `Item inválido: ${cfg.item}` };
  }

  if (!AVATAR_OPCOES.mobilidade.includes(cfg.mobilidade)) {
    return { valido: false, erro: `Item de mobilidade inválido: ${cfg.mobilidade}` };
  }

  const normalizado = {
    v: 1,
    corpo: cfg.corpo,
    pele: peleNum,
    expressao: cfg.expressao,
    roupa: cfg.roupa,
    cor_roupa: cfg.cor_roupa,
    cabelo: cfg.cabelo,
    cor_cabelo: corCabeloId,
    barba: cfg.barba,
    rosto: cfg.rosto,
    cabeca: cfg.cabeca,
    item: cfg.item,
    mobilidade: cfg.mobilidade
  };

  return { valido: true, normalizado };
}

/**
 * Gera um avatar aleatório coerente e harmonioso
 * @param {Object} [override]
 * @returns {Object}
 */
export function gerarAvatarAleatorio(override = {}) {
  const randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const corpo = override.corpo || randItem(AVATAR_OPCOES.corpo);
  const pele = override.pele || Math.floor(Math.random() * 8) + 1;
  const expressao = override.expressao || randItem(AVATAR_OPCOES.expressao);
  const roupa = override.roupa || randItem(AVATAR_OPCOES.roupa);
  const cor_roupa = override.cor_roupa || randItem(AVATAR_OPCOES.cor_roupa).id;
  const cabelo = override.cabelo || randItem(AVATAR_OPCOES.cabelo);
  const cor_cabelo = override.cor_cabelo || randItem(AVATAR_OPCOES.cor_cabelo).id;
  
  // Barba: mais provável em corpo masculino, mas permitida em qualquer um
  let barba = "nenhum";
  if (corpo === "m" && Math.random() > 0.45) {
    barba = randItem(["por_fazer", "cavanhaque", "bigode", "curta", "cheia"]);
  }

  // Acessórios com probabilidades realistas
  const rosto = Math.random() > 0.65 ? randItem(AVATAR_OPCOES.rosto.filter(r => r !== "nenhum")) : "nenhum";
  const cabeca = Math.random() > 0.75 ? randItem(AVATAR_OPCOES.cabeca.filter(c => c !== "nenhum")) : "nenhum";
  const item = Math.random() > 0.4 ? randItem(AVATAR_OPCOES.item.filter(i => i !== "nenhum")) : "cracha";
  const mobilidade = Math.random() > 0.88 ? randItem(["cadeira_rodas", "bengala"]) : "nenhum";

  const config = {
    v: 1,
    corpo,
    pele,
    expressao,
    roupa,
    cor_roupa,
    cabelo,
    cor_cabelo,
    barba,
    rosto,
    cabeca,
    item,
    mobilidade,
    ...override
  };

  const val = validarAvatar(config);
  return val.valido ? val.normalizado : AVATAR_PADRAO;
}

/**
 * Renderiza a miniatura do avatar em SVG (desenho v2 em js/avatar_render.js)
 * @param {Object} rawConfig
 * @param {{ modo?: 'completo'|'busto'|'peao', reacao?: 'neutro'|'pulando'|'comemorando'|'assustado' }} [opcoes]
 * @returns {string}
 */
export function renderAvatarSVG(rawConfig, opcoes = {}) {
  const val = validarAvatar(rawConfig);
  const cfg = val.valido ? val.normalizado : AVATAR_PADRAO;
  const modo = opcoes.modo || 'completo';
  const reacao = opcoes.reacao || 'neutro';

  const cacheKey = `${JSON.stringify(cfg)}_${modo}_${reacao}`;
  if (cacheRenderizacao.has(cacheKey)) return cacheRenderizacao.get(cacheKey);

  const svg = desenharMiniatura(cfg, {
    modo,
    reacao,
    pele: AVATAR_OPCOES.pele.find(p => p.id === cfg.pele) || AVATAR_OPCOES.pele[2],
    roupa: AVATAR_OPCOES.cor_roupa.find(r => r.id === cfg.cor_roupa) || AVATAR_OPCOES.cor_roupa[0],
    cabelo: AVATAR_OPCOES.cor_cabelo.find(c => c.id === cfg.cor_cabelo) || AVATAR_OPCOES.cor_cabelo[0]
  }).trim().replace(/\s+/g, ' ');

  if (cacheRenderizacao.size > 400) cacheRenderizacao.clear();
  cacheRenderizacao.set(cacheKey, svg);
  return svg;
}

/**
 * Retorna o HTML embutível do peão com reações dinâmicas e squash-and-stretch
 * @param {Object} avatarConfig
 * @param {string} [reacao='neutro']
 * @returns {string}
 */
export function renderPeaoAvatarHTML(avatarConfig, reacao = 'neutro') {
  const svgAvatar = renderAvatarSVG(avatarConfig, { modo: 'peao', reacao });
  return `
    <div class="peao-container peao-avatar-wrapper peao-reacao-${reacao}" id="peao-jogador">
      <div class="peao-sombra" id="peao-sombra"></div>
      <div class="peao-corpo-wrapper peao-billboard" id="peao-corpo">
        ${svgAvatar}
      </div>
    </div>
  `;
}
