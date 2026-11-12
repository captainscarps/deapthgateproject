// js/config.js - Configurações do Supabase para o Trilha Inteligente
// Se SUPABASE_URL estiver vazia ou for um placeholder, o sistema entra automaticamente em MODO MOCK.
//
// NOTA SOBRE GITHUB PAGES:
// Em SPAs estáticas públicas (como GitHub Pages), a SUPABASE_ANON_KEY é pública por natureza (design do Supabase).
// A segurança real do sistema é garantida pela Row Level Security (RLS) no PostgreSQL, pelas triggers
// e pelas regras da Edge Function (SERVICE_ROLE_KEY nunca fica no frontend).

export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";
