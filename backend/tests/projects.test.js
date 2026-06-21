// ============================================================================
// projects.test.js — testes da rota de PROJETOS (src/routes/projects.js)
// ============================================================================
// Cobrimos as 5 operacoes da rota: criar, listar, deletar, convidar membro e
// listar membros. Cada teste segue o padrao AAA (Arrange / Act / Assert) e tem
// um comentario de 1 linha dizendo, em portugues simples, o que ele verifica.
//
// Apoios usados (Cap. 8):
//   - supertest: faz a requisicao HTTP no app em memoria (sem subir porta).
//   - FIXTURES (helpers.js): criarUsuario / criarProjeto / criarMembro semeiam
//     o banco fake; tokenDe assina o JWT pro header Authorization.
//   - O banco fake e zerado antes de CADA teste (beforeEach em setup.js), entao
//     os testes sao isolados e deterministicos (principios "I" e "R" de FIRST).
// ============================================================================

const request = require('supertest');
const app = require('../src/app');
const { tokenDe, criarUsuario, criarProjeto, criarMembro } = require('./helpers');

// ----------------------------------------------------------------------------
// POST /api/projects — criar projeto
// ----------------------------------------------------------------------------
describe('POST /api/projects (criar projeto)', () => {
  // Verifica que criar projeto com nome retorna 201 e devolve o projeto criado.
  it('retorna 201 com o projeto criado quando recebe um nome', async () => {
    // Arrange — cria o usuario dono e seu token.
    const dono = criarUsuario({ username: 'ana', email: 'ana@x.com' });

    // Act — envia o POST autenticado com o nome do projeto.
    const resposta = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${tokenDe(dono)}`)
      .send({ name: 'Projeto X', description: 'desc' });

    // Assert — status 201 e o corpo traz o projeto com o owner correto.
    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({ name: 'Projeto X', owner_id: dono.id });
  });

  // Verifica que criar projeto SEM nome retorna 400 (nome e obrigatorio).
  it('retorna 400 quando o nome nao e enviado', async () => {
    // Arrange — usuario valido, mas vamos omitir o nome no corpo.
    const dono = criarUsuario({ username: 'caio', email: 'caio@x.com' });

    // Act — envia o POST sem o campo "name".
    const resposta = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${tokenDe(dono)}`)
      .send({ description: 'sem nome' });

    // Assert — status 400 (requisicao invalida).
    expect(resposta.status).toBe(400);
  });
});

// ----------------------------------------------------------------------------
// GET /api/projects — listar projetos do usuario
// ----------------------------------------------------------------------------
describe('GET /api/projects (listar projetos)', () => {
  // Verifica que a lista traz apenas os projetos onde o usuario e membro.
  it('retorna so os projetos em que o usuario e membro', async () => {
    // Arrange — o usuario e membro do projeto A, mas NAO do projeto B.
    const usuario = criarUsuario({ username: 'dani', email: 'dani@x.com' });
    const projetoA = criarProjeto({ name: 'A', ownerId: usuario.id });
    criarProjeto({ name: 'B', ownerId: 999 }); // projeto de outro dono
    criarMembro({ projectId: projetoA.id, userId: usuario.id, role: 'PO' });

    // Act — pede a lista de projetos do usuario.
    const resposta = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${tokenDe(usuario)}`);

    // Assert — vem exatamente 1 projeto (o A), com o role anexado.
    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0]).toMatchObject({ name: 'A', role: 'PO' });
  });

  // Verifica que, sem nenhuma membership, a lista volta vazia (cobre o early
  // return [] da rota quando não há memberships).
  it('retorna lista vazia quando o usuario nao e membro de nada', async () => {
    // Arrange — usuario sem nenhuma membership criada.
    const usuario = criarUsuario({ username: 'edu', email: 'edu@x.com' });

    // Act — pede a lista de projetos.
    const resposta = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${tokenDe(usuario)}`);

    // Assert — corpo e um array vazio.
    expect(resposta.body).toEqual([]);
  });
});

// ----------------------------------------------------------------------------
// DELETE /api/projects/:id — deletar projeto (so o dono)
// ----------------------------------------------------------------------------
describe('DELETE /api/projects/:id (deletar projeto)', () => {
  // Verifica que o DONO consegue deletar o proprio projeto (200 + success).
  it('retorna 200 quando o dono deleta o proprio projeto', async () => {
    // Arrange — cria o dono e um projeto que pertence a ele.
    const dono = criarUsuario({ username: 'fp', email: 'fp@x.com' });
    const projeto = criarProjeto({ name: 'Del', ownerId: dono.id });

    // Act — dono manda o DELETE no proprio projeto.
    const resposta = await request(app)
      .delete(`/api/projects/${projeto.id}`)
      .set('Authorization', `Bearer ${tokenDe(dono)}`);

    // Assert — status 200 e confirmacao de sucesso.
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ success: true });
  });

  // Verifica que quem NAO e o dono recebe 403 ao tentar deletar.
  it('retorna 403 quando quem deleta nao e o dono', async () => {
    // Arrange — projeto pertence ao dono; outro usuario tenta apagar.
    const dono = criarUsuario({ username: 'gabi', email: 'gabi@x.com' });
    const intruso = criarUsuario({ username: 'hugo', email: 'hugo@x.com' });
    const projeto = criarProjeto({ name: 'NaoSeu', ownerId: dono.id });

    // Act — o intruso tenta deletar.
    const resposta = await request(app)
      .delete(`/api/projects/${projeto.id}`)
      .set('Authorization', `Bearer ${tokenDe(intruso)}`);

    // Assert — acesso negado (403).
    expect(resposta.status).toBe(403);
  });

  // Verifica que deletar um projeto inexistente retorna 404.
  it('retorna 404 quando o projeto nao existe', async () => {
    // Arrange — usuario valido, mas o id 999 nao corresponde a nenhum projeto.
    const usuario = criarUsuario({ username: 'ivo', email: 'ivo@x.com' });

    // Act — tenta deletar um id que nao existe.
    const resposta = await request(app)
      .delete('/api/projects/999')
      .set('Authorization', `Bearer ${tokenDe(usuario)}`);

    // Assert — projeto nao encontrado (404).
    expect(resposta.status).toBe(404);
  });
});

// ----------------------------------------------------------------------------
// POST /api/projects/:id/members — convidar membro (cria convite pendente)
// ----------------------------------------------------------------------------
describe('POST /api/projects/:id/members (convidar membro)', () => {
  // Verifica o caminho feliz: dono convida outro usuario e recebe 201 + convite.
  it('retorna 201 com o convite quando o dono convida um usuario existente', async () => {
    // Arrange — dono com projeto + um usuario a ser convidado.
    const dono = criarUsuario({ username: 'joao', email: 'joao@x.com' });
    const convidado = criarUsuario({ username: 'kim', email: 'kim@x.com' });
    const projeto = criarProjeto({ name: 'Conv', ownerId: dono.id });

    // Act — dono convida o usuario pelo email, no papel de DEV.
    const resposta = await request(app)
      .post(`/api/projects/${projeto.id}/members`)
      .set('Authorization', `Bearer ${tokenDe(dono)}`)
      .send({ identifier: 'kim@x.com', role: 'DEV' });

    // Assert — convite criado (201), com status pendente e o convidado certo.
    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({
      status: 'pending',
      role: 'DEV',
      invitee: { id: convidado.id },
    });
  });

  // Verifica que faltando identifier ou role o convite e recusado com 400.
  it('retorna 400 quando faltam identifier ou role', async () => {
    // Arrange — dono com projeto; vamos mandar o corpo sem o role.
    const dono = criarUsuario({ username: 'lia', email: 'lia@x.com' });
    const projeto = criarProjeto({ name: 'Falta', ownerId: dono.id });

    // Act — convida passando so o identifier (sem role).
    const resposta = await request(app)
      .post(`/api/projects/${projeto.id}/members`)
      .set('Authorization', `Bearer ${tokenDe(dono)}`)
      .send({ identifier: 'alguem@x.com' });

    // Assert — requisicao invalida (400).
    expect(resposta.status).toBe(400);
  });

  // Verifica que o dono nao consegue convidar a si mesmo (400). Cobre o galho
  // "autoconvite" da rota (invitedUser.id === req.user.id).
  it('retorna 400 quando o dono tenta se convidar', async () => {
    // Arrange — dono do projeto usando o proprio email como convidado.
    const dono = criarUsuario({ username: 'self', email: 'self@x.com' });
    const projeto = criarProjeto({ name: 'Auto', ownerId: dono.id });

    // Act — o dono envia um convite apontando para o proprio email.
    const resposta = await request(app)
      .post(`/api/projects/${projeto.id}/members`)
      .set('Authorization', `Bearer ${tokenDe(dono)}`)
      .send({ identifier: 'self@x.com', role: 'DEV' });

    // Assert — autoconvite recusado com 400.
    expect(resposta.status).toBe(400);
  });

  // Verifica que quem NAO e o dono do projeto nao pode convidar (403).
  it('retorna 403 quando quem convida nao e o dono', async () => {
    // Arrange — projeto e do dono; outro usuario (intruso) tenta convidar.
    const dono = criarUsuario({ username: 'mara', email: 'mara@x.com' });
    const intruso = criarUsuario({ username: 'ney', email: 'ney@x.com' });
    criarUsuario({ username: 'alvo', email: 'alvo@x.com' });
    const projeto = criarProjeto({ name: 'Priv', ownerId: dono.id });

    // Act — o intruso tenta convidar o "alvo".
    const resposta = await request(app)
      .post(`/api/projects/${projeto.id}/members`)
      .set('Authorization', `Bearer ${tokenDe(intruso)}`)
      .send({ identifier: 'alvo@x.com', role: 'DEV' });

    // Assert — apenas o dono convida; intruso recebe 403.
    expect(resposta.status).toBe(403);
  });

  // Verifica que convidar um usuario que nao existe retorna 404.
  it('retorna 404 quando o usuario convidado nao existe', async () => {
    // Arrange — dono com projeto; o email convidado nao pertence a ninguem.
    const dono = criarUsuario({ username: 'olga', email: 'olga@x.com' });
    const projeto = criarProjeto({ name: 'Fantasma', ownerId: dono.id });

    // Act — convida um email inexistente.
    const resposta = await request(app)
      .post(`/api/projects/${projeto.id}/members`)
      .set('Authorization', `Bearer ${tokenDe(dono)}`)
      .send({ identifier: 'ninguem@x.com', role: 'DEV' });

    // Assert — usuario nao encontrado (404).
    expect(resposta.status).toBe(404);
  });

  // Verifica que convidar quem JA e membro do projeto retorna 409 (conflito).
  it('retorna 409 quando o usuario ja e membro do projeto', async () => {
    // Arrange — o convidado ja e membro do projeto.
    const dono = criarUsuario({ username: 'paulo', email: 'paulo@x.com' });
    const jaMembro = criarUsuario({ username: 'rita', email: 'rita@x.com' });
    const projeto = criarProjeto({ name: 'JaTem', ownerId: dono.id });
    criarMembro({ projectId: projeto.id, userId: jaMembro.id, role: 'DEV' });

    // Act — dono tenta convidar quem ja faz parte.
    const resposta = await request(app)
      .post(`/api/projects/${projeto.id}/members`)
      .set('Authorization', `Bearer ${tokenDe(dono)}`)
      .send({ identifier: 'rita@x.com', role: 'DEV' });

    // Assert — conflito (409): ja e membro.
    expect(resposta.status).toBe(409);
  });

});

// ----------------------------------------------------------------------------
// GET /api/projects/:id/members — listar membros (qualquer membro pode ver)
// ----------------------------------------------------------------------------
describe('GET /api/projects/:id/members (listar membros)', () => {
  // Verifica que um membro consegue listar os membros do projeto (200).
  it('retorna 200 e a lista de membros quando quem pede e membro', async () => {
    // Arrange — usuario e membro do projeto.
    const dono = criarUsuario({ username: 'ugo', email: 'ugo@x.com' });
    const projeto = criarProjeto({ name: 'Lista', ownerId: dono.id });
    criarMembro({ projectId: projeto.id, userId: dono.id, role: 'PO' });

    // Act — pede a lista de membros.
    const resposta = await request(app)
      .get(`/api/projects/${projeto.id}/members`)
      .set('Authorization', `Bearer ${tokenDe(dono)}`);

    // Assert — status 200 e o membro aparece com username e role.
    expect(resposta.status).toBe(200);
    expect(resposta.body[0]).toMatchObject({ username: 'ugo', role: 'PO' });
  });

  // Verifica que quem NAO e membro do projeto nao pode ver a lista (403).
  it('retorna 403 quando quem pede nao e membro do projeto', async () => {
    // Arrange — projeto existe, mas o usuario nao tem membership nele.
    const dono = criarUsuario({ username: 'vera', email: 'vera@x.com' });
    const estranho = criarUsuario({ username: 'will', email: 'will@x.com' });
    const projeto = criarProjeto({ name: 'Fechado', ownerId: dono.id });

    // Act — o estranho tenta listar os membros.
    const resposta = await request(app)
      .get(`/api/projects/${projeto.id}/members`)
      .set('Authorization', `Bearer ${tokenDe(estranho)}`);

    // Assert — acesso negado (403): nao e membro.
    expect(resposta.status).toBe(403);
  });
});
