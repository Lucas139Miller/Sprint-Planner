// ============================================================================
// stories.test.js — testes das rotas de histórias (user stories) do backlog,
// Kanban e sprints. Cobre US3 (backlog), US5 (mover pra sprint) e US6 (status).
// ============================================================================
// Padrão usado em TODOS os testes: AAA (Arrange / Act / Assert), explícito em
// comentários PT-BR. Cada teste começa com 1 linha dizendo, em português
// simples, o QUE ele verifica e POR QUE aquilo importa.
//
// Ferramentas (Cap. 8):
//   - supertest: faz a requisição HTTP no app Express em memória (sem porta).
//   - fake em memória (USE_FAKE_DB=1): banco determinístico, zerado a cada teste.
//   - fixtures (helpers.js): criarUsuario/criarProjeto/criarMembro + tokenDe.
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
// Fixture local: monta o "cenário feliz" comum a quase todo teste — um usuário
// que é DONO e MEMBRO de um projeto. Devolve { user, projeto } já com ids.
// Centralizar aqui evita repetir as mesmas 3 linhas em cada teste (DRY).
// ----------------------------------------------------------------------------
function cenarioMembroComProjeto() {
  const user = criarUsuario({ username: 'ana', email: 'ana@ex.com' });
  const projeto = criarProjeto({ name: 'App Mobile', ownerId: user.id });
  criarMembro({ projectId: projeto.id, userId: user.id });
  return { user, projeto };
}

// ============================================================================
// POST /api/projects/:projectId/stories — criar história no backlog (US3)
// ============================================================================
describe('POST /api/projects/:projectId/stories', () => {
  // Verifica o caminho feliz: membro cria história e recebe 201 com os defaults
  // do banco aplicados (status to_do, story_points 0, label feature).
  it('retorna 201 e cria a história com os defaults quando o usuário é membro', async () => {
    // Arrange — usuário membro de um projeto e seu token.
    const { user, projeto } = cenarioMembroComProjeto();

    // Act — envia o título mínimo necessário pra criar a história.
    const resposta = await request(app)
      .post(`/api/projects/${projeto.id}/stories`)
      .set('Authorization', `Bearer ${tokenDe(user)}`)
      .send({ title: 'Tela de login' });

    // Assert — criada (201) com os defaults esperados do schema.
    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({
      title: 'Tela de login',
      status: 'to_do',
      story_points: 0,
      label: 'feature',
    });
  });

  // Verifica a validação de entrada: sem título a rota deve recusar com 400.
  it('retorna 400 quando o título não é enviado', async () => {
    // Arrange — usuário membro, mas vamos mandar um corpo sem title.
    const { user, projeto } = cenarioMembroComProjeto();

    // Act — envia corpo vazio (sem title).
    const resposta = await request(app)
      .post(`/api/projects/${projeto.id}/stories`)
      .set('Authorization', `Bearer ${tokenDe(user)}`)
      .send({});

    // Assert — recusado por falta de título.
    expect(resposta.status).toBe(400);
  });

  // Verifica o controle de acesso: quem NÃO é membro do projeto não pode criar
  // história nele (403), mesmo com token válido.
  it('retorna 403 quando o usuário não é membro do projeto', async () => {
    // Arrange — usuário válido e projeto, mas SEM criarMembro (não é membro).
    const user = criarUsuario({ username: 'bia', email: 'bia@ex.com' });
    const projeto = criarProjeto({ name: 'Projeto Alheio', ownerId: 999 });

    // Act — tenta criar história em projeto onde não participa.
    const resposta = await request(app)
      .post(`/api/projects/${projeto.id}/stories`)
      .set('Authorization', `Bearer ${tokenDe(user)}`)
      .send({ title: 'Não deveria entrar' });

    // Assert — bloqueado por não ser membro.
    expect(resposta.status).toBe(403);
  });
});

// ============================================================================
// GET /api/projects/:projectId/stories — listar backlog (US3)
// ============================================================================
describe('GET /api/projects/:projectId/stories', () => {
  // Verifica que o backlog lista só as histórias SEM sprint (sprint_id null),
  // ignorando as que já foram movidas pra um sprint.
  it('retorna apenas as histórias do backlog (sem sprint)', async () => {
    // Arrange — uma história no backlog (sprint_id null por default) e outra já
    // dentro de um sprint (sprint_id preenchido).
    const { user, projeto } = cenarioMembroComProjeto();
    fakeSupabase.__seed('sp_user_stories', { project_id: projeto.id, title: 'No backlog' });
    fakeSupabase.__seed('sp_user_stories', { project_id: projeto.id, title: 'Já no sprint', sprint_id: 50 });

    // Act — lista o backlog (sem o parâmetro include=all).
    const resposta = await request(app)
      .get(`/api/projects/${projeto.id}/stories`)
      .set('Authorization', `Bearer ${tokenDe(user)}`);

    // Assert — só a história do backlog aparece.
    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0].title).toBe('No backlog');
  });

  // Verifica que com ?include=all a listagem traz TODAS as histórias do projeto,
  // inclusive as que já estão em sprints.
  it('retorna todas as histórias quando include=all', async () => {
    // Arrange — uma no backlog e uma em sprint.
    const { user, projeto } = cenarioMembroComProjeto();
    fakeSupabase.__seed('sp_user_stories', { project_id: projeto.id, title: 'No backlog' });
    fakeSupabase.__seed('sp_user_stories', { project_id: projeto.id, title: 'Já no sprint', sprint_id: 50 });

    // Act — pede a listagem completa.
    const resposta = await request(app)
      .get(`/api/projects/${projeto.id}/stories?include=all`)
      .set('Authorization', `Bearer ${tokenDe(user)}`);

    // Assert — as duas histórias aparecem.
    expect(resposta.body).toHaveLength(2);
  });

  // Verifica o controle de acesso na listagem: não-membro recebe 403.
  it('retorna 403 quando o usuário não é membro do projeto', async () => {
    // Arrange — usuário válido e projeto, mas sem vínculo de membro.
    const user = criarUsuario({ username: 'caio', email: 'caio@ex.com' });
    const projeto = criarProjeto({ name: 'Projeto Alheio', ownerId: 999 });

    // Act — tenta listar o backlog de projeto onde não participa.
    const resposta = await request(app)
      .get(`/api/projects/${projeto.id}/stories`)
      .set('Authorization', `Bearer ${tokenDe(user)}`);

    // Assert — bloqueado.
    expect(resposta.status).toBe(403);
  });
});

// ============================================================================
// PUT /api/stories/:id — atualização parcial da história
// ============================================================================
describe('PUT /api/stories/:id', () => {
  // Verifica o caminho feliz: membro atualiza campos da história e recebe o
  // registro já com os novos valores.
  it('retorna 200 e atualiza os campos enviados', async () => {
    // Arrange — história existente no projeto do membro.
    const { user, projeto } = cenarioMembroComProjeto();
    const [story] = fakeSupabase.__seed('sp_user_stories', {
      project_id: projeto.id, title: 'Título antigo',
    });

    // Act — atualiza título e pontos.
    const resposta = await request(app)
      .put(`/api/stories/${story.id}`)
      .set('Authorization', `Bearer ${tokenDe(user)}`)
      .send({ title: 'Título novo', story_points: 5 });

    // Assert — campos atualizados.
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ title: 'Título novo', story_points: 5 });
  });

  // Verifica que atribuir a história a alguém que NÃO é membro é rejeitado (400).
  // É a proteção contra atribuir tarefa para um user_id qualquer (IDOR).
  it('retorna 400 ao atribuir a história a quem não é membro do projeto', async () => {
    // Arrange — história do projeto e um outro usuário que NÃO é membro.
    const { user, projeto } = cenarioMembroComProjeto();
    const estranho = criarUsuario({ username: 'estranho', email: 'estranho@ex.com' });
    const [story] = fakeSupabase.__seed('sp_user_stories', {
      project_id: projeto.id, title: 'Tarefa',
    });

    // Act — tenta atribuir ao usuário que não participa do projeto.
    const resposta = await request(app)
      .put(`/api/stories/${story.id}`)
      .set('Authorization', `Bearer ${tokenDe(user)}`)
      .send({ assignee_id: estranho.id });

    // Assert — recusado.
    expect(resposta.status).toBe(400);
  });

  // Verifica o 404: tentar atualizar história que não existe.
  it('retorna 404 quando a história não existe', async () => {
    // Arrange — usuário membro, mas nenhuma história com esse id.
    const { user } = cenarioMembroComProjeto();

    // Act — usa um id inexistente.
    const resposta = await request(app)
      .put('/api/stories/9999')
      .set('Authorization', `Bearer ${tokenDe(user)}`)
      .send({ title: 'X' });

    // Assert — não encontrada.
    expect(resposta.status).toBe(404);
  });

  // Verifica o 403: a história existe, mas em projeto onde o usuário não é membro.
  it('retorna 403 quando o usuário não é membro do projeto da história', async () => {
    // Arrange — usuário válido SEM membership e uma história de outro projeto.
    const user = criarUsuario({ username: 'duda', email: 'duda@ex.com' });
    const projetoAlheio = criarProjeto({ name: 'Alheio', ownerId: 999 });
    const [story] = fakeSupabase.__seed('sp_user_stories', {
      project_id: projetoAlheio.id, title: 'Não é minha',
    });

    // Act — tenta atualizar história de projeto alheio.
    const resposta = await request(app)
      .put(`/api/stories/${story.id}`)
      .set('Authorization', `Bearer ${tokenDe(user)}`)
      .send({ title: 'Invadindo' });

    // Assert — bloqueado.
    expect(resposta.status).toBe(403);
  });
});

// ============================================================================
// DELETE /api/stories/:id — remover história
// ============================================================================
describe('DELETE /api/stories/:id', () => {
  // Verifica o caminho feliz: membro deleta sua história e recebe success true.
  // (O 404/403 do DELETE passa pelo mesmo getStoryAndCheckAccess já coberto no PUT.)
  it('retorna 200 e remove a história', async () => {
    // Arrange — história existente no projeto do membro.
    const { user, projeto } = cenarioMembroComProjeto();
    const [story] = fakeSupabase.__seed('sp_user_stories', {
      project_id: projeto.id, title: 'Pra deletar',
    });

    // Act — deleta a história.
    const resposta = await request(app)
      .delete(`/api/stories/${story.id}`)
      .set('Authorization', `Bearer ${tokenDe(user)}`);

    // Assert — sucesso confirmado.
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ success: true });
  });
});

// ============================================================================
// PUT /api/stories/:id/move-to-sprint — mover história entre backlog e sprint (US5)
// ============================================================================
describe('PUT /api/stories/:id/move-to-sprint', () => {
  // Verifica o caminho feliz: mover uma história do backlog para um sprint do
  // mesmo projeto grava o sprint_id na história.
  it('retorna 200 e associa a história ao sprint do mesmo projeto', async () => {
    // Arrange — história no backlog e um sprint do mesmo projeto.
    const { user, projeto } = cenarioMembroComProjeto();
    const [sprint] = fakeSupabase.__seed('sp_sprints', { project_id: projeto.id, name: 'Sprint 1' });
    const [story] = fakeSupabase.__seed('sp_user_stories', { project_id: projeto.id, title: 'Mover pra sprint' });

    // Act — move a história pra esse sprint.
    const resposta = await request(app)
      .put(`/api/stories/${story.id}/move-to-sprint`)
      .set('Authorization', `Bearer ${tokenDe(user)}`)
      .send({ sprint_id: sprint.id });

    // Assert — história passou a apontar para o sprint.
    expect(resposta.status).toBe(200);
    expect(resposta.body.sprint_id).toBe(sprint.id);
  });

  // Verifica que enviar sprint_id null devolve a história ao backlog.
  it('retorna 200 e devolve a história ao backlog quando sprint_id é null', async () => {
    // Arrange — história que já está em um sprint.
    const { user, projeto } = cenarioMembroComProjeto();
    const [story] = fakeSupabase.__seed('sp_user_stories', {
      project_id: projeto.id, title: 'Voltar pro backlog', sprint_id: 50,
    });

    // Act — move de volta pro backlog (sprint_id null).
    const resposta = await request(app)
      .put(`/api/stories/${story.id}/move-to-sprint`)
      .set('Authorization', `Bearer ${tokenDe(user)}`)
      .send({ sprint_id: null });

    // Assert — sem sprint (de volta ao backlog).
    expect(resposta.status).toBe(200);
    expect(resposta.body.sprint_id).toBeNull();
  });

  // Verifica o 400: o corpo precisa conter a chave sprint_id (mesmo que null).
  it('retorna 400 quando sprint_id não está no corpo', async () => {
    // Arrange — história válida no projeto do membro.
    const { user, projeto } = cenarioMembroComProjeto();
    const [story] = fakeSupabase.__seed('sp_user_stories', { project_id: projeto.id, title: 'X' });

    // Act — envia corpo sem a chave sprint_id.
    const resposta = await request(app)
      .put(`/api/stories/${story.id}/move-to-sprint`)
      .set('Authorization', `Bearer ${tokenDe(user)}`)
      .send({});

    // Assert — recusado por falta de sprint_id.
    expect(resposta.status).toBe(400);
  });

  // Verifica o 404: mover para um sprint que não existe.
  it('retorna 404 quando o sprint de destino não existe', async () => {
    // Arrange — história válida, mas o sprint alvo não foi criado.
    const { user, projeto } = cenarioMembroComProjeto();
    const [story] = fakeSupabase.__seed('sp_user_stories', { project_id: projeto.id, title: 'X' });

    // Act — tenta mover pra um sprint inexistente.
    const resposta = await request(app)
      .put(`/api/stories/${story.id}/move-to-sprint`)
      .set('Authorization', `Bearer ${tokenDe(user)}`)
      .send({ sprint_id: 9999 });

    // Assert — sprint não encontrado.
    expect(resposta.status).toBe(404);
  });

  // Verifica o 403 (anti-IDOR): não dá pra mover história do projeto A para um
  // sprint que pertence ao projeto B.
  it('retorna 403 quando o sprint pertence a outro projeto', async () => {
    // Arrange — história do projeto do membro e um sprint de OUTRO projeto.
    const { user, projeto } = cenarioMembroComProjeto();
    const outroProjeto = criarProjeto({ name: 'Outro', ownerId: 999 });
    const [sprintAlheio] = fakeSupabase.__seed('sp_sprints', { project_id: outroProjeto.id, name: 'Sprint B' });
    const [story] = fakeSupabase.__seed('sp_user_stories', { project_id: projeto.id, title: 'Minha história' });

    // Act — tenta mover pra um sprint de outro projeto.
    const resposta = await request(app)
      .put(`/api/stories/${story.id}/move-to-sprint`)
      .set('Authorization', `Bearer ${tokenDe(user)}`)
      .send({ sprint_id: sprintAlheio.id });

    // Assert — bloqueado por inconsistência de projeto.
    expect(resposta.status).toBe(403);
  });
});

// ============================================================================
// GET /api/sprints/:sprintId/stories — listar histórias de um sprint (US5)
// ============================================================================
describe('GET /api/sprints/:sprintId/stories', () => {
  // Verifica o caminho feliz: lista só as histórias atribuídas àquele sprint.
  it('retorna as histórias daquele sprint', async () => {
    // Arrange — sprint do projeto e duas histórias: uma dentro do sprint, outra no backlog.
    const { user, projeto } = cenarioMembroComProjeto();
    const [sprint] = fakeSupabase.__seed('sp_sprints', { project_id: projeto.id, name: 'Sprint 1' });
    fakeSupabase.__seed('sp_user_stories', { project_id: projeto.id, title: 'Dentro do sprint', sprint_id: sprint.id });
    fakeSupabase.__seed('sp_user_stories', { project_id: projeto.id, title: 'No backlog' });

    // Act — lista as histórias do sprint.
    const resposta = await request(app)
      .get(`/api/sprints/${sprint.id}/stories`)
      .set('Authorization', `Bearer ${tokenDe(user)}`);

    // Assert — só a história do sprint aparece.
    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0].title).toBe('Dentro do sprint');
  });

  // Verifica o 404: listar histórias de um sprint que não existe.
  it('retorna 404 quando o sprint não existe', async () => {
    // Arrange — usuário membro, sem o sprint alvo.
    const { user } = cenarioMembroComProjeto();

    // Act — pede histórias de um sprint inexistente.
    const resposta = await request(app)
      .get('/api/sprints/9999/stories')
      .set('Authorization', `Bearer ${tokenDe(user)}`);

    // Assert — não encontrado.
    expect(resposta.status).toBe(404);
  });

  // Verifica o 403: o sprint existe, mas quem lista NÃO é membro do projeto dele.
  it('retorna 403 ao listar histórias do sprint quando não é membro', async () => {
    // Arrange — sprint de um dono; o intruso não tem membership no projeto.
    const dono = criarUsuario({ username: 'donoS', email: 'donoS@ex.com' });
    const intruso = criarUsuario({ username: 'intrusoS', email: 'intrusoS@ex.com' });
    const projeto = criarProjeto({ name: 'Privado', ownerId: dono.id });
    const [sprint] = fakeSupabase.__seed('sp_sprints', { project_id: projeto.id, name: 'Sprint 1' });

    // Act — o intruso tenta listar as histórias do sprint.
    const resposta = await request(app)
      .get(`/api/sprints/${sprint.id}/stories`)
      .set('Authorization', `Bearer ${tokenDe(intruso)}`);

    // Assert — acesso negado.
    expect(resposta.status).toBe(403);
  });
});

// ============================================================================
// PUT /api/stories/:id/status — mover história entre colunas do Kanban (US6)
// ============================================================================
describe('PUT /api/stories/:id/status', () => {
  // Verifica a transição to_do -> in_progress (mover card pra coluna "fazendo").
  it('retorna 200 e muda o status de to_do para in_progress', async () => {
    // Arrange — história nova (status default to_do) no sprint do membro.
    const { user, projeto } = cenarioMembroComProjeto();
    const [story] = fakeSupabase.__seed('sp_user_stories', {
      project_id: projeto.id, title: 'Card do Kanban',
    });

    // Act — move pra in_progress.
    const resposta = await request(app)
      .put(`/api/stories/${story.id}/status`)
      .set('Authorization', `Bearer ${tokenDe(user)}`)
      .send({ status: 'in_progress' });

    // Assert — status atualizado.
    expect(resposta.status).toBe(200);
    expect(resposta.body.status).toBe('in_progress');
  });

  // Verifica a validação: um status que não existe no Kanban é recusado (400).
  it('retorna 400 quando o status é inválido', async () => {
    // Arrange — história válida no projeto do membro.
    const { user, projeto } = cenarioMembroComProjeto();
    const [story] = fakeSupabase.__seed('sp_user_stories', {
      project_id: projeto.id, title: 'Card',
    });

    // Act — tenta um status que não pertence ao conjunto válido.
    const resposta = await request(app)
      .put(`/api/stories/${story.id}/status`)
      .set('Authorization', `Bearer ${tokenDe(user)}`)
      .send({ status: 'voando' });

    // Assert — recusado.
    expect(resposta.status).toBe(400);
  });
});

// ============================================================================
// GET /api/sprints/:sprintId/board — board Kanban agrupado por status (US6)
// ============================================================================
describe('GET /api/sprints/:sprintId/board', () => {
  // Verifica que o board devolve as histórias agrupadas pelas 4 colunas do
  // Kanban, cada card no balde do seu status.
  it('retorna as histórias agrupadas por status', async () => {
    // Arrange — sprint do projeto com uma história em to_do e outra em done.
    const { user, projeto } = cenarioMembroComProjeto();
    const [sprint] = fakeSupabase.__seed('sp_sprints', { project_id: projeto.id, name: 'Sprint 1' });
    fakeSupabase.__seed('sp_user_stories', {
      project_id: projeto.id, title: 'A fazer', sprint_id: sprint.id, status: 'to_do',
    });
    fakeSupabase.__seed('sp_user_stories', {
      project_id: projeto.id, title: 'Feita', sprint_id: sprint.id, status: 'done',
    });

    // Act — pede o board do sprint.
    const resposta = await request(app)
      .get(`/api/sprints/${sprint.id}/board`)
      .set('Authorization', `Bearer ${tokenDe(user)}`);

    // Assert — cada coluna tem a quantidade certa de cards.
    expect(resposta.status).toBe(200);
    expect(resposta.body.to_do).toHaveLength(1);
    expect(resposta.body.done).toHaveLength(1);
  });

  // Verifica que o card no board carrega o assignee_username (nome do responsável),
  // que a rota busca na tabela de usuários e anexa em cada card.
  it('inclui o assignee_username do responsável em cada card', async () => {
    // Arrange — sprint + história atribuída a um usuário que também é membro.
    const { user, projeto } = cenarioMembroComProjeto();
    const [sprint] = fakeSupabase.__seed('sp_sprints', { project_id: projeto.id, name: 'Sprint 1' });
    fakeSupabase.__seed('sp_user_stories', {
      project_id: projeto.id, title: 'Com dono', sprint_id: sprint.id, status: 'to_do', assignee_id: user.id,
    });

    // Act — pede o board.
    const resposta = await request(app)
      .get(`/api/sprints/${sprint.id}/board`)
      .set('Authorization', `Bearer ${tokenDe(user)}`);

    // Assert — o card traz o username do responsável.
    expect(resposta.body.to_do[0].assignee_username).toBe('ana');
  });

  // Verifica o 404: pedir board de sprint inexistente.
  it('retorna 404 quando o sprint não existe', async () => {
    // Arrange — usuário membro, sem o sprint alvo.
    const { user } = cenarioMembroComProjeto();

    // Act — pede board de sprint inexistente.
    const resposta = await request(app)
      .get('/api/sprints/9999/board')
      .set('Authorization', `Bearer ${tokenDe(user)}`);

    // Assert — não encontrado.
    expect(resposta.status).toBe(404);
  });

  // Verifica o 403: o sprint existe, mas quem vê o board NÃO é membro do projeto.
  it('retorna 403 ao ver o board do sprint quando não é membro', async () => {
    // Arrange — sprint de um dono; o intruso não tem membership no projeto.
    const dono = criarUsuario({ username: 'donoB', email: 'donoB@ex.com' });
    const intruso = criarUsuario({ username: 'intrusoB', email: 'intrusoB@ex.com' });
    const projeto = criarProjeto({ name: 'Privado 2', ownerId: dono.id });
    const [sprint] = fakeSupabase.__seed('sp_sprints', { project_id: projeto.id, name: 'Sprint 1' });

    // Act — o intruso tenta ver o board do sprint.
    const resposta = await request(app)
      .get(`/api/sprints/${sprint.id}/board`)
      .set('Authorization', `Bearer ${tokenDe(intruso)}`);

    // Assert — acesso negado.
    expect(resposta.status).toBe(403);
  });
});
