// js/avatar.js - Motor de Geração e Renderização de Avatares Chibi 3D
// Miniaturas colecionáveis de tabuleiro: proporção chibi, contorno escuro grosso, cores chapadas, camadas SVG

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
 * Renderiza o SVG do avatar montado por camadas ordenadas rigorosamente:
 * base -> mobilidade -> corpo -> roupa -> rosto -> barba -> cabelo -> acessório rosto -> acessório cabeça -> item
 * 
 * @param {Object} rawConfig
 * @param {Object} [opcoes]
 * @param {('completo'|'busto'|'peao')} [opcoes.modo='completo']
 * @param {('neutro'|'pulando'|'comemorando'|'assustado')} [opcoes.reacao='neutro']
 * @param {number} [opcoes.tamanho=120]
 * @returns {string} Código SVG seguro e autocontido
 */
export function renderAvatarSVG(rawConfig, opcoes = {}) {
  const val = validarAvatar(rawConfig);
  const cfg = val.valido ? val.normalizado : AVATAR_PADRAO;

  const modo = opcoes.modo || 'completo'; // 'completo', 'busto', 'peao'
  const reacao = opcoes.reacao || 'neutro'; // 'neutro', 'pulando', 'comemorando', 'assustado'

  const cacheKey = `${JSON.stringify(cfg)}_${modo}_${reacao}`;
  if (cacheRenderizacao.has(cacheKey)) {
    return cacheRenderizacao.get(cacheKey);
  }

  // Cores derivadas
  const objPele = AVATAR_OPCOES.pele.find(p => p.id === cfg.pele) || AVATAR_OPCOES.pele[2];
  const corPele = objPele.hex;
  const corPeleSombra = objPele.sombra;

  const objRoupa = AVATAR_OPCOES.cor_roupa.find(r => r.id === cfg.cor_roupa) || AVATAR_OPCOES.cor_roupa[0];
  const corRoupa = objRoupa.hex;
  const corRoupaSecundaria = objRoupa.secundaria;

  const objCabelo = AVATAR_OPCOES.cor_cabelo.find(c => c.id === cfg.cor_cabelo) || AVATAR_OPCOES.cor_cabelo[0];
  const corCabelo = objCabelo.hex;
  const corCabeloBrilho = objCabelo.brilho;

  const strokeGrosso = 'stroke="#05101F" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"';

  // 1. BASE REDONDA DE MINIATURA (estilo impressão 3D com chanfro)
  const renderBase = () => {
    if (modo === 'busto') return '';
    return `
      <!-- CAMADA 1: BASE 3D DA MINIATURA -->
      <g id="camada-base">
        <!-- Sombra no piso -->
        <ellipse cx="60" cy="118" rx="44" ry="10" fill="#030A14" opacity="0.6"/>
        <!-- Borda chanfrada inferior da base cilíndrica -->
        <path d="M 22 108 C 22 116 98 116 98 108 L 98 112 C 98 120 22 120 22 112 Z" fill="#07192C" stroke="#05101F" stroke-width="2.5"/>
        <!-- Face superior da base -->
        <ellipse cx="60" cy="108" rx="38" ry="8" fill="#123B63" stroke="#00B4D8" stroke-width="2.2"/>
        <ellipse cx="60" cy="108" rx="33" ry="6" fill="#0B2642" stroke="#05101F" stroke-width="1.2"/>
        <!-- Selo de autenticidade frontal -->
        <rect x="52" y="109" width="16" height="5" rx="1.5" fill="#FFC93C" stroke="#05101F" stroke-width="1"/>
        <text x="60" y="113" font-family="'Silkscreen', monospace" font-size="3.5" font-weight="700" fill="#05101F" text-anchor="middle">SS</text>
      </g>
    `;
  };

  // 2. MOBILIDADE / ACESSÓRIO DE COSTAS (Cadeira de Rodas ou Bengala)
  const renderMobilidade = () => {
    if (cfg.mobilidade === 'cadeira_rodas') {
      return `
        <!-- MOBILIDADE: CADEIRA DE RODAS ESPORTIVA -->
        <g id="camada-mobilidade">
          <!-- Roda traseira grande esquerda -->
          <circle cx="34" cy="95" r="17" fill="#08182B" stroke="#05101F" stroke-width="2.5"/>
          <circle cx="34" cy="95" r="13" fill="none" stroke="#00B4D8" stroke-width="1.8"/>
          <circle cx="34" cy="95" r="4" fill="#FFC93C" stroke="#05101F" stroke-width="1.5"/>
          <line x1="34" y1="82" x2="34" y2="108" stroke="#94A3B8" stroke-width="1.2"/>
          <line x1="21" y1="95" x2="47" y2="95" stroke="#94A3B8" stroke-width="1.2"/>

          <!-- Roda direita -->
          <circle cx="86" cy="95" r="17" fill="#08182B" stroke="#05101F" stroke-width="2.5"/>
          <circle cx="86" cy="95" r="13" fill="none" stroke="#00B4D8" stroke-width="1.8"/>
          <circle cx="86" cy="95" r="4" fill="#FFC93C" stroke="#05101F" stroke-width="1.5"/>
          <line x1="86" y1="82" x2="86" y2="108" stroke="#94A3B8" stroke-width="1.2"/>
          <line x1="73" y1="95" x2="99" y2="95" stroke="#94A3B8" stroke-width="1.2"/>

          <!-- Encosto e Estrutura -->
          <path d="M 40 70 L 40 92 L 80 92 L 80 70" fill="none" stroke="#00B4D8" stroke-width="3.5" stroke-linecap="round"/>
          <rect x="42" y="68" width="36" height="18" rx="3" fill="#0E2C4D" stroke="#05101F" stroke-width="2"/>
        </g>
      `;
    }
    return '';
  };

  // 3. CORPO CHIBI (Tronco compacto, pernas, pés firmes)
  const renderCorpo = () => {
    const isCadeira = cfg.mobilidade === 'cadeira_rodas';
    const isPulo = reacao === 'pulando';

    let pernasSVG = '';
    if (!isCadeira && modo !== 'busto') {
      const pernaEsqY = isPulo ? 94 : 98;
      const pernaDirY = isPulo ? 94 : 98;
      pernasSVG = `
        <!-- Pernas Chibi -->
        <rect x="46" y="86" width="10" height="${isPulo ? 12 : 16}" rx="4" fill="#0E2135" ${strokeGrosso}/>
        <rect x="64" y="86" width="10" height="${isPulo ? 12 : 16}" rx="4" fill="#0E2135" ${strokeGrosso}/>
        <!-- Sapatos Sociais / Tênis Corporativo -->
        <ellipse cx="50" cy="${pernaEsqY + 5}" rx="7" ry="4.5" fill="#05101F"/>
        <ellipse cx="70" cy="${pernaDirY + 5}" rx="7" ry="4.5" fill="#05101F"/>
      `;
    } else if (isCadeira && modo !== 'busto') {
      pernasSVG = `
        <!-- Pernas dobradas na cadeira -->
        <path d="M 46 84 L 46 96 L 56 96" fill="none" stroke="#0E2135" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M 66 84 L 66 96 L 76 96" fill="none" stroke="#0E2135" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        <ellipse cx="58" cy="96" rx="5" ry="3.5" fill="#05101F"/>
        <ellipse cx="78" cy="96" rx="5" ry="3.5" fill="#05101F"/>
      `;
    }

    return `
      <g id="camada-corpo">
        ${pernasSVG}
        <!-- Pescoço -->
        <rect x="54" y="48" width="12" height="10" rx="3" fill="${corPeleSombra}" ${strokeGrosso}/>
        <!-- Braço esquerdo -->
        <path d="M 40 62 L 32 78" fill="none" stroke="${corPele}" stroke-width="9" stroke-linecap="round"/>
        <path d="M 40 62 L 32 78" fill="none" stroke="#05101F" stroke-width="2.5" stroke-linecap="round"/>
        <!-- Mão esquerda -->
        <circle cx="31" cy="80" r="5" fill="${corPele}" ${strokeGrosso}/>

        <!-- Braço direito (comemoração ou neutro) -->
        ${reacao === 'comemorando' ? `
          <path d="M 80 62 L 92 46" fill="none" stroke="${corPele}" stroke-width="9" stroke-linecap="round"/>
          <path d="M 80 62 L 92 46" fill="none" stroke="#05101F" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="94" cy="44" r="5" fill="${corPele}" ${strokeGrosso}/>
        ` : `
          <path d="M 80 62 L 88 78" fill="none" stroke="${corPele}" stroke-width="9" stroke-linecap="round"/>
          <path d="M 80 62 L 88 78" fill="none" stroke="#05101F" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="89" cy="80" r="5" fill="${corPele}" ${strokeGrosso}/>
        `}
      </g>
    `;
  };

  // 4. ROUPA CORPORATIVA
  const renderRoupa = () => {
    let roupaDetalhes = '';
    const larguraTronco = cfg.corpo === 'f' ? 36 : 40;
    const inicioX = 60 - larguraTronco / 2;

    switch (cfg.roupa) {
      case 'terno':
        roupaDetalhes = `
          <!-- Terno com Gravata -->
          <path d="M ${inicioX} 56 L 60 88 L ${inicioX + larguraTronco} 56 Z" fill="#FFFFFF"/>
          <!-- Lapelas do Terno -->
          <path d="M ${inicioX} 56 L 52 88 L ${inicioX} 88 Z" fill="${corRoupa}" ${strokeGrosso}/>
          <path d="M ${inicioX + larguraTronco} 56 L 68 88 L ${inicioX + larguraTronco} 88 Z" fill="${corRoupa}" ${strokeGrosso}/>
          <!-- Gravata -->
          <polygon points="58,58 62,58 64,80 60,86 56,80" fill="${corRoupaSecundaria}" ${strokeGrosso}/>
        `;
        break;

      case 'blazer':
        roupaDetalhes = `
          <!-- Blazer com Camisa -->
          <rect x="${inicioX + 2}" y="56" width="${larguraTronco - 4}" height="32" rx="6" fill="#F8FAFC" ${strokeGrosso}/>
          <path d="M ${inicioX} 56 L 50 88 L ${inicioX} 88 Z" fill="${corRoupa}" ${strokeGrosso}/>
          <path d="M ${inicioX + larguraTronco} 56 L 70 88 L ${inicioX + larguraTronco} 88 Z" fill="${corRoupa}" ${strokeGrosso}/>
          <line x1="60" y1="62" x2="60" y2="86" stroke="#CBD5E1" stroke-width="2"/>
          <circle cx="60" cy="72" r="1.5" fill="${corRoupaSecundaria}"/>
        `;
        break;

      case 'polo_ss':
        roupaDetalhes = `
          <!-- Camisa Polo Institucional com Logo SS -->
          <rect x="${inicioX}" y="56" width="${larguraTronco}" height="32" rx="6" fill="${corRoupa}" ${strokeGrosso}/>
          <!-- Gola Polo -->
          <path d="M 48 56 L 60 66 L 72 56 Z" fill="${corRoupaSecundaria}" ${strokeGrosso}/>
          <line x1="60" y1="66" x2="60" y2="76" stroke="#05101F" stroke-width="2"/>
          <!-- Selo SS bordado no peito esquerdo -->
          <circle cx="${inicioX + 8}" cy="67" r="4" fill="#00B4D8" stroke="#05101F" stroke-width="1"/>
          <text x="${inicioX + 8}" cy="69" font-family="'Silkscreen', monospace" font-size="3" font-weight="700" fill="#FFFFFF" text-anchor="middle">SS</text>
        `;
        break;

      case 'jaleco':
        roupaDetalhes = `
          <!-- Jaleco de Saúde Branco Profissional -->
          <rect x="${inicioX}" y="56" width="${larguraTronco}" height="34" rx="5" fill="#FFFFFF" ${strokeGrosso}/>
          <!-- Camisa interna colorida -->
          <polygon points="52,56 68,56 60,68" fill="${corRoupa}" stroke="#05101F" stroke-width="1.5"/>
          <!-- Golas do Jaleco -->
          <path d="M ${inicioX} 56 L 54 74 L ${inicioX} 74 Z" fill="#F1F5F9" ${strokeGrosso}/>
          <path d="M ${inicioX + larguraTronco} 56 L 66 74 L ${inicioX + larguraTronco} 74 Z" fill="#F1F5F9" ${strokeGrosso}/>
          <!-- Bolsos e Estetoscópio sutil -->
          <rect x="${inicioX + 4}" y="76" width="8" height="8" rx="1.5" fill="#E2E8F0" stroke="#05101F" stroke-width="1.2"/>
          <rect x="${inicioX + larguraTronco - 12}" y="76" width="8" height="8" rx="1.5" fill="#E2E8F0" stroke="#05101F" stroke-width="1.2"/>
        `;
        break;

      case 'macacao':
        roupaDetalhes = `
          <!-- Macacão / Colete de Frota com Faixa Reflexiva -->
          <rect x="${inicioX}" y="56" width="${larguraTronco}" height="33" rx="5" fill="${corRoupa}" ${strokeGrosso}/>
          <!-- Faixa reflexiva amarela / ciano -->
          <rect x="${inicioX}" y="68" width="${larguraTronco}" height="6" fill="#FFC93C" stroke="#05101F" stroke-width="1.5"/>
          <line x1="${inicioX}" y1="71" x2="${inicioX + larguraTronco}" y2="71" stroke="#FFFFFF" stroke-width="1.5"/>
          <!-- Zíper central -->
          <line x1="60" y1="56" x2="60" y2="88" stroke="#05101F" stroke-width="2"/>
        `;
        break;

      case 'colete':
        roupaDetalhes = `
          <!-- Colete Social Estruturado -->
          <rect x="${inicioX}" y="56" width="${larguraTronco}" height="32" rx="6" fill="#F8FAFC" ${strokeGrosso}/>
          <path d="M ${inicioX + 3} 56 L 52 86 L ${inicioX + 3} 86 Z" fill="${corRoupa}" ${strokeGrosso}/>
          <path d="M ${inicioX + larguraTronco - 3} 56 L 68 86 L ${inicioX + larguraTronco - 3} 86 Z" fill="${corRoupa}" ${strokeGrosso}/>
          <!-- Botões dourados -->
          <circle cx="60" cy="68" r="1.5" fill="#FFC93C"/>
          <circle cx="60" cy="76" r="1.5" fill="#FFC93C"/>
        `;
        break;

      case 'tailleur':
        roupaDetalhes = `
          <!-- Tailleur Corporativo Feminino -->
          <rect x="${inicioX}" y="56" width="${larguraTronco}" height="32" rx="7" fill="${corRoupa}" ${strokeGrosso}/>
          <polygon points="50,56 70,56 60,70" fill="#F8FAFC" stroke="#05101F" stroke-width="1.5"/>
          <circle cx="60" cy="76" r="2" fill="#FFC93C" stroke="#05101F" stroke-width="1"/>
        `;
        break;

      default: // 'camisa_social'
        roupaDetalhes = `
          <!-- Camisa Social Alinhada -->
          <rect x="${inicioX}" y="56" width="${larguraTronco}" height="32" rx="6" fill="${corRoupa}" ${strokeGrosso}/>
          <line x1="60" y1="56" x2="60" y2="88" stroke="#05101F" stroke-width="2"/>
          <!-- Gola -->
          <polygon points="46,56 60,65 74,56 60,59" fill="#FFFFFF" ${strokeGrosso}/>
          <circle cx="60" cy="69" r="1.2" fill="#FFFFFF"/>
          <circle cx="60" cy="77" r="1.2" fill="#FFFFFF"/>
        `;
        break;
    }

    return `
      <g id="camada-roupa">
        <!-- Mangas da Roupa -->
        <path d="M 40 60 L 34 74" fill="none" stroke="${corRoupa}" stroke-width="11" stroke-linecap="round"/>
        <path d="M 40 60 L 34 74" fill="none" stroke="#05101F" stroke-width="2.5" stroke-linecap="round"/>
        ${reacao === 'comemorando' ? `
          <path d="M 80 60 L 90 48" fill="none" stroke="${corRoupa}" stroke-width="11" stroke-linecap="round"/>
          <path d="M 80 60 L 90 48" fill="none" stroke="#05101F" stroke-width="2.5" stroke-linecap="round"/>
        ` : `
          <path d="M 80 60 L 86 74" fill="none" stroke="${corRoupa}" stroke-width="11" stroke-linecap="round"/>
          <path d="M 80 60 L 86 74" fill="none" stroke="#05101F" stroke-width="2.5" stroke-linecap="round"/>
        `}
        ${roupaDetalhes}
      </g>
    `;
  };

  // 5. CABEÇA E ROSTO CHIBI (Cabeça redonda generosa)
  const renderRosto = () => {
    let olhosEBoca = '';

    // Se a reação for 'assustado' ou 'comemorando', sobrepõe a expressão
    if (reacao === 'assustado') {
      olhosEBoca = `
        <!-- Expressão: Assustado (Armadilha) -->
        <circle cx="50" cy="34" r="5" fill="#FFFFFF" ${strokeGrosso}/>
        <circle cx="50" cy="34" r="2" fill="#05101F"/>
        <circle cx="70" cy="34" r="5" fill="#FFFFFF" ${strokeGrosso}/>
        <circle cx="70" cy="34" r="2" fill="#05101F"/>
        <!-- Boca tremendo -->
        <path d="M 54 44 Q 57 41 60 44 Q 63 47 66 44" fill="none" stroke="#05101F" stroke-width="2.5" stroke-linecap="round"/>
        <!-- Gotas de suor ciano -->
        <path d="M 76 24 C 76 22 79 20 80 23 C 81 25 79 27 77 27 Z" fill="#00B4D8" stroke="#05101F" stroke-width="1"/>
      `;
    } else if (reacao === 'comemorando') {
      olhosEBoca = `
        <!-- Expressão: Comemorando / Conquista -->
        <path d="M 46 34 Q 50 28 54 34" fill="none" stroke="#05101F" stroke-width="3" stroke-linecap="round"/>
        <path d="M 66 34 Q 70 28 74 34" fill="none" stroke="#05101F" stroke-width="3" stroke-linecap="round"/>
        <!-- Boca sorrindo aberta com língua -->
        <path d="M 52 41 Q 60 52 68 41 Z" fill="#E63946" ${strokeGrosso}/>
        <ellipse cx="60" cy="46" rx="4" ry="2" fill="#FF85A1"/>
        <!-- Bochechas rosadas -->
        <circle cx="43" cy="38" r="3.5" fill="#FF7A3D" opacity="0.45"/>
        <circle cx="77" cy="38" r="3.5" fill="#FF7A3D" opacity="0.45"/>
      `;
    } else {
      switch (cfg.expressao) {
        case 'confiante':
          olhosEBoca = `
            <!-- Olhos Confiantes -->
            <path d="M 46 31 L 54 33" stroke="#05101F" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M 74 31 L 66 33" stroke="#05101F" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="50" cy="35" r="3.5" fill="#05101F"/>
            <circle cx="51" cy="34" r="1.2" fill="#FFFFFF"/>
            <circle cx="70" cy="35" r="3.5" fill="#05101F"/>
            <circle cx="71" cy="34" r="1.2" fill="#FFFFFF"/>
            <!-- Sorriso de canto -->
            <path d="M 56 43 Q 63 46 67 42" fill="none" stroke="#05101F" stroke-width="2.5" stroke-linecap="round"/>
          `;
          break;

        case 'concentrado':
          olhosEBoca = `
            <!-- Olhos Focados / Concentrado -->
            <line x1="46" y1="31" x2="54" y2="33" stroke="#05101F" stroke-width="2.5"/>
            <line x1="74" y1="31" x2="66" y2="33" stroke="#05101F" stroke-width="2.5"/>
            <ellipse cx="50" cy="35" rx="3.5" ry="2.5" fill="#05101F"/>
            <ellipse cx="70" cy="35" rx="3.5" ry="2.5" fill="#05101F"/>
            <circle cx="51" cy="34" r="1" fill="#FFFFFF"/>
            <circle cx="71" cy="34" r="1" fill="#FFFFFF"/>
            <!-- Linha de boca séria -->
            <line x1="56" y1="43" x2="64" y2="43" stroke="#05101F" stroke-width="2.5" stroke-linecap="round"/>
          `;
          break;

        case 'animado':
          olhosEBoca = `
            <!-- Olhos Grandes Brilhantes -->
            <circle cx="50" cy="34" r="4.5" fill="#05101F"/>
            <circle cx="49" cy="33" r="1.8" fill="#FFFFFF"/>
            <circle cx="52" cy="36" r="0.9" fill="#FFFFFF"/>
            <circle cx="70" cy="34" r="4.5" fill="#05101F"/>
            <circle cx="69" cy="33" r="1.8" fill="#FFFFFF"/>
            <circle cx="72" cy="36" r="0.9" fill="#FFFFFF"/>
            <path d="M 54 41 Q 60 48 66 41 Z" fill="#05101F"/>
            <circle cx="43" cy="37" r="3" fill="#FF7A3D" opacity="0.4"/>
            <circle cx="77" cy="37" r="3" fill="#FF7A3D" opacity="0.4"/>
          `;
          break;

        default: // 'sorriso'
          olhosEBoca = `
            <!-- Olhos Amigáveis com Brilho -->
            <circle cx="50" cy="34" r="4" fill="#05101F"/>
            <circle cx="49" cy="33" r="1.5" fill="#FFFFFF"/>
            <circle cx="70" cy="34" r="4" fill="#05101F"/>
            <circle cx="69" cy="33" r="1.5" fill="#FFFFFF"/>
            <!-- Sobrancelhas suaves -->
            <path d="M 46 29 Q 50 27 54 29" fill="none" stroke="#05101F" stroke-width="2" stroke-linecap="round"/>
            <path d="M 66 29 Q 70 27 74 29" fill="none" stroke="#05101F" stroke-width="2" stroke-linecap="round"/>
            <!-- Sorriso simpático -->
            <path d="M 55 42 Q 60 46 65 42" fill="none" stroke="#05101F" stroke-width="2.5" stroke-linecap="round"/>
          `;
          break;
      }
    }

    return `
      <g id="camada-rosto">
        <!-- Orelhas Chibi -->
        <circle cx="34" cy="36" r="6" fill="${corPele}" ${strokeGrosso}/>
        <circle cx="86" cy="36" r="6" fill="${corPele}" ${strokeGrosso}/>
        <!-- Cabeça Chibi Redonda -->
        <circle cx="60" cy="36" r="26" fill="${corPele}" ${strokeGrosso}/>
        <!-- Nariz delicado -->
        <circle cx="60" cy="38" r="1.5" fill="${corPeleSombra}"/>
        ${olhosEBoca}
      </g>
    `;
  };

  // 6. BARBA / BIGODE
  const renderBarba = () => {
    switch (cfg.barba) {
      case 'por_fazer':
        return `
          <!-- Barba por Fazer (Textura pontilhada suave) -->
          <path d="M 44 40 C 44 54 76 54 76 40 C 72 50 48 50 44 40 Z" fill="${corCabelo}" opacity="0.25"/>
        `;
      case 'cavanhaque':
        return `
          <!-- Cavanhaque -->
          <path d="M 54 44 Q 60 48 66 44 L 63 56 Q 60 58 57 56 Z" fill="${corCabelo}" ${strokeGrosso}/>
        `;
      case 'bigode':
        return `
          <!-- Bigode Clássico -->
          <path d="M 52 42 Q 60 40 68 42 Q 60 46 52 42 Z" fill="${corCabelo}" ${strokeGrosso}/>
        `;
      case 'curta':
        return `
          <!-- Barba Curta Desenhada -->
          <path d="M 37 38 C 37 58 83 58 83 38 C 77 56 43 56 37 38 Z" fill="${corCabelo}" ${strokeGrosso}/>
          <path d="M 52 42 Q 60 40 68 42 Q 60 45 52 42 Z" fill="${corCabelo}"/>
        `;
      case 'cheia':
        return `
          <!-- Barba Cheia Imponente -->
          <path d="M 36 36 C 35 64 85 64 84 36 C 76 60 44 60 36 36 Z" fill="${corCabelo}" ${strokeGrosso}/>
          <path d="M 50 41 Q 60 38 70 41 Q 60 47 50 41 Z" fill="${corCabelo}" ${strokeGrosso}/>
        `;
      default:
        return '';
    }
  };

  // 7. CABELO
  const renderCabelo = () => {
    switch (cfg.cabelo) {
      case 'raspado':
        return `
          <!-- Cabelo Raspado -->
          <path d="M 35 34 C 35 15 85 15 85 34 Z" fill="${corCabelo}" opacity="0.35"/>
        `;
      case 'careca':
        return ''; // Sem cabelo

      case 'liso_medio':
        return `
          <!-- Cabelo Liso Médio -->
          <path d="M 33 46 C 31 22 89 22 87 46 L 85 64 C 81 50 81 30 78 28 C 68 20 52 20 42 28 C 39 30 39 50 35 64 Z" fill="${corCabelo}" ${strokeGrosso}/>
          <path d="M 42 24 Q 60 18 78 24" fill="none" stroke="${corCabeloBrilho}" stroke-width="2.5"/>
        `;

      case 'longo':
        return `
          <!-- Cabelo Longo Ondulado -->
          <path d="M 32 44 C 28 20 92 20 88 44 L 88 78 C 84 62 82 42 78 30 C 68 20 52 20 42 30 C 38 42 36 62 32 78 Z" fill="${corCabelo}" ${strokeGrosso}/>
          <path d="M 30 76 Q 34 82 38 76" fill="none" stroke="${corCabelo}" stroke-width="4"/>
          <path d="M 82 76 Q 86 82 90 76" fill="none" stroke="${corCabelo}" stroke-width="4"/>
        `;

      case 'coque':
        return `
          <!-- Coque Elegante -->
          <circle cx="60" cy="8" r="11" fill="${corCabelo}" ${strokeGrosso}/>
          <circle cx="60" cy="8" r="6" fill="${corCabeloBrilho}" opacity="0.5"/>
          <path d="M 34 32 C 34 16 86 16 86 32 C 78 22 42 22 34 32 Z" fill="${corCabelo}" ${strokeGrosso}/>
        `;

      case 'rabo_cavalo':
        return `
          <!-- Rabo de Cavalo -->
          <path d="M 82 24 C 92 24 98 42 94 56 C 90 44 86 32 82 24 Z" fill="${corCabelo}" ${strokeGrosso}/>
          <circle cx="82" cy="24" r="4" fill="#00B4D8" stroke="#05101F" stroke-width="1.5"/>
          <path d="M 34 32 C 34 16 86 16 86 32 C 78 22 42 22 34 32 Z" fill="${corCabelo}" ${strokeGrosso}/>
        `;

      case 'cacheado':
        return `
          <!-- Cabelo Cacheado Volumoso -->
          <path d="M 30 38 C 26 22 34 10 50 10 C 60 8 70 8 80 14 C 94 20 94 36 90 44 C 84 32 78 22 60 20 C 42 22 36 32 30 38 Z" fill="${corCabelo}" ${strokeGrosso}/>
          <circle cx="36" cy="18" r="8" fill="${corCabelo}" ${strokeGrosso}/>
          <circle cx="50" cy="11" r="8" fill="${corCabelo}" ${strokeGrosso}/>
          <circle cx="68" cy="11" r="8" fill="${corCabelo}" ${strokeGrosso}/>
          <circle cx="84" cy="18" r="8" fill="${corCabelo}" ${strokeGrosso}/>
          <circle cx="28" cy="30" r="7" fill="${corCabelo}" ${strokeGrosso}/>
          <circle cx="92" cy="30" r="7" fill="${corCabelo}" ${strokeGrosso}/>
        `;

      case 'crespo_black':
        return `
          <!-- Black Power / Crespo Imponente -->
          <circle cx="60" cy="28" r="32" fill="${corCabelo}" ${strokeGrosso}/>
          <circle cx="42" cy="18" r="14" fill="${corCabeloBrilho}" opacity="0.3"/>
          <!-- Rosto vazado sobre o black power -->
          <circle cx="60" cy="36" r="26" fill="${corPele}" ${strokeGrosso}/>
        `;

      case 'trancas':
        return `
          <!-- Tranças Nagô -->
          <path d="M 34 32 C 34 16 86 16 86 32 Z" fill="${corCabelo}" ${strokeGrosso}/>
          <line x1="42" y1="20" x2="36" y2="52" stroke="${corCabeloBrilho}" stroke-width="4" stroke-dasharray="3 2" ${strokeGrosso}/>
          <line x1="50" y1="16" x2="44" y2="56" stroke="${corCabeloBrilho}" stroke-width="4" stroke-dasharray="3 2" ${strokeGrosso}/>
          <line x1="60" y1="14" x2="60" y2="28" stroke="${corCabeloBrilho}" stroke-width="4" stroke-dasharray="3 2" ${strokeGrosso}/>
          <line x1="70" y1="16" x2="76" y2="56" stroke="${corCabeloBrilho}" stroke-width="4" stroke-dasharray="3 2" ${strokeGrosso}/>
          <line x1="78" y1="20" x2="84" y2="52" stroke="${corCabeloBrilho}" stroke-width="4" stroke-dasharray="3 2" ${strokeGrosso}/>
        `;

      case 'dreads':
        return `
          <!-- Dreads Estruturados -->
          <path d="M 33 30 C 33 16 87 16 87 30 Z" fill="${corCabelo}" ${strokeGrosso}/>
          <rect x="30" y="24" width="7" height="34" rx="3.5" fill="${corCabelo}" ${strokeGrosso}/>
          <rect x="38" y="16" width="7" height="42" rx="3.5" fill="${corCabelo}" ${strokeGrosso}/>
          <rect x="75" y="16" width="7" height="42" rx="3.5" fill="${corCabelo}" ${strokeGrosso}/>
          <rect x="83" y="24" width="7" height="34" rx="3.5" fill="${corCabelo}" ${strokeGrosso}/>
        `;

      case 'franja':
        return `
          <!-- Chanel com Franja Reto -->
          <path d="M 33 36 C 33 16 87 16 87 36 L 87 52 L 80 50 L 80 30 C 72 26 48 26 40 30 L 40 50 L 33 52 Z" fill="${corCabelo}" ${strokeGrosso}/>
          <!-- Linha reta da franja -->
          <path d="M 40 28 L 80 28 L 78 33 L 42 33 Z" fill="${corCabelo}" ${strokeGrosso}/>
        `;

      default: // 'curto'
        return `
          <!-- Curto Social Repartido -->
          <path d="M 34 32 C 34 14 86 14 86 32 C 78 20 62 18 52 24 C 44 20 38 24 34 32 Z" fill="${corCabelo}" ${strokeGrosso}/>
          <path d="M 46 20 Q 64 16 76 22" fill="none" stroke="${corCabeloBrilho}" stroke-width="2.5"/>
        `;
    }
  };

  // 8. ACESSÓRIOS DE ROSTO (Óculos, etc.)
  const renderAcessorioRosto = () => {
    switch (cfg.rosto) {
      case 'oculos_grau':
        return `
          <!-- Óculos de Grau Armação Retangular -->
          <rect x="42" y="29" width="15" height="11" rx="3" fill="none" stroke="#05101F" stroke-width="2.5"/>
          <rect x="42" y="29" width="15" height="11" rx="3" fill="#00B4D8" opacity="0.18"/>
          <rect x="63" y="29" width="15" height="11" rx="3" fill="none" stroke="#05101F" stroke-width="2.5"/>
          <rect x="63" y="29" width="15" height="11" rx="3" fill="#00B4D8" opacity="0.18"/>
          <line x1="57" y1="34" x2="63" y2="34" stroke="#05101F" stroke-width="2.5"/>
          <line x1="36" y1="33" x2="42" y2="33" stroke="#05101F" stroke-width="2"/>
          <line x1="78" y1="33" x2="84" y2="33" stroke="#05101F" stroke-width="2"/>
        `;

      case 'oculos_escuros':
        return `
          <!-- Óculos Escuros Sofisticados -->
          <path d="M 41 29 L 57 29 C 57 39 42 41 41 29 Z" fill="#05101F" ${strokeGrosso}/>
          <path d="M 63 29 L 79 29 C 79 41 64 39 63 29 Z" fill="#05101F" ${strokeGrosso}/>
          <line x1="57" y1="32" x2="63" y2="32" stroke="#FFC93C" stroke-width="2.5"/>
          <line x1="43" y1="31" x2="55" y2="35" stroke="#FFFFFF" stroke-width="1.2" opacity="0.4"/>
          <line x1="65" y1="31" x2="77" y2="35" stroke="#FFFFFF" stroke-width="1.2" opacity="0.4"/>
        `;

      case 'monoculo':
        return `
          <!-- Monóculo Dourado Clássico -->
          <circle cx="70" cy="34" r="8" fill="#FFC93C" opacity="0.2"/>
          <circle cx="70" cy="34" r="8" fill="none" stroke="#FFC93C" stroke-width="2.5"/>
          <path d="M 78 34 Q 84 46 80 58" fill="none" stroke="#FFC93C" stroke-width="1.5" stroke-dasharray="2 1"/>
        `;

      case 'tapa_olho':
        return `
          <!-- Tapa-olho de Couro -->
          <path d="M 36 28 L 84 40" stroke="#05101F" stroke-width="2"/>
          <path d="M 43 31 C 43 41 57 41 57 31 Z" fill="#05101F" ${strokeGrosso}/>
        `;

      case 'oculos_leitura':
        return `
          <!-- Óculos de Leitura na Ponta do Nariz -->
          <ellipse cx="49" cy="38" rx="6" ry="4" fill="none" stroke="#05101F" stroke-width="2"/>
          <ellipse cx="71" cy="38" rx="6" ry="4" fill="none" stroke="#05101F" stroke-width="2"/>
          <line x1="55" y1="38" x2="65" y2="38" stroke="#05101F" stroke-width="2"/>
        `;

      default:
        return '';
    }
  };

  // 9. ACESSÓRIOS DE CABEÇA (Boné SEST SENAT, Chapéu, Capacete, etc.)
  const renderAcessorioCabeca = () => {
    switch (cfg.cabeca) {
      case 'bone_ss':
        return `
          <!-- Boné SEST SENAT Institucional -->
          <g id="bone-ss">
            <!-- Copa do Boné -->
            <path d="M 33 28 C 33 12 87 12 87 28 Z" fill="#00B4D8" ${strokeGrosso}/>
            <!-- Aba do Boné -->
            <path d="M 30 28 C 30 28 50 34 82 28 C 90 28 94 34 84 35 C 50 40 30 28 30 28 Z" fill="#07203E" ${strokeGrosso}/>
            <!-- Selo SS frontal -->
            <circle cx="60" cy="20" r="5" fill="#FFC93C" stroke="#05101F" stroke-width="1.2"/>
            <text x="60" y="22.5" font-family="'Silkscreen', monospace" font-size="3.5" font-weight="700" fill="#05101F" text-anchor="middle">SS</text>
          </g>
        `;

      case 'chapeu_ss':
        return `
          <!-- Chapéu Panamá / Fedora SEST SENAT -->
          <path d="M 40 18 C 40 10 80 10 80 18 L 84 25 L 36 25 Z" fill="#F8FAFC" ${strokeGrosso}/>
          <!-- Fita Azul Navy com logo -->
          <rect x="37" y="21" width="46" height="4" fill="#0B2545"/>
          <!-- Aba curvada -->
          <ellipse cx="60" cy="25" rx="36" ry="7" fill="#F8FAFC" ${strokeGrosso}/>
        `;

      case 'capacete_seguranca':
        return `
          <!-- Capacete de Segurança EPI Amarelo -->
          <path d="M 34 26 C 34 10 86 10 86 26 Z" fill="#FFC93C" ${strokeGrosso}/>
          <path d="M 30 26 L 90 26 L 86 29 L 34 29 Z" fill="#FFC93C" ${strokeGrosso}/>
          <!-- Faixa reflexiva branca -->
          <path d="M 40 20 L 80 20 L 78 23 L 42 23 Z" fill="#FFFFFF"/>
        `;

      case 'fone_ouvido':
        return `
          <!-- Headphone Corporativo com Microfone -->
          <path d="M 32 36 C 32 12 88 12 88 36" fill="none" stroke="#05101F" stroke-width="4" stroke-linecap="round"/>
          <rect x="28" y="30" width="7" height="15" rx="3" fill="#00B4D8" ${strokeGrosso}/>
          <rect x="85" y="30" width="7" height="15" rx="3" fill="#00B4D8" ${strokeGrosso}/>
          <!-- Microfone saindo do fone -->
          <path d="M 32 42 Q 36 50 48 48" fill="none" stroke="#05101F" stroke-width="2" stroke-linecap="round"/>
          <circle cx="50" cy="48" r="2" fill="#FFC93C"/>
        `;

      case 'aparelho_auditivo':
        return `
          <!-- Aparelho Auditivo Tecnológico -->
          <path d="M 88 34 C 92 34 94 38 92 42 C 90 44 88 42 88 38" fill="#FFC93C" stroke="#05101F" stroke-width="1.5"/>
          <circle cx="89" cy="38" r="1.5" fill="#00B4D8"/>
        `;

      case 'lenco_turbante':
        return `
          <!-- Turbante / Lenço Estiloso -->
          <path d="M 32 30 C 30 10 90 10 88 30 C 80 18 40 18 32 30 Z" fill="#7209B7" ${strokeGrosso}/>
          <ellipse cx="60" cy="18" rx="28" ry="12" fill="#800E2B" ${strokeGrosso}/>
          <circle cx="60" cy="18" r="5" fill="#FFC93C" stroke="#05101F" stroke-width="1.5"/>
        `;

      default:
        return '';
    }
  };

  // 10. ITENS NA MÃO / COSTAS (Mala SEST SENAT, Notebook, etc.)
  const renderItemMao = () => {
    if (modo === 'busto') return '';

    switch (cfg.item) {
      case 'mala_ss':
        return `
          <!-- Mala de Viagem SEST SENAT -->
          <g id="item-mala" transform="translate(14, 68)">
            <rect x="0" y="4" width="20" height="28" rx="3" fill="#0B2545" ${strokeGrosso}/>
            <!-- Alça telescópica -->
            <path d="M 5 4 L 5 -4 L 15 -4 L 15 4" fill="none" stroke="#05101F" stroke-width="2"/>
            <rect x="7" y="-6" width="6" height="3" rx="1" fill="#FFC93C" stroke="#05101F" stroke-width="1"/>
            <!-- Frisos e Rodinhas -->
            <line x1="0" y1="12" x2="20" y2="12" stroke="#00B4D8" stroke-width="1.5"/>
            <circle cx="4" cy="33" r="2.5" fill="#05101F"/>
            <circle cx="16" cy="33" r="2.5" fill="#05101F"/>
            <!-- Selo SS -->
            <circle cx="10" cy="20" r="3.5" fill="#FFC93C" stroke="#05101F" stroke-width="1"/>
            <text x="10" y="22" font-family="'Silkscreen', monospace" font-size="2.5" font-weight="700" fill="#05101F" text-anchor="middle">SS</text>
          </g>
        `;

      case 'notebook':
        return `
          <!-- Notebook Aberto -->
          <g id="item-notebook" transform="translate(76, 68)">
            <polygon points="4,2 18,2 20,14 2,14" fill="#0E2135" ${strokeGrosso}/>
            <rect x="4" y="3" width="13" height="9" fill="#00B4D8"/>
            <line x1="6" y1="6" x2="15" y2="6" stroke="#FFFFFF" stroke-width="1"/>
            <line x1="6" y1="9" x2="12" y2="9" stroke="#FFFFFF" stroke-width="1"/>
            <!-- Base / Teclado -->
            <polygon points="0,14 22,14 18,19 4,19" fill="#475569" ${strokeGrosso}/>
          </g>
        `;

      case 'prancheta':
        return `
          <!-- Prancheta de Auditoria -->
          <g id="item-prancheta" transform="translate(78, 66)">
            <rect x="0" y="0" width="16" height="22" rx="2" fill="#78350F" ${strokeGrosso}/>
            <rect x="2" y="2" width="12" height="18" fill="#F8FAFC"/>
            <!-- Clipe metálico -->
            <rect x="5" y="-2" width="6" height="3" fill="#94A3B8" stroke="#05101F" stroke-width="1"/>
            <!-- Linhas de checklist com checks verdes -->
            <line x1="6" y1="7" x2="12" y2="7" stroke="#05101F" stroke-width="1"/>
            <circle cx="4" cy="7" r="1" fill="#3CCB7F"/>
            <line x1="6" y1="11" x2="12" y2="11" stroke="#05101F" stroke-width="1"/>
            <circle cx="4" cy="11" r="1" fill="#3CCB7F"/>
            <line x1="6" y1="15" x2="12" y2="15" stroke="#05101F" stroke-width="1"/>
            <circle cx="4" cy="15" r="1" fill="#3CCB7F"/>
          </g>
        `;

      case 'caneca_cafe':
        return `
          <!-- Caneca Térmica de Café -->
          <g id="item-caneca" transform="translate(86, 74)">
            <rect x="0" y="0" width="10" height="12" rx="2" fill="#00B4D8" ${strokeGrosso}/>
            <path d="M 10 3 C 14 3 14 9 10 9" fill="none" stroke="#05101F" stroke-width="2"/>
            <!-- Vapor saindo -->
            <path d="M 2 -2 Q 4 -4 2 -6" fill="none" stroke="#CBD5E1" stroke-width="1.2" stroke-linecap="round"/>
            <path d="M 6 -2 Q 8 -4 6 -6" fill="none" stroke="#CBD5E1" stroke-width="1.2" stroke-linecap="round"/>
            <text x="5" y="8" font-family="'Silkscreen', monospace" font-size="3" font-weight="700" fill="#05101F" text-anchor="middle">SS</text>
          </g>
        `;

      case 'tablet_grafico':
        return `
          <!-- Tablet Exibindo Gráfico -->
          <g id="item-tablet" transform="translate(76, 68)">
            <rect x="0" y="0" width="18" height="22" rx="3" fill="#0F172A" ${strokeGrosso}/>
            <rect x="2" y="2" width="14" height="18" rx="1.5" fill="#07192C"/>
            <!-- Gráfico de barras na tela -->
            <rect x="4" y="14" width="2" height="4" fill="#00B4D8"/>
            <rect x="7" y="10" width="2" height="8" fill="#3CCB7F"/>
            <rect x="10" y="7" width="2" height="11" fill="#FFC93C"/>
          </g>
        `;

      case 'cracha':
        return `
          <!-- Crachá com Cordão no Peito -->
          <g id="item-cracha">
            <path d="M 54 56 L 60 72 L 66 56" fill="none" stroke="#00B4D8" stroke-width="1.8"/>
            <rect x="55" y="72" width="10" height="12" rx="1.5" fill="#FFFFFF" stroke="#05101F" stroke-width="1.2"/>
            <rect x="56" y="74" width="8" height="3" fill="#00B4D8"/>
            <line x1="57" y1="79" x2="63" y2="79" stroke="#05101F" stroke-width="0.8"/>
            <line x1="57" y1="81" x2="61" y2="81" stroke="#05101F" stroke-width="0.8"/>
          </g>
        `;

      default: // 'bengala' se estiver em mobilidade
        if (cfg.mobilidade === 'bengala') {
          return `
            <!-- Bengala de Apoio / Guia -->
            <g id="item-bengala" transform="translate(86, 72)">
              <path d="M 4 0 C 4 -6 0 -6 0 0 L 0 38" fill="none" stroke="#D4A373" stroke-width="3" stroke-linecap="round"/>
              <path d="M 4 0 C 4 -6 0 -6 0 0 L 0 38" fill="none" stroke="#05101F" stroke-width="1" stroke-linecap="round"/>
              <rect x="-1" y="36" width="2" height="4" fill="#05101F"/>
            </g>
          `;
        }
        return '';
    }
  };

  // Ajuste de ViewBox por Modo
  // Completo: 0 0 120 130
  // Busto: 24 6 72 72 (Foco em cabeça e ombros)
  const viewBox = modo === 'busto' ? '24 6 72 72' : '0 0 120 130';

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" class="avatar-chibi-svg modo-${modo} reacao-${reacao}" shape-rendering="geometricPrecision">
      <defs>
        <filter id="avatar-sombra-dura" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="0" flood-color="#05101F" flood-opacity="0.85"/>
        </filter>
      </defs>

      <!-- ORDEM ESTRITA DE CAMADAS FIXAS -->
      ${renderBase()}
      ${renderMobilidade()}
      ${renderCorpo()}
      ${renderRoupa()}
      ${renderRosto()}
      ${renderBarba()}
      ${renderCabelo()}
      ${renderAcessorioRosto()}
      ${renderAcessorioCabeca()}
      ${renderItemMao()}
    </svg>
  `;

  // Sanitização e cache
  const cleanSVG = svgContent.trim().replace(/\s+/g, ' ');
  cacheRenderizacao.set(cacheKey, cleanSVG);
  return cleanSVG;
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
