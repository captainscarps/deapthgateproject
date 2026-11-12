-- ==============================================================================
-- TRILHA INTELIGENTE - SCRIPT DE LIMPEZA DE DADOS DE TESTE (PRÉ-PILOTO)
-- ==============================================================================
-- Execute este script no SQL Editor do Supabase antes do lançamento oficial do piloto.
-- Ele remove todos os registros transitórios de testes, preservando a estrutura,
-- as 7 áreas oficiais e as cartas ativas.

BEGIN;

-- 1. Remove histórico de partidas de teste
TRUNCATE TABLE public.partidas RESTART IDENTITY CASCADE;

-- 2. Remove perfis de colaboradores de teste
TRUNCATE TABLE public.jogadores RESTART IDENTITY CASCADE;

-- 3. Remove usuários de teste criados no Auth do Supabase
-- (Mantém integridade referencial com public.jogadores já limpa)
DELETE FROM auth.users 
WHERE email ILIKE '%@sestsenat.org.br'
   OR email ILIKE '%teste%';

-- 4. Confirmação do estado das tabelas mestre
-- As tabelas 'areas' e 'cartas' NÃO devem ser truncadas!
SELECT 'Áreas cadastradas:' AS status, count(*) AS total FROM public.areas
UNION ALL
SELECT 'Cartas cadastradas:' AS status, count(*) AS total FROM public.cartas
UNION ALL
SELECT 'Partidas restantes (deve ser 0):' AS status, count(*) AS total FROM public.partidas
UNION ALL
SELECT 'Jogadores restantes (deve ser 0):' AS status, count(*) AS total FROM public.jogadores;

COMMIT;
