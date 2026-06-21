// ============================================================================
// helpers.js — utilitários SIMPLES e reutilizáveis para os testes
// ============================================================================
// Objetivo: tirar a "burocracia" repetida de dentro dos testes (criar token,
// semear usuário/projeto/membro) para que cada teste fique curto e focado só
// no que ele quer verificar. São FIXTURES (Cap. 8): dados de apoio padronizados.
// ============================================================================

const jwt = require('jsonwebtoken');
const fakeSupabase = require('./fakeSupabase');

// Mesmo segredo definido em setup.js. Os tokens assinados aqui precisam usar
// exatamente este segredo para o middleware/auth.js conseguir validá-los.
const JWT_SECRET = 'sprint-planner-secret-dev';

// ----------------------------------------------------------------------------
// tokenDe(user) -> string do JWT pronto para o header Authorization.
// O middleware lê { id, username } do payload, então é só isso que assinamos.
// Uso no teste:  .set('Authorization', `Bearer ${tokenDe(user)}`)
// ----------------------------------------------------------------------------
function tokenDe(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
}

// ----------------------------------------------------------------------------
// criarUsuario({ username, email, password? }) -> linha do usuário (com id).
// Semeia direto no fake. O middleware exige que o user exista no banco, então
// quase todo teste autenticado começa criando um usuário com este helper.
// password já vai "fake-hash" porque a maioria dos testes não passa por login.
// ----------------------------------------------------------------------------
function criarUsuario({ username, email, password = 'hash-fake' }) {
  const [user] = fakeSupabase.__seed('sp_users', { username, email, password });
  return user;
}

// ----------------------------------------------------------------------------
// criarProjeto({ name, ownerId, description? }) -> linha do projeto (com id).
// NÃO adiciona membership automaticamente (algumas rotas testam justamente o
// caso "não é membro"). Use criarMembro para isso.
// ----------------------------------------------------------------------------
function criarProjeto({ name, ownerId, description = '' }) {
  const [projeto] = fakeSupabase.__seed('sp_projects', {
    name, description, owner_id: ownerId,
  });
  return projeto;
}

// ----------------------------------------------------------------------------
// criarMembro({ projectId, userId, role? }) -> linha de project_members.
// Atalho para tornar um usuário membro de um projeto (o caso "feliz" das rotas
// protegidas por membership).
// ----------------------------------------------------------------------------
function criarMembro({ projectId, userId, role = 'DEV' }) {
  const [membro] = fakeSupabase.__seed('sp_project_members', {
    project_id: projectId, user_id: userId, role,
  });
  return membro;
}

module.exports = {
  tokenDe,
  criarUsuario,
  criarProjeto,
  criarMembro,
};
