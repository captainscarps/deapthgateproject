-- ==============================================================================
-- TRILHA INTELIGENTE - SCHEMA FINAL CONSOLIDADO (SUPABASE / POSTGRESQL)
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELA DE ÁREAS
CREATE TABLE IF NOT EXISTS public.areas (
    id SERIAL PRIMARY KEY,
    sigla VARCHAR(10) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL
);

INSERT INTO public.areas (id, sigla, nome) VALUES
    (1, 'TI', 'Tecnologia da Informação & BI'),
    (2, 'JUR', 'Jurídico, Compliance & LGPD'),
    (3, 'RH', 'Gestão de Pessoas'),
    (4, 'OPE', 'Operações & Transporte'),
    (5, 'SAU', 'Saúde & Odontologia'),
    (6, 'EDU', 'Educação & Formação Profissional'),
    (7, 'ADM', 'Administrativo & Financeiro')
ON CONFLICT (id) DO UPDATE SET sigla = EXCLUDED.sigla, nome = EXCLUDED.nome;

-- 3. VALIDAÇÃO DE E-MAIL INSTITUCIONAL NO AUTH
CREATE OR REPLACE FUNCTION public.validar_email_institucional()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.email NOT ILIKE '%@sestsenat.org.br' THEN
        RAISE EXCEPTION 'Acesso restrito: apenas e-mails @sestsenat.org.br são permitidos.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_email_auth ON auth.users;
CREATE TRIGGER trg_validar_email_auth
    BEFORE INSERT OR UPDATE OF email ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.validar_email_institucional();

-- 4. TABELA DE JOGADORES
CREATE TABLE IF NOT EXISTS public.jogadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    area_id INT NOT NULL REFERENCES public.areas(id) ON DELETE RESTRICT,
    email TEXT NOT NULL CHECK (email ILIKE '%@sestsenat.org.br'),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_jogadores_user_id ON public.jogadores(user_id);

-- TRIGGER: TRAVAR ÁREA INSTITUCIONAL APÓS DEFINIDA
CREATE OR REPLACE FUNCTION public.impedir_alteracao_area()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF OLD.area_id IS NOT NULL AND NEW.area_id != OLD.area_id AND current_user != 'service_role' THEN
        RAISE EXCEPTION 'A área institucional já foi definida e não pode ser alterada pelo colaborador.';
    END IF;
    NEW.atualizado_em := timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_impedir_alteracao_area ON public.jogadores;
CREATE TRIGGER trg_impedir_alteracao_area
    BEFORE UPDATE ON public.jogadores
    FOR EACH ROW EXECUTE FUNCTION public.impedir_alteracao_area();

-- 5. TABELA DE PARTIDAS
CREATE TABLE IF NOT EXISTS public.partidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jogador_id UUID NOT NULL REFERENCES public.jogadores(id) ON DELETE CASCADE,
    area_id INT NOT NULL REFERENCES public.areas(id) ON DELETE RESTRICT,
    pontos INT NOT NULL CHECK (pontos >= 0 AND pontos <= 2000),
    acertos INT NOT NULL DEFAULT 0 CHECK (acertos >= 0),
    armadilhas INT NOT NULL DEFAULT 0 CHECK (armadilhas >= 0),
    bonus_pense_antes INT NOT NULL DEFAULT 0 CHECK (bonus_pense_antes >= 0),
    semana TEXT NOT NULL CHECK (semana ~ '^[0-9]{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$'),
    versao_cartas TEXT NOT NULL DEFAULT '1.0',
    historico JSONB NOT NULL DEFAULT '[]'::jsonb,
    conta_ranking BOOLEAN NOT NULL DEFAULT false,
    jogada_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_partidas_semana ON public.partidas(semana);
CREATE INDEX IF NOT EXISTS idx_partidas_jogada_em ON public.partidas(jogada_em);

-- CONSTRAINT ÚNICA: Apenas UMA partida oficial por jogador por semana
CREATE UNIQUE INDEX IF NOT EXISTS idx_partidas_unica_ranking_semana 
    ON public.partidas (jogador_id, semana) 
    WHERE conta_ranking = true;

-- TRIGGER DE RANKING JUSTO BASEADO EM JOGADA_EM
CREATE OR REPLACE FUNCTION public.definir_partida_ranking_ou_treino()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.partidas 
        WHERE jogador_id = NEW.jogador_id 
          AND semana = NEW.semana 
          AND conta_ranking = true
          AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
        NEW.conta_ranking := true;
    ELSE
        NEW.conta_ranking := false;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_definir_partida_ranking ON public.partidas;
CREATE TRIGGER trg_definir_partida_ranking
    BEFORE INSERT ON public.partidas
    FOR EACH ROW EXECUTE FUNCTION public.definir_partida_ranking_ou_treino();

-- 6. TABELA DE CARTAS REMOTAS DA SEMANA
CREATE TABLE IF NOT EXISTS public.cartas (
    id TEXT PRIMARY KEY,
    semana_inicio TEXT NOT NULL CHECK (semana_inicio ~ '^[0-9]{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$'),
    semana_fim TEXT NOT NULL CHECK (semana_fim ~ '^[0-9]{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$'),
    versao TEXT NOT NULL DEFAULT '1.0',
    json JSONB NOT NULL,
    ativa BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. FUNÇÕES RPC COM SECURITY DEFINER (RESOLVEM A PRIVACIDADE DA RLS)
-- Com RLS rigorosa onde cada usuário só vê a própria linha em partidas/jogadores,
-- funções RPC SECURITY DEFINER com search_path fixo permitem retornar os rankings
-- consolidados de todas as áreas e participantes, expondo apenas dados públicos.

CREATE OR REPLACE FUNCTION public.get_ranking_areas(p_semana TEXT)
RETURNS TABLE (
    posicao BIGINT,
    semana TEXT,
    area_sigla VARCHAR(10),
    area_nome VARCHAR(100),
    pontuacao_media NUMERIC,
    total_jogadores BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    WITH pontuacoes AS (
        SELECT
            p.semana,
            p.area_id,
            p.jogador_id,
            p.pontos AS pontuacao_oficial
        FROM public.partidas p
        WHERE p.conta_ranking = true AND p.semana = p_semana
    )
    SELECT
        DENSE_RANK() OVER (ORDER BY ROUND(AVG(pts.pontuacao_oficial), 2) DESC) AS posicao,
        pts.semana,
        a.sigla AS area_sigla,
        a.nome AS area_nome,
        ROUND(AVG(pts.pontuacao_oficial), 2) AS pontuacao_media,
        COUNT(DISTINCT pts.jogador_id) AS total_jogadores
    FROM pontuacoes pts
    INNER JOIN public.areas a ON a.id = pts.area_id
    GROUP BY pts.semana, pts.area_id, a.sigla, a.nome
    HAVING COUNT(DISTINCT pts.jogador_id) >= 3;
$$;

CREATE OR REPLACE FUNCTION public.get_ranking_area(p_semana TEXT, p_area_id INT)
RETURNS TABLE (
    posicao_area BIGINT,
    jogador_nome TEXT,
    area_sigla VARCHAR(10),
    area_nome VARCHAR(100),
    pontos INT,
    acertos INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT
        DENSE_RANK() OVER (ORDER BY p.pontos DESC) AS posicao_area,
        j.nome AS jogador_nome,
        a.sigla AS area_sigla,
        a.nome AS area_nome,
        p.pontos,
        p.acertos
    FROM public.partidas p
    INNER JOIN public.jogadores j ON j.id = p.jogador_id
    INNER JOIN public.areas a ON a.id = p.area_id
    WHERE p.conta_ranking = true 
      AND p.semana = p_semana 
      AND p.area_id = p_area_id
    ORDER BY p.pontos DESC;
$$;

-- 8. ROW LEVEL SECURITY (RLS) RIGOROSA

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jogadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "areas_select_policy" ON public.areas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cartas_select_policy" ON public.cartas FOR SELECT TO anon, authenticated USING (ativa = true);

-- Cada colaborador só lê e edita seu PRÓPRIO registro
CREATE POLICY "jogadores_select_proprio" ON public.jogadores FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "jogadores_insert_proprio" ON public.jogadores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "jogadores_update_proprio" ON public.jogadores FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Cada colaborador só lê as suas próprias partidas
CREATE POLICY "partidas_select_proprio" ON public.partidas FOR SELECT TO authenticated
    USING (jogador_id IN (SELECT id FROM public.jogadores WHERE user_id = auth.uid()));

CREATE POLICY "partidas_insert_proprio" ON public.partidas FOR INSERT TO authenticated
    WITH CHECK (jogador_id IN (SELECT id FROM public.jogadores WHERE user_id = auth.uid()));

-- GRANTS DE EXECUÇÃO DAS FUNÇÕES RPC DE RANKING
GRANT EXECUTE ON FUNCTION public.get_ranking_areas(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ranking_area(TEXT, INT) TO anon, authenticated;

-- 9. TABELA DE PARTIDAS DE CONVIDADOS (Dados Anônimos para Aprimoramento Pedagógico)
CREATE TABLE IF NOT EXISTS public.partidas_convidado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id INT REFERENCES public.areas(id) ON DELETE SET NULL,
    pontos INT NOT NULL CHECK (pontos >= 0 AND pontos <= 2000),
    acertos INT NOT NULL DEFAULT 0 CHECK (acertos >= 0),
    armadilhas INT NOT NULL DEFAULT 0 CHECK (armadilhas >= 0),
    bonus_pense_antes INT NOT NULL DEFAULT 0 CHECK (bonus_pense_antes >= 0),
    historico JSONB NOT NULL DEFAULT '[]'::jsonb,
    jogada_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.partidas_convidado ENABLE ROW LEVEL SECURITY;
-- RLS ESTRITA: Nenhuma permissão de SELECT para frontends públicos (anon/authenticated).
-- Inserção é feita EXCLUSIVAMENTE pela Edge Function registrar-partida-convidado (via service_role).
-- Funções de ranking NÃO consultam esta tabela sob nenhuma hipótese.
