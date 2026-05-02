// Conexão com Supabase (PostgreSQL gerenciado)
// Antes usávamos SQLite local; agora todos os dados ficam no Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Variáveis de ambiente vêm do arquivo .env (não commitado por segurança)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('SUPABASE_URL e SUPABASE_KEY são obrigatórios no .env');
}

// Cliente Supabase - usado por todas as rotas para queries
// As tabelas usam prefixo sp_ (sp_users, sp_projects, etc.) para evitar colisões
// com outras tabelas que existem no mesmo projeto Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = supabase;
