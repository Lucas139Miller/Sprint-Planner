// ============================================================================
// ai.test.js — testes das rotas de IA (US8 generate-stories e US9 sprint-summary)
// ============================================================================
//
// O QUE ESTES TESTES PROVAM (leia antes de explicar pro professor):
//   As rotas de IA chamam o Google Gemini pela internet. Nos testes NUNCA
//   queremos chamar a API real (custa crédito e seria lento/instável). Por isso
//   usamos um TEST DOUBLE do tipo "mock/fake": substituímos a função global
//   `fetch` por uma versão controlada por nós (`jest.fn()`). Assim decidimos
//   exatamente o que o "Gemini" responde em cada teste:
//     - resposta de sucesso com JSON de histórias,
//     - resposta com texto inválido (pra testar o erro de parsing),
//     - erro de rede (pra testar o branch de 500).
//
// Padrão dos testes: AAA (Arrange / Act / Assert) bem separado, 1 comentário em
// português no topo de cada teste dizendo o que ele verifica, e nomes de teste
// descritivos em PT-BR. Princípios FIRST: cada teste é isolado (o setup global
// zera o banco fake antes de cada um) e determinístico (o fetch é mockado).
// ============================================================================

const request = require('supertest');
const app = require('../src/app');
const { tokenDe, criarUsuario, criarProjeto, criarMembro } = require('./helpers');
const fakeSupabase = require('./fakeSupabase');

// ----------------------------------------------------------------------------
// Helper local: monta uma resposta "de sucesso" no formato que o Gemini devolve.
// A rota lê data.candidates[0].content.parts[0].text, então é só esse caminho
// que precisamos imitar. `texto` é o que o "modelo" teria respondido.
// ----------------------------------------------------------------------------
function respostaGeminiOk(texto) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: texto }] } }],
    }),
  };
}

describe('Rotas de IA (Gemini mockado)', () => {
  // Antes de cada teste, garantimos a chave da API (a rota recusa sem ela) e
  // substituímos o fetch global por um mock limpo. Como o setup global já dá
  // __reset() no banco, aqui só cuidamos do que é específico da IA.
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'chave-fake-de-teste';
    global.fetch = jest.fn();
  });

  // Depois de cada teste, removemos o fetch mockado para não vazar pro próximo
  // arquivo de teste (boa higiene de test double).
  afterEach(() => {
    delete global.fetch;
  });

  // ==========================================================================
  // US8 — POST /api/ai/generate-stories
  // ==========================================================================
  describe('POST /api/ai/generate-stories (US8)', () => {
    // Verifica que sem o campo "description" a rota recusa com 400, antes mesmo
    // de tentar chamar a IA (validação de entrada).
    it('retorna 400 quando falta a description', async () => {
      // Arrange — usuário válido (o middleware exige user existente) e token.
      const usuario = criarUsuario({ username: 'ana', email: 'ana@x.com' });

      // Act — chama a rota SEM o campo description no corpo.
      const resposta = await request(app)
        .post('/api/ai/generate-stories')
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({});

      // Assert — recusa com 400.
      expect(resposta.status).toBe(400);
    });

    // Verifica que, se o usuário informa um projectId de um projeto do qual NÃO
    // é membro, a rota bloqueia com 403 (autorização por membership).
    it('retorna 403 quando informa projectId de projeto onde nao e membro', async () => {
      // Arrange — usuário existe, projeto existe, mas SEM criar membership.
      const usuario = criarUsuario({ username: 'bia', email: 'bia@x.com' });
      const projeto = criarProjeto({ name: 'Loja', ownerId: 999 });

      // Act — pede histórias passando o projectId do projeto alheio.
      const resposta = await request(app)
        .post('/api/ai/generate-stories')
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ description: 'um app de loja', projectId: projeto.id });

      // Assert — bloqueia com 403.
      expect(resposta.status).toBe(403);
    });

    // Verifica o caminho feliz: o "Gemini" devolve um JSON com histórias e a
    // rota repassa essas histórias parseadas no corpo da resposta.
    it('retorna 200 com as historias parseadas do JSON da IA', async () => {
      // Arrange — usuário válido e o mock do fetch devolvendo histórias em JSON.
      const usuario = criarUsuario({ username: 'caio', email: 'caio@x.com' });
      const jsonDaIa = '{"stories":[{"title":"Como usuário, quero logar para acessar","story_points":3,"label":"feature"}]}';
      global.fetch.mockResolvedValue(respostaGeminiOk(jsonDaIa));

      // Act — pede histórias só com a description (sem projectId, então não checa membership).
      const resposta = await request(app)
        .post('/api/ai/generate-stories')
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ description: 'um app com login' });

      // Assert — 200 e as histórias vieram exatamente como o mock devolveu.
      expect(resposta.status).toBe(200);
      expect(resposta.body.stories).toEqual([
        { title: 'Como usuário, quero logar para acessar', story_points: 3, label: 'feature' },
      ]);
    });

    // Verifica o branch de erro de parsing: se a IA responde um texto que não é
    // JSON válido, a rota cai no catch e retorna 500.
    it('retorna 500 quando a IA responde um texto que nao e JSON valido', async () => {
      // Arrange — o mock devolve texto qualquer (impossível de parsear como JSON).
      const usuario = criarUsuario({ username: 'edu', email: 'edu@x.com' });
      global.fetch.mockResolvedValue(respostaGeminiOk('desculpe, não entendi o pedido'));

      // Act — pede histórias.
      const resposta = await request(app)
        .post('/api/ai/generate-stories')
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ description: 'algo' });

      // Assert — erro de parsing vira 500.
      expect(resposta.status).toBe(500);
    });

    // Verifica o branch do wrapper callGemini: quando o Gemini responde com
    // status != 200 (ex.: 429 cota), o wrapper lança e a rota retorna 500.
    // (cobre o galho `if (!res.ok)` do callGemini, distinto do fetch rejeitando.)
    it('retorna 500 quando o Gemini responde com status nao-OK', async () => {
      // Arrange — chave presente, mas o fetch devolve ok=false (status 429).
      const usuario = criarUsuario({ username: 'fab', email: 'fab@x.com' });
      global.fetch.mockResolvedValue({ ok: false, status: 429, text: async () => 'cota excedida' });

      // Act — pede histórias (passa pelo wrapper callGemini).
      const resposta = await request(app)
        .post('/api/ai/generate-stories')
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ description: 'um app' });

      // Assert — erro do Gemini vira 500.
      expect(resposta.status).toBe(500);
    });
  });

  // ==========================================================================
  // POST /api/ai/project-onboarding — conversa multi-turno
  // ==========================================================================
  describe('POST /api/ai/project-onboarding (onboarding por IA)', () => {
    // Verifica a validação de entrada: sem projectDescription a rota recusa (400).
    it('retorna 400 quando falta projectDescription', async () => {
      // Arrange — usuário válido e token.
      const usuario = criarUsuario({ username: 'ona', email: 'ona@x.com' });

      // Act — chama a rota sem projectDescription.
      const resposta = await request(app)
        .post('/api/ai/project-onboarding')
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ projectName: 'Loja' });

      // Assert — recusa com 400.
      expect(resposta.status).toBe(400);
    });

    // Verifica o caminho "ainda perguntando": com poucos turnos (shouldGenerate
    // false), a IA devolve uma pergunta e a rota responde done=false.
    it('retorna done=false com a pergunta quando ha poucos turnos', async () => {
      // Arrange — usuário válido; a "IA" devolve uma pergunta em texto natural.
      const usuario = criarUsuario({ username: 'pia', email: 'pia@x.com' });
      global.fetch.mockResolvedValue(respostaGeminiOk('Qual o tipo de usuário do app?'));

      // Act — começa a conversa (0 turnos do usuário).
      const resposta = await request(app)
        .post('/api/ai/project-onboarding')
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ projectName: 'Loja', projectDescription: 'um app de loja' });

      // Assert — 200, ainda não terminou e veio a pergunta da IA.
      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({ done: false, message: 'Qual o tipo de usuário do app?' });
    });

    // Verifica o caminho "gerar histórias": após 3+ turnos (shouldGenerate true)
    // a IA devolve JSON e a rota responde done=true com as histórias parseadas.
    it('retorna done=true com as historias apos 3 turnos do usuario', async () => {
      // Arrange — 3 turnos do usuário e a IA devolve JSON com histórias.
      const usuario = criarUsuario({ username: 'qia', email: 'qia@x.com' });
      const jsonDaIa = '{"stories":[{"title":"Como cliente, quero comprar para receber em casa","story_points":5,"label":"feature"}]}';
      global.fetch.mockResolvedValue(respostaGeminiOk(jsonDaIa));
      const messages = [
        { role: 'user', content: 'quero um app de loja' },
        { role: 'user', content: 'para clientes finais' },
        { role: 'user', content: 'com pagamento por pix' },
      ];

      // Act — manda a conversa já com 3 turnos do usuário.
      const resposta = await request(app)
        .post('/api/ai/project-onboarding')
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ projectName: 'Loja', projectDescription: 'um app de loja', messages });

      // Assert — 200, terminou e veio a lista de histórias parseada.
      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({
        done: true,
        stories: [{ title: 'Como cliente, quero comprar para receber em casa', story_points: 5, label: 'feature' }],
      });
    });

    // Verifica o fallback de parsing: mesmo na fase de gerar (3+ turnos), se a IA
    // devolve texto que NÃO é JSON, a rota cai no fallback done=false.
    it('cai no fallback done=false quando a IA nao devolve JSON na fase de gerar', async () => {
      // Arrange — 3 turnos do usuário, mas a IA responde texto livre (não-JSON).
      const usuario = criarUsuario({ username: 'ria', email: 'ria@x.com' });
      global.fetch.mockResolvedValue(respostaGeminiOk('ainda preciso de mais detalhes'));
      const messages = [
        { role: 'user', content: 'um' },
        { role: 'user', content: 'dois' },
        { role: 'user', content: 'tres' },
      ];

      // Act — pede o onboarding com a conversa de 3 turnos.
      const resposta = await request(app)
        .post('/api/ai/project-onboarding')
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ projectDescription: 'algo', messages });

      // Assert — não terminou e devolveu o texto como mensagem (fallback).
      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({ done: false, message: 'ainda preciso de mais detalhes' });
    });

    // Verifica o branch de erro: se a chamada ao Gemini falha, a rota cai no
    // catch próprio do onboarding e retorna 500.
    it('retorna 500 quando a chamada ao Gemini falha', async () => {
      // Arrange — usuário válido e o fetch simula falha de rede.
      const usuario = criarUsuario({ username: 'sia', email: 'sia@x.com' });
      global.fetch.mockRejectedValue(new Error('falha de rede'));

      // Act — pede o onboarding.
      const resposta = await request(app)
        .post('/api/ai/project-onboarding')
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ projectDescription: 'um app' });

      // Assert — falha na IA vira 500.
      expect(resposta.status).toBe(500);
    });
  });

  // ==========================================================================
  // US9 — POST /api/ai/sprint-summary
  // ==========================================================================
  describe('POST /api/ai/sprint-summary (US9)', () => {
    // Verifica que sem o campo "sprintId" a rota recusa com 400 (validação de entrada).
    it('retorna 400 quando falta o sprintId', async () => {
      // Arrange — usuário válido e token.
      const usuario = criarUsuario({ username: 'gui', email: 'gui@x.com' });

      // Act — chama a rota sem o sprintId no corpo.
      const resposta = await request(app)
        .post('/api/ai/sprint-summary')
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({});

      // Assert — recusa com 400.
      expect(resposta.status).toBe(400);
    });

    // Verifica que, se o sprintId não corresponde a nenhum sprint, retorna 404.
    it('retorna 404 quando o sprint nao existe', async () => {
      // Arrange — usuário existe, mas nenhum sprint foi semeado.
      const usuario = criarUsuario({ username: 'ian', email: 'ian@x.com' });

      // Act — pede resumo de um sprint inexistente.
      const resposta = await request(app)
        .post('/api/ai/sprint-summary')
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ sprintId: 12345 });

      // Assert — sprint não encontrado vira 404.
      expect(resposta.status).toBe(404);
    });

    // Verifica que, se o sprint existe mas o usuário não é membro do projeto dele,
    // a rota bloqueia com 403 (autorização por membership).
    it('retorna 403 quando o usuario nao e membro do projeto do sprint', async () => {
      // Arrange — projeto e sprint existem, mas o usuário NÃO é membro do projeto.
      const usuario = criarUsuario({ username: 'jul', email: 'jul@x.com' });
      const projeto = criarProjeto({ name: 'Alheio', ownerId: 999 });
      const [sprint] = fakeSupabase.__seed('sp_sprints', { project_id: projeto.id, name: 'Sprint 1' });

      // Act — pede resumo do sprint do projeto alheio.
      const resposta = await request(app)
        .post('/api/ai/sprint-summary')
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ sprintId: sprint.id });

      // Assert — não-membro vira 403.
      expect(resposta.status).toBe(403);
    });

    // Verifica o caminho feliz: sprint com histórias retorna 200 com o resumo da
    // IA e as métricas agregadas calculadas pela própria rota.
    it('retorna 200 com summary da IA e metrics calculadas das historias', async () => {
      // Arrange — usuário membro, projeto, sprint e duas histórias (uma "done").
      const usuario = criarUsuario({ username: 'lia', email: 'lia@x.com' });
      const projeto = criarProjeto({ name: 'Projeto X', ownerId: usuario.id });
      criarMembro({ projectId: projeto.id, userId: usuario.id });
      const [sprint] = fakeSupabase.__seed('sp_sprints', { project_id: projeto.id, name: 'Sprint 1', goal: 'entregar login' });
      fakeSupabase.__seed('sp_user_stories', [
        { project_id: projeto.id, sprint_id: sprint.id, title: 'História A', status: 'done', story_points: 5 },
        { project_id: projeto.id, sprint_id: sprint.id, title: 'História B', status: 'in_progress', story_points: 3 },
      ]);
      global.fetch.mockResolvedValue(respostaGeminiOk('Resumo do sprint: foi bem.'));

      // Act — pede o resumo do sprint.
      const resposta = await request(app)
        .post('/api/ai/sprint-summary')
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ sprintId: sprint.id });

      // Assert — 200, com o texto da IA e as métricas certas (8 planejados, 5 feitos, 1 em andamento).
      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({
        summary: 'Resumo do sprint: foi bem.',
        metrics: { totalPoints: 8, donePoints: 5, storiesCount: 2, inProgressCount: 1, inReviewCount: 0 },
      });
    });

    // Verifica o caso "sprint sem histórias": a rota responde 200 com uma mensagem
    // pronta e NÃO chama a IA (economiza crédito quando não há o que resumir).
    it('retorna 200 com mensagem padrao e sem chamar a IA quando o sprint nao tem historias', async () => {
      // Arrange — sprint do projeto do usuário (que é membro), mas sem histórias.
      const usuario = criarUsuario({ username: 'meg', email: 'meg@x.com' });
      const projeto = criarProjeto({ name: 'Projeto Y', ownerId: usuario.id });
      criarMembro({ projectId: projeto.id, userId: usuario.id });
      const [sprint] = fakeSupabase.__seed('sp_sprints', { project_id: projeto.id, name: 'Sprint vazio' });

      // Act — pede o resumo de um sprint sem histórias.
      const resposta = await request(app)
        .post('/api/ai/sprint-summary')
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ sprintId: sprint.id });

      // Assert — 200 com a mensagem padrão e o fetch (IA) nunca foi chamado.
      expect(resposta.status).toBe(200);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    // Verifica o branch de erro: com histórias no sprint, se a chamada ao Gemini
    // falha, a rota cai no catch e retorna 500.
    it('retorna 500 quando a chamada ao Gemini falha no resumo', async () => {
      // Arrange — usuário membro, sprint com 1 história, mas o fetch rejeita.
      const usuario = criarUsuario({ username: 'noa', email: 'noa@x.com' });
      const projeto = criarProjeto({ name: 'Projeto Z', ownerId: usuario.id });
      criarMembro({ projectId: projeto.id, userId: usuario.id });
      const [sprint] = fakeSupabase.__seed('sp_sprints', { project_id: projeto.id, name: 'Sprint 1' });
      fakeSupabase.__seed('sp_user_stories', { project_id: projeto.id, sprint_id: sprint.id, title: 'História', status: 'to_do', story_points: 2 });
      global.fetch.mockRejectedValue(new Error('falha de rede'));

      // Act — pede o resumo do sprint.
      const resposta = await request(app)
        .post('/api/ai/sprint-summary')
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ sprintId: sprint.id });

      // Assert — falha na IA vira 500.
      expect(resposta.status).toBe(500);
    });
  });
});
