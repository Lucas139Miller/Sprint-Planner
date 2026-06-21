// ============================================================================
// smoke.test.js — teste de fumaça: prova que app + supertest + fake carregam
// ============================================================================
// "Smoke test" é o teste mais básico possível: se ele passa, sabemos que a
// fundação (Express importado sem listen, supertest fazendo a requisição e o
// banco fake plugado via USE_FAKE_DB) está de pé. Os próximos testes constroem
// em cima disso.
// ============================================================================

const request = require('supertest');
const app = require('../src/app');

describe('GET /api/health', () => {
  // Verifica que a rota pública de saúde responde 200 com { status: "ok" }.
  // Se isto passa, o app subiu e o supertest consegue conversar com ele.
  it('retorna 200 com { status: "ok" }', async () => {
    // Arrange — nada a preparar: health check é público e não usa banco.

    // Act — faz a requisição HTTP no app em memória (sem subir porta real).
    const resposta = await request(app).get('/api/health');

    // Assert — status e corpo esperados.
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ status: 'ok' });
  });
});
