// js/ui/avatar_criador.js - Interface Interativa do Criador de Personagens (Avatar Chibi 3D)
// Prévia viva à esquerda (Desktop) / topo (Celular) com abas acessíveis e miniaturas

import { AVATAR_OPCOES, AVATAR_PADRAO, validarAvatar, gerarAvatarAleatorio, renderAvatarSVG } from '../avatar.js';
import { Audio } from '../audio.js';
import { ico } from '../icones.js';

let modalContainer = null;
let avatarAtual = null;
let historico = [];
let callbackSalvar = null;
let abaAtiva = 'corpo'; // 'corpo', 'rosto', 'cabelo', 'roupa', 'acessorios', 'mobilidade'

/**
 * Abre o Criador de Personagem
 * @param {Object} options
 * @param {Object} [options.avatarInicial]
 * @param {string} [options.titulo='Criador de Personagem']
 * @param {string} [options.rotuloBotaoSalvar='Salvar e Jogar']
 * @param {Function} options.onSalvar
 * @param {Function} [options.onCancelar]
 */
export function abrirCriadorAvatar({ avatarInicial, titulo, rotuloBotaoSalvar, onSalvar, onCancelar }) {
  const val = validarAvatar(avatarInicial);
  avatarAtual = val.valido ? { ...val.normalizado } : { ...AVATAR_PADRAO };
  historico = [{ ...avatarAtual }];
  callbackSalvar = onSalvar;
  abaAtiva = 'corpo';

  let container = document.getElementById('modal-criador-avatar-global');
  if (!container) {
    container = document.createElement('div');
    container.id = 'modal-criador-avatar-global';
    container.className = 'modal-backdrop modal-avatar-backdrop';
    document.body.appendChild(container);
  }

  modalContainer = container;
  renderModal(titulo || 'Crie seu Personagem de Tabuleiro', rotuloBotaoSalvar || 'Salvar e Jogar');
  modalContainer.classList.add('ativo');

  // Reproduz som alegre de abertura
  try { Audio.tocarDado(); } catch (e) {}

  return new Promise((resolve) => {
    modalContainer._resolver = resolve;
  });
}

function fecharModal(salvou = false, resultado = null) {
  if (!modalContainer) return;
  modalContainer.classList.remove('ativo');
  if (modalContainer._resolver) {
    modalContainer._resolver(salvou ? resultado : null);
  }
}

function renderModal(titulo, rotuloBotaoSalvar) {
  modalContainer.innerHTML = `
    <div class="modal-dialog criador-avatar-dialog" role="dialog" aria-modal="true" aria-labelledby="avatar-modal-titulo">
      
      <!-- CABEÇALHO DO MODAL -->
      <div class="modal-header criador-avatar-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="criador-titulo-ico">${ico('usuarios')}</span>
          <h3 id="avatar-modal-titulo" style="font-family: var(--font-title); font-size: 1.4rem; color: var(--gold); letter-spacing: 0.5px; margin: 0;">
            ${titulo}
          </h3>
        </div>
        <button type="button" class="btn-fechar-dialog" id="btn-fechar-avatar" aria-label="Fechar">✕</button>
      </div>

      <!-- CORPO DO MODAL (DUAS COLUNAS NO DESKTOP, EMPILHADO NO CELULAR) -->
      <div class="modal-body criador-avatar-body">
        
        <!-- COLUNA ESQUERDA: PRÉVIA VIVA EM DESTAQUE -->
        <div class="criador-previa-coluna">
          <div class="avatar-podio-box">
            <div class="avatar-podio-luz"></div>
            <div class="avatar-previa-wrapper" id="box-avatar-previa">
              ${renderAvatarSVG(avatarAtual, { modo: 'completo', reacao: 'neutro' })}
            </div>
            <div class="avatar-podio-base-fisica"></div>
          </div>

          <!-- AÇÕES RÁPIDAS ABAIXO DA PRÉVIA -->
          <div class="criador-botoes-rapidos">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-avatar-aleatorio" title="Gerar combinação aleatória e coerente">
              ${ico('dado')} Aleatório
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-avatar-desfazer" title="Desfazer última alteração" ${historico.length <= 1 ? 'disabled' : ''}>
              ${ico('voltar')} Desfazer
            </button>
          </div>
          <div class="avatar-selo-marca-info">
            <img src="assets/avatar/marca.svg" alt="Marca SS" style="width: 18px; height: 18px; vertical-align: middle; margin-right: 4px;" />
            Miniatura Colecionável Oficial
          </div>
        </div>

        <!-- COLUNA DIREITA: ABAS E SELETORES DE OPÇÕES -->
        <div class="criador-opcoes-coluna">
          
          <!-- NAVEGAÇÃO POR ABAS -->
          <nav class="avatar-abas-nav" role="tablist" aria-label="Categorias do Criador de Personagem">
            ${[['corpo', 'usuarios', 'Corpo'], ['rosto', 'lampada', 'Rosto'], ['cabelo', 'coroa', 'Cabelo'], ['roupa', 'escudo', 'Roupa'], ['acessorios', 'caixa', 'Acessórios'], ['mobilidade', 'alvo', 'Mobilidade']].map(([id, icone, nome]) => `
              <button type="button" role="tab" class="avatar-aba-btn ${abaAtiva === id ? 'ativa' : ''}" data-aba="${id}" aria-selected="${abaAtiva === id}">
                ${ico(icone)} <span>${nome}</span>
              </button>`).join('')}
          </nav>

          <!-- CONTEÚDO DA ABA SELECIONADA -->
          <div class="avatar-aba-painel" id="avatar-aba-painel" role="tabpanel">
            ${renderConteudoAba(abaAtiva)}
          </div>

        </div>

      </div>

      <!-- RODAPÉ DO MODAL -->
      <div class="modal-footer criador-avatar-footer">
        <button type="button" class="btn btn-secondary" id="btn-cancelar-avatar">Cancelar</button>
        <button type="button" class="btn btn-primary btn-lg" id="btn-salvar-avatar" style="min-width: 180px;">
          ${rotuloBotaoSalvar}
        </button>
      </div>

    </div>
  `;

  atribuirEventos(rotuloBotaoSalvar);
}

// Nomes amigáveis das opções
const NOMES = {
  corpo: { m: 'Masculino', f: 'Feminino' },
  expressao: { sorriso: 'Sorriso', confiante: 'Confiante', concentrado: 'Concentrado', animado: 'Animado' },
  barba: { nenhum: 'Sem barba', por_fazer: 'Por fazer', cavanhaque: 'Cavanhaque', bigode: 'Bigode', curta: 'Curta', cheia: 'Cheia' },
  cabelo: { curto: 'Curto', raspado: 'Raspado', careca: 'Careca', liso_medio: 'Liso médio', longo: 'Longo', coque: 'Coque', rabo_cavalo: 'Rabo de cavalo', cacheado: 'Cacheado', crespo_black: 'Black power', trancas: 'Tranças', dreads: 'Dreads', franja: 'Franja' },
  roupa: { terno: 'Terno', blazer: 'Blazer', camisa_social: 'Camisa social', colete: 'Colete', tailleur: 'Tailleur', polo_ss: 'Polo SEST SENAT', jaleco: 'Jaleco', macacao: 'Uniforme operacional' },
  rosto: { nenhum: 'Nenhum', oculos_grau: 'Óculos de grau', oculos_escuros: 'Óculos escuros', monoculo: 'Monóculo', tapa_olho: 'Tapa-olho', oculos_leitura: 'Óculos de leitura' },
  cabeca: { nenhum: 'Nenhum', bone_ss: 'Boné SS', chapeu_ss: 'Chapéu', capacete_seguranca: 'Capacete', fone_ouvido: 'Headset', aparelho_auditivo: 'Aparelho auditivo', lenco_turbante: 'Lenço / turbante' },
  item: { nenhum: 'Mãos livres', mala_ss: 'Mala SS', notebook: 'Notebook', prancheta: 'Prancheta', caneca_cafe: 'Café', tablet_grafico: 'Tablet', cracha: 'Crachá' },
  mobilidade: { nenhum: 'Em pé', cadeira_rodas: 'Cadeira de rodas', bengala: 'Bengala' }
};

// Card de opção com miniatura do PRÓPRIO avatar usando aquela escolha
function cardOpcao(prop, valor, modo = 'busto') {
  const selecionado = String(avatarAtual[prop]) === String(valor);
  const previa = renderAvatarSVG({ ...avatarAtual, [prop]: valor }, { modo });
  const nome = (NOMES[prop] && NOMES[prop][valor]) || String(valor).replace(/_/g, ' ');
  return `
    <button type="button" class="avatar-opcao-mini ${selecionado ? 'selecionado' : ''} mini-${modo}" data-prop="${prop}" data-valor="${valor}" aria-pressed="${selecionado}" title="${nome}">
      <span class="avatar-opcao-previa">${previa}</span>
      <span class="avatar-opcao-nome">${nome}</span>
    </button>`;
}

function grupo(titulo, conteudo, classe = 'avatar-grade-mini') {
  return `
    <div class="avatar-secao-grupo">
      <label class="avatar-grupo-rotulo">${titulo}</label>
      <div class="${classe}">${conteudo}</div>
    </div>`;
}

function swatches(prop, lista, borda) {
  return lista.map(c => {
    const id = c.id;
    const sel = String(avatarAtual[prop]) === String(id);
    return `<button type="button" class="avatar-swatch-cor ${sel ? 'selecionado' : ''}" data-prop="${prop}" data-valor="${id}"
      style="background-color: ${c.hex}; ${borda ? `box-shadow: inset 0 -6px 0 ${c[borda]};` : ''}" title="${c.nome}" aria-label="${c.nome}" aria-pressed="${sel}">
      ${sel ? '<span class="swatch-check">✓</span>' : ''}</button>`;
  }).join('');
}

function renderConteudoAba(aba) {
  const O = AVATAR_OPCOES;
  switch (aba) {
    case 'corpo':
      return grupo('Tipo de corpo', O.corpo.map(c => cardOpcao('corpo', c, 'completo')).join(''), 'avatar-grade-mini grade-2') +
        grupo('Tom de pele', swatches('pele', O.pele), 'avatar-paleta-pele-grid');
    case 'rosto':
      return grupo('Expressão', O.expressao.map(e => cardOpcao('expressao', e)).join('')) +
        grupo('Barba e bigode', O.barba.map(b => cardOpcao('barba', b)).join(''));
    case 'cabelo':
      return grupo('Cor do cabelo', swatches('cor_cabelo', O.cor_cabelo), 'avatar-paleta-cores-grid') +
        grupo('Estilo', O.cabelo.map(c => cardOpcao('cabelo', c)).join(''));
    case 'roupa':
      return grupo('Cor da roupa', swatches('cor_roupa', O.cor_roupa, 'secundaria'), 'avatar-paleta-cores-grid') +
        grupo('Traje', O.roupa.map(r => cardOpcao('roupa', r, 'completo')).join(''));
    case 'acessorios':
      return grupo('Rosto', O.rosto.map(r => cardOpcao('rosto', r)).join('')) +
        grupo('Cabeça', O.cabeca.map(c => cardOpcao('cabeca', c)).join('')) +
        grupo('Na mão', O.item.map(i => cardOpcao('item', i, 'completo')).join(''));
    case 'mobilidade':
      return grupo('Acessibilidade e mobilidade (opcional)', O.mobilidade.map(m => cardOpcao('mobilidade', m, 'completo')).join(''), 'avatar-grade-mini grade-3');
    default:
      return '';
  }
}

function atualizarPrevia() {
  const boxPrevia = modalContainer.querySelector('#box-avatar-previa');
  if (boxPrevia) {
    boxPrevia.innerHTML = renderAvatarSVG(avatarAtual, { modo: 'completo', reacao: 'neutro' });
  }

  // Atualiza estado do botão desfazer
  const btnDesfazer = modalContainer.querySelector('#btn-avatar-desfazer');
  if (btnDesfazer) {
    btnDesfazer.disabled = historico.length <= 1;
  }
}

function atualizarPropriedade(prop, valor) {
  // Converte pele para número
  const valorFinal = prop === 'pele' ? parseInt(valor, 10) : valor;

  if (avatarAtual[prop] === valorFinal) return;

  // Salva no histórico para desfazer
  historico.push({ ...avatarAtual });
  avatarAtual[prop] = valorFinal;

  atualizarPrevia();

  // Atualiza seleção visual dos botões na aba
  const painel = modalContainer.querySelector('#avatar-aba-painel');
  if (painel) {
    painel.innerHTML = renderConteudoAba(abaAtiva);
    vincularSeletoresAba(painel);
  }
}

function atribuirEventos(rotuloBotaoSalvar) {
  // 1. Fechar / Cancelar
  const btnFechar = modalContainer.querySelector('#btn-fechar-avatar');
  if (btnFechar) btnFechar.onclick = () => fecharModal(false);

  const btnCancelar = modalContainer.querySelector('#btn-cancelar-avatar');
  if (btnCancelar) btnCancelar.onclick = () => fecharModal(false);

  // 2. Salvar
  const btnSalvar = modalContainer.querySelector('#btn-salvar-avatar');
  if (btnSalvar) {
    btnSalvar.onclick = () => {
      try { Audio.tocarAcerto(); } catch (e) {}
      if (typeof callbackSalvar === 'function') {
        callbackSalvar({ ...avatarAtual });
      }
      fecharModal(true, { ...avatarAtual });
    };
  }

  // 3. Botão Aleatório
  const btnAleatorio = modalContainer.querySelector('#btn-avatar-aleatorio');
  if (btnAleatorio) {
    btnAleatorio.onclick = () => {
      historico.push({ ...avatarAtual });
      avatarAtual = gerarAvatarAleatorio();
      atualizarPrevia();
      const painel = modalContainer.querySelector('#avatar-aba-painel');
      if (painel) {
        painel.innerHTML = renderConteudoAba(abaAtiva);
        vincularSeletoresAba(painel);
      }
      try { Audio.tocarPasso(); } catch (e) {}
    };
  }

  // 4. Botão Desfazer
  const btnDesfazer = modalContainer.querySelector('#btn-avatar-desfazer');
  if (btnDesfazer) {
    btnDesfazer.onclick = () => {
      if (historico.length > 1) {
        historico.pop(); // Remove o atual
        avatarAtual = { ...historico[historico.length - 1] };
        atualizarPrevia();
        const painel = modalContainer.querySelector('#avatar-aba-painel');
        if (painel) {
          painel.innerHTML = renderConteudoAba(abaAtiva);
          vincularSeletoresAba(painel);
        }
      }
    };
  }

  // 5. Navegação de Abas
  const botoesAbas = modalContainer.querySelectorAll('.avatar-aba-btn');
  botoesAbas.forEach(btn => {
    btn.onclick = () => {
      botoesAbas.forEach(b => {
        b.classList.remove('ativa');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('ativa');
      btn.setAttribute('aria-selected', 'true');
      abaAtiva = btn.dataset.aba;

      const painel = modalContainer.querySelector('#avatar-aba-painel');
      if (painel) {
        painel.innerHTML = renderConteudoAba(abaAtiva);
        vincularSeletoresAba(painel);
      }
    };
  });

  const painel = modalContainer.querySelector('#avatar-aba-painel');
  if (painel) {
    vincularSeletoresAba(painel);
  }
}

function vincularSeletoresAba(painel) {
  // Botões de opções (cards)
  const botoesOpcao = painel.querySelectorAll('.btn-opcao-card, .avatar-opcao-mini');
  botoesOpcao.forEach(btn => {
    btn.onclick = () => {
      const prop = btn.dataset.prop;
      const val = btn.dataset.valor;
      atualizarPropriedade(prop, val);
    };
  });

  // Swatches de cor e pele
  const swatches = painel.querySelectorAll('.avatar-swatch-pele, .avatar-swatch-cor');
  swatches.forEach(sw => {
    sw.onclick = () => {
      const prop = sw.dataset.prop;
      const val = sw.dataset.valor;
      atualizarPropriedade(prop, val);
    };
  });
}
