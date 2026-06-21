// ============================================================================
// dashboard.test.js — testes das métricas do sprint (US7) e da velocity
// ============================================================================
// Rotas testadas (montadas em /api, ver src/app.js):
//   GET /api/sprints/:sprintId/dashboard  -> pontos totais/concluídos/progresso
//   GET /api/projects/:projectId/velocity -> média de pontos concluídos
//
// Padrão dos testes: AAA (Arrange / Act / Assert) explícito + FIRST.
// O banco é o FAKE em memória (USE_FAKE_DB=1, ligado em tests/setup.js) e é
// zerado antes de cada teste (beforeEach global), então cada teste é isolado.
// Usamos os helpers compartilhados (fixtures) para semear usuário/projeto/membro
// e para assinar o token JWT, deixando cada teste curto e focado.
// ============================================================================

const request = require('supertest');
const app = require('../src/app');
const fakeSupabase = require('./fakeSupabase');
const {
  tokenDe,
  criarUsuario,
  criarProjeto,
  criarMembro,
} = require('./helpers');

// ----------------------------------------------------------------------------
// Pequeno atalho local: semeia uma história já dentro de um sprint, com pontos
// e status escolhidos. Como as histórias de sprint precisam de sprint_id
// explícito (o default do fake é null = backlog), passamos sempre o sprint_id.
// Não mexe nos arquivos compartilhados; é só açúcar dentro deste arquivo.
// ----------------------------------------------------------------------------
function criarStoryNoSprint({ projectId, sprintId, points, status }) {
  const [story] = fakeSupabase.__seed('sp_user_stories', {
    project_id: projectId,
    sprint_id: sprintId,
    title: 'História de teste',
    story_points: points,
    status,
  });
  return story;
}

describe('GET /api/sprints/:sprintId/dashboard — métricas do sprint', () => {
  // Verifica que um sprint SEM nenhuma história devolve a estrutura zerada,
  // para a tela do dashboard não quebrar quando o sprint ainda está vazio.
  it('retorna estrutura zerada quando o sprint não tem histórias', async () => {
    // Arrange — usuário existe (o middleware exige), mas o sprint 999 está vazio.
    const user = criarUsuario({ username: 'ana', email: 'ana@x.com' });

    // Act — pede o dashboard de um sprint sem histórias.
    const resposta = await request(app)
      .get('/api/sprints/999/dashboard')
      .set('Authorization', `Bearer ${tokenDe(user)}`);

    // Assert — status 200 e tudo zerado.
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({
      totalPoints: 0,
      completedPoints: 0,
      progress: 0,
      byStatus: { to_do: 0, in_progress: 0, in_review: 0, done: 0 },
      storiesCount: 0,
    });
  });

  // Verifica o cálculo principal: soma de pontos, pontos concluídos (status done),
  // progresso em % e contagem por status, com um membro acessando o próprio sprint.
  it('calcula totais, concluídos, progresso e byStatus para um membro', async () => {
    // Arrange — usuário membro do projeto, sprint com 4 histórias variadas.
    const user = criarUsuario({ username: 'bob', email: 'bob@x.com' });
    const projeto = criarProjeto({ name: 'Projeto X', ownerId: user.id });
    criarMembro({ projectId: projeto.id, userId: user.id });
    const [sprint] = fakeSupabase.__seed('sp_sprints', {
      project_id: projeto.id, name: 'Sprint 1',
    });
    // 2 histórias done (3 + 5 = 8 pts), 1 in_progress (2 pts), 1 to_do (0 pt).
    // Total = 10 pts; concluído = 8 pts; progresso = round(8/10*100) = 80.
    criarStoryNoSprint({ projectId: projeto.id, sprintId: sprint.id, points: 3, status: 'done' });
    criarStoryNoSprint({ projectId: projeto.id, sprintId: sprint.id, points: 5, status: 'done' });
    criarStoryNoSprint({ projectId: projeto.id, sprintId: sprint.id, points: 2, status: 'in_progress' });
    criarStoryNoSprint({ projectId: projeto.id, sprintId: sprint.id, points: 0, status: 'to_do' });

    // Act — pede o dashboard do sprint.
    const resposta = await request(app)
      .get(`/api/sprints/${sprint.id}/dashboard`)
      .set('Authorization', `Bearer ${tokenDe(user)}`);

    // Assert — métricas calculadas como esperado.
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({
      totalPoints: 10,
      completedPoints: 8,
      progress: 80,
      byStatus: { to_do: 1, in_progress: 1, in_review: 0, done: 2 },
      storiesCount: 4,
    });
  });

  // Verifica que quem NÃO é membro do projeto leva 403 ao pedir o dashboard,
  // garantindo o controle de acesso (só membros veem métricas do projeto).
  it('retorna 403 quando o usuário não é membro do projeto', async () => {
    // Arrange — o sprint tem história (para passar do "sprint vazio"), mas o
    // usuário que pede NÃO é membro do projeto dono dessa história.
    const dono = criarUsuario({ username: 'dono', email: 'dono@x.com' });
    const intruso = criarUsuario({ username: 'intruso', email: 'intruso@x.com' });
    const projeto = criarProjeto({ name: 'Projeto Privado', ownerId: dono.id });
    const [sprint] = fakeSupabase.__seed('sp_sprints', {
      project_id: projeto.id, name: 'Sprint Secreto',
    });
    criarStoryNoSprint({ projectId: projeto.id, sprintId: sprint.id, points: 3, status: 'done' });

    // Act — o intruso (sem membership) tenta ver o dashboard.
    const resposta = await request(app)
      .get(`/api/sprints/${sprint.id}/dashboard`)
      .set('Authorization', `Bearer ${tokenDe(intruso)}`);

    // Assert — acesso negado.
    expect(resposta.status).toBe(403);
  });

  // Verifica que sem token o middleware barra a rota (401), porque o dashboard
  // é protegido por autenticação.
  it('retorna 401 quando não há token de autenticação', async () => {
    // Arrange — nada a preparar; a requisição vai sem header Authorization.

    // Act — pede o dashboard sem token.
    const resposta = await request(app).get('/api/sprints/1/dashboard');

    // Assert — barrado pela autenticação.
    expect(resposta.status).toBe(401);
  });
});

describe('GET /api/projects/:projectId/velocity — velocidade do projeto', () => {
  // Verifica que quem não é membro leva 403 ao pedir a velocity do projeto,
  // mantendo o mesmo controle de acesso do dashboard.
  it('retorna 403 quando o usuário não é membro do projeto', async () => {
    // Arrange — projeto de um dono; o intruso não é membro.
    const dono = criarUsuario({ username: 'dono2', email: 'dono2@x.com' });
    const intruso = criarUsuario({ username: 'intruso2', email: 'intruso2@x.com' });
    const projeto = criarProjeto({ name: 'Projeto V', ownerId: dono.id });

    // Act — intruso pede a velocity.
    const resposta = await request(app)
      .get(`/api/projects/${projeto.id}/velocity`)
      .set('Authorization', `Bearer ${tokenDe(intruso)}`);

    // Assert — acesso negado.
    expect(resposta.status).toBe(403);
  });

  // Verifica que um projeto sem sprints COMPLETADOS devolve velocity 0 e lista
  // vazia (só contam sprints com status 'completed').
  it('retorna velocity 0 e lista vazia quando não há sprints completados', async () => {
    // Arrange — membro com um sprint ainda em 'planning' (não conta na velocity).
    const user = criarUsuario({ username: 'edu', email: 'edu@x.com' });
    const projeto = criarProjeto({ name: 'Projeto W', ownerId: user.id });
    criarMembro({ projectId: projeto.id, userId: user.id });
    fakeSupabase.__seed('sp_sprints', { project_id: projeto.id, name: 'Sprint Aberto' });

    // Act — pede a velocity.
    const resposta = await request(app)
      .get(`/api/projects/${projeto.id}/velocity`)
      .set('Authorization', `Bearer ${tokenDe(user)}`);

    // Assert — nada a medir ainda.
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ velocity: 0, sprints: [] });
  });

  // Verifica o cálculo da velocity: média dos pontos concluídos por sprint
  // completado, com o detalhamento por sprint.
  it('calcula a velocity média dos sprints completados', async () => {
    // Arrange — membro com 2 sprints 'completed'. Sprint A concluiu 8 pts
    // (3+5, ambos done), Sprint B concluiu 4 pts (4 done). Histórias não-done
    // e de sprint não-completado NÃO entram na conta.
    const user = criarUsuario({ username: 'fab', email: 'fab@x.com' });
    const projeto = criarProjeto({ name: 'Projeto Velocity', ownerId: user.id });
    criarMembro({ projectId: projeto.id, userId: user.id });
    const [sprintA] = fakeSupabase.__seed('sp_sprints', {
      project_id: projeto.id, name: 'Sprint A', status: 'completed',
    });
    const [sprintB] = fakeSupabase.__seed('sp_sprints', {
      project_id: projeto.id, name: 'Sprint B', status: 'completed',
    });
    // Sprint A: 8 pts concluídos.
    criarStoryNoSprint({ projectId: projeto.id, sprintId: sprintA.id, points: 3, status: 'done' });
    criarStoryNoSprint({ projectId: projeto.id, sprintId: sprintA.id, points: 5, status: 'done' });
    // Sprint A também tem 1 história não concluída (não entra na soma).
    criarStoryNoSprint({ projectId: projeto.id, sprintId: sprintA.id, points: 99, status: 'in_progress' });
    // Sprint B: 4 pts concluídos.
    criarStoryNoSprint({ projectId: projeto.id, sprintId: sprintB.id, points: 4, status: 'done' });

    // Act — pede a velocity. Média = (8 + 4) / 2 = 6.
    const resposta = await request(app)
      .get(`/api/projects/${projeto.id}/velocity`)
      .set('Authorization', `Bearer ${tokenDe(user)}`);

    // Assert — velocity média e detalhamento por sprint.
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({
      velocity: 6,
      sprints: [
        { id: sprintA.id, name: 'Sprint A', completed: 8 },
        { id: sprintB.id, name: 'Sprint B', completed: 4 },
      ],
    });
  });
});
