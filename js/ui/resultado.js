// js/ui/resultado.js - Tela de Resultado, Homologação e Checklist Pense Antes
import { state } from '../state.js';
import { Api } from '../api.js';
import { renderAvatarSVG, AVATAR_PADRAO } from '../avatar.js';
import { relatorioAprendizagem } from '../temas.js';
import { ico } from '../icones.js';
import { confete } from '../fx.js';

function renderRelatorio(st) {
  const rel = relatorioAprendizagem(st.respostas_tema || {});
  const seq = st.maior_sequencia || 0;
  if (!rel.temas.length) {
    return `<p class="relatorio-vazio">Você não respondeu perguntas nesta partida. Caia em casas de <strong>Desafio</strong> e <strong>Pense Antes</strong> para gerar seu relatório.</p>`;
  }
  return `
    ${rel.temas.map(t => `
      <div class="relatorio-linha">
        <span class="relatorio-nome">${t.nome}</span>
        <span class="relatorio-taxa">${t.acertos}/${t.total}</span>
        <div class="relatorio-barra"><span style="width: ${Math.round(t.taxa * 100)}%; background: ${t.cor};"></span></div>
      </div>`).join('')}
    <div class="relatorio-destaques">
      <div class="relatorio-destaque forte">
        <strong>Seu ponto forte</strong>
        ${rel.forte ? rel.forte.nome : 'Continue jogando para descobrir'}
      </div>
      <div class="relatorio-destaque reforcar">
        <strong>Vale reforçar</strong>
        ${rel.reforcar ? rel.reforcar.nome : 'Nada por enquanto. Mandou bem!'}
      </div>
    </div>
    <div style="font-size: 0.88rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
      ${ico('fogo')} Maior sequência de acertos: <strong style="color: var(--orange);">${seq}</strong>
    </div>`;
}

let containerRef = null;
let navigateRef = null;

export function render(currentState) {
  const tokens = currentState.tokens || 0;
  const acertos = currentState.acertos_desafio || 0;
  const bonusPense = currentState.bonus_pense_antes || 0;
  const armadilhas = currentState.armadilhas || 0;
  const voltas = currentState.voltas_completas || 0;
  const casasAvancadas = currentState.casas_avancadas || 0;
  const boasPraticas = currentState.boas_praticas || 0;
  const pontuacaoCliente = currentState.pontuacao_final || 0;
  const valeRanking = currentState.partida_vale_ranking === true;
  const ehConvidado = currentState.modo_convidado === true;

  // Nova fórmula oficial em loop:
  // pontos = casas_avancadas*5 + voltas*150 + acertos_desafio*50 + bonus_pense_antes*30 + boas_praticas*10 - armadilhas*20
  const ptsCasas = casasAvancadas * 5;
  const ptsVoltas = voltas * 150;
  const ptsDesafios = acertos * 50;
  const ptsPenseAntes = bonusPense * 30;
  const ptsBoasPraticas = boasPraticas * 10;
  const penalidadeArmadilhas = armadilhas * 20;

  return `
    <div class="tela-resultado fade-in">
      
      <!-- COLUNA ESQUERDA: PONTUAÇÃO, DETALHAMENTO & AÇÕES -->
      <div class="resultado-coluna-esquerda">
        <!-- HERO DE RESULTADO -->
        <section class="painel painel-arcade" style="text-align: center; border-color: var(--cyan);">
          <span class="parafuso-canto top-left"></span>
          <span class="parafuso-canto top-right"></span>
          <span class="parafuso-canto bottom-left"></span>
          <span class="parafuso-canto bottom-right"></span>

          <div class="ico-grande" style="width: 52px; height: 52px; margin: 0 auto 4px; color: var(--gold);">${ico('trofeu')}</div>
          <h2 class="titulo-secao" style="margin-bottom: 2px; font-size: 1.75rem;">Jornada Concluída!</h2>
          <p style="color: var(--gold); font-size: 1.05rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
            Guardião dos Dados
          </p>

          <!-- AVATAR CHIBI COMEMORANDO A VITÓRIA -->
          <div style="display: flex; justify-content: center; align-items: center; margin: 12px 0 6px;">
            <div class="avatar-podio-box" style="width: 100px; height: 115px; margin: 0 auto;" title="Seu Personagem Comemorando!">
              ${renderAvatarSVG(currentState.avatar || AVATAR_PADRAO, { modo: 'completo', reacao: 'comemorando', tamanho: 100 })}
            </div>
          </div>

          <!-- CONTADOR DE PONTUAÇÃO ANIMADO -->
          <div class="pontos-contador-box">
            <div style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Pontuação Final</div>
            <div class="pontos-contador fonte-pixel" id="pontos-contador-valor" data-valor="${pontuacaoCliente}">0</div>
            <div style="margin-top: 6px;">
              ${ehConvidado ? `
                <span class="badge badge-treino" style="font-size: 0.85rem; border: 1px solid var(--gold); color: #FFD166; background: rgba(255, 209, 102, 0.15);">
                  👤 Modo convidado: não conta para o ranking
                </span>
              ` : (valeRanking ? `
                <span class="badge badge-oficial" style="font-size: 0.85rem;">
                  🏆 OFICIAL • Computada para o Ranking da sua Área!
                </span>
              ` : `
                <span class="badge badge-treino" style="font-size: 0.85rem;">
                  🎯 TREINO • Partida de prática e aperfeiçoamento
                </span>
              `)}
            </div>
          </div>

          <!-- STATUS DE HOMOLOGAÇÃO / ENVIO DA PARTIDA -->
          <div id="envio-status-container" class="envio-status-box enviando">
            <span class="spinner-circulo"></span>
            <span id="envio-status-msg">${ehConvidado ? 'Registrando estatísticas anônimas...' : 'Homologando partida com o servidor de auditoria...'}</span>
          </div>

          <div style="font-size: 1rem; color: #E2E8F0; margin-top: 10px;">
            ${ehConvidado 
              ? 'Parabéns pela conclusão da trilha! Praticar com antecedência fortalece a cultura de governança de IA.'
              : `Parabéns, <strong>${currentState.jogador || 'Colaborador'}</strong>! Sua atuação fortalece a governança de IA no <strong>SEST SENAT</strong>.`}
          </div>
        </section>

        <!-- RESUMO RÁPIDO DE MÉTRICAS -->
        <section class="resumo-metricas-grid" style="grid-template-columns: repeat(4, 1fr);">
          <div class="metrica-card">
            <span class="metrica-card-valor" style="color: var(--cyan);">${voltas}</span>
            <span class="metrica-card-rotulo">Voltas</span>
          </div>
          <div class="metrica-card">
            <span class="metrica-card-valor" style="color: var(--green);">${acertos}</span>
            <span class="metrica-card-rotulo">Acertos</span>
          </div>
          <div class="metrica-card">
            <span class="metrica-card-valor" style="color: var(--amber);">${bonusPense}</span>
            <span class="metrica-card-rotulo">Pense Antes</span>
          </div>
          <div class="metrica-card">
            <span class="metrica-card-valor" style="color: ${armadilhas === 0 ? 'var(--green)' : 'var(--coral)'};">${armadilhas}</span>
            <span class="metrica-card-rotulo">Armadilhas</span>
          </div>
        </section>

        <!-- RELATÓRIO DE APRENDIZAGEM POR TEMA -->
        <section class="card relatorio-aprendizagem">
          <div class="relatorio-titulo">${ico('livro')} Seu relatório de aprendizagem</div>
          ${renderRelatorio(currentState)}
        </section>

        <!-- ENTRADA PARA A LIGA -->
        <button type="button" id="btn-resultado-liga" class="btn-liga-entrada">
          ${ico('espadas')}
          <span>
            <span class="btn-liga-entrada-titulo">Liga & Duelos <span class="badge-novo">NOVO</span></span>
            <span class="btn-liga-entrada-sub">Desafie colegas numa bateria de perguntas contra o tempo</span>
          </span>
        </button>

        <!-- DETALHAMENTO DA PONTUAÇÃO -->
        <section class="card" style="display: flex; flex-direction: column; gap: 8px;">
          <h3 class="titulo-card" style="font-size: 1.05rem; color: var(--cyan); border-bottom: 1px solid var(--border); padding-bottom: 4px;">
            Detalhamento da Pontuação (Regra em Loop)
          </h3>

          <div style="display: flex; justify-content: space-between; font-size: 0.92rem;">
            <span style="color: var(--text-muted);">Casas Avançadas (${casasAvancadas} × 5):</span>
            <span style="font-family: var(--font-pixel); font-weight: 700; color: var(--gold);">+${ptsCasas} pts</span>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.92rem;">
            <span style="color: var(--text-muted);">Voltas Completas (${voltas} × 150):</span>
            <span style="font-family: var(--font-pixel); font-weight: 700; color: var(--cyan);">+${ptsVoltas} pts</span>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.92rem;">
            <span style="color: var(--text-muted);">Acertos em Desafios (${acertos} × 50):</span>
            <span style="font-family: var(--font-pixel); font-weight: 700; color: var(--green);">+${ptsDesafios} pts</span>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.92rem;">
            <span style="color: var(--text-muted);">Bônus "Pense Antes" (${bonusPense} × 30):</span>
            <span style="font-family: var(--font-pixel); font-weight: 700; color: var(--amber);">+${ptsPenseAntes} pts</span>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.92rem;">
            <span style="color: var(--text-muted);">Boas Práticas Adotadas (${boasPraticas} × 10):</span>
            <span style="font-family: var(--font-pixel); font-weight: 700; color: var(--green);">+${ptsBoasPraticas} pts</span>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.92rem;">
            <span style="color: var(--text-muted);">Penalidade de Armadilhas (${armadilhas} × -20):</span>
            <span style="font-family: var(--font-pixel); font-weight: 700; color: ${armadilhas === 0 ? 'var(--text-dim)' : 'var(--coral)'};">
              -${penalidadeArmadilhas} pts
            </span>
          </div>
        </section>

        <!-- BOTÕES DE NAVEGAÇÃO -->
        <section class="resultado-acoes" style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
          <button id="btn-resultado-jogar-novamente" class="btn btn-primary btn-block" style="font-size: 1.15rem; padding: 14px;">
            ${ico('repetir')} ${ehConvidado ? 'Jogar Outra Trilha como Convidado' : 'Jogar Novamente (Modo Treino)'}
          </button>
          <button id="btn-resultado-ranking" class="btn btn-secondary btn-block">
            ${ico('ranking')} Ver ranking da semana
          </button>
        </section>
      </div>

      <!-- COLUNA DIREITA: CHECKLIST PENSE ANTES & CTA LOGIN -->
      <div class="resultado-coluna-direita">
        ${ehConvidado ? `
          <!-- CHAMADA PARA LOGIN DO CONVIDADO (NÃO CONVERTE PARTIDA) -->
          <section class="card painel-arcade" style="background: linear-gradient(135deg, rgba(0, 180, 216, 0.15), rgba(11, 31, 58, 0.95)); border: 2px solid var(--cyan); text-align: center; padding: 18px;">
            <span class="parafuso-canto top-left"></span>
            <span class="parafuso-canto top-right"></span>
            <span style="font-size: 2.2rem;">🏛️</span>
            <h3 style="color: var(--cyan); margin: 6px 0 4px; font-size: 1.25rem; font-family: var(--font-title); font-weight: 800;">Quer aparecer no ranking da sua área?</h3>
            <p style="font-size: 0.95rem; color: #E2E8F0; margin-bottom: 14px; line-height: 1.4;">
              Entre com seu e-mail institucional e jogue o <strong>Desafio da Semana</strong> oficial.
            </p>
            <button id="btn-login-cta" class="btn btn-primary btn-block" style="font-size: 1.1rem; padding: 12px;">
              🔐 Entrar com E-mail Institucional
            </button>
          </section>
        ` : ''}

        <!-- CARD CHECKLIST PENSE ANTES -->
        <section class="card card-pense-antes painel-arcade">
          <span class="parafuso-canto top-left"></span>
          <span class="parafuso-canto top-right"></span>
          <div class="card-pense-antes-header">
            <span style="font-size: 1.4rem;">💡</span>
            <h3 style="color: var(--cyan); font-size: 1.15rem; font-family: var(--font-title); font-weight: 800; text-transform: uppercase;">Checklist de Bolso • "Pense Antes"</h3>
          </div>
          <p style="font-size: 0.88rem; color: var(--text-dim); margin-bottom: 12px;">
            Guarde estas 4 perguntas antes de colar dados em qualquer ferramenta ou assistente de IA:
          </p>
          <ol class="checklist-pense-antes-lista">
            <li>
              <strong>1. Preciso mesmo de IA para isso?</strong>
              <span>Avalie se uma regra simples ou automação padrão já atende com segurança.</span>
            </li>
            <li>
              <strong>2. Já existe algo pronto?</strong>
              <span>Consulte o portfólio oficial do SEST SENAT antes de usar ferramentas externas.</span>
            </li>
            <li>
              <strong>3. Alguma área já faz algo parecido?</strong>
              <span>Alinhe com TI e Inovação para evitar retrabalho e silos tecnológicos.</span>
            </li>
            <li>
              <strong>4. Que dados vou usar e posso usá-los nessa ferramenta?</strong>
              <span>Nunca insira CPF, prontuários, dados sensíveis ou informações sigilosas em IAs públicas!</span>
            </li>
          </ol>
        </section>
      </div>

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
  setTimeout(() => confete({ quantidade: 120 }), 300);

  const btnLiga = container.querySelector('#btn-resultado-liga');
  if (btnLiga) btnLiga.onclick = () => navigate('liga');

  // 2. Transmite partida (anônima se convidado, oficial/treino se colaborador)
  await processarEnvioPartida(container, currentState, pontosCliente, elContador);

  // 3. Ações dos botões
  const btnRanking = container.querySelector('#btn-resultado-ranking');
  if (btnRanking) {
    btnRanking.onclick = () => navigate('ranking');
  }

  const btnReplay = container.querySelector('#btn-resultado-jogar-novamente');
  if (btnReplay) {
    btnReplay.onclick = () => {
      if (currentState.modo_convidado) {
        state.iniciarPartidaConvidado({
          area_id: currentState.area_id,
          area: currentState.area,
          cartas: state.deckManager ? state.deckManager.todasCartas : []
        });
      } else {
        state.novaPartida({
          jogador: currentState.jogador,
          area: currentState.area,
          area_id: currentState.area_id,
          partida_vale_ranking: false
        });
      }
      navigate('tabuleiro');
    };
  }

  // 4. Botão CTA para Login (Convidado quer ir para o desafio semanal)
  const btnLoginCta = container.querySelector('#btn-login-cta');
  if (btnLoginCta) {
    btnLoginCta.onclick = () => {
      // Navega para a tela inicial para fazer login.
      // IMPORTANTE: Partida de convidado NUNCA é convertida em oficial.
      navigate('inicio');
    };
  }
}

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

async function processarEnvioPartida(container, currentState, pontosCliente, elContador) {
  const statusBox = container.querySelector('#envio-status-container');
  if (!statusBox) return;

  const ehConvidado = currentState.modo_convidado === true;

  // CASO A: MODO CONVIDADO (Envio anônimo; sem fila offline em caso de falha)
  if (ehConvidado) {
    try {
      const res = await Api.registrarPartidaConvidado({
        area_id: currentState.area_id || null,
        pontos: pontosCliente,
        tokens: currentState.tokens,
        casas_avancadas: currentState.casas_avancadas || 0,
        voltas: currentState.voltas_completas || 0,
        acertos: currentState.acertos_desafio,
        bonusPenseAntes: currentState.bonus_pense_antes,
        boas_praticas: currentState.boas_praticas || 0,
        armadilhas: currentState.armadilhas,
        historico: currentState.historico,
        jogada_em: currentState.jogada_em || new Date().toISOString()
      });

      if (res && res.sucesso) {
        statusBox.className = 'envio-status-box sucesso';
        statusBox.innerHTML = `<span>📊</span> <span>Estatísticas anônimas registradas para aprimoramento contínuo.</span>`;
      } else {
        // Descarte silencioso sem fila offline
        statusBox.style.display = 'none';
      }
    } catch {
      // Descarte silencioso
      statusBox.style.display = 'none';
    }
    return;
  }

  // CASO B: COLABORADOR LOGADO (Envio oficial/treino com auditoria)
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
    casas_avancadas: currentState.casas_avancadas || 0,
    voltas: currentState.voltas_completas || 0,
    acertos: currentState.acertos_desafio,
    bonusPenseAntes: currentState.bonus_pense_antes,
    boas_praticas: currentState.boas_praticas || 0,
    armadilhas: currentState.armadilhas,
    historico: currentState.historico,
    jogada_em: currentState.jogada_em || new Date().toISOString()
  };

  try {
    const res = await Api.registrarPartida(payload);

    if (res.status === 'enviado') {
      if (res.divergencia && res.pontosServidor !== pontosCliente) {
        statusBox.className = 'envio-status-box sucesso';
        statusBox.innerHTML = `<span>⚖️</span> <span>Pontuação auditada e homologada pelo servidor: <strong>${res.pontosServidor} pts</strong></span>`;
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
  } catch {
    statusBox.className = 'envio-status-box aviso';
    statusBox.innerHTML = `<span>💾</span> <span>Partida salva localmente no dispositivo para envio posterior.</span>`;
  }
}

export function desmontar() {}
