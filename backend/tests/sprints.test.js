// ============================================================================
// sprints.test.js — testes das rotas de SPRINT (src/routes/sprints.js)
// ============================================================================
// O que estes testes cobrem (US4 — criar sprint com datas):
//   - POST   /api/projects/:projectId/sprints   (criar: 201 / 400 / 403)
//   - GET    /api/projects/:projectId/sprints   (listar: 200 / 403)
//   - PUT    /api/sprints/:id                    (atualizar parcial: 200 / 404 / 403)
//   - DELETE /api/sprints/:id                    (deletar: 200 / 404)
//
// Como lemos estes testes (padrão do Cap. 8):
//   - Cada teste segue AAA: // Arrange (prepara), // Act (executa), // Assert (verifica).
//   - O banco é um FAKE em memória (test double), zerado antes de cada teste.
//   - Usamos FIXTURES/helpers (criarUsuario, criarProjeto, criarMembro, tokenDe)
//     para não repetir a "burocracia" de preparar dados em cada teste.
//   - supertest faz a requisição HTTP no app em memória (sem subir porta real).
// ============================================================================

const request = require('supertest');
const app = require('../src/app');
const { tokenDe, criarUsuario, criarProjeto, criarMembro } = require('./helpers');

describe('Rotas de Sprint', () => {
  // --------------------------------------------------------------------------
  // POST /api/projects/:projectId/sprints — criar sprint
  // --------------------------------------------------------------------------
  describe('POST /api/projects/:projectId/sprints (criar sprint)', () => {
    // Verifica o caminho feliz: membro do projeto cria um sprint e recebe 201
    // com o sprint criado já com o status padrão "planning" aplicado pelo banco.
    it('retorna 201 e cria o sprint com status padrao "planning" quando o usuario e membro', async () => {
      // Arrange — usuario membro de um projeto.
      const usuario = criarUsuario({ username: 'ana', email: 'ana@test.com' });
      const projeto = criarProjeto({ name: 'App', ownerId: usuario.id });
      criarMembro({ projectId: projeto.id, userId: usuario.id });

      // Act — cria o sprint só com o nome (deixa o status default agir).
      const resposta = await request(app)
        .post(`/api/projects/${projeto.id}/sprints`)
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ name: 'Sprint 1' });

      // Assert — 201 e sprint criado com status "planning" e o nome enviado.
      expect(resposta.status).toBe(201);
      expect(resposta.body).toMatchObject({ name: 'Sprint 1', status: 'planning' });
    });

    // Verifica a validacao de entrada: sem o campo "name" a rota recusa com 400
    // ANTES mesmo de checar membership (regra de negocio: nome e obrigatorio).
    it('retorna 400 quando o nome do sprint nao e enviado', async () => {
      // Arrange — usuario membro (para garantir que o 400 vem da falta de nome, nao do acesso).
      const usuario = criarUsuario({ username: 'bia', email: 'bia@test.com' });
      const projeto = criarProjeto({ name: 'App', ownerId: usuario.id });
      criarMembro({ projectId: projeto.id, userId: usuario.id });

      // Act — envia o body sem "name".
      const resposta = await request(app)
        .post(`/api/projects/${projeto.id}/sprints`)
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ goal: 'sem nome' });

      // Assert — 400 (Nome e obrigatorio).
      expect(resposta.status).toBe(400);
    });

    // Verifica a regra de acesso: quem NAO e membro do projeto nao pode criar sprint (403).
    it('retorna 403 quando o usuario nao e membro do projeto', async () => {
      // Arrange — usuario existe, mas NAO foi adicionado como membro do projeto.
      const usuario = criarUsuario({ username: 'caio', email: 'caio@test.com' });
      const projeto = criarProjeto({ name: 'App', ownerId: usuario.id });

      // Act — tenta criar o sprint com nome valido.
      const resposta = await request(app)
        .post(`/api/projects/${projeto.id}/sprints`)
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ name: 'Sprint 1' });

      // Assert — 403 (nao e membro deste projeto).
      expect(resposta.status).toBe(403);
    });
  });

  // --------------------------------------------------------------------------
  // GET /api/projects/:projectId/sprints — listar sprints
  // --------------------------------------------------------------------------
  describe('GET /api/projects/:projectId/sprints (listar sprints)', () => {
    // Verifica que um membro consegue listar os sprints do projeto (retorna a lista).
    it('retorna 200 com a lista de sprints do projeto para um membro', async () => {
      // Arrange — usuario membro + um sprint ja semeado no projeto.
      const usuario = criarUsuario({ username: 'duda', email: 'duda@test.com' });
      const projeto = criarProjeto({ name: 'App', ownerId: usuario.id });
      criarMembro({ projectId: projeto.id, userId: usuario.id });
      await request(app)
        .post(`/api/projects/${projeto.id}/sprints`)
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ name: 'Sprint 1' });

      // Act — lista os sprints do projeto.
      const resposta = await request(app)
        .get(`/api/projects/${projeto.id}/sprints`)
        .set('Authorization', `Bearer ${tokenDe(usuario)}`);

      // Assert — 200 e a lista tem o sprint criado.
      expect(resposta.status).toBe(200);
      expect(resposta.body).toHaveLength(1);
    });

    // Verifica a regra de acesso na listagem: nao-membro recebe 403.
    it('retorna 403 quando quem lista nao e membro do projeto', async () => {
      // Arrange — usuario existe, mas nao e membro.
      const usuario = criarUsuario({ username: 'edu', email: 'edu@test.com' });
      const projeto = criarProjeto({ name: 'App', ownerId: usuario.id });

      // Act — tenta listar os sprints.
      const resposta = await request(app)
        .get(`/api/projects/${projeto.id}/sprints`)
        .set('Authorization', `Bearer ${tokenDe(usuario)}`);

      // Assert — 403 (nao e membro deste projeto).
      expect(resposta.status).toBe(403);
    });
  });

  // --------------------------------------------------------------------------
  // PUT /api/sprints/:id — atualizacao parcial
  // --------------------------------------------------------------------------
  describe('PUT /api/sprints/:id (atualizar sprint)', () => {
    // Verifica a atualizacao parcial: membro muda so o "goal" e a resposta traz o valor novo.
    it('retorna 200 e atualiza apenas os campos enviados quando o usuario e membro', async () => {
      // Arrange — usuario membro + um sprint criado para depois atualizar.
      const usuario = criarUsuario({ username: 'flavia', email: 'flavia@test.com' });
      const projeto = criarProjeto({ name: 'App', ownerId: usuario.id });
      criarMembro({ projectId: projeto.id, userId: usuario.id });
      const criado = await request(app)
        .post(`/api/projects/${projeto.id}/sprints`)
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ name: 'Sprint 1', goal: 'objetivo antigo' });

      // Act — atualiza somente o campo "goal".
      const resposta = await request(app)
        .put(`/api/sprints/${criado.body.id}`)
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ goal: 'objetivo novo' });

      // Assert — 200 e o goal foi atualizado (e o nome continua o mesmo).
      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({ name: 'Sprint 1', goal: 'objetivo novo' });
    });

    // Verifica que tentar atualizar um sprint que nao existe retorna 404.
    it('retorna 404 quando o sprint nao existe', async () => {
      // Arrange — usuario valido, mas o id 999 nao corresponde a nenhum sprint.
      const usuario = criarUsuario({ username: 'gil', email: 'gil@test.com' });

      // Act — tenta atualizar um sprint inexistente.
      const resposta = await request(app)
        .put('/api/sprints/999')
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ goal: 'qualquer' });

      // Assert — 404 (Sprint nao encontrado).
      expect(resposta.status).toBe(404);
    });

    // Verifica a regra de acesso na atualizacao: o sprint existe, mas quem edita
    // nao e membro do projeto dele -> 403.
    it('retorna 403 quando o usuario nao e membro do projeto do sprint', async () => {
      // Arrange — o sprint foi criado pelo dono; um SEGUNDO usuario (nao-membro) tentara editar.
      const dono = criarUsuario({ username: 'helena', email: 'helena@test.com' });
      const projeto = criarProjeto({ name: 'App', ownerId: dono.id });
      criarMembro({ projectId: projeto.id, userId: dono.id });
      const criado = await request(app)
        .post(`/api/projects/${projeto.id}/sprints`)
        .set('Authorization', `Bearer ${tokenDe(dono)}`)
        .send({ name: 'Sprint 1' });
      const estranho = criarUsuario({ username: 'igor', email: 'igor@test.com' });

      // Act — o usuario estranho (nao-membro) tenta atualizar o sprint.
      const resposta = await request(app)
        .put(`/api/sprints/${criado.body.id}`)
        .set('Authorization', `Bearer ${tokenDe(estranho)}`)
        .send({ goal: 'invasao' });

      // Assert — 403 (nao e membro deste projeto).
      expect(resposta.status).toBe(403);
    });
  });

  // --------------------------------------------------------------------------
  // DELETE /api/sprints/:id — remover sprint
  // --------------------------------------------------------------------------
  describe('DELETE /api/sprints/:id (deletar sprint)', () => {
    // Verifica que um membro consegue deletar o sprint e recebe { success: true }.
    it('retorna 200 com { success: true } quando o membro deleta o sprint', async () => {
      // Arrange — usuario membro + um sprint criado para deletar.
      const usuario = criarUsuario({ username: 'joana', email: 'joana@test.com' });
      const projeto = criarProjeto({ name: 'App', ownerId: usuario.id });
      criarMembro({ projectId: projeto.id, userId: usuario.id });
      const criado = await request(app)
        .post(`/api/projects/${projeto.id}/sprints`)
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ name: 'Sprint 1' });

      // Act — deleta o sprint recem-criado.
      const resposta = await request(app)
        .delete(`/api/sprints/${criado.body.id}`)
        .set('Authorization', `Bearer ${tokenDe(usuario)}`);

      // Assert — 200 com confirmacao de sucesso.
      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({ success: true });
    });

    // Verifica que tentar deletar um sprint que nao existe retorna 404.
    it('retorna 404 quando o sprint a deletar nao existe', async () => {
      // Arrange — usuario valido, mas o id 999 nao corresponde a nenhum sprint.
      const usuario = criarUsuario({ username: 'kleber', email: 'kleber@test.com' });

      // Act — tenta deletar um sprint inexistente.
      const resposta = await request(app)
        .delete('/api/sprints/999')
        .set('Authorization', `Bearer ${tokenDe(usuario)}`);

      // Assert — 404 (Sprint nao encontrado).
      expect(resposta.status).toBe(404);
    });
  });
});
