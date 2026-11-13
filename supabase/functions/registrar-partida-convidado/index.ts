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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // 1. Limite de tamanho de payload para prevenir abuso (< 40 KB)
    const rawText = await req.text();
    if (rawText.length > 40000) {
      return new Response(JSON.stringify({ erro: "Payload excede o tamanho máximo permitido (40KB)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let body: any = {};
    try {
      body = JSON.parse(rawText);
    } catch {
      return new Response(JSON.stringify({ erro: "Corpo da requisição deve ser um JSON válido." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const historico = body.historico || [];
    const areaId = (body.area_id !== undefined && body.area_id !== null && body.area_id !== "")
      ? Number(body.area_id)
      : null;
    const jogadaEm = body.jogada_em ? new Date(body.jogada_em).toISOString() : new Date().toISOString();

    // 2. Validações estritas do histórico
    if (!Array.isArray(historico) || historico.length === 0) {
      return new Response(JSON.stringify({ erro: "Histórico de jogadas vazio ou ausente." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (historico.length > 400) {
      return new Response(JSON.stringify({ erro: "Número de jogadas excede o limite máximo permitido por partida (400)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Carrega cartas de contingência / remotas
    let dicionarioCartas: Record<string, any> = { ...CARTAS_FALLBACK_BASE };

    // 4. Recalcula deterministicamente os pontos no servidor
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
        return new Response(JSON.stringify({ erro: `Carta inexistente no baralho: '${cartaId}'.` }), {
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

    const casasAvancadas = Math.max(0, Number(body.casas_avancadas || (historico.length * 3.5)));
    const voltas = Math.max(0, Number(body.voltas || 0));
    const boasPraticas = Math.max(0, Number(body.boas_praticas || 0));

    const ptsCasas = casasAvancadas * 5;
    const ptsVoltas = voltas * 150;
    const ptsDesafios = acertosDesafio * 50;
    const ptsPenseAntes = bonusPenseAntes * 30;
    const ptsBoasPraticas = boasPraticas * 10;
    const penalidadeArmadilhas = armadilhas * 20;

    const pontosFinais = Math.max(0, Math.round(ptsCasas + ptsVoltas + ptsDesafios + ptsPenseAntes + ptsBoasPraticas - penalidadeArmadilhas));

    // MODO DRY_RUN: Devolve sem gravar no banco
    if (body.dry_run === true) {
      return new Response(JSON.stringify({
        sucesso: true,
        dry_run: true,
        modo_convidado: true,
        pontos_oficiais: pontosFinais,
        tokens_finais: tokens,
        acertos: acertosDesafio,
        armadilhas: armadilhas,
        bonus_pense_antes: bonusPenseAntes
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 5. Grava na tabela anônima partidas_convidado via service_role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: partida, error: partidaError } = await supabaseAdmin
      .from("partidas_convidado")
      .insert({
        area_id: (typeof areaId === 'number' && areaId > 0) ? areaId : null,
        pontos: pontosFinais,
        acertos: acertosDesafio,
        armadilhas: armadilhas,
        bonus_pense_antes: bonusPenseAntes,
        historico: historico,
        jogada_em: jogadaEm
      })
      .select("id, pontos")
      .single();

    if (partidaError) {
      return new Response(JSON.stringify({ erro: "Erro ao registrar estatísticas anônimas: " + partidaError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 6. Resposta sem dados pessoais ou vínculo de jogador
    return new Response(JSON.stringify({
      sucesso: true,
      partida_id: partida.id,
      modo_convidado: true,
      pontos_oficiais: partida.pontos,
      acertos: acertosDesafio,
      armadilhas: armadilhas,
      bonus_pense_antes: bonusPenseAntes
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ erro: "Erro interno no servidor: " + String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
