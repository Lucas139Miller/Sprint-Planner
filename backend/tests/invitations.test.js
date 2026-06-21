// ============================================================================
// invitations.test.js — testes das rotas de convites (/api/invitations)
// ============================================================================
// O que estas rotas fazem (resumo pros alunos):
//   GET    /api/invitations        -> lista os convites PENDENTES do usuário
//   POST   /api/invitations/:id/accept  -> aceita o convite (o usuário vira membro)
//   POST   /api/invitations/:id/reject  -> rejeita o convite
//
// Padrão usado em TODO teste: AAA (Arrange / Act / Assert), comentado em PT-BR.
// Banco = fake em memória (zerado antes de cada teste pelo setup.js global).
// Token JWT = helper tokenDe(user). Dados = helpers criarUsuario/criarProjeto.
// ============================================================================

const request = require('supertest');
const app = require('../src/app');
const fakeSupabase = require('./fakeSupabase');
const { tokenDe, criarUsuario, criarProjeto, criarMembro } = require('./helpers');

// ----------------------------------------------------------------------------
// Atalho local: cria um convite PENDENTE direto no fake e devolve a linha.
// Não existe helper compartilhado pra isso, então semeamos aqui (continua
// simples e explicável). status "pending" vem do default da tabela.
// ----------------------------------------------------------------------------
function criarConvite({ projectId, inviterId, inviteeId, role = 'DEV' }) {
  const [convite] = fakeSupabase.__seed('sp_invitations', {
    project_id: projectId, inviter_id: inviterId, invitee_id: inviteeId, role,
  });
  return convite;
}

// ============================================================================
// GET /api/invitations — listar convites pendentes do usuário logado
// ============================================================================
describe('GET /api/invitations', () => {
  // Verifica que o convite pendente aparece na lista, já com os dados do
  // projeto e do nome de quem convidou (a rota faz um "JOIN manual").
  it('lista o convite pendente com dados do projeto e do convidador', async () => {
    // Arrange — dono cria projeto e convida o usuário logado.
    const dono = criarUsuario({ username: 'dono', email: 'dono@ex.com' });
    const convidado = criarUsuario({ username: 'bia', email: 'bia@ex.com' });
    const projeto = criarProjeto({ name: 'App X', ownerId: dono.id, description: 'desc' });
    criarConvite({ projectId: projeto.id, inviterId: dono.id, inviteeId: convidado.id, role: 'DEV' });

    // Act — o convidado consulta seus convites pendentes.
    const resposta = await request(app)
      .get('/api/invitations')
      .set('Authorization', `Bearer ${tokenDe(convidado)}`);

    // Assert — veio 1 convite com os dados denormalizados esperados.
    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0]).toMatchObject({
      project_id: projeto.id,
      project_name: 'App X',
      project_description: 'desc',
      inviter_username: 'dono',
      role: 'DEV',
      status: 'pending',
    });
  });

  // Verifica que sem token a rota é bloqueada pelo middleware de auth (401).
  it('retorna 401 quando não há token', async () => {
    // Arrange — nada: a requisição vai sem header Authorization.

    // Act — chama a rota protegida sem token.
    const resposta = await request(app).get('/api/invitations');

    // Assert — middleware barra com 401.
    expect(resposta.status).toBe(401);
  });
});

// ============================================================================
// POST /api/invitations/:id/accept — aceitar convite (vira membro)
// ============================================================================
describe('POST /api/invitations/:id/accept', () => {
  // Verifica o caminho feliz: aceitar responde sucesso com o id do projeto.
  it('retorna 200 com { success: true } e o project_id ao aceitar', async () => {
    // Arrange — convite pendente para o usuário logado.
    const dono = criarUsuario({ username: 'dono', email: 'dono@ex.com' });
    const convidado = criarUsuario({ username: 'bia', email: 'bia@ex.com' });
    const projeto = criarProjeto({ name: 'App X', ownerId: dono.id });
    const convite = criarConvite({ projectId: projeto.id, inviterId: dono.id, inviteeId: convidado.id });

    // Act — o convidado aceita o convite.
    const resposta = await request(app)
      .post(`/api/invitations/${convite.id}/accept`)
      .set('Authorization', `Bearer ${tokenDe(convidado)}`);

    // Assert — sucesso e devolve o projeto do convite.
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ success: true, project_id: projeto.id });
  });

  // Verifica que aceitar um convite inexistente responde 404.
  it('retorna 404 quando o convite não existe', async () => {
    // Arrange — usuário existe, mas não há convite com id 999.
    const usuario = criarUsuario({ username: 'ana', email: 'ana@ex.com' });

    // Act — tenta aceitar um id que não existe.
    const resposta = await request(app)
      .post('/api/invitations/999/accept')
      .set('Authorization', `Bearer ${tokenDe(usuario)}`);

    // Assert — 404 com a mensagem padrão da rota.
    expect(resposta.status).toBe(404);
    expect(resposta.body).toEqual({ error: 'Convite não encontrado ou já respondido' });
  });

  // Verifica a IDEMPOTÊNCIA: se o usuário já é membro (UNIQUE 23505 no insert),
  // a rota ainda responde sucesso e marca o convite como aceito mesmo assim.
  it('é idempotente: aceita com sucesso mesmo se o usuário já for membro (23505)', async () => {
    // Arrange — usuário JÁ é membro do projeto e ainda tem um convite pendente.
    const dono = criarUsuario({ username: 'dono', email: 'dono@ex.com' });
    const convidado = criarUsuario({ username: 'bia', email: 'bia@ex.com' });
    const projeto = criarProjeto({ name: 'App X', ownerId: dono.id });
    criarMembro({ projectId: projeto.id, userId: convidado.id }); // já é membro -> insert dará 23505
    const convite = criarConvite({ projectId: projeto.id, inviterId: dono.id, inviteeId: convidado.id });

    // Act — aceita o convite (o insert de membership colide com o UNIQUE).
    const resposta = await request(app)
      .post(`/api/invitations/${convite.id}/accept`)
      .set('Authorization', `Bearer ${tokenDe(convidado)}`);

    // Assert — mesmo com o 23505, a rota trata como sucesso (idempotente).
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ success: true, project_id: projeto.id });
  });
});

// ============================================================================
// POST /api/invitations/:id/reject — rejeitar convite
// ============================================================================
describe('POST /api/invitations/:id/reject', () => {
  // Verifica o caminho feliz: rejeitar um convite pendente responde sucesso.
  it('retorna 200 com { success: true } ao rejeitar um convite pendente', async () => {
    // Arrange — convite pendente para o usuário logado.
    const dono = criarUsuario({ username: 'dono', email: 'dono@ex.com' });
    const convidado = criarUsuario({ username: 'bia', email: 'bia@ex.com' });
    const projeto = criarProjeto({ name: 'App X', ownerId: dono.id });
    const convite = criarConvite({ projectId: projeto.id, inviterId: dono.id, inviteeId: convidado.id });

    // Act — o convidado rejeita o convite.
    const resposta = await request(app)
      .post(`/api/invitations/${convite.id}/reject`)
      .set('Authorization', `Bearer ${tokenDe(convidado)}`);

    // Assert — sucesso.
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ success: true });
  });

  // Verifica que rejeitar um convite inexistente responde 404.
  it('retorna 404 quando o convite não existe', async () => {
    // Arrange — usuário existe, mas não há convite com id 999.
    const usuario = criarUsuario({ username: 'ana', email: 'ana@ex.com' });

    // Act — tenta rejeitar um id que não existe.
    const resposta = await request(app)
      .post('/api/invitations/999/reject')
      .set('Authorization', `Bearer ${tokenDe(usuario)}`);

    // Assert — 404 com a mensagem padrão da rota.
    expect(resposta.status).toBe(404);
    expect(resposta.body).toEqual({ error: 'Convite não encontrado ou já respondido' });
  });
});
