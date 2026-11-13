import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fallback de contingência caso a tabela remota de cartas ainda não esteja populada
const CARTAS_FALLBACK_BASE: Record<string, any> = {
  "pa_001": { categoria: "pense_antes", opcoes: [{ tokens: 4, correta: true, bonus_pense_antes: true }, { tokens: -3, correta: false }] },
  "pa_002": { categoria: "pense_antes", opcoes: [{ tokens: 3, correta: true, bonus_pense_antes: false }, { tokens: -4, correta: false }] },
  "pa_003": { categoria: "pense_antes", opcoes: [{ tokens: 4, correta: true, bonus_pense_antes: true }, { tokens: -2, correta: false }] },
  "pa_004": { categoria: "pense_antes", opcoes: [{ tokens: 3, correta: true, bonus_pense_antes: true }, { tokens: -2, correta: false }] },
  "pa_005": { categoria: "pense_antes", opcoes: [{ tokens: 3, correta: true, bonus_pense_antes: false }, { tokens: -3, correta: false }] },
  "pa_006": { categoria: "pense_antes", opcoes: [{ tokens: 4, correta: true, bonus_pense_antes: true }, { tokens: -3, correta: false }] },
  "pa_007": { categoria: "pense_antes", opcoes: [{ tokens: 4, correta: true, bonus_pense_antes: true }, { tokens: -5, correta: false }] },
  "bp_001": { categoria: "boa_pratica", efeito: { tokens: 4 } },
  "bp_002": { categoria: "boa_pratica", efeito: { tokens: 4 } },
  "bp_003": { categoria: "boa_pratica", efeito: { tokens: 3 } },
  "bp_004": { categoria: "boa_pratica", efeito: { tokens: 3 } },
  "bp_005": { categoria: "boa_pratica", efeito: { tokens: 4 } },
  "bp_006": { categoria: "boa_pratica", efeito: { tokens: 3 } },
  "bp_007": { categoria: "boa_pratica", efeito: { tokens: 4 } },
  "arm_001": { categoria: "armadilha", efeito: { tokens: -5, armadilha: true } },
  "arm_002": { categoria: "armadilha", efeito: { tokens: -4, armadilha: true } },
  "arm_003": { categoria: "armadilha", efeito: { tokens: -4, armadilha: true } },
  "arm_004": { categoria: "armadilha", efeito: { tokens: -3, armadilha: true } },
  "arm_005": { categoria: "armadilha", efeito: { tokens: -4, armadilha: true } },
  "arm_006": { categoria: "armadilha", efeito: { tokens: -5, armadilha: true } },
  "arm_007": { categoria: "armadilha", efeito: { tokens: -3, armadilha: true } },
  "des_001": { categoria: "desafio", opcoes: [{ tokens: 4, correta: true }, { tokens: -2, correta: false }, { tokens: -2, correta: false }] },
  "des_002": { categoria: "desafio", opcoes: [{ tokens: 4, correta: true }, { tokens: -3, correta: false }, { tokens: -2, correta: false }] },
  "des_003": { categoria: "desafio", opcoes: [{ tokens: 4, correta: true }, { tokens: -2, correta: false }, { tokens: -2, correta: false }] },
  "des_004": { categoria: "desafio", opcoes: [{ tokens: 4, correta: true }, { tokens: -2, correta: false }] },
  "des_005": { categoria: "desafio", opcoes: [{ tokens: 4, correta: true }, { tokens: -3, correta: false }] },
  "des_006": { categoria: "desafio", opcoes: [{ tokens: 4, correta: true }, { tokens: -4, correta: false }] },
  "des_007": { categoria: "desafio", opcoes: [{ tokens: 4, correta: true }, { tokens: -3, correta: false }] },
  "con_001": { categoria: "conexao", efeito: { tokens: 4 } },
  "con_002": { categoria: "conexao", efeito: { tokens: 4 } },
  "con_003": { categoria: "conexao", efeito: { tokens: 3 } },
  "con_004": { categoria: "conexao", efeito: { tokens: 4 } },
  "con_005": { categoria: "conexao", efeito: { tokens: 3 } },
  "con_006": { categoria: "conexao", efeito: { tokens: 4 } },
  "con_007": { categoria: "conexao", efeito: { tokens: 3 } },
  "evt_001": { categoria: "evento", efeito: { tokens: 4 } },
  "evt_002": { categoria: "evento", efeito: { tokens: 3 } },
  "evt_003": { categoria: "evento", efeito: { tokens: 4 } },
  "evt_004": { categoria: "evento", efeito: { tokens: 3 } },
  "evt_005": { categoria: "evento", efeito: { tokens: 4 } },
  "evt_006": { categoria: "evento", efeito: { tokens: -2 } },
  "evt_007": { categoria: "evento", efeito: { tokens: 5 } }
};

function calcularSemanasPermitidas(): string[] {
  const agora = new Date();
  const calcularISO = (d: Date) => {
    const data = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const diaNum = data.getUTCDay() || 7;
    data.setUTCDate(data.getUTCDate() + 4 - diaNum);
    const anoInicio = new Date(Date.UTC(data.getUTCFullYear(), 0, 1));
    const semanaNum = Math.ceil((((data.getTime() - anoInicio.getTime()) / 86400000) + 1) / 7);
    return `${data.getUTCFullYear()}-W${String(semanaNum).padStart(2, "0")}`;
  };

  const semanaAtual = calcularISO(agora);
  const dataSemanaPassada = new Date(agora.getTime() - (7 * 24 * 60 * 60 * 1000));
  const semanaAnterior = calcularISO(dataSemanaPassada);
  return [semanaAtual, semanaAnterior];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ erro: "Cabeçalho de autorização ausente." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // 1. Valida o usuário com o token enviado
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ erro: "Sessão inválida ou expirada." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const historico = body.historico || [];
    const semana = String(body.semana || "");
    const versaoCartas = String(body.versao_cartas || "1.0");
    const jogadaEm = body.jogada_em ? new Date(body.jogada_em).toISOString() : new Date().toISOString();

    // 2. Validações de Rejeição Estritas
    if (!Array.isArray(historico) || historico.length === 0) {
      return new Response(JSON.stringify({ erro: "Histórico de jogadas vazio ou ausente." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (historico.length > 35) {
      return new Response(JSON.stringify({ erro: "Número de jogadas excede o limite máximo permitido por partida (35)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const formatoSemanaValido = /^[0-9]{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$/.test(semana);
    if (!formatoSemanaValido) {
      return new Response(JSON.stringify({ erro: `Formato de semana inválido: ${semana}.` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const semanasValidas = calcularSemanasPermitidas();
    if (!body.dry_run && !semanasValidas.includes(semana)) {
      return new Response(JSON.stringify({ erro: `Semana ${semana} inválida. Permitidas: ${semanasValidas.join(", ")}.` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Busca perfil oficial do jogador vinculado
    const { data: jogador, error: jogError } = await supabaseAdmin
      .from("jogadores")
      .select("id, area_id, nome")
      .eq("user_id", user.id)
      .single();

    if (jogError || !jogador) {
      return new Response(JSON.stringify({ erro: "Perfil de colaborador não cadastrado. Complete seu perfil primeiro." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 4. Carrega cartas ativas da semana (ou fallback)
    let dicionarioCartas: Record<string, any> = { ...CARTAS_FALLBACK_BASE };
    const { data: cartasRemotas } = await supabaseAdmin
      .from("cartas")
      .select("json")
      .eq("ativa", true)
      .lte("semana_inicio", semana)
      .gte("semana_fim", semana)
      .limit(1);

    if (cartasRemotas && cartasRemotas.length > 0 && Array.isArray(cartasRemotas[0].json)) {
      dicionarioCartas = {};
      for (const c of cartasRemotas[0].json) {
        if (c && c.id) dicionarioCartas[c.id] = c;
      }
    }

    // 5. Recalcula os pontos item a item no servidor
    let tokens = 20;
    let acertosDesafio = 0;
    let bonusPenseAntes = 0;
    let armadilhas = 0;

    for (let i = 0; i < historico.length; i++) {
      const item = historico[i];
      const cartaId = String(item.carta_id || "");
      const opIdx = Number(item.opcao_index ?? 0);

      const carta = dicionarioCartas[cartaId];
      if (!carta) {
        return new Response(JSON.stringify({ erro: `Carta inexistente ou não autorizada no histórico: '${cartaId}'.` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (carta.opcoes && Array.isArray(carta.opcoes) && carta.opcoes.length > 0) {
        if (opIdx < 0 || opIdx >= carta.opcoes.length) {
          return new Response(JSON.stringify({ erro: `Índice de opção inválido (${opIdx}) para a carta '${cartaId}'.` }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        const opcao = carta.opcoes[opIdx];
        tokens += Number(opcao.tokens || 0);

        if (carta.categoria === "desafio" && opcao.correta === true) {
          acertosDesafio++;
        }
        if (opcao.bonus_pense_antes === true) {
          bonusPenseAntes++;
        }
      } else if (carta.efeito) {
        tokens += Number(carta.efeito.tokens || 0);
        if (carta.categoria === "armadilha" || carta.efeito.armadilha === true) {
          armadilhas++;
        }
      }
    }

    // Bônus oficiais dos checkpoints: Casa 10 (+3), Casa 20 (+5), Casa 30 (+0)
    tokens += 3 + 5;
    tokens = Math.max(0, tokens);

    // Mesma fórmula exata do GameState.gd
    const ptsTokens = tokens * 10;
    const ptsDesafios = acertosDesafio * 50;
    const ptsPenseAntes = bonusPenseAntes * 30;
    const bonusZeroArmadilhas = armadilhas === 0 ? 100 : 0;
    const pontosFinais = Math.max(0, ptsTokens + ptsDesafios + ptsPenseAntes + bonusZeroArmadilhas);

    // MODO DRY_RUN: Calcula e devolve os pontos SEM gravar no banco
    if (body.dry_run === true) {
      return new Response(JSON.stringify({
        sucesso: true,
        dry_run: true,
        pontos_oficiais: pontosFinais,
        tokens_finais: tokens,
        acertos: acertosDesafio,
        armadilhas: armadilhas,
        bonus_pense_antes: bonusPenseAntes,
        conta_ranking: false
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 6. Grava com a pontuação auditada do SERVIDOR e jogada_em
    const { data: partida, error: partidaError } = await supabaseAdmin
      .from("partidas")
      .insert({
        jogador_id: jogador.id,
        area_id: jogador.area_id,
        pontos: pontosFinais,
        acertos: acertosDesafio,
        armadilhas: armadilhas,
        bonus_pense_antes: bonusPenseAntes,
        semana: semana,
        versao_cartas: versaoCartas,
        historico: historico,
        jogada_em: jogadaEm
      })
      .select("id, pontos, conta_ranking")
      .single();

    if (partidaError) {
      return new Response(JSON.stringify({ erro: "Erro ao gravar partida: " + partidaError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 7. Devolve a pontuação oficial do servidor
    return new Response(JSON.stringify({
      sucesso: true,
      partida_id: partida.id,
      pontos_oficiais: partida.pontos,
      acertos: acertosDesafio,
      armadilhas: armadilhas,
      conta_ranking: partida.conta_ranking
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ erro: "Erro interno no servidor: " + String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
