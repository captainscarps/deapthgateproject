// js/ui/resultado.js - Tela de Conclusão, Pontuação Animada, Envio e Checklist
import { state } from '../state.js';
import { Api } from '../api.js';
import { calcularPontuacao } from '../regras.js';

let containerRef = null;
let navigateRef = null;

export function render(currentState) {
  const tokens = currentState.tokens || 0;
  const acertos = currentState.acertos_desafio || 0;
  const bonusPense = currentState.bonus_pense_antes || 0;
  const armadilhas = currentState.armadilhas || 0;
  const valeRanking = !!currentState.partida_vale_ranking;

  const ptsTokens = tokens * 10;
  const ptsDesafios = acertos * 50;
  const ptsPenseAntes = bonusPense * 30;
  const bonusZeroArmadilhas = armadilhas === 0 ? 100 : 0;
  const pontuacaoCliente = Math.max(0, ptsTokens + ptsDesafios + ptsPenseAntes + bonusZeroArmadilhas);

  return `
    <div class="tela-resultado fade-in">
      
      <!-- HERO DE RESULTADO -->
      <section class="painel" style="text-align: center; border-color: var(--cyan);">
        <div style="font-size: 2.8rem; margin-bottom: 4px;">🏆</div>
        <h2 class="titulo-secao" style="margin-bottom: 2px; font-size: 1.75rem;">Jornada Concluída!</h2>
        <p style="color: var(--gold); font-size: 1.05rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
          Guardião dos Dados
        </p>

        <!-- CONTADOR DE PONTUAÇÃO ANIMADO -->
        <div class="pontos-contador-box">
          <div style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Pontuação Oficial</div>
          <div class="pontos-contador" id="pontos-contador-valor" data-valor="${pontuacaoCliente}">0</div>
          <div style="margin-top: 6px;">
            ${valeRanking ? `
              <span class="badge badge-oficial" style="font-size: 0.85rem;">
                🏆 OFICIAL • Computada para o Ranking da sua Área!
              </span>
            ` : `
              <span class="badge badge-treino" style="font-size: 0.85rem;">
                🎯 TREINO • Partida de prática e aperfeiçoamento
              </span>
            `}
          </div>
        </div>

        <!-- STATUS DE HOMOLOGAÇÃO / ENVIO DA PARTIDA -->
        <div id="envio-status-container" class="envio-status-box enviando">
          <span class="spinner-circulo"></span>
          <span id="envio-status-msg">Homologando partida com o servidor de auditoria...</span>
        </div>

        <div style="font-size: 1rem; color: #E2E8F0; margin-top: 10px;">
          Parabéns, <strong>${currentState.jogador || 'Colaborador'}</strong>! Sua atuação fortalece a governança de IA no <strong>SEST SENAT</strong>.
        </div>
      </section>

      <!-- RESUMO RÁPIDO DE MÉTRICAS -->
      <section class="resumo-metricas-grid">
        <div class="metrica-card">
          <span class="metrica-card-valor" style="color: var(--green);">${acertos}</span>
          <span class="metrica-card-rotulo">Acertos</span>
        </div>
        <div class="metrica-card">
          <span class="metrica-card-valor" style="color: ${armadilhas === 0 ? 'var(--green)' : 'var(--coral)'};">${armadilhas}</span>
          <span class="metrica-card-rotulo">Armadilhas</span>
        </div>
        <div class="metrica-card">
          <span class="metrica-card-valor" style="color: var(--amber);">${bonusPense}</span>
          <span class="metrica-card-rotulo">Pensou Antes</span>
        </div>
      </section>

      <!-- DETALHAMENTO DA PONTUAÇÃO -->
      <section class="card" style="display: flex; flex-direction: column; gap: 8px;">
        <h3 class="titulo-card" style="font-size: 1.05rem; color: var(--cyan); border-bottom: 1px solid var(--border); padding-bottom: 4px;">
          Detalhamento por Componente
        </h3>

        <div style="display: flex; justify-content: space-between; font-size: 0.95rem;">
          <span style="color: var(--text-muted);">Tokens Restantes (${tokens} × 10):</span>
          <span style="font-weight: 700; color: var(--gold);">+${ptsTokens} pts</span>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 0.95rem;">
          <span style="color: var(--text-muted);">Acertos em Desafios (${acertos} × 50):</span>
          <span style="font-weight: 700; color: var(--green);">+${ptsDesafios} pts</span>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 0.95rem;">
          <span style="color: var(--text-muted);">Bônus "Pense Antes" (${bonusPense} × 30):</span>
          <span style="font-weight: 700; color: var(--cyan);">+${ptsPenseAntes} pts</span>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 0.95rem;">
          <span style="color: var(--text-muted);">Consciência Ética (Zero Armadilhas):</span>
          <span style="font-weight: 700; color: ${armadilhas === 0 ? 'var(--green)' : 'var(--text-dim)'};">
            ${armadilhas === 0 ? '+100 pts' : '0 pts (' + armadilhas + ' armadilhas)'}
          </span>
        </div>
      </section>

      <!-- CARD CHECKLIST PENSE ANTES -->
      <section class="card card-pense-antes">
        <div class="card-pense-antes-header">
          <span style="font-size: 1.3rem;">💡</span>
          <h3 style="color: var(--cyan); font-size: 1.1rem; text-transform: uppercase;">Checklist de Bolso • "Pense Antes"</h3>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-muted);">
          Lembre-se sempre destas 4 perguntas essenciais antes de usar IA no SEST SENAT:
        </p>

        <ol class="checklist-pense-antes">
          <li>
            <strong>1. Preciso mesmo de IA para isso?</strong>
            <span>Problemas simples se resolvem melhor com escuta ativa, bom senso e ferramentas básicas.</span>
          </li>
          <li>
            <strong>2. Já existe algo pronto?</strong>
            <span>Consulte o catálogo da TI institucional e as soluções já contratadas para evitar custos duplicados.</span>
          </li>
          <li>
            <strong>3. Alguma área já faz algo parecido?</strong>
            <span>Compartilhe iniciativas com outras unidades e departamentos para estimular a colaboração em rede.</span>
          </li>
          <li>
            <strong>4. Que dados vou usar e posso usá-los nessa ferramenta?</strong>
            <span>Nunca compartilhe dados pessoais sensíveis, senhas ou documentos restritos em IAs públicas externas.</span>
          </li>
        </ol>
      </section>

      <!-- BOTÕES DE AÇÃO -->
      <section style="display: flex; flex-direction: column; gap: 10px; margin-top: 6px;">
        <button id="btn-resultado-ranking" class="btn btn-primary btn-block">
          🏅 Ver Ranking Semanal
        </button>
        <button id="btn-resultado-jogar-novamente" class="btn btn-secondary btn-block">
          🔄 Jogar de Novo (Treino)
        </button>
      </section>

    </div>
  `;
}

export async function montar(container, currentState, navigate) {
  containerRef = container;
  navigateRef = navigate;

  const elContador = container.querySelector('#pontos-contador-valor');
  const pontosCliente = Number(elContador?.getAttribute('data-valor') || 0);

  // 1. Inicia animação de contagem da pontuação
  animarPontuacao(elContador, 0, pontosCliente);

  // 2. Transmite partida via Api.registrarPartida
  await processarEnvioPartida(container, currentState, pontosCliente, elContador);

  // 3. Ações dos botões
  const btnRanking = container.querySelector('#btn-resultado-ranking');
  if (btnRanking) {
    btnRanking.onclick = () => navigate('ranking');
  }

  const btnReplay = container.querySelector('#btn-resultado-jogar-novamente');
  if (btnReplay) {
    btnReplay.onclick = () => {
      // Inicia como modo treino
      state.novaPartida({
        jogador: currentState.jogador,
        area: currentState.area,
        area_id: currentState.area_id,
        partida_vale_ranking: false
      });
      navigate('tabuleiro');
    };
  }
}

// Animação de contagem numérica
function animarPontuacao(elemento, inicio, fim, duracao = 1.4) {
  if (!elemento) return;

  if (window.gsap) {
    const obj = { val: inicio };
    gsap.to(obj, {
      val: fim,
      duration: duracao,
      ease: 'power2.out',
      onUpdate: () => {
        elemento.textContent = Math.round(obj.val);
      }
    });
  } else {
    elemento.textContent = fim;
  }
}

// Envia a partida e trata resposta do servidor
async function processarEnvioPartida(container, currentState, pontosCliente, elContador) {
  const statusBox = container.querySelector('#envio-status-container');
  const statusMsg = container.querySelector('#envio-status-msg');

  const payload = {
    jogador_id: currentState.jogador_id || 'jog_mock',
    email: currentState.email,
    jogador: currentState.jogador,
    area_id: currentState.area_id || 1,
    area: currentState.area,
    semana: currentState.semana_partida,
    versao_cartas: currentState.versao_cartas || '1.0',
    pontos: pontosCliente,
    tokens: currentState.tokens,
    acertos: currentState.acertos_desafio,
    bonusPenseAntes: currentState.bonus_pense_antes,
    armadilhas: currentState.armadilhas,
    historico: currentState.historico,
    jogada_em: currentState.jogada_em || new Date().toISOString()
  };

  try {
    const res = await Api.registrarPartida(payload);

    if (res.status === 'enviado') {
      if (res.divergencia && res.pontosServidor !== pontosCliente) {
        // Se o servidor recalculou e encontrou divergência oficial
        statusBox.className = 'envio-status-box sucesso';
        statusBox.innerHTML = `<span>⚖️</span> <span>Pontuação auditada e homologada pelo servidor: <strong>${res.pontosServidor} pts</strong></span>`;
        // Atualiza contador com a pontuação oficial do servidor
        animarPontuacao(elContador, pontosCliente, res.pontosServidor, 0.8);
        state.set({ pontuacao_final: res.pontosServidor });
      } else {
        statusBox.className = 'envio-status-box sucesso';
        statusBox.innerHTML = `<span>✅</span> <span>Partida homologada com sucesso no ranking da área!</span>`;
      }
    } else if (res.status === 'salvo_offline') {
      statusBox.className = 'envio-status-box aviso';
      statusBox.innerHTML = `<span>💾</span> <span>Sem conexão imediata. Partida salva para reenviar automaticamente.</span>`;
    }
  } catch (err) {
    statusBox.className = 'envio-status-box aviso';
    statusBox.innerHTML = `<span>💾</span> <span>Partida salva localmente no dispositivo para envio posterior.</span>`;
  }
}

export function desmontar() {}
