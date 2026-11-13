// js/ui/avatar_criador.js - Interface Interativa do Criador de Personagens (Avatar Chibi 3D)
// Prévia viva à esquerda (Desktop) / topo (Celular) com abas acessíveis e miniaturas

import { AVATAR_OPCOES, AVATAR_PADRAO, validarAvatar, gerarAvatarAleatorio, renderAvatarSVG } from '../avatar.js';
import { Audio } from '../audio.js';

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
          <span style="font-size: 1.5rem;">🎨</span>
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
              🎲 Aleatório
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-avatar-desfazer" title="Desfazer última alteração" ${historico.length <= 1 ? 'disabled' : ''}>
              ↩️ Desfazer
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
            <button type="button" role="tab" class="avatar-aba-btn ${abaAtiva === 'corpo' ? 'ativa' : ''}" data-aba="corpo" aria-selected="${abaAtiva === 'corpo'}">
              👤 Corpo
            </button>
            <button type="button" role="tab" class="avatar-aba-btn ${abaAtiva === 'rosto' ? 'ativa' : ''}" data-aba="rosto" aria-selected="${abaAtiva === 'rosto'}">
              🙂 Rosto
            </button>
            <button type="button" role="tab" class="avatar-aba-btn ${abaAtiva === 'cabelo' ? 'ativa' : ''}" data-aba="cabelo" aria-selected="${abaAtiva === 'cabelo'}">
              💇 Cabelo
            </button>
            <button type="button" role="tab" class="avatar-aba-btn ${abaAtiva === 'roupa' ? 'ativa' : ''}" data-aba="roupa" aria-selected="${abaAtiva === 'roupa'}">
              👔 Roupa
            </button>
            <button type="button" role="tab" class="avatar-aba-btn ${abaAtiva === 'acessorios' ? 'ativa' : ''}" data-aba="acessorios" aria-selected="${abaAtiva === 'acessorios'}">
              👓 Itens
            </button>
            <button type="button" role="tab" class="avatar-aba-btn ${abaAtiva === 'mobilidade' ? 'ativa' : ''}" data-aba="mobilidade" aria-selected="${abaAtiva === 'mobilidade'}">
              ♿ Mobilidade
            </button>
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

function renderConteudoAba(aba) {
  switch (aba) {
    case 'corpo':
      return `
        <!-- SELEÇÃO DE CORPO -->
        <div class="avatar-secao-grupo">
          <label class="avatar-grupo-rotulo">Tipo de Corpo</label>
          <div class="avatar-botoes-corpo-grid">
            ${AVATAR_OPCOES.corpo.map(c => `
              <button type="button" class="btn-opcao-card ${avatarAtual.corpo === c ? 'selecionado' : ''}" data-prop="corpo" data-valor="${c}" aria-label="Corpo ${c === 'm' ? 'Masculino' : 'Feminino'}">
                <span style="font-size: 1.4rem;">${c === 'm' ? '👨' : '👩'}</span>
                <span>${c === 'm' ? 'Masculino' : 'Feminino'}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- SELEÇÃO DE TOM DE PELE (8 TONS) -->
        <div class="avatar-secao-grupo">
          <label class="avatar-grupo-rotulo">Tom de Pele (8 Tons)</label>
          <div class="avatar-paleta-pele-grid">
            ${AVATAR_OPCOES.pele.map(p => `
              <button type="button" class="avatar-swatch-pele ${avatarAtual.pele === p.id ? 'selecionado' : ''}" data-prop="pele" data-valor="${p.id}" style="background-color: ${p.hex};" title="${p.nome}" aria-label="${p.nome}">
                ${avatarAtual.pele === p.id ? '<span class="swatch-check">✓</span>' : ''}
              </button>
            `).join('')}
          </div>
        </div>
      `;

    case 'rosto':
      return `
        <!-- EXPRESSÕES FACIAIS (4) -->
        <div class="avatar-secao-grupo">
          <label class="avatar-grupo-rotulo">Expressão Facial</label>
          <div class="avatar-grade-opcoes">
            ${AVATAR_OPCOES.expressao.map(exp => `
              <button type="button" class="btn-opcao-card ${avatarAtual.expressao === exp ? 'selecionado' : ''}" data-prop="expressao" data-valor="${exp}" aria-label="Expressão ${exp}">
                <span style="font-size: 1.3rem;">${exp === 'sorriso' ? '😊' : exp === 'confiante' ? '😎' : exp === 'concentrado' ? '🧐' : '😄'}</span>
                <span style="text-transform: capitalize;">${exp}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- BARBA / BIGODE -->
        <div class="avatar-secao-grupo">
          <label class="avatar-grupo-rotulo">Barba & Bigode</label>
          <div class="avatar-grade-opcoes">
            ${AVATAR_OPCOES.barba.map(b => `
              <button type="button" class="btn-opcao-card ${avatarAtual.barba === b ? 'selecionado' : ''}" data-prop="barba" data-valor="${b}" aria-label="Barba: ${b.replace('_', ' ')}">
                <span style="font-size: 1.2rem;">${b === 'nenhum' ? '🚫' : '🧔'}</span>
                <span>${b === 'nenhum' ? 'Sem barba' : b.replace('_', ' ')}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;

    case 'cabelo':
      return `
        <!-- COR DO CABELO (10 CORES) -->
        <div class="avatar-secao-grupo">
          <label class="avatar-grupo-rotulo">Cor do Cabelo (10 Cores)</label>
          <div class="avatar-paleta-cores-grid">
            ${AVATAR_OPCOES.cor_cabelo.map(cc => `
              <button type="button" class="avatar-swatch-cor ${avatarAtual.cor_cabelo === cc.id ? 'selecionado' : ''}" data-prop="cor_cabelo" data-valor="${cc.id}" style="background-color: ${cc.hex}; border-color: ${cc.brilho};" title="${cc.nome}" aria-label="Cor de cabelo: ${cc.nome}">
                ${avatarAtual.cor_cabelo === cc.id ? '<span class="swatch-check">✓</span>' : ''}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- ESTILOS DE CABELO (12 OPÇÕES) -->
        <div class="avatar-secao-grupo">
          <label class="avatar-grupo-rotulo">Estilo de Cabelo (12 Estilos)</label>
          <div class="avatar-grade-opcoes">
            ${AVATAR_OPCOES.cabelo.map(cab => `
              <button type="button" class="btn-opcao-card ${avatarAtual.cabelo === cab ? 'selecionado' : ''}" data-prop="cabelo" data-valor="${cab}" aria-label="Cabelo: ${cab.replace('_', ' ')}">
                <span style="font-size: 1.2rem;">${cab === 'careca' ? '🧑‍🦲' : '💇'}</span>
                <span>${cab.replace('_', ' ')}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;

    case 'roupa':
      return `
        <!-- COR DA ROUPA CORPORATIVA (6 CORES) -->
        <div class="avatar-secao-grupo">
          <label class="avatar-grupo-rotulo">Cor da Roupa Corporativa</label>
          <div class="avatar-paleta-cores-grid">
            ${AVATAR_OPCOES.cor_roupa.map(cr => `
              <button type="button" class="avatar-swatch-cor ${avatarAtual.cor_roupa === cr.id ? 'selecionado' : ''}" data-prop="cor_roupa" data-valor="${cr.id}" style="background-color: ${cr.hex}; border-color: ${cr.secundaria};" title="${cr.nome}" aria-label="Cor de roupa: ${cr.nome}">
                ${avatarAtual.cor_roupa === cr.id ? '<span class="swatch-check">✓</span>' : ''}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- MODELOS DE ROUPA CORPORATIVA (8 MODELOS) -->
        <div class="avatar-secao-grupo">
          <label class="avatar-grupo-rotulo">Traje Corporativo (8 Modelos)</label>
          <div class="avatar-grade-opcoes">
            ${AVATAR_OPCOES.roupa.map(r => `
              <button type="button" class="btn-opcao-card ${avatarAtual.roupa === r ? 'selecionado' : ''}" data-prop="roupa" data-valor="${r}" aria-label="Traje: ${r.replace('_', ' ')}">
                <span style="font-size: 1.2rem;">${r === 'jaleco' ? '🥼' : r === 'macacao' ? '🦺' : r === 'polo_ss' ? '👕' : '👔'}</span>
                <span>${r === 'polo_ss' ? 'Polo SEST SENAT' : r.replace('_', ' ')}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;

    case 'acessorios':
      return `
        <!-- ACESSÓRIO DE ROSTO -->
        <div class="avatar-secao-grupo">
          <label class="avatar-grupo-rotulo">Acessório de Rosto</label>
          <div class="avatar-grade-opcoes">
            ${AVATAR_OPCOES.rosto.map(ro => `
              <button type="button" class="btn-opcao-card ${avatarAtual.rosto === ro ? 'selecionado' : ''}" data-prop="rosto" data-valor="${ro}" aria-label="Rosto: ${ro.replace('_', ' ')}">
                <span style="font-size: 1.2rem;">${ro === 'nenhum' ? '🚫' : ro === 'oculos_escuros' ? '🕶️' : '👓'}</span>
                <span>${ro === 'nenhum' ? 'Nenhum' : ro.replace('_', ' ')}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- ACESSÓRIO DE CABEÇA -->
        <div class="avatar-secao-grupo">
          <label class="avatar-grupo-rotulo">Acessório de Cabeça</label>
          <div class="avatar-grade-opcoes">
            ${AVATAR_OPCOES.cabeca.map(cb => `
              <button type="button" class="btn-opcao-card ${avatarAtual.cabeca === cb ? 'selecionado' : ''}" data-prop="cabeca" data-valor="${cb}" aria-label="Cabeça: ${cb.replace('_', ' ')}">
                <span style="font-size: 1.2rem;">${cb === 'nenhum' ? '🚫' : cb === 'capacete_seguranca' ? '⛑️' : cb === 'fone_ouvido' ? '🎧' : '🧢'}</span>
                <span>${cb === 'nenhum' ? 'Nenhum' : cb === 'bone_ss' ? 'Boné SS' : cb.replace('_', ' ')}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- ITEM NA MÃO / COSTAS -->
        <div class="avatar-secao-grupo">
          <label class="avatar-grupo-rotulo">Item na Mão / Costas</label>
          <div class="avatar-grade-opcoes">
            ${AVATAR_OPCOES.item.map(it => `
              <button type="button" class="btn-opcao-card ${avatarAtual.item === it ? 'selecionado' : ''}" data-prop="item" data-valor="${it}" aria-label="Item: ${it.replace('_', ' ')}">
                <span style="font-size: 1.2rem;">${it === 'nenhum' ? '🚫' : it === 'mala_ss' ? '🧳' : it === 'notebook' ? '💻' : it === 'prancheta' ? '📋' : it === 'caneca_cafe' ? '☕' : '📱'}</span>
                <span>${it === 'nenhum' ? 'Mãos livres' : it === 'mala_ss' ? 'Mala SS' : it.replace('_', ' ')}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;

    case 'mobilidade':
      return `
        <!-- MOBILIDADE INCLUSIVA -->
        <div class="avatar-secao-grupo">
          <label class="avatar-grupo-rotulo">Acessibilidade e Mobilidade (Opcional)</label>
          <div class="avatar-grade-opcoes" style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));">
            ${AVATAR_OPCOES.mobilidade.map(mob => `
              <button type="button" class="btn-opcao-card ${avatarAtual.mobilidade === mob ? 'selecionado' : ''}" data-prop="mobilidade" data-valor="${mob}" aria-label="Mobilidade: ${mob.replace('_', ' ')}">
                <span style="font-size: 1.5rem;">${mob === 'nenhum' ? '🚶' : mob === 'cadeira_rodas' ? '♿' : '🦯'}</span>
                <span>${mob === 'nenhum' ? 'Em pé' : mob === 'cadeira_rodas' ? 'Cadeira de Rodas' : 'Bengala'}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;

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
  const botoesOpcao = painel.querySelectorAll('.btn-opcao-card');
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
