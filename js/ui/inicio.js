// js/ui/inicio.js - Tela de Início, Fluxo de Conta Mock e Modais
import { state } from '../state.js';
import { semanaAtual, carregarCartas } from '../deck.js';
import { Api } from '../api.js';
import { abrirModalPrivacidade } from './privacidade.js';
import { abrirModalTutorial } from './tutorial.js';

let containerRef = null;
let navigateRef = null;

// Estado transitório local do formulário de autenticação mock
let fluxoAuth = {
  etapa: 'email', // 'email' | 'otp' | 'perfil' | 'logado'
  emailDigitado: '',
  codigoDigitado: '',
  erro: '',
  info: ''
};

function formatarSemanaExibicao(semanaIso) {
  // Converte "2026-W46" para "Semana 46 • 2026"
  const match = semanaIso.match(/^(\d{4})-W(\d{2})$/);
  if (match) {
    return `Desafio da Semana ${parseInt(match[2], 10)} (${match[1]})`;
  }
  return `Desafio Semanal • ${semanaIso}`;
}

export function render(currentState) {
  const semIso = semanaAtual();
  const semFormatada = formatarSemanaExibicao(semIso);
  const estaLogado = !!(currentState.email && currentState.jogador && currentState.area);

  // Se o estado já tem dados persistidos, atualiza fluxoAuth
  if (estaLogado && fluxoAuth.etapa !== 'logado') {
    fluxoAuth.etapa = 'logado';
  }

  const valeRanking = currentState.partida_vale_ranking !== false;

  return `
    <div class="tela-inicio fade-in">
      
      <!-- HERO COM SEMANA E STATUS -->
      <section class="inicio-hero">
        <div class="semana-tag">
          <span>📅</span>
          <span>${semFormatada}</span>
        </div>
        
        <div class="status-partida-box">
          ${valeRanking ? `
            <span class="badge badge-oficial">
              🏆 OFICIAL • Vale para o Ranking
            </span>
          ` : `
            <span class="badge badge-treino">
              🎯 TREINO • Não afeta sua pontuação oficial
            </span>
          `}
        </div>

        <p class="inicio-desc">
          Partida rápida (5 a 8 minutos). Aprenda uso ético de IA, proteção de dados corporativos e LGPD no SEST SENAT.
        </p>
      </section>

      <!-- CARD DE IDENTIFICAÇÃO / LOGIN MOCK -->
      <section class="colaborador-card" id="card-identificacao">
        ${renderCardAutenticacao(currentState)}
      </section>

      <!-- AÇÕES PRINCIPAIS -->
      <section class="inicio-acoes">
        <button id="btn-jogar" class="btn btn-primary btn-block" style="font-size: 1.35rem; padding: 16px;">
          🚀 JOGAR AGORA
        </button>

        <button id="btn-ver-ranking" class="btn btn-secondary btn-block">
          🏅 VER RANKING SEMANAL
        </button>
      </section>

      <!-- LINKS SECUNDÁRIOS -->
      <section class="inicio-links-secundarios">
        <button id="btn-abrir-tutorial" class="btn btn-outline btn-sm">
          💡 Como Jogar
        </button>
        <button id="btn-abrir-privacidade" class="btn btn-outline btn-sm">
          🛡️ Privacidade & LGPD
        </button>
      </section>

    </div>
  `;
}

function renderCardAutenticacao(currentState) {
  const { etapa, erro, info, emailDigitado } = fluxoAuth;

  // Feedback de erro ou sucesso
  const mensagemBox = erro ? `
    <div style="background: rgba(239, 71, 111, 0.15); border: 1px solid var(--coral); color: #FFA8BA; padding: 8px 12px; border-radius: 6px; font-size: 0.9rem;">
      ⚠️ ${erro}
    </div>
  ` : (info ? `
    <div style="background: rgba(6, 214, 160, 0.15); border: 1px solid var(--green); color: #72F2D1; padding: 8px 12px; border-radius: 6px; font-size: 0.9rem;">
      ℹ️ ${info}
    </div>
  ` : '');

  // 1. ETAPA: JÁ AUTENTICADO E PERFIL TRAVADO
  if (etapa === 'logado' && currentState.jogador && currentState.area) {
    return `
      <div class="colaborador-header">
        <div>
          <div style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase;">Colaborador Conectado</div>
          <div class="colaborador-nome">${currentState.jogador}</div>
        </div>
        <button id="btn-logout" class="btn btn-secondary btn-sm" title="Desconectar sessão">
          Sair / Trocar
        </button>
      </div>

      <div class="colaborador-area-lock">
        <span class="badge badge-area">
          🏛️ ${currentState.area}
        </span>
        <span class="lock-icon" title="Área vinculada ao perfil institucional">🔒 Área Fixada</span>
      </div>

      <div style="font-size: 0.9rem; color: var(--text-dim); margin-top: 2px;">
        ${currentState.email}
      </div>
    `;
  }

  // 2. ETAPA: DIGITAR EMAIL INSTITUCIONAL
  if (etapa === 'email') {
    return `
      <h3 class="titulo-card">Identificação do Colaborador</h3>
      <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 8px;">
        Informe seu e-mail corporativo do SEST SENAT para participar do ranking.
      </p>

      ${mensagemBox}

      <div class="form-group" style="margin-top: 8px;">
        <label class="form-label" for="input-email-login">E-mail Corporativo</label>
        <input type="email" id="input-email-login" placeholder="seu.nome@sestsenat.org.br" value="${emailDigitado}" />
      </div>

      <button id="btn-enviar-otp" class="btn btn-primary btn-block">
        Continuar com Código de Acesso
      </button>
    `;
  }

  // 3. ETAPA: DIGITAR CÓDIGO OTP (MOCK: 123456)
  if (etapa === 'otp') {
    return `
      <h3 class="titulo-card">Código de Verificação</h3>
      <p style="font-size: 0.95rem; color: var(--text-muted);">
        Enviamos um código de 6 dígitos para <strong>${emailDigitado}</strong>.
      </p>

      ${mensagemBox}

      <div class="form-group" style="margin-top: 8px;">
        <label class="form-label" for="input-codigo-otp">Código de 6 Dígitos (Mock: 123456)</label>
        <input type="text" id="input-codigo-otp" maxlength="6" placeholder="123456" style="letter-spacing: 4px; font-weight: 700; text-align: center;" />
      </div>

      <div style="display: flex; gap: 10px;">
        <button id="btn-voltar-email" class="btn btn-secondary btn-block">Voltar</button>
        <button id="btn-verificar-otp" class="btn btn-primary btn-block">Validar Código</button>
      </div>
    `;
  }

  // 4. ETAPA: COMPLETAR PERFIL NA 1ª VEZ
  if (etapa === 'perfil') {
    return `
      <h3 class="titulo-card">Complete seu Perfil</h3>
      <p style="font-size: 0.95rem; color: var(--text-muted);">
        Primeiro acesso com <strong>${emailDigitado}</strong>. Escolha sua área de atuação (ela ficará travada após o cadastro).
      </p>

      ${mensagemBox}

      <div class="form-group" style="margin-top: 8px;">
        <label class="form-label" for="input-nome-perfil">Nome Completo</label>
        <input type="text" id="input-nome-perfil" placeholder="Ex: Rafael Scarpille" />
      </div>

      <div class="form-group">
        <label class="form-label" for="select-area-perfil">Área / Unidade Institucional</label>
        <select id="select-area-perfil" class="form-select">
          <option value="">Carregando áreas...</option>
        </select>
      </div>

      <button id="btn-salvar-perfil" class="btn btn-success btn-block">
        Salvar e Bloquear Perfil
      </button>
    `;
  }

  return '';
}

export async function montar(container, currentState, navigate) {
  containerRef = container;
  navigateRef = navigate;

  // Carrega opções do seletor de áreas se estiver na etapa de perfil
  const selectArea = container.querySelector('#select-area-perfil');
  if (selectArea) {
    const areas = await Api.carregarAreas();
    selectArea.innerHTML = `
      <option value="">-- Selecione sua Área Oficial --</option>
      ${areas.map(a => `<option value="${a.id}" data-sigla="${a.sigla}" data-nome="${a.nome}">${a.sigla} - ${a.nome}</option>`).join('')}
    `;
  }

  // Atualiza validação da partida oficial ou treino para a semana atual
  if (currentState.email) {
    const statusPartida = await Api.verificarStatusPartidaSemanal(currentState.email);
    if (currentState.partida_vale_ranking !== statusPartida.valeRanking) {
      state.set({ partida_vale_ranking: statusPartida.valeRanking });
    }
  }

  atribuirEventos(container);
}

function reRender() {
  if (containerRef && navigateRef) {
    containerRef.innerHTML = render(state.get());
    montar(containerRef, state.get(), navigateRef);
  }
}

function atribuirEventos(container) {
  // 1. Enviar OTP
  const btnEnviarOtp = container.querySelector('#btn-enviar-otp');
  if (btnEnviarOtp) {
    btnEnviarOtp.onclick = async () => {
      const inputEmail = container.querySelector('#input-email-login');
      const email = inputEmail ? inputEmail.value.trim().toLowerCase() : '';

      if (!Api.validarEmailInstitucional(email)) {
        fluxoAuth.erro = 'Acesso restrito: utilize exclusivamente um e-mail @sestsenat.org.br.';
        fluxoAuth.info = '';
        reRender();
        return;
      }

      fluxoAuth.emailDigitado = email;
      fluxoAuth.erro = '';
      fluxoAuth.info = 'Código de acesso simulado enviado! Utilize o código mock: 123456';
      fluxoAuth.etapa = 'otp';
      reRender();
    };
  }

  // 2. Voltar para e-mail
  const btnVoltarEmail = container.querySelector('#btn-voltar-email');
  if (btnVoltarEmail) {
    btnVoltarEmail.onclick = () => {
      fluxoAuth.etapa = 'email';
      fluxoAuth.erro = '';
      fluxoAuth.info = '';
      reRender();
    };
  }

  // 3. Validar OTP
  const btnVerificarOtp = container.querySelector('#btn-verificar-otp');
  if (btnVerificarOtp) {
    btnVerificarOtp.onclick = async () => {
      const inputCodigo = container.querySelector('#input-codigo-otp');
      const codigo = inputCodigo ? inputCodigo.value.trim() : '';

      const res = await Api.validarOtp(fluxoAuth.emailDigitado, codigo);
      if (!res.sucesso) {
        fluxoAuth.erro = res.mensagem;
        reRender();
        return;
      }

      // Tenta buscar perfil existente do colaborador
      const userId = res.user?.id || ('user_mock_' + fluxoAuth.emailDigitado.replace(/[^a-z0-9]/g, '_'));
      const perfilRemoto = await Api.buscarPerfil(userId);

      if (perfilRemoto && perfilRemoto.nome && perfilRemoto.area_id) {
        const areaStr = perfilRemoto.areas ? `${perfilRemoto.areas.sigla} - ${perfilRemoto.areas.nome}` : `Área ${perfilRemoto.area_id}`;
        state.set({
          jogador: perfilRemoto.nome,
          email: fluxoAuth.emailDigitado,
          area: areaStr,
          area_id: perfilRemoto.area_id,
          jogador_id: perfilRemoto.id
        });
        state.salvarJogadorLocal();
        fluxoAuth.etapa = 'logado';
        fluxoAuth.erro = '';
        fluxoAuth.info = '';
        reRender();
        return;
      }

      // Se já possui perfil local cadastrado para esse e-mail
      const current = state.get();
      if (current.email === fluxoAuth.emailDigitado && current.jogador && current.area) {
        fluxoAuth.etapa = 'logado';
        fluxoAuth.erro = '';
        fluxoAuth.info = '';
        reRender();
      } else {
        // Primeiro acesso: pede perfil
        fluxoAuth.etapa = 'perfil';
        fluxoAuth.erro = '';
        fluxoAuth.info = 'Autenticado! Preencha seu nome e selecione sua área.';
        reRender();
      }
    };
  }

  // 4. Salvar Perfil
  const btnSalvarPerfil = container.querySelector('#btn-salvar-perfil');
  if (btnSalvarPerfil) {
    btnSalvarPerfil.onclick = async () => {
      const inputNome = container.querySelector('#input-nome-perfil');
      const selectArea = container.querySelector('#select-area-perfil');

      const nome = inputNome ? inputNome.value.trim() : '';
      const areaId = selectArea ? selectArea.value : '';
      const selectedOption = selectArea ? selectArea.selectedOptions[0] : null;

      if (!nome) {
        fluxoAuth.erro = 'Por favor, informe seu nome completo.';
        reRender();
        return;
      }
      if (!areaId || !selectedOption) {
        fluxoAuth.erro = 'Selecione uma área oficial do SEST SENAT.';
        reRender();
        return;
      }

      const areaNome = selectedOption.getAttribute('data-nome');
      const areaSigla = selectedOption.getAttribute('data-sigla');
      const areaIdNum = parseInt(areaId, 10);

      try {
        const sessao = await Api.obterSessao();
        const userId = sessao?.user?.id || ('user_mock_' + fluxoAuth.emailDigitado.replace(/[^a-z0-9]/g, '_'));
        const perfilCriado = await Api.criarPerfil({
          userId,
          nome,
          areaId: areaIdNum,
          email: fluxoAuth.emailDigitado
        });
        if (perfilCriado?.id) {
          state.set({ jogador_id: perfilCriado.id });
        }
      } catch (err) {
        console.warn('Registro de perfil no backend:', err.message);
      }

      // Salva perfil no State e trava área
      state.set({
        jogador: nome,
        email: fluxoAuth.emailDigitado,
        area: `${areaSigla} - ${areaNome}`,
        area_id: areaIdNum
      });
      state.salvarJogadorLocal();

      fluxoAuth.etapa = 'logado';
      fluxoAuth.erro = '';
      fluxoAuth.info = '';
      reRender();
    };
  }

  // 5. Logout
  const btnLogout = container.querySelector('#btn-logout');
  if (btnLogout) {
    btnLogout.onclick = async () => {
      await Api.logout();
      state.set({
        jogador: '',
        email: '',
        area: '',
        area_id: null
      });
      state.salvarJogadorLocal();
      state.limparSessaoLocal();

      fluxoAuth = {
        etapa: 'email',
        emailDigitado: '',
        codigoDigitado: '',
        erro: '',
        info: 'Sessão encerrada com sucesso.'
      };
      reRender();
    };
  }

  // 6. Botão JOGAR AGORA
  const btnJogar = container.querySelector('#btn-jogar');
  if (btnJogar) {
    btnJogar.onclick = () => {
      const currentState = state.get();

      // Validação de autenticação prévia
      if (!currentState.email || !currentState.jogador || !currentState.area) {
        fluxoAuth.erro = 'Por favor, conecte-se com seu e-mail institucional antes de iniciar a partida.';
        reRender();
        const cardAuth = container.querySelector('#card-identificacao');
        if (cardAuth) cardAuth.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      // 1ª barreira: Termo de privacidade aceito?
      if (!currentState.termo_privacidade_aceito) {
        abrirModalPrivacidade({
          onAceitar: () => {
            verificarTutorialESeguir();
          }
        });
        return;
      }

      verificarTutorialESeguir();
    };
  }

  function verificarTutorialESeguir() {
    const currentState = state.get();
    // 2ª barreira: Tutorial visto?
    if (!currentState.tutorial_visto) {
      abrirModalTutorial({
        onConcluir: () => {
          iniciarPartidaENavegar();
        }
      });
      return;
    }

    iniciarPartidaENavegar();
  }

  async function iniciarPartidaENavegar() {
    const currentState = state.get();
    let cartas = [];
    try {
      cartas = await Api.carregarCartas(semanaAtual());
      if (!cartas || cartas.length === 0) {
        cartas = await carregarCartas();
      }
    } catch (e) {
      console.warn('Erro ao carregar cartas para a partida:', e);
      cartas = await carregarCartas();
    }
    state.novaPartida({
      jogador: currentState.jogador,
      area: currentState.area,
      area_id: currentState.area_id,
      partida_vale_ranking: currentState.partida_vale_ranking,
      cartas
    });
    navigateRef('tabuleiro');
  }

  // 7. Botão Ver Ranking
  const btnRanking = container.querySelector('#btn-ver-ranking');
  if (btnRanking) {
    btnRanking.onclick = () => {
      navigateRef('ranking');
    };
  }

  // 8. Botão Como Jogar (Rever Tutorial)
  const btnTutorial = container.querySelector('#btn-abrir-tutorial');
  if (btnTutorial) {
    btnTutorial.onclick = () => {
      abrirModalTutorial({ forcarAbertura: true });
    };
  }

  // 9. Botão Privacidade & LGPD (Consultar Termo)
  const btnPrivacidade = container.querySelector('#btn-abrir-privacidade');
  if (btnPrivacidade) {
    btnPrivacidade.onclick = () => {
      abrirModalPrivacidade({ somenteLeitura: true });
    };
  }
}

export function desmontar(container) {
  // Limpeza de referências
}
