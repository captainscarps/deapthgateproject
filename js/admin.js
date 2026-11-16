// js/admin.js - Área do admin da Roleta da Governança
// ---------------------------------------------------------------------------
// Fluxo: FONTES (políticas, leis, normas) → GERAR PERGUNTAS (trechos + pedido para
// IA homologada, ou criação manual) → REVISÃO (editar/aprovar) → PUBLICAR (testar
// no jogo e exportar perguntas.json / fontes.json).
//
// O site é estático: tudo fica salvo NESTE navegador até ser exportado e publicado.
// O texto integral dos documentos nunca é exportado (pode ser material interno).
// ---------------------------------------------------------------------------
import { CATEGORIAS, categoria, CHAVE_BANCO_LOCAL } from './perguntas.js';
import { ico } from './icones.js';

const CHAVE_FONTES = 'roleta_admin_fontes_v1';
const PREFIXO_TEXTO = 'roleta_admin_texto_';
const app = document.getElementById('admin-app');

const TIPOS = { lei: 'Lei', norma: 'Norma / Resolução', politica: 'Política interna', manual: 'Manual / Procedimento', guia: 'Guia / Boas práticas', acervo: 'Acervo', outro: 'Outro' };
const STATUS_FONTE = { vigente: 'Vigente', provisoria: 'Provisória', revogada: 'Revogada' };
const STATUS_PERGUNTA = {
  rascunho: { nome: 'Rascunho', cor: '#94A3B8' },
  revisao: { nome: 'Em revisão', cor: '#FFB703' },
  aprovada: { nome: 'Aprovada', cor: '#3CCB7F' },
  exemplo: { nome: 'Exemplo', cor: '#B98CFF' }
};

let publicado = { perguntas: [], fontes: [] };
let banco = null;   // { versao, observacao, perguntas }
let fontes = null;  // { versao, observacao, fontes }
let aba = 'fontes';
let filtros = { status: 'revisao', categoria: '', fonte: '', busca: '' };
let geracao = { fonteId: '', selecionados: new Set(), categoria: '', quantidade: 5, nivel: 'misto', buscaTrecho: '' };

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));

function slug(txt) {
  return String(txt || 'item').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32) || 'item';
}

function toast(msg, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = `admin-toast ${tipo}`;
  el.innerHTML = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('saindo'), 2800);
  setTimeout(() => el.remove(), 3300);
}

async function lerJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`Falha ao carregar ${url}`);
  return r.json();
}

function salvarLocal() {
  try {
    localStorage.setItem(CHAVE_BANCO_LOCAL, JSON.stringify(banco));
    localStorage.setItem(CHAVE_FONTES, JSON.stringify(fontes));
  } catch (e) {
    toast(`${ico('alerta')} Não foi possível salvar no navegador (espaço cheio?)`, 'erro');
  }
}

function textoFonte(id) {
  try { return localStorage.getItem(PREFIXO_TEXTO + id) || ''; } catch (_) { return ''; }
}
function salvarTexto(id, texto) {
  try {
    if (texto) localStorage.setItem(PREFIXO_TEXTO + id, texto);
    else localStorage.removeItem(PREFIXO_TEXTO + id);
    return true;
  } catch (_) {
    toast(`${ico('alerta')} Documento grande demais para guardar no navegador. Cole só as seções relevantes.`, 'erro');
    return false;
  }
}

function fontePorId(id) {
  return fontes.fontes.find(f => f.id === id) || null;
}

function baixar(nome, conteudo) {
  const blob = new Blob([conteudo], { type: 'application/json;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// ---------------------------------------------------------------------------
// Validação de perguntas (mesmas regras de tests.html)
// ---------------------------------------------------------------------------
function problemas(p) {
  const lista = [];
  const alts = (p.alternativas || []).map(a => String(a || '').trim()).filter(Boolean);
  if (!String(p.pergunta || '').trim()) lista.push('Sem enunciado');
  if (alts.length < 2) lista.push('Menos de 2 alternativas');
  if (alts.length > 4) lista.push('Mais de 4 alternativas');
  if (!(p.correta >= 0 && p.correta < alts.length)) lista.push('Resposta correta inválida');
  if (new Set(alts.map(a => a.toLowerCase())).size !== alts.length) lista.push('Alternativas repetidas');
  if (!String(p.explicacao || '').trim()) lista.push('Sem explicação');
  if (!CATEGORIAS.some(c => c.id === p.categoria)) lista.push('Categoria inválida');
  if (String(p.pergunta || '').length > 240) lista.push('Enunciado longo (>240 caracteres)');
  if (alts.some(a => a.length > 140)) lista.push('Alternativa longa (>140 caracteres)');
  return lista;
}

function novoId(base) {
  const ids = new Set(banco.perguntas.map(p => p.id));
  let n = 1;
  let id;
  do { id = `${base}_${String(n).padStart(3, '0')}`; n++; } while (ids.has(id));
  return id;
}

// ---------------------------------------------------------------------------
// Diferenças em relação ao publicado
// ---------------------------------------------------------------------------
function diferencas() {
  const pub = new Map(publicado.perguntas.map(p => [p.id, JSON.stringify(p)]));
  const loc = new Map(banco.perguntas.map(p => [p.id, JSON.stringify(p)]));
  const novas = banco.perguntas.filter(p => !pub.has(p.id));
  const alteradas = banco.perguntas.filter(p => pub.has(p.id) && pub.get(p.id) !== loc.get(p.id));
  const removidas = publicado.perguntas.filter(p => !loc.has(p.id));
  const fPub = new Map(publicado.fontes.map(f => [f.id, JSON.stringify(f)]));
  const fontesNovas = fontes.fontes.filter(f => !fPub.has(f.id));
  const fontesAlteradas = fontes.fontes.filter(f => fPub.has(f.id) && fPub.get(f.id) !== JSON.stringify(f));
  const fontesRemovidas = publicado.fontes.filter(f => !fontes.fontes.some(x => x.id === f.id));
  const total = novas.length + alteradas.length + removidas.length + fontesNovas.length + fontesAlteradas.length + fontesRemovidas.length;
  return { novas, alteradas, removidas, fontesNovas, fontesAlteradas, fontesRemovidas, total };
}

// ---------------------------------------------------------------------------
// Layout geral
// ---------------------------------------------------------------------------
function render() {
  // Preserva a rolagem ao redesenhar
  const rolagem = window.scrollY;
  const rolTrechos = app.querySelector('.trechos-lista')?.scrollTop || 0;
  requestAnimationFrame(() => {
    window.scrollTo(0, rolagem);
    const t = app.querySelector('.trechos-lista');
    if (t) t.scrollTop = rolTrechos;
  });
  const dif = diferencas();
  const emRevisao = banco.perguntas.filter(p => p.status === 'revisao' || p.status === 'rascunho').length;
  app.innerHTML = `
    <header class="admin-topo">
      <div class="admin-marca">
        <span class="admin-marca-ico">${ico('livro')}</span>
        <div>
          <div class="admin-marca-titulo">Área do admin</div>
          <div class="admin-marca-sub">Roleta da Governança · fontes e perguntas</div>
        </div>
      </div>
      <div class="admin-topo-acoes">
        ${dif.total ? `<span class="admin-pendente">${dif.total} alteração(ões) não publicada(s)</span>` : '<span class="admin-sincronizado">Tudo publicado</span>'}
        <a class="admin-btn admin-btn-sec" href="index.html" target="_blank" rel="noopener">${ico('dado')} Abrir jogo</a>
      </div>
    </header>

    <div class="admin-aviso">
      ${ico('escudo')}
      <span>Tudo o que você faz aqui fica salvo <strong>só neste navegador</strong> até ser exportado na aba <strong>Publicar</strong>.
      O texto integral dos documentos nunca é exportado. Nenhuma pergunta entra no jogo sem aprovação.</span>
    </div>

    <nav class="admin-abas">
      ${[['fontes', 'livro', 'Fontes', fontes.fontes.length], ['gerar', 'raio', 'Gerar perguntas', null], ['revisao', 'check', 'Revisão', emRevisao], ['publicar', 'seta', 'Publicar', dif.total || null]]
        .map(([id, i, nome, n]) => `<button type="button" class="admin-aba ${aba === id ? 'ativa' : ''}" data-aba="${id}">${ico(i)} ${nome}${n ? ` <span class="admin-aba-n">${n}</span>` : ''}</button>`).join('')}
    </nav>

    <main class="admin-conteudo" id="admin-conteudo"></main>
  `;
  app.querySelectorAll('.admin-aba').forEach(b => { b.onclick = () => { aba = b.dataset.aba; render(); }; });
  const conteudo = app.querySelector('#admin-conteudo');
  ({ fontes: abaFontes, gerar: abaGerar, revisao: abaRevisao, publicar: abaPublicar })[aba](conteudo);
}

// ---------------------------------------------------------------------------
// ABA FONTES
// ---------------------------------------------------------------------------
function abaFontes(el) {
  const contagem = (id) => banco.perguntas.filter(p => p.fonte_id === id).length;
  el.innerHTML = `
    <div class="admin-cabecalho-aba">
      <div>
        <h2>Fontes de conteúdo</h2>
        <p>Leis, normas e políticas que servem de base para as perguntas. Adicione uma nova política para gerar perguntas a partir dela.</p>
      </div>
      <button type="button" class="admin-btn" id="btn-nova-fonte">${ico('livro')} Nova fonte</button>
    </div>
    <div class="admin-grade-fontes">
      ${fontes.fontes.map(f => {
        const txt = textoFonte(f.id);
        const n = contagem(f.id);
        return `
          <article class="fonte-cartao status-${esc(f.status)}">
            <div class="fonte-topo">
              <span class="fonte-tipo">${esc(TIPOS[f.tipo] || f.tipo)}</span>
              <span class="fonte-status">${esc(STATUS_FONTE[f.status] || f.status)}</span>
            </div>
            <h3>${esc(f.titulo)}</h3>
            <div class="fonte-meta">${esc(f.referencia_oficial || '')}${f.orgao ? ` · ${esc(f.orgao)}` : ''}${f.vigencia ? ` · desde ${esc(f.vigencia.split('-').reverse().join('/'))}` : ''}</div>
            ${f.resumo ? `<p class="fonte-resumo">${esc(f.resumo)}</p>` : ''}
            <div class="fonte-cats">${(f.categorias || []).map(c => `<span class="chip-cat" style="--cor: ${categoria(c).cor};">${esc(categoria(c).nome)}</span>`).join('')}</div>
            <div class="fonte-rodape">
              <span>${n} pergunta${n === 1 ? '' : 's'}</span>
              <span class="${txt ? 'fonte-texto-ok' : 'fonte-texto-falta'}">${txt ? `${ico('check')} documento carregado (${Math.round(txt.length / 1000)}k caracteres)` : `${ico('alerta')} sem documento`}</span>
            </div>
            <div class="fonte-acoes">
              <button type="button" class="admin-btn admin-btn-sec" data-editar="${esc(f.id)}">Editar</button>
              <button type="button" class="admin-btn" data-gerar="${esc(f.id)}" ${txt ? '' : 'disabled title="Carregue o documento para gerar perguntas"'}>${ico('raio')} Gerar perguntas</button>
              ${f.url ? `<a class="admin-link" href="${esc(f.url)}" target="_blank" rel="noopener">Ver original</a>` : ''}
            </div>
          </article>`;
      }).join('')}
    </div>`;
  el.querySelector('#btn-nova-fonte').onclick = () => editarFonte(null);
  el.querySelectorAll('[data-editar]').forEach(b => { b.onclick = () => editarFonte(b.dataset.editar); });
  el.querySelectorAll('[data-gerar]').forEach(b => {
    b.onclick = () => { geracao = { ...geracao, fonteId: b.dataset.gerar, selecionados: new Set(), categoria: '' }; aba = 'gerar'; render(); };
  });
}

function editarFonte(id) {
  const atual = id ? clone(fontePorId(id)) : { id: '', titulo: '', tipo: 'politica', orgao: 'SEST SENAT', referencia_oficial: '', vigencia: '', url: '', categorias: ['politicas'], status: 'vigente', resumo: '' };
  const texto = id ? textoFonte(id) : '';
  const usadas = id ? banco.perguntas.filter(p => p.fonte_id === id).length : 0;
  abrirModal(`
    <h2>${id ? 'Editar fonte' : 'Nova fonte'}</h2>
    <form id="form-fonte" class="admin-form">
      <label class="campo campo-largo">Título *<input name="titulo" required value="${esc(atual.titulo)}" placeholder="Ex.: Política de Uso de Inteligência Artificial"></label>
      <label class="campo">Tipo<select name="tipo">${Object.entries(TIPOS).map(([k, v]) => `<option value="${k}" ${atual.tipo === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="campo">Situação<select name="status">${Object.entries(STATUS_FONTE).map(([k, v]) => `<option value="${k}" ${atual.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="campo">Órgão / área responsável<input name="orgao" value="${esc(atual.orgao)}"></label>
      <label class="campo">Referência oficial<input name="referencia_oficial" value="${esc(atual.referencia_oficial)}" placeholder="Ex.: Portaria nº 123/2026"></label>
      <label class="campo">Vigente desde<input type="date" name="vigencia" value="${esc(atual.vigencia)}"></label>
      <label class="campo">Link do original<input type="url" name="url" value="${esc(atual.url)}" placeholder="https://..."></label>
      <fieldset class="campo campo-largo"><legend>Categorias do jogo</legend>
        <div class="checks">${CATEGORIAS.map(c => `<label class="check"><input type="checkbox" name="categorias" value="${c.id}" ${(atual.categorias || []).includes(c.id) ? 'checked' : ''}> ${c.nomeLongo}</label>`).join('')}</div>
      </fieldset>
      <label class="campo campo-largo">Resumo (aparece só aqui)<textarea name="resumo" rows="2">${esc(atual.resumo)}</textarea></label>
      <div class="campo campo-largo">
        <div class="campo-rotulo">Documento</div>
        <div class="upload-linha">
          <label class="admin-btn admin-btn-sec upload-btn">${ico('caixa')} Enviar arquivo (.txt, .md, .pdf, .docx)<input type="file" id="arquivo-fonte" accept=".txt,.md,.pdf,.docx" hidden></label>
          <span id="arquivo-status" class="upload-status"></span>
        </div>
        <textarea name="texto" id="texto-fonte" rows="10" placeholder="Ou cole aqui o texto da política/lei. Ele fica salvo só neste navegador e não é publicado.">${esc(texto)}</textarea>
        <div class="campo-dica">${ico('lampada')} Não envie documentos classificados como confidenciais se este computador for compartilhado.</div>
      </div>
      <div class="form-acoes">
        ${id && !usadas ? `<button type="button" class="admin-btn admin-btn-perigo" id="btn-remover-fonte">Remover fonte</button>` : ''}
        ${id && usadas ? `<span class="campo-dica">${usadas} pergunta(s) usam esta fonte; ela não pode ser removida.</span>` : ''}
        <span style="flex:1"></span>
        <button type="button" class="admin-btn admin-btn-sec" data-fechar>Cancelar</button>
        <button type="submit" class="admin-btn">Salvar fonte</button>
      </div>
    </form>`);

  const form = document.getElementById('form-fonte');
  document.getElementById('arquivo-fonte').onchange = async (ev) => {
    const arq = ev.target.files[0];
    if (!arq) return;
    const status = document.getElementById('arquivo-status');
    status.textContent = 'Lendo arquivo...';
    try {
      const t = await extrairTexto(arq);
      document.getElementById('texto-fonte').value = t;
      status.textContent = `${arq.name}: ${t.length.toLocaleString('pt-BR')} caracteres extraídos`;
    } catch (e) {
      status.textContent = `Não foi possível ler ${arq.name}. Copie e cole o texto no campo abaixo.`;
      console.warn(e);
    }
  };
  const btnRem = document.getElementById('btn-remover-fonte');
  if (btnRem) btnRem.onclick = () => {
    if (!confirm('Remover esta fonte?')) return;
    fontes.fontes = fontes.fontes.filter(f => f.id !== id);
    salvarTexto(id, '');
    salvarLocal(); fecharModal(); render();
  };
  form.onsubmit = (ev) => {
    ev.preventDefault();
    const d = new FormData(form);
    const nova = {
      id: id || '',
      titulo: d.get('titulo').trim(),
      tipo: d.get('tipo'),
      orgao: d.get('orgao').trim(),
      referencia_oficial: d.get('referencia_oficial').trim(),
      vigencia: d.get('vigencia'),
      url: d.get('url').trim(),
      categorias: d.getAll('categorias'),
      status: d.get('status'),
      resumo: d.get('resumo').trim()
    };
    if (!nova.titulo) return;
    if (!nova.id) {
      let base = slug(nova.titulo); let n = 2; let cand = base;
      while (fontePorId(cand)) cand = `${base}_${n++}`;
      nova.id = cand;
    }
    if (!salvarTexto(nova.id, d.get('texto').trim())) return;
    const idx = fontes.fontes.findIndex(f => f.id === nova.id);
    if (idx >= 0) fontes.fontes[idx] = nova; else fontes.fontes.push(nova);
    salvarLocal(); fecharModal(); render();
    toast(`${ico('check')} Fonte salva`);
  };
}

async function extrairTexto(arq) {
  const nome = arq.name.toLowerCase();
  if (nome.endsWith('.txt') || nome.endsWith('.md')) return (await arq.text()).trim();
  if (nome.endsWith('.pdf')) {
    const pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
    const doc = await pdfjs.getDocument({ data: await arq.arrayBuffer() }).promise;
    const paginas = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const c = await (await doc.getPage(i)).getTextContent();
      paginas.push(c.items.map(it => it.str + (it.hasEOL ? '\n' : ' ')).join(''));
    }
    return paginas.join('\n\n').replace(/[ \t]+\n/g, '\n').trim();
  }
  if (nome.endsWith('.docx')) {
    if (!window.mammoth) {
      await new Promise((ok, falha) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js';
        s.onload = ok; s.onerror = falha;
        document.head.appendChild(s);
      });
    }
    const r = await window.mammoth.extractRawText({ arrayBuffer: await arq.arrayBuffer() });
    return r.value.trim();
  }
  throw new Error('Formato não suportado');
}

// ---------------------------------------------------------------------------
// Trechos (divide o documento em artigos / seções / parágrafos)
// ---------------------------------------------------------------------------
function dividirTrechos(texto) {
  const limpo = texto.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n');
  const regexArtigo = /(?:^|\n)\s*(Art(?:igo)?\.?\s*\d+[º°o]?(?:-[A-Z])?\.?)/g;
  const marcas = [...limpo.matchAll(regexArtigo)];
  let trechos = [];
  if (marcas.length >= 3) {
    marcas.forEach((m, i) => {
      const ini = m.index;
      const fim = i + 1 < marcas.length ? marcas[i + 1].index : limpo.length;
      const corpo = limpo.slice(ini, fim).trim();
      trechos.push({ rotulo: m[1].replace(/\s+/g, ' ').replace(/\.$/, ''), texto: corpo });
    });
  } else {
    const blocos = limpo.split(/\n\s*\n/).map(b => b.trim()).filter(b => b.length > 40);
    let atual = null;
    blocos.forEach((b) => {
      const titulo = b.length < 90 && !/[.;:]$/.test(b);
      if (titulo) { atual = b; return; }
      trechos.push({ rotulo: atual ? atual.slice(0, 60) : `Parágrafo ${trechos.length + 1}`, texto: b });
    });
  }
  // Junta trechos muito curtos e corta os muito longos
  trechos = trechos.map((t, i) => ({ ...t, id: i, texto: t.texto.length > 2500 ? t.texto.slice(0, 2500) + '…' : t.texto }));
  return trechos.slice(0, 400);
}

// ---------------------------------------------------------------------------
// ABA GERAR PERGUNTAS
// ---------------------------------------------------------------------------
function abaGerar(el) {
  const comTexto = fontes.fontes.filter(f => textoFonte(f.id));
  if (!geracao.fonteId && comTexto.length) geracao.fonteId = comTexto[0].id;
  const fonte = fontePorId(geracao.fonteId);
  const texto = fonte ? textoFonte(fonte.id) : '';
  const trechos = texto ? dividirTrechos(texto) : [];
  if (fonte && !geracao.categoria) geracao.categoria = (fonte.categorias || [])[0] || 'politicas';
  const busca = geracao.buscaTrecho.toLowerCase();
  const visiveis = trechos.filter(t => !busca || t.texto.toLowerCase().includes(busca) || t.rotulo.toLowerCase().includes(busca));

  el.innerHTML = `
    <div class="admin-cabecalho-aba">
      <div>
        <h2>Gerar perguntas a partir de uma fonte</h2>
        <p>Escolha os trechos do documento. Depois monte um pedido para uma IA homologada <strong>ou</strong> crie perguntas manualmente. Tudo entra como <em>Em revisão</em>.</p>
      </div>
    </div>
    ${!comTexto.length ? `<div class="admin-vazio">${ico('alerta')} Nenhuma fonte tem documento carregado. Vá em <strong>Fontes</strong>, edite ou crie uma fonte e cole o texto.</div>` : `
    <div class="gerar-grade">
      <section class="admin-painel">
        <h3>1. Fonte e trechos</h3>
        <label class="campo">Fonte
          <select id="sel-fonte">${comTexto.map(f => `<option value="${esc(f.id)}" ${f.id === geracao.fonteId ? 'selected' : ''}>${esc(f.titulo)}</option>`).join('')}</select>
        </label>
        <div class="trechos-barra">
          <input type="search" id="busca-trecho" placeholder="Filtrar trechos (ex.: incidente, IA, senha)" value="${esc(geracao.buscaTrecho)}">
          <button type="button" class="admin-btn admin-btn-sec admin-btn-p" id="btn-sel-todos">Selecionar visíveis</button>
          <button type="button" class="admin-btn admin-btn-sec admin-btn-p" id="btn-limpar-sel">Limpar</button>
        </div>
        <div class="trechos-info">${trechos.length} trechos encontrados · <strong>${geracao.selecionados.size}</strong> selecionado(s)</div>
        <div class="trechos-lista">
          ${visiveis.map(t => `
            <div class="trecho ${geracao.selecionados.has(t.id) ? 'sel' : ''}">
              <label class="trecho-check"><input type="checkbox" data-trecho="${t.id}" ${geracao.selecionados.has(t.id) ? 'checked' : ''}>
                <span class="trecho-rotulo">${esc(t.rotulo)}</span></label>
              <p>${esc(t.texto.slice(0, 320))}${t.texto.length > 320 ? '…' : ''}</p>
              <button type="button" class="admin-link" data-manual="${t.id}">+ Criar pergunta manual deste trecho</button>
            </div>`).join('') || '<p class="admin-vazio-p">Nenhum trecho com esse filtro.</p>'}
        </div>
      </section>

      <section class="admin-painel">
        <h3>2. Pedido para a IA homologada</h3>
        <div class="gerar-opcoes">
          <label class="campo">Categoria<select id="sel-cat">${CATEGORIAS.map(c => `<option value="${c.id}" ${geracao.categoria === c.id ? 'selected' : ''}>${c.nomeLongo}</option>`).join('')}</select></label>
          <label class="campo">Quantidade<input type="number" id="inp-qtd" min="1" max="15" value="${geracao.quantidade}"></label>
          <label class="campo">Nível<select id="sel-nivel">${[['misto', 'Misto'], ['1', '1 · básico'], ['2', '2 · intermediário'], ['3', '3 · avançado']].map(([v, n]) => `<option value="${v}" ${geracao.nivel === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        </div>
        <div class="admin-alerta">${ico('alerta')} <span><strong>Pense antes:</strong> use apenas a ferramenta de IA homologada pela instituição. Não cole documentos confidenciais em IA pública. A IA só sugere — a aprovação é sempre humana.</span></div>
        <button type="button" class="admin-btn" id="btn-montar" ${geracao.selecionados.size ? '' : 'disabled'}>${ico('raio')} Montar pedido (${geracao.selecionados.size} trecho(s))</button>
        <textarea id="txt-prompt" class="txt-mono" rows="8" readonly placeholder="O pedido aparece aqui."></textarea>
        <button type="button" class="admin-btn admin-btn-sec" id="btn-copiar" disabled>${ico('caixa')} Copiar pedido</button>

        <h3>3. Importar a resposta</h3>
        <textarea id="txt-resposta" class="txt-mono" rows="7" placeholder='Cole aqui o JSON devolvido pela IA. Ex.: [{"pergunta": "...", "alternativas": ["...","...","...","..."], "correta": 0, "explicacao": "...", "referencia": "Art. 3º", "nivel": 1}]'></textarea>
        <button type="button" class="admin-btn" id="btn-importar">${ico('check')} Importar como rascunhos em revisão</button>
        <div id="importar-resultado"></div>
      </section>
    </div>`}`;

  if (!comTexto.length) return;
  el.querySelector('#sel-fonte').onchange = (e) => { geracao = { ...geracao, fonteId: e.target.value, selecionados: new Set(), categoria: '', buscaTrecho: '' }; render(); };
  const busc = el.querySelector('#busca-trecho');
  busc.oninput = () => {
    geracao.buscaTrecho = busc.value;
    clearTimeout(busc._t);
    busc._t = setTimeout(() => { render(); const b = app.querySelector('#busca-trecho'); b.focus(); b.setSelectionRange(b.value.length, b.value.length); }, 300);
  };
  el.querySelector('#btn-sel-todos').onclick = () => { visiveis.forEach(t => geracao.selecionados.add(t.id)); render(); };
  el.querySelector('#btn-limpar-sel').onclick = () => { geracao.selecionados.clear(); render(); };
  el.querySelectorAll('[data-trecho]').forEach(c => {
    c.onchange = () => { const id = Number(c.dataset.trecho); c.checked ? geracao.selecionados.add(id) : geracao.selecionados.delete(id); render(); };
  });
  el.querySelectorAll('[data-manual]').forEach(b => {
    b.onclick = () => {
      const t = trechos.find(x => x.id === Number(b.dataset.manual));
      editarPergunta(null, { categoria: geracao.categoria, fonte_id: fonte.id, referencia: t.rotulo, trecho: t.texto });
    };
  });
  el.querySelector('#sel-cat').onchange = (e) => { geracao.categoria = e.target.value; };
  el.querySelector('#inp-qtd').onchange = (e) => { geracao.quantidade = Math.max(1, Math.min(15, Number(e.target.value) || 5)); };
  el.querySelector('#sel-nivel').onchange = (e) => { geracao.nivel = e.target.value; };
  el.querySelector('#btn-montar').onclick = () => {
    const sel = trechos.filter(t => geracao.selecionados.has(t.id));
    el.querySelector('#txt-prompt').value = montarPrompt(fonte, sel);
    el.querySelector('#btn-copiar').disabled = false;
  };
  el.querySelector('#btn-copiar').onclick = async () => {
    const txt = el.querySelector('#txt-prompt');
    try { await navigator.clipboard.writeText(txt.value); } catch (_) { txt.select(); document.execCommand('copy'); }
    toast(`${ico('check')} Pedido copiado`);
  };
  el.querySelector('#btn-importar').onclick = () => importarResposta(el.querySelector('#txt-resposta').value, fonte, el.querySelector('#importar-resultado'));
}

function montarPrompt(fonte, trechos) {
  const cat = categoria(geracao.categoria);
  const nivel = geracao.nivel === 'misto' ? 'misture níveis 1 (básico), 2 (intermediário) e 3 (avançado)' : `todas de nível ${geracao.nivel}`;
  return `Você vai criar perguntas para a "Roleta da Governança", um jogo educativo de perguntas para colaboradores do SEST SENAT.

FONTE: ${fonte.titulo}${fonte.referencia_oficial ? ` (${fonte.referencia_oficial})` : ''}
CATEGORIA DO JOGO: ${cat.nomeLongo}

TAREFA: crie ${geracao.quantidade} perguntas de múltipla escolha, ${nivel}, usando SOMENTE as informações dos trechos abaixo.

REGRAS:
1. Cada pergunta tem exatamente 4 alternativas e apenas 1 correta.
2. As alternativas erradas devem ser plausíveis, sem pegadinhas e sem "todas as anteriores".
3. Linguagem simples e direta, para qualquer colaborador. Enunciado com até 200 caracteres; alternativas com até 110.
4. Prefira situações do dia a dia de trabalho ("O que você deve fazer quando...").
5. Não invente regras, prazos ou números que não estejam nos trechos.
6. Não inclua nomes de pessoas reais nem dados pessoais.
7. A explicação (até 250 caracteres) diz por que a resposta está certa e cita o trecho.
8. "referencia" indica o artigo ou seção usado (ex.: "Art. 5º" ou o título da seção).
9. "correta" é o índice da alternativa correta (0 a 3). Varie a posição da correta.

RESPONDA APENAS com um JSON válido, sem texto antes ou depois, neste formato:
[
  {
    "pergunta": "...",
    "alternativas": ["...", "...", "...", "..."],
    "correta": 0,
    "explicacao": "...",
    "referencia": "...",
    "nivel": 1
  }
]

TRECHOS DA FONTE:
${trechos.map(t => `--- ${t.rotulo} ---\n${t.texto}`).join('\n\n')}
`;
}

function extrairJsonPerguntas(texto) {
  let t = String(texto || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let dados;
  try { dados = JSON.parse(t); } catch (_) {
    const ini = t.indexOf('['); const fim = t.lastIndexOf(']');
    if (ini >= 0 && fim > ini) dados = JSON.parse(t.slice(ini, fim + 1));
    else throw new Error('Não encontrei um JSON válido na resposta.');
  }
  if (Array.isArray(dados)) return dados;
  if (dados && Array.isArray(dados.perguntas)) return dados.perguntas;
  if (dados && typeof dados === 'object') return [dados];
  throw new Error('O JSON não contém uma lista de perguntas.');
}

function importarResposta(texto, fonte, saida) {
  let itens;
  try { itens = extrairJsonPerguntas(texto); } catch (e) {
    saida.innerHTML = `<div class="admin-erro">${ico('x')} ${esc(e.message)}</div>`;
    return;
  }
  const ok = []; const ruins = [];
  const existentes = new Set(banco.perguntas.map(p => String(p.pergunta).trim().toLowerCase()));
  itens.forEach((it, i) => {
    const alternativas = (it.alternativas || it.opcoes || []).map(a => String(typeof a === 'object' ? (a.texto ?? '') : a).trim());
    let correta = Number(it.correta ?? it.resposta_correta);
    if (Number.isNaN(correta) && typeof it.correta === 'string') correta = alternativas.indexOf(it.correta.trim());
    const p = {
      id: '',
      categoria: CATEGORIAS.some(c => c.id === it.categoria) ? it.categoria : geracao.categoria,
      nivel: [1, 2, 3].includes(Number(it.nivel)) ? Number(it.nivel) : 1,
      status: 'revisao',
      fonte_id: fonte.id,
      referencia: String(it.referencia || '').trim(),
      pergunta: String(it.pergunta || it.enunciado || '').trim(),
      alternativas,
      correta,
      explicacao: String(it.explicacao || '').trim()
    };
    const prob = problemas(p).filter(x => !x.startsWith('Enunciado longo') && !x.startsWith('Alternativa longa'));
    if (existentes.has(p.pergunta.toLowerCase())) prob.push('Pergunta já existe no banco');
    if (prob.length) { ruins.push({ i: i + 1, prob, texto: p.pergunta }); return; }
    p.id = novoId(`${p.categoria}_${slug(fonte.id).slice(0, 14)}`);
    banco.perguntas.push(p);
    existentes.add(p.pergunta.toLowerCase());
    ok.push(p);
  });
  salvarLocal();
  saida.innerHTML = `
    <div class="admin-ok">${ico('check')} ${ok.length} pergunta(s) importada(s) como <strong>Em revisão</strong>.
      ${ok.length ? '<button type="button" class="admin-link" id="ir-revisao">Ir para a revisão →</button>' : ''}</div>
    ${ruins.length ? `<div class="admin-erro">${ico('alerta')} ${ruins.length} item(ns) ignorado(s):<ul>${ruins.map(r => `<li>#${r.i} ${esc(r.texto.slice(0, 80))}: ${esc(r.prob.join(', '))}</li>`).join('')}</ul></div>` : ''}`;
  const ir = saida.querySelector('#ir-revisao');
  if (ir) ir.onclick = () => { aba = 'revisao'; filtros = { ...filtros, status: 'revisao', fonte: fonte.id }; render(); };
  const n = app.querySelector('.admin-aba[data-aba="revisao"]');
  if (n && ok.length) n.classList.add('pulsa');
}

// ---------------------------------------------------------------------------
// ABA REVISÃO
// ---------------------------------------------------------------------------
function abaRevisao(el) {
  const busca = filtros.busca.toLowerCase();
  const lista = banco.perguntas.filter(p =>
    (!filtros.status || (p.status || 'aprovada') === filtros.status) &&
    (!filtros.categoria || p.categoria === filtros.categoria) &&
    (!filtros.fonte || p.fonte_id === filtros.fonte) &&
    (!busca || `${p.pergunta} ${p.alternativas.join(' ')} ${p.explicacao}`.toLowerCase().includes(busca)));
  const cont = (st) => banco.perguntas.filter(p => (p.status || 'aprovada') === st).length;
  const pubIds = new Set(publicado.perguntas.map(p => p.id));

  el.innerHTML = `
    <div class="admin-cabecalho-aba">
      <div>
        <h2>Revisão de perguntas</h2>
        <p>Edite, aprove ou exclua. Só perguntas <strong>Aprovadas</strong> (e as marcadas como Exemplo) entram no jogo.</p>
      </div>
      <button type="button" class="admin-btn" id="btn-nova-pergunta">${ico('check')} Nova pergunta</button>
    </div>
    <div class="revisao-filtros">
      <div class="filtro-status">
        ${[['', 'Todas', banco.perguntas.length], ...Object.entries(STATUS_PERGUNTA).map(([k, v]) => [k, v.nome, cont(k)])]
          .map(([k, n, c]) => `<button type="button" class="filtro-chip ${filtros.status === k ? 'ativo' : ''}" data-status="${k}">${n} <span>${c}</span></button>`).join('')}
      </div>
      <select id="f-cat"><option value="">Todas as categorias</option>${CATEGORIAS.map(c => `<option value="${c.id}" ${filtros.categoria === c.id ? 'selected' : ''}>${c.nomeLongo}</option>`).join('')}</select>
      <select id="f-fonte"><option value="">Todas as fontes</option>${fontes.fontes.map(f => `<option value="${esc(f.id)}" ${filtros.fonte === f.id ? 'selected' : ''}>${esc(f.titulo)}</option>`).join('')}</select>
      <input type="search" id="f-busca" placeholder="Buscar texto" value="${esc(filtros.busca)}">
    </div>
    <div class="revisao-acoes-lote">
      <span>${lista.length} pergunta(s)</span>
      ${lista.some(p => p.status === 'revisao' || p.status === 'rascunho') ? `<button type="button" class="admin-btn admin-btn-sec admin-btn-p" id="btn-aprovar-lote">${ico('check')} Aprovar as ${lista.filter(p => (p.status === 'revisao' || p.status === 'rascunho') && !problemas(p).length).length} sem pendências</button>` : ''}
    </div>
    <div class="revisao-lista">
      ${lista.map(p => {
        const c = categoria(p.categoria);
        const st = STATUS_PERGUNTA[p.status || 'aprovada'] || STATUS_PERGUNTA.aprovada;
        const prob = problemas(p);
        const f = fontePorId(p.fonte_id);
        return `
          <article class="pergunta-item" style="--cor: ${c.cor};">
            <div class="pi-topo">
              <span class="pi-status" style="--st: ${st.cor};">${st.nome}</span>
              <span class="chip-cat" style="--cor: ${c.cor};">${esc(c.nome)}</span>
              <span class="pi-nivel">Nível ${p.nivel || 1}</span>
              ${!pubIds.has(p.id) ? '<span class="pi-novo">nova</span>' : ''}
              <span class="pi-fonte">${esc(f ? f.titulo : 'sem fonte')}${p.referencia ? ` · ${esc(p.referencia)}` : ''}</span>
            </div>
            <p class="pi-pergunta">${esc(p.pergunta)}</p>
            <ol class="pi-alts" type="A">${p.alternativas.map((a, i) => `<li class="${i === p.correta ? 'certa' : ''}">${esc(a)}${i === p.correta ? ` ${ico('check')}` : ''}</li>`).join('')}</ol>
            <p class="pi-exp">${esc(p.explicacao)}</p>
            ${prob.length ? `<div class="pi-prob">${ico('alerta')} ${esc(prob.join(' · '))}</div>` : ''}
            <div class="pi-acoes">
              <button type="button" class="admin-btn admin-btn-sec admin-btn-p" data-edit="${esc(p.id)}">Editar</button>
              ${p.status !== 'aprovada' ? `<button type="button" class="admin-btn admin-btn-p" data-aprovar="${esc(p.id)}" ${prob.length ? 'disabled title="Resolva as pendências antes de aprovar"' : ''}>${ico('check')} Aprovar</button>` : `<button type="button" class="admin-btn admin-btn-sec admin-btn-p" data-revisar="${esc(p.id)}">Voltar para revisão</button>`}
              <button type="button" class="admin-btn admin-btn-perigo admin-btn-p" data-excluir="${esc(p.id)}">Excluir</button>
            </div>
          </article>`;
      }).join('') || `<div class="admin-vazio">${ico('check')} Nenhuma pergunta com esses filtros.</div>`}
    </div>`;

  el.querySelectorAll('[data-status]').forEach(b => { b.onclick = () => { filtros.status = b.dataset.status; render(); }; });
  el.querySelector('#f-cat').onchange = (e) => { filtros.categoria = e.target.value; render(); };
  el.querySelector('#f-fonte').onchange = (e) => { filtros.fonte = e.target.value; render(); };
  const fb = el.querySelector('#f-busca');
  fb.oninput = () => { filtros.busca = fb.value; clearTimeout(fb._t); fb._t = setTimeout(() => { render(); const b = app.querySelector('#f-busca'); b.focus(); b.setSelectionRange(b.value.length, b.value.length); }, 300); };
  el.querySelector('#btn-nova-pergunta').onclick = () => editarPergunta(null, { categoria: filtros.categoria || 'politicas', fonte_id: filtros.fonte || '' });
  el.querySelectorAll('[data-edit]').forEach(b => { b.onclick = () => editarPergunta(b.dataset.edit); });
  el.querySelectorAll('[data-aprovar]').forEach(b => { b.onclick = () => { mudarStatus(b.dataset.aprovar, 'aprovada'); }; });
  el.querySelectorAll('[data-revisar]').forEach(b => { b.onclick = () => { mudarStatus(b.dataset.revisar, 'revisao'); }; });
  el.querySelectorAll('[data-excluir]').forEach(b => {
    b.onclick = () => {
      if (!confirm('Excluir esta pergunta?')) return;
      banco.perguntas = banco.perguntas.filter(p => p.id !== b.dataset.excluir);
      salvarLocal(); render();
    };
  });
  const lote = el.querySelector('#btn-aprovar-lote');
  if (lote) lote.onclick = () => {
    const alvo = lista.filter(p => (p.status === 'revisao' || p.status === 'rascunho') && !problemas(p).length);
    if (!alvo.length || !confirm(`Aprovar ${alvo.length} pergunta(s)? Confirme que você leu cada uma.`)) return;
    alvo.forEach(p => { p.status = 'aprovada'; });
    salvarLocal(); render(); toast(`${ico('check')} ${alvo.length} aprovada(s)`);
  };
}

function mudarStatus(id, status) {
  const p = banco.perguntas.find(x => x.id === id);
  if (!p) return;
  p.status = status;
  salvarLocal(); render();
  toast(`${ico('check')} ${status === 'aprovada' ? 'Pergunta aprovada' : 'Pergunta voltou para revisão'}`);
}

function editarPergunta(id, base = {}) {
  const existente = id ? banco.perguntas.find(p => p.id === id) : null;
  const p = existente ? clone(existente) : { id: '', categoria: base.categoria || 'politicas', nivel: 1, status: 'revisao', fonte_id: base.fonte_id || '', referencia: base.referencia || '', pergunta: '', alternativas: ['', '', '', ''], correta: 0, explicacao: '' };
  while (p.alternativas.length < 4) p.alternativas.push('');
  abrirModal(`
    <h2>${id ? 'Editar pergunta' : 'Nova pergunta'}</h2>
    ${base.trecho ? `<details class="trecho-base" open><summary>Trecho de referência · ${esc(base.referencia)}</summary><p>${esc(base.trecho)}</p></details>` : ''}
    <form id="form-pergunta" class="admin-form">
      <label class="campo">Categoria<select name="categoria">${CATEGORIAS.map(c => `<option value="${c.id}" ${p.categoria === c.id ? 'selected' : ''}>${c.nomeLongo}</option>`).join('')}</select></label>
      <label class="campo">Nível<select name="nivel">${[1, 2, 3].map(n => `<option value="${n}" ${Number(p.nivel) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="campo">Situação<select name="status">${Object.entries(STATUS_PERGUNTA).map(([k, v]) => `<option value="${k}" ${p.status === k ? 'selected' : ''}>${v.nome}</option>`).join('')}</select></label>
      <label class="campo">Fonte<select name="fonte_id"><option value="">(sem fonte)</option>${fontes.fontes.map(f => `<option value="${esc(f.id)}" ${p.fonte_id === f.id ? 'selected' : ''}>${esc(f.titulo)}</option>`).join('')}</select></label>
      <label class="campo campo-largo">Referência (artigo, seção)<input name="referencia" value="${esc(p.referencia || '')}" placeholder="Ex.: Art. 7º, inciso II"></label>
      <label class="campo campo-largo">Pergunta *<textarea name="pergunta" rows="2" required maxlength="300">${esc(p.pergunta)}</textarea></label>
      <fieldset class="campo campo-largo"><legend>Alternativas (marque a correta; deixe vazias as que não usar)</legend>
        ${p.alternativas.slice(0, 4).map((a, i) => `
          <label class="alt-linha"><input type="radio" name="correta" value="${i}" ${p.correta === i ? 'checked' : ''}>
            <span class="alt-l">${'ABCD'[i]}</span><input name="alt${i}" value="${esc(a)}" maxlength="160" placeholder="Alternativa ${'ABCD'[i]}"></label>`).join('')}
      </fieldset>
      <label class="campo campo-largo">Explicação (mostrada após a resposta) *<textarea name="explicacao" rows="3" maxlength="400">${esc(p.explicacao)}</textarea></label>
      <div id="form-prob" class="campo-largo"></div>
      <div class="form-acoes"><span style="flex:1"></span>
        <button type="button" class="admin-btn admin-btn-sec" data-fechar>Cancelar</button>
        <button type="submit" class="admin-btn">Salvar</button>
      </div>
    </form>`);
  const form = document.getElementById('form-pergunta');
  form.onsubmit = (ev) => {
    ev.preventDefault();
    const d = new FormData(form);
    const brutas = [0, 1, 2, 3].map(i => String(d.get(`alt${i}`) || '').trim());
    const corretaBruta = Number(d.get('correta'));
    const alternativas = []; let correta = -1;
    brutas.forEach((a, i) => { if (a) { if (i === corretaBruta) correta = alternativas.length; alternativas.push(a); } });
    const nova = {
      id: p.id,
      categoria: d.get('categoria'),
      nivel: Number(d.get('nivel')),
      status: d.get('status'),
      fonte_id: d.get('fonte_id') || undefined,
      referencia: String(d.get('referencia') || '').trim() || undefined,
      pergunta: String(d.get('pergunta') || '').trim(),
      alternativas,
      correta,
      explicacao: String(d.get('explicacao') || '').trim()
    };
    const prob = problemas(nova);
    const graves = prob.filter(x => !x.startsWith('Enunciado longo') && !x.startsWith('Alternativa longa'));
    if (graves.length && nova.status === 'aprovada') {
      document.getElementById('form-prob').innerHTML = `<div class="admin-erro">${ico('alerta')} Para aprovar, resolva: ${esc(graves.join(', '))}</div>`;
      return;
    }
    if (!nova.id) nova.id = novoId(`${nova.categoria}_${slug(nova.fonte_id || 'manual').slice(0, 14)}`);
    Object.keys(nova).forEach(k => nova[k] === undefined && delete nova[k]);
    const idx = banco.perguntas.findIndex(x => x.id === nova.id);
    if (idx >= 0) banco.perguntas[idx] = nova; else banco.perguntas.push(nova);
    salvarLocal(); fecharModal(); render();
    toast(`${ico('check')} Pergunta salva${graves.length ? ' (com pendências)' : ''}`);
  };
}

// ---------------------------------------------------------------------------
// ABA PUBLICAR
// ---------------------------------------------------------------------------
function abaPublicar(el) {
  const dif = diferencas();
  const comProblema = banco.perguntas.filter(p => ['aprovada', 'exemplo'].includes(p.status) && problemas(p).some(x => !x.startsWith('Enunciado longo') && !x.startsWith('Alternativa longa')));
  const noJogo = banco.perguntas.filter(p => ['aprovada', 'exemplo'].includes(p.status));
  const porCat = CATEGORIAS.map(c => ({ c, n: noJogo.filter(p => p.categoria === c.id).length }));
  const linha = (rotulo, arr, tipo) => arr.length ? `<li><strong>${arr.length}</strong> ${rotulo}<ul>${arr.slice(0, 8).map(x => `<li class="${tipo}">${esc(x.pergunta || x.titulo)}</li>`).join('')}${arr.length > 8 ? `<li>… e mais ${arr.length - 8}</li>` : ''}</ul></li>` : '';

  el.innerHTML = `
    <div class="admin-cabecalho-aba">
      <div>
        <h2>Publicar no jogo</h2>
        <p>Teste suas alterações no jogo e exporte os arquivos para publicar no site.</p>
      </div>
    </div>
    <div class="publicar-grade">
      <section class="admin-painel">
        <h3>Alterações em relação ao site publicado</h3>
        ${dif.total ? `<ul class="dif-lista">
          ${linha('pergunta(s) nova(s)', dif.novas, 'add')}
          ${linha('pergunta(s) alterada(s)', dif.alteradas, 'mod')}
          ${linha('pergunta(s) removida(s)', dif.removidas, 'del')}
          ${linha('fonte(s) nova(s)', dif.fontesNovas, 'add')}
          ${linha('fonte(s) alterada(s)', dif.fontesAlteradas, 'mod')}
          ${linha('fonte(s) removida(s)', dif.fontesRemovidas, 'del')}
        </ul>` : `<p class="admin-vazio-p">${ico('check')} Nenhuma alteração local. O que está aqui é igual ao site.</p>`}
        <h3>Perguntas que entrarão no jogo: ${noJogo.length}</h3>
        <div class="publicar-cats">${porCat.map(({ c, n }) => `<div class="pub-cat ${n < 8 ? 'pouco' : ''}" style="--cor: ${c.cor};"><span>${esc(c.nomeLongo)}</span><strong>${n}</strong></div>`).join('')}</div>
        ${porCat.some(x => x.n < 8) ? `<p class="campo-dica">${ico('alerta')} Categorias com menos de 8 perguntas repetem muito numa partida.</p>` : ''}
        ${comProblema.length ? `<div class="admin-erro">${ico('alerta')} ${comProblema.length} pergunta(s) aprovada(s) com pendência. Corrija na Revisão antes de publicar.</div>` : ''}
      </section>

      <section class="admin-painel">
        <h3>1. Testar no jogo</h3>
        <p>Abre o jogo usando o banco deste navegador (as pessoas continuam vendo a versão publicada).</p>
        <a class="admin-btn" href="index.html?banco=local" target="_blank" rel="noopener">${ico('dado')} Testar no jogo</a>

        <h3>2. Exportar arquivos</h3>
        <div class="publicar-botoes">
          <button type="button" class="admin-btn" id="btn-baixar-perguntas">${ico('caixa')} Baixar perguntas.json</button>
          <button type="button" class="admin-btn admin-btn-sec" id="btn-baixar-fontes">${ico('caixa')} Baixar fontes.json</button>
          <button type="button" class="admin-btn admin-btn-sec" id="btn-copiar-resumo">${ico('livro')} Copiar resumo das mudanças</button>
        </div>

        <h3>3. Publicar</h3>
        <ol class="publicar-passos">
          <li>No GitHub, abra a pasta <code>data/</code> do repositório e use <em>Add file → Upload files</em> para enviar os dois arquivos (substituindo os atuais).</li>
          <li>Na mensagem do commit, cole o resumo das mudanças.</li>
          <li>Em 1 a 2 minutos o site atualiza. Ou envie os arquivos ao assistente para ele publicar.</li>
        </ol>

        <h3>Recomeçar</h3>
        <button type="button" class="admin-btn admin-btn-perigo" id="btn-descartar">Descartar alterações locais</button>
        <p class="campo-dica">Volta ao que está publicado. Os textos de documentos carregados são mantidos.</p>
      </section>
    </div>`;

  el.querySelector('#btn-baixar-perguntas').onclick = () => {
    const ordem = ['id', 'categoria', 'nivel', 'status', 'fonte_id', 'referencia', 'pergunta', 'alternativas', 'correta', 'explicacao'];
    const saida = { ...banco, perguntas: banco.perguntas.map(p => Object.fromEntries(ordem.filter(k => p[k] !== undefined).map(k => [k, p[k]]))) };
    baixar('perguntas.json', JSON.stringify(saida, null, 1));
  };
  el.querySelector('#btn-baixar-fontes').onclick = () => baixar('fontes.json', JSON.stringify(fontes, null, 1));
  el.querySelector('#btn-copiar-resumo').onclick = async () => {
    const r = resumoMudancas(dif);
    try { await navigator.clipboard.writeText(r); toast(`${ico('check')} Resumo copiado`); } catch (_) { prompt('Copie o resumo:', r); }
  };
  el.querySelector('#btn-descartar').onclick = () => {
    if (!confirm('Descartar todas as alterações locais de perguntas e fontes?')) return;
    banco = clone({ ...publicado.bancoOriginal });
    fontes = clone({ ...publicado.fontesOriginal });
    salvarLocal(); render(); toast('Alterações descartadas');
  };
}

function resumoMudancas(dif) {
  const partes = [];
  if (dif.novas.length) partes.push(`${dif.novas.length} pergunta(s) nova(s)`);
  if (dif.alteradas.length) partes.push(`${dif.alteradas.length} alterada(s)`);
  if (dif.removidas.length) partes.push(`${dif.removidas.length} removida(s)`);
  if (dif.fontesNovas.length) partes.push(`fontes novas: ${dif.fontesNovas.map(f => f.titulo).join(', ')}`);
  if (dif.fontesAlteradas.length) partes.push(`fontes alteradas: ${dif.fontesAlteradas.map(f => f.titulo).join(', ')}`);
  return `Banco de perguntas: ${partes.join('; ') || 'sem alterações'}`;
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
function abrirModal(html) {
  fecharModal();
  const m = document.createElement('div');
  m.className = 'admin-modal';
  m.id = 'admin-modal';
  m.innerHTML = `<div class="admin-modal-caixa" role="dialog" aria-modal="true"><button type="button" class="admin-modal-x" data-fechar aria-label="Fechar">${ico('x')}</button>${html}</div>`;
  document.body.appendChild(m);
  m.querySelectorAll('[data-fechar]').forEach(b => { b.onclick = fecharModal; });
  m.addEventListener('mousedown', (e) => { if (e.target === m) fecharModal(); });
  const primeiro = m.querySelector('input, textarea, select');
  if (primeiro) primeiro.focus();
}
function fecharModal() {
  const m = document.getElementById('admin-modal');
  if (m) m.remove();
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharModal(); });

// ---------------------------------------------------------------------------
(async function iniciar() {
  try {
    const [pPub, fPub] = await Promise.all([lerJson('data/perguntas.json'), lerJson('data/fontes.json')]);
    publicado = { perguntas: pPub.perguntas || [], fontes: fPub.fontes || [], bancoOriginal: pPub, fontesOriginal: fPub };
    try { banco = JSON.parse(localStorage.getItem(CHAVE_BANCO_LOCAL)); } catch (_) { banco = null; }
    try { fontes = JSON.parse(localStorage.getItem(CHAVE_FONTES)); } catch (_) { fontes = null; }
    if (!banco || !Array.isArray(banco.perguntas)) banco = clone(pPub);
    if (!fontes || !Array.isArray(fontes.fontes)) fontes = clone(fPub);
    render();
  } catch (e) {
    app.innerHTML = `<div class="admin-erro">${ico('x')} Não foi possível carregar os dados: ${esc(e.message)}</div>`;
  }
})();
