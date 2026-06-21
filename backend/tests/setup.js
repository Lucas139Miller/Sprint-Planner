// ============================================================================
// setup.js — preparação GLOBAL dos testes (roda antes de cada arquivo de teste)
// ============================================================================
// Configurado em jest.config.js -> setupFilesAfterEnv.
//
// Por que aqui e não em cada teste? Para garantir que TODO teste:
//   1. use o banco FAKE em memória (interruptor USE_FAKE_DB) — nunca o Supabase real;
//   2. use um JWT_SECRET fixo e conhecido, para os tokens dos testes baterem
//      com o que o middleware/auth.js espera;
//   3. comece com o banco LIMPO (isolamento — princípio "I" de FIRST).
//
// IMPORTANTE: estas variáveis precisam ser definidas ANTES de qualquer require
// do app/database. Como o Jest carrega este setup antes dos arquivos de teste
// (que é quem dá require no app), a ordem está garantida.
// ============================================================================

process.env.USE_FAKE_DB = '1';
process.env.JWT_SECRET = 'sprint-planner-secret-dev';

const fakeSupabase = require('./fakeSupabase');

// Antes de CADA teste, zera o banco fake. Assim um teste nunca enxerga dados
// deixados por outro (testes isolados e determinísticos).
beforeEach(() => {
  fakeSupabase.__reset();
});
