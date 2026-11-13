// js/ui/inicio.js - Tela de Início, Modo Convidado e Autenticação de Colaborador
import { state } from '../state.js';
import { semanaAtual, carregarCartas } from '../deck.js';
import { Api } from '../api.js';
import { abrirModalPrivacidade } from './privacidade.js';
import { abrirModalTutorial } from './tutorial.js';
import { renderAvatarSVG, AVATAR_PADRAO, gerarAvatarAleatorio } from '../avatar.js';
import { abrirCriadorAvatar } from './avatar_criador.js';

let containerRef = null;
let navigateRef = null;

// Estado transitório local do formulário de autenticação
let fluxoAuth = {
  etapa: 'email', // 'email' | 'otp' | 'perfil' | 'logado'
  emailDigitado: '',
  codigoDigitado: '',
  erro: '',
  info: ''
};

function formatarSemanaExibicao(semanaIso) {
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

  if (estaLogado && fluxoAuth.etapa !== 'logado') {
    fluxoAuth.etapa = 'logado';
  }

  const valeRanking = currentState.partida_vale_ranking !== false;

  return `
    <div class="tela-inicio fade-in">
      
      <!-- COLUNA ESQUERDA: APRESENTAÇÃO & ILUSTRAÇÃO DO TABULEIRO / DADINHO -->
      <div class="inicio-coluna-esquerda">
        <!-- HERO COM SEMANA E STATUS -->
        <section class="inicio-hero painel-arcade">
          <span class="parafuso-canto top-left"></span>
          <span class="parafuso-canto top-right"></span>
          <span class="parafuso-canto bottom-left"></span>
          <span class="parafuso-canto bottom-right"></span>

          <div class="semana-tag">
            <span>📅</span>
            <span>${semFormatada}</span>
          </div>
          
          <h2 style="font-family: var(--font-title); font-size: 1.85rem; color: var(--cyan); margin-top: 6px; font-weight: 900; text-transform: uppercase;">
            Trilha Inteligente • Governança de IA
          </h2>

          <p class="inicio-desc" style="margin-top: 8px;">
            Partida rápida de <strong>5 a 8 minutos</strong>. Navegue pela Cidade dos Dados, responda situações reais sobre IA ética, proteção de dados corporativos e LGPD no <strong>SEST SENAT</strong>.
          </p>

          <!-- DADINHO NA CIDADE DOS DADOS -->
          <div style="background: var(--navy-darkest); border: 2px solid var(--navy-card); border-radius: 10px; padding: 14px; margin-top: 14px; display: flex; align-items: center; gap: 14px;">
            <div style="width: 58px; height: 64px; flex-shrink: 0;">
              <svg viewBox="0 0 48 54" fill="none" style="width: 100%; height: 100%;">
                <ellipse cx="24" cy="50" rx="16" ry="3.5" fill="#05101F" opacity="0.65"/>
                <rect x="14" y="42" width="6" height="8" rx="3" fill="#05101F"/>
                <rect x="28" y="42" width="6" height="8" rx="3" fill="#05101F"/>
                <rect x="6" y="8" width="36" height="36" rx="8" fill="#00B4D8" stroke="#05101F" stroke-width="3"/>
                <path d="M10 12 H38" stroke="#90E0EF" stroke-width="2" stroke-linecap="round"/>
                <circle cx="10" cy="15" r="2" fill="#FFFFFF" stroke="#05101F" stroke-width="1"/>
                <circle cx="38" cy="15" r="2" fill="#FFFFFF" stroke="#05101F" stroke-width="1"/>
                <ellipse cx="18" cy="25" rx="3.5" ry="4.5" fill="#FFFFFF" stroke="#05101F" stroke-width="1.5"/>
                <circle cx="19" cy="24.5" r="2" fill="#05101F"/>
                <ellipse cx="30" cy="25" rx="3.5" ry="4.5" fill="#FFFFFF" stroke="#05101F" stroke-width="1.5"/>
                <circle cx="29" cy="24.5" r="2" fill="#05101F"/>
                <path d="M21 31 Q24 33.5 27 31" stroke="#05101F" stroke-width="2" stroke-linecap="round" fill="none"/>
              </svg>
            </div>
            <div style="text-align: left; font-size: 0.88rem; color: var(--text-muted); line-height: 1.35;">
              <div style="font-family: var(--font-pixel); color: var(--gold); font-size: 0.82rem; margin-bottom: 2px;">GUIA DO DADINHO:</div>
              Jogue os dados, passe pelos 3 checkpoints e alcance o portal Guardião dos Dados com o maior número de tokens.
            </div>
          </div>
        </section>

        <!-- AÇÕES GERAIS -->
        <section class="inicio-acoes" style="margin-top: 14px;">
          <button id="btn-ver-ranking" class="btn btn-secondary btn-block">
            🏅 VER RANKING SEMANAL
          </button>
        </section>

        <!-- LINKS SECUNDÁRIOS -->
        <section class="inicio-links-secundarios" style="display: flex; justify-content: center; gap: 14px; margin-top: 12px;">
          <button id="btn-abrir-tutorial" class="btn btn-outline btn-sm">
            💡 Como Jogar
          </button>
          <button id="btn-abrir-privacidade" class="btn btn-outline btn-sm">
            🛡️ Privacidade &amp; LGPD
          </button>
        </section>
      </div>

      <!-- COLUNA DIREITA: CARDS DE OPÇÃO (CONVIDADO X LOGIN) -->
      <div class="inicio-coluna-direita">
        ${estaLogado ? `
          <!-- SE COLABORADOR JÁ ESTIVER LOGADO -->
          <section class="colaborador-card painel-arcade" id="card-identificacao">
            <span class="parafuso-canto top-left"></span>
            <span class="parafuso-canto top-right"></span>
            <span class="parafuso-canto bottom-left"></span>
            <span class="parafuso-canto bottom-right"></span>
            ${renderCardAutenticado(currentState, valeRanking)}
          </section>

          <section class="card" style="margin-top: 12px; background: rgba(16, 38, 68, 0.6); border: 2px dashed var(--navy-darkest); padding: 14px; text-align: center;">
            <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 8px;">
              Quer praticar sem valer para a sua pontuação semanal?
            </p>
            <button id="btn-jogar-convidado-alt" class="btn btn-secondary btn-sm" style="margin: 0 auto;">
              🎲 Jogar Trilha Aleatória como Convidado
            </button>
          </section>

        ` : `
          <!-- DOIS CAMINHOS CLAROS (CONVIDADO X COLABORADOR) -->
          <section class="caminhos-inicio-grid" style="margin: 0;">
            
            <!-- CAMINHO 1: MODO CONVIDADO -->
            <div class="card-caminho destaque-convidado painel-arcade">
              <span class="parafuso-canto top-left"></span>
              <span class="parafuso-canto top-right"></span>
              <div>
                <div class="card-caminho-topo">
                  <span class="card-caminho-icone">🎲</span>
                  <div>
                    <h3 class="card-caminho-titulo" style="font-family: var(--font-title); font-size: 1.3rem;">Jogar como Convidado</h3>
                    <span class="badge badge-treino" style="font-size: 0.75rem;">Sem Cadastro • Não Pontua</span>
                  </div>
                </div>
                <p class="card-caminho-desc" style="margin-top: 8px;">
                  Trilha gerada com desafios aleatórios a cada partida. Ideal para praticar sem registrar pontuação no ranking.
                </p>

                <!-- PREVIEW DO PERSONAGEM DO CONVIDADO -->
                <div style="display: flex; align-items: center; gap: 12px; margin-top: 12px; background: rgba(5, 16, 31, 0.6); padding: 10px; border-radius: 8px; border: 1px solid var(--navy-card);">
                  <div class="avatar-busto-moldura" style="width: 58px; height: 58px; flex-shrink: 0;" title="Miniatura do Convidado">
                    ${renderAvatarSVG(currentState.avatar || AVATAR_PADRAO, { modo: 'busto', tamanho: 58 })}
                  </div>
                  <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                    <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Seu Avatar Chibi 3D</div>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                      <button id="btn-avatar-aleatorio-convidado" type="button" class="btn btn-secondary btn-sm" style="font-size: 0.78rem; padding: 4px 8px;">
                        🎲 Aleatório
                      </button>
                      <button id="btn-customizar-avatar-convidado" type="button" class="btn btn-outline btn-sm" style="font-size: 0.78rem; padding: 4px 8px;">
                        🎨 Personalizar
                      </button>
                    </div>
                  </div>
                </div>

                <div class="form-group" style="margin-top: 12px;">
                  <label class="form-label" for="select-area-convidado">Sua Área de Atuação (Opcional)</label>
                  <select id="select-area-convidado" class="form-select">
                    <option value="">Carregando áreas...</option>
                  </select>
                </div>
              </div>

              <button id="btn-jogar-convidado" class="btn btn-primary btn-block" style="font-size: 1.15rem; padding: 14px; margin-top: 10px;">
                🎲 Iniciar como Convidado
              </button>
            </div>

            <!-- CAMINHO 2: ENTRAR COM E-MAIL INSTITUCIONAL -->
            <div class="card-caminho destaque-colaborador painel-arcade" id="card-identificacao">
              <span class="parafuso-canto top-left"></span>
              <span class="parafuso-canto top-right"></span>
              <div>
                <div class="card-caminho-topo">
                  <span class="card-caminho-icone">🏛️</span>
                  <div>
                    <h3 class="card-caminho-titulo" style="font-family: var(--font-title); font-size: 1.3rem;">Colaborador SEST SENAT</h3>
                    <span class="badge badge-oficial" style="font-size: 0.75rem;">Desafio Semanal • Vale Ranking</span>
                  </div>
                </div>
                
                <div style="margin-top: 8px;">
                  ${renderFormularioAutenticacao(currentState)}
                </div>
              </div>
            </div>

          </section>
        `}
      </div>

    </div>
  `;
}

function renderCardAutenticado(currentState, valeRanking) {
  const avatarSvg = renderAvatarSVG(currentState.avatar || AVATAR_PADRAO, { modo: 'busto', tamanho: 72 });
  return `
    <div class="colaborador-header" style="align-items: center; gap: 12px;">
      <div class="avatar-busto-moldura grande" style="width: 72px; height: 72px; flex-shrink: 0;" title="Seu Personagem">
        ${avatarSvg}
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 0.82rem; color: var(--text-muted); text-transform: uppercase;">Colaborador Conectado</div>
        <div class="colaborador-nome" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${currentState.jogador}</div>
        <button id="btn-editar-avatar" class="btn btn-outline btn-sm" style="margin-top: 4px; padding: 3px 8px; font-size: 0.78rem;">
          🎨 Personalizar Personagem
        </button>
      </div>
      <button id="btn-logout" class="btn btn-secondary btn-sm" title="Desconectar sessão">
        Sair
      </button>
    </div>

    <div class="colaborador-area-lock" style="margin-top: 10px;">
      <span class="badge badge-area">
        🏛️ ${currentState.area}
      </span>
      <span class="lock-icon" title="Área vinculada ao perfil institucional">🔒 Área Fixada</span>
    </div>

    <div style="font-size: 0.88rem; color: var(--text-dim); margin-top: 2px;">
      ${currentState.email}
    </div>

    <div style="margin-top: 10px;">
      ${valeRanking ? `
        <span class="badge badge-oficial" style="font-size: 0.85rem; padding: 4px 10px;">
          🏆 1ª PARTIDA DA SEMANA: Vale para o Ranking Oficial
        </span>
      ` : `
        <span class="badge badge-treino" style="font-size: 0.85rem; padding: 4px 10px;">
          🎯 MODO TREINO: Partida oficial da semana já foi enviada
        </span>
      `}
    </div>

    <button id="btn-jogar-oficial" class="btn btn-primary btn-block" style="font-size: 1.25rem; padding: 14px; margin-top: 12px;">
      🚀 JOGAR DESAFIO DA SEMANA
    </button>
  `;
}

function renderFormularioAutenticacao(currentState) {
  const { etapa, erro, info, emailDigitado } = fluxoAuth;

  const mensagemBox = erro ? `
    <div style="background: rgba(239, 71, 111, 0.15); border: 1px solid var(--coral); color: #FFA8BA; padding: 8px 12px; border-radius: 6px; font-size: 0.88rem; margin-bottom: 8px;">
      ⚠️ ${erro}
    </div>
  ` : (info ? `
    <div style="background: rgba(6, 214, 160, 0.15); border: 1px solid var(--green); color: #72F2D1; padding: 8px 12px; border-radius: 6px; font-size: 0.88rem; margin-bottom: 8px;">
      ℹ️ ${info}
    </div>
  ` : '');

  // 1. DIGITAR EMAIL INSTITUCIONAL
  if (etapa === 'email') {
    return `
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 8px;">
        Informe seu e-mail institucional corporativo para pontuar pela sua área.
      </p>

      ${mensagemBox}

      <div class="form-group">
        <label class="form-label" for="input-email-login">E-mail Corporativo</label>
        <input type="email" id="input-email-login" placeholder="seu.nome@sestsenat.org.br" value="${emailDigitado}" />
      </div>

      <button id="btn-enviar-otp" class="btn btn-primary btn-block" style="margin-top: 10px;">
        Continuar com Código de Acesso
      </button>
    `;
  }

  // 2. DIGITAR CÓDIGO OTP (MOCK: 123456)
  if (etapa === 'otp') {
    return `
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 8px;">
        Código enviado para <strong>${emailDigitado}</strong>.
      </p>

      ${mensagemBox}

      <div class="form-group">
        <label class="form-label" for="input-codigo-otp">Código de 6 Dígitos (Mock: 123456)</label>
        <input type="text" id="input-codigo-otp" maxlength="6" placeholder="123456" style="letter-spacing: 4px; font-weight: 700; text-align: center;" />
      </div>

      <div style="display: flex; gap: 8px; margin-top: 10px;">
        <button id="btn-voltar-email" class="btn btn-secondary" style="flex: 1;">Voltar</button>
        <button id="btn-verificar-otp" class="btn btn-primary" style="flex: 2;">Validar Código</button>
      </div>
    `;
  }

  // 3. COMPLETAR PERFIL NA 1ª VEZ
  if (etapa === 'perfil') {
    return `
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 8px;">
        Primeiro acesso! Preencha seu nome e escolha sua área de atuação (ela ficará travada após o cadastro).
      </p>

      ${mensagemBox}

      <div class="form-group">
        <label class="form-label" for="input-nome-perfil">Nome Completo</label>
        <input type="text" id="input-nome-perfil" placeholder="Ex: Rafael Scarpille" />
      </div>

      <div class="form-group">
        <label class="form-label" for="select-area-perfil">Área Institucional</label>
        <select id="select-area-perfil" class="form-select">
          <option value="">Carregando áreas...</option>
        </select>
      </div>

      <button id="btn-salvar-perfil" class="btn btn-success btn-block" style="margin-top: 10px;">
        Salvar e Bloquear Perfil
      </button>
    `;
  }

  return '';
}

export async function montar(container, currentState, navigate) {
  containerRef = container;
  navigateRef = navigate;

  atribuirEventos(container);

  // Carrega opções de áreas para os selects disponíveis
  const areas = await Api.carregarAreas();

  const selectAreaConvidado = container.querySelector('#select-area-convidado');
  if (selectAreaConvidado) {
    selectAreaConvidado.innerHTML = `
      <option value="">-- Selecione sua Área (Opcional) --</option>
      ${areas.map(a => `<option value="${a.id}" data-sigla="${a.sigla}" data-nome="${a.nome}">${a.sigla} - ${a.nome}</option>`).join('')}
    `;
  }

  const selectAreaPerfil = container.querySelector('#select-area-perfil');
  if (selectAreaPerfil) {
    selectAreaPerfil.innerHTML = `
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
}

function reRender() {
  if (containerRef && navigateRef) {
    containerRef.innerHTML = render(state.get());
    montar(containerRef, state.get(), navigateRef);
  }
}

function atribuirEventos(container) {
  // A. AÇÃO: JOGAR COMO CONVIDADO
  const handlerJogarConvidado = async (btn) => {
    btn.disabled = true;
    btn.textContent = 'Carregando trilha...';

    const selArea = container.querySelector('#select-area-convidado');
    let areaId = null;
    let areaNome = 'Convidado';

    if (selArea && selArea.value) {
      areaId = Number(selArea.value);
      const opt = selArea.selectedOptions ? selArea.selectedOptions[0] : null;
      if (opt && opt.dataset.nome) {
        areaNome = `${opt.dataset.sigla} - ${opt.dataset.nome}`;
      }
    }

    let cartas = [];
    try {
      cartas = await carregarCartas();
    } catch (e) {
      console.warn('Erro ao carregar cartas locais:', e);
    }

    state.iniciarPartidaConvidado({
      area_id: areaId,
      area: areaNome,
      cartas: cartas
    });

    navigateRef('tabuleiro');
  };

  const btnJogarConvidado = container.querySelector('#btn-jogar-convidado');
  if (btnJogarConvidado) {
    btnJogarConvidado.onclick = () => handlerJogarConvidado(btnJogarConvidado);
  }

  const btnJogarConvidadoAlt = container.querySelector('#btn-jogar-convidado-alt');
  if (btnJogarConvidadoAlt) {
    btnJogarConvidadoAlt.onclick = () => handlerJogarConvidado(btnJogarConvidadoAlt);
  }

  // B. AUTENTICAÇÃO: Enviar OTP
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
      fluxoAuth.info = 'Código de acesso enviado! Utilize o código mock: 123456';
      fluxoAuth.etapa = 'otp';
      reRender();
    };
  }

  // C. Voltar para e-mail
  const btnVoltarEmail = container.querySelector('#btn-voltar-email');
  if (btnVoltarEmail) {
    btnVoltarEmail.onclick = () => {
      fluxoAuth.etapa = 'email';
      fluxoAuth.erro = '';
      fluxoAuth.info = '';
      reRender();
    };
  }

  // D. Validar OTP
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

      const userId = res.user?.id || ('user_mock_' + fluxoAuth.emailDigitado.replace(/[^a-z0-9]/g, '_'));
      const perfilRemoto = await Api.buscarPerfil(userId);

      if (perfilRemoto && perfilRemoto.nome && perfilRemoto.area_id) {
        const areaStr = perfilRemoto.areas ? `${perfilRemoto.areas.sigla} - ${perfilRemoto.areas.nome}` : `Área ${perfilRemoto.area_id}`;
        state.set({
          jogador: perfilRemoto.nome,
          email: fluxoAuth.emailDigitado,
          area: areaStr,
          area_id: perfilRemoto.area_id,
          jogador_id: perfilRemoto.id,
          modo_convidado: false
        });
        state.salvarJogadorLocal();
        fluxoAuth.etapa = 'logado';
        fluxoAuth.erro = '';
        fluxoAuth.info = '';
        reRender();
        return;
      }

      const current = state.get();
      if (current.email === fluxoAuth.emailDigitado && current.jogador && current.area) {
        state.set({ modo_convidado: false });
        fluxoAuth.etapa = 'logado';
        fluxoAuth.erro = '';
        fluxoAuth.info = '';
        reRender();
      } else {
        fluxoAuth.etapa = 'perfil';
        fluxoAuth.erro = '';
        fluxoAuth.info = 'Autenticado! Preencha seu nome e selecione sua área.';
        reRender();
      }
    };
  }

  // E. Salvar Perfil
  const btnSalvarPerfil = container.querySelector('#btn-salvar-perfil');
  if (btnSalvarPerfil) {
    btnSalvarPerfil.onclick = async () => {
      const inputNome = container.querySelector('#input-nome-perfil');
      const selectArea = container.querySelector('#select-area-perfil');

      const nome = inputNome ? inputNome.value.trim() : '';
      const areaId = selectArea ? selectArea.value : '';

      if (!nome) {
        fluxoAuth.erro = 'Por favor, informe seu nome completo.';
        reRender();
        return;
      }
      if (!areaId) {
        fluxoAuth.erro = 'Por favor, selecione sua área de atuação oficial.';
        reRender();
        return;
      }

      const opt = selectArea.selectedOptions[0];
      const areaSigla = opt ? opt.dataset.sigla : 'TI';
      const areaNome = opt ? opt.dataset.nome : 'Tecnologia da Informação';
      const areaIdNum = parseInt(areaId, 10);
      const userId = 'user_mock_' + fluxoAuth.emailDigitado.replace(/[^a-z0-9]/g, '_');

      // Abre o criador de personagem antes de finalizar o primeiro acesso
      abrirCriadorAvatar({
        avatarInicial: state.get().avatar || AVATAR_PADRAO,
        nomeJogador: nome,
        salvarRemoto: false,
        onSalvar: async (avatarCriado) => {
          state.salvarAvatar(avatarCriado);

          const salvouRemoto = await Api.criarPerfil({
            userId,
            nome,
            areaId: areaIdNum,
            email: fluxoAuth.emailDigitado,
            avatar: avatarCriado
          });
          if (salvouRemoto && !salvouRemoto.sucesso && salvouRemoto.erro) {
            fluxoAuth.erro = salvouRemoto.erro;
            reRender();
            return;
          }

          state.set({
            jogador: nome,
            email: fluxoAuth.emailDigitado,
            area: `${areaSigla} - ${areaNome}`,
            area_id: areaIdNum,
            modo_convidado: false,
            avatar: avatarCriado
          });
          state.salvarJogadorLocal();

          fluxoAuth.etapa = 'logado';
          fluxoAuth.erro = '';
          fluxoAuth.info = 'Perfil registrado e personagem salvo com sucesso!';
          reRender();
        }
      });
    };
  }

  // F. Logout
  const btnLogout = container.querySelector('#btn-logout');
  if (btnLogout) {
    btnLogout.onclick = async () => {
      await Api.logout();
      state.set({
        jogador: '',
        email: '',
        area: '',
        area_id: null,
        modo_convidado: false
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

  // F2. Ações de Personalização de Personagem (Avatar)
  const btnEditarAvatar = container.querySelector('#btn-editar-avatar');
  if (btnEditarAvatar) {
    btnEditarAvatar.onclick = () => {
      const cur = state.get();
      abrirCriadorAvatar({
        avatarInicial: cur.avatar || AVATAR_PADRAO,
        nomeJogador: cur.jogador,
        salvarRemoto: true,
        onSalvar: (novoAvatar) => {
          state.salvarAvatar(novoAvatar);
          reRender();
        }
      });
    };
  }

  const btnAvatarAleatorioConvidado = container.querySelector('#btn-avatar-aleatorio-convidado');
  if (btnAvatarAleatorioConvidado) {
    btnAvatarAleatorioConvidado.onclick = () => {
      const randAvatar = gerarAvatarAleatorio();
      state.salvarAvatar(randAvatar);
      reRender();
    };
  }

  const btnCustomizarAvatarConvidado = container.querySelector('#btn-customizar-avatar-convidado');
  if (btnCustomizarAvatarConvidado) {
    btnCustomizarAvatarConvidado.onclick = () => {
      const cur = state.get();
      abrirCriadorAvatar({
        avatarInicial: cur.avatar || AVATAR_PADRAO,
        nomeJogador: cur.jogador || 'Convidado',
        salvarRemoto: false,
        onSalvar: (novoAvatar) => {
          state.salvarAvatar(novoAvatar);
          reRender();
        }
      });
    };
  }

  // G. Botão JOGAR DESAFIO DA SEMANA (Oficial)
  const btnJogarOficial = container.querySelector('#btn-jogar-oficial');
  if (btnJogarOficial) {
    btnJogarOficial.onclick = () => {
      const currentState = state.get();

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
    if (!currentState.tutorial_visto) {
      abrirModalTutorial({
        onConcluir: () => {
          iniciarPartidaOficialENavegar();
        }
      });
      return;
    }
    iniciarPartidaOficialENavegar();
  }

  async function iniciarPartidaOficialENavegar() {
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
      semana: semanaAtual(),
      cartas: cartas,
      modo_convidado: false
    });
    navigateRef('tabuleiro');
  }

  // H. Botões de Navegação Auxiliares
  const btnRanking = container.querySelector('#btn-ver-ranking');
  if (btnRanking) {
    btnRanking.onclick = () => navigateRef('ranking');
  }

  const btnTutorial = container.querySelector('#btn-abrir-tutorial');
  if (btnTutorial) {
    btnTutorial.onclick = () => abrirModalTutorial();
  }

  const btnPrivacidade = container.querySelector('#btn-abrir-privacidade');
  if (btnPrivacidade) {
    btnPrivacidade.onclick = () => abrirModalPrivacidade();
  }
}
