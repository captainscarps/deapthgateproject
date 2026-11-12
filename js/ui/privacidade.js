// js/ui/privacidade.js - Modal do Termo de Privacidade e Aceite LGPD
import { state } from '../state.js';

let modalContainer = null;

export function renderModalHTML() {
  return `
    <div id="modal-privacidade" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="privacidade-titulo">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 id="privacidade-titulo">Privacidade e Uso de Dados</h3>
          <button type="button" class="btn-outline btn-sm" id="btn-fechar-privacidade-x" aria-label="Fechar">✕</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.95rem; color: var(--text-muted);">
            Em conformidade com a <strong>LGPD (Lei nº 13.709/2018)</strong> e as diretrizes corporativas do SEST SENAT.
          </p>

          <div class="privacidade-texto-box">
            <h4>1. Apresentação</h4>
            <p>O <strong>Trilha Inteligente</strong> é uma ferramenta educacional voltada à capacitação de colaboradores sobre uso ético e seguro de Inteligência Artificial, governança de dados corporativos e boas práticas da LGPD.</p>

            <h4>2. Dados Coletados (Princípio da Minimização)</h4>
            <ul>
              <li><strong>Identificação:</strong> Nome completo e e-mail institucional corporativo (@sestsenat.org.br).</li>
              <li><strong>Lotação:</strong> Área de atuação institucional (ex.: TI, Jurídico, RH, Saúde).</li>
              <li><strong>Métricas de Jogo:</strong> Tokens finais, acertos em desafios, acionamentos de "Pense Antes" e armadilhas.</li>
              <li><strong>Histórico de Respostas:</strong> Escolhas realizadas nas cartas durante a partida.</li>
            </ul>
            <p style="font-style: italic; color: var(--gold);">* Não coletamos dados sensíveis, localização precisa ou dados financeiros.</p>

            <h4>3. Finalidade do Tratamento</h4>
            <p>1. Composição dos rankings semanais individuais e por área institucional.<br>
               2. Auditoria e recálculo da pontuação oficial no servidor.<br>
               3. Aprimoramento contínuo dos treinamentos corporativos de IA.</p>

            <h4>4. Segurança e Compartilhamento</h4>
            <p>Seus dados permanecem em servidores corporativos protegidos, sem qualquer comercialização ou cessão a terceiros, trafegando exclusivamente via conexões seguras criptografadas (HTTPS).</p>

            <div class="privacidade-dpo-box">
              <strong>Canal Oficial do DPO / Encarregado:</strong><br>
              E-mail: <code>privacidade@sestsenat.org.br</code><br>
              Assessoria Jurídica e de Proteção de Dados - SEST SENAT
            </div>
          </div>

          <label style="display: flex; align-items: flex-start; gap: 10px; font-size: 0.95rem; cursor: pointer; margin-top: 4px;">
            <input type="checkbox" id="chk-aceite-privacidade" style="width: 20px; height: 20px; accent-color: var(--cyan); margin-top: 2px;" />
            <span>Declaro que li e concordo com a coleta das métricas da partida para fins de ranking e capacitação institucional.</span>
          </label>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-cancelar-privacidade">Cancelar</button>
          <button type="button" class="btn btn-primary" id="btn-confirmar-privacidade" disabled>Concordo e Continuar</button>
        </div>
      </div>
    </div>
  `;
}

export function abrirModalPrivacidade({ onAceitar, somenteLeitura = false } = {}) {
  let modalEl = document.getElementById('modal-privacidade');
  if (!modalEl) {
    const div = document.createElement('div');
    div.innerHTML = renderModalHTML();
    document.body.appendChild(div.firstElementChild);
    modalEl = document.getElementById('modal-privacidade');
  }

  const chk = modalEl.querySelector('#chk-aceite-privacidade');
  const btnConfirmar = modalEl.querySelector('#btn-confirmar-privacidade');
  const btnFecharX = modalEl.querySelector('#btn-fechar-privacidade-x');
  const btnCancelar = modalEl.querySelector('#btn-cancelar-privacidade');

  if (somenteLeitura || state.get().termo_privacidade_aceito) {
    chk.checked = true;
    chk.disabled = true;
    btnConfirmar.disabled = false;
    btnConfirmar.textContent = 'Fechar';
  } else {
    chk.checked = false;
    chk.disabled = false;
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Concordo e Continuar';
  }

  const onChangeChk = () => {
    btnConfirmar.disabled = !chk.checked;
  };

  const fechar = () => {
    modalEl.classList.remove('ativo');
    chk.removeEventListener('change', onChangeChk);
    btnConfirmar.removeEventListener('click', onConfirmar);
    btnFecharX.removeEventListener('click', fechar);
    btnCancelar.removeEventListener('click', fechar);
  };

  const onConfirmar = () => {
    if (!somenteLeitura) {
      state.set({
        termo_privacidade_aceito: true,
        termo_privacidade_aceito_em: new Date().toISOString()
      });
      state.salvarJogadorLocal();
    }
    fechar();
    if (typeof onAceitar === 'function') {
      onAceitar();
    }
  };

  chk.addEventListener('change', onChangeChk);
  btnConfirmar.addEventListener('click', onConfirmar);
  btnFecharX.addEventListener('click', fechar);
  btnCancelar.addEventListener('click', fechar);

  modalEl.classList.add('ativo');
}
