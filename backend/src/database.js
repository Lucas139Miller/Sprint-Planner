// Conexão com Supabase (PostgreSQL gerenciado)
// Antes usávamos SQLite local; agora todos os dados ficam no Supabase
require('dotenv').config();

// ----------------------------------------------------------------------------
// INTERRUPTOR DE BANCO FAKE (para testes e E2E offline)
// ----------------------------------------------------------------------------
// Se a variável de ambiente USE_FAKE_DB === "1", este módulo NÃO conecta no
// Supabase real: ele exporta um fake em memória (tests/fakeSupabase.js) que
// emula a mesma API encadeável do supabase-js. Assim:
//   - os testes rodam com custo zero, offline e de forma determinística;
//   - o mesmo interruptor serve para subir o servidor no E2E sem banco real.
// O if/else abaixo escolhe qual cliente exportar; quando o fake está ligado, o
// cliente real nem é criado (não tenta validar SUPABASE_URL/KEY).
// (Optamos por este interruptor de env em vez de jest.mock espalhado porque
//  é muito mais fácil de explicar: uma variável liga/desliga o fake.)
if (process.env.USE_FAKE_DB === '1') {
  module.exports = require('../tests/fakeSupabase');
} else {
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
}
