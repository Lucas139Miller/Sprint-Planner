// ============================================================================
// middleware.unit.test.js — TESTE DE UNIDADE do authMiddleware (porteiro JWT)
// ============================================================================
// O QUE É ESTE ARQUIVO (pra explicar pro professor / pra equipe):
//   Diferente dos testes de INTEGRAÇÃO (middleware.test.js), que sobem o app
//   inteiro com supertest e batem numa rota real, aqui testamos o middleware
//   COMO UNIDADE ISOLADA: chamamos authMiddleware(req, res, next) DIRETO, com
//   req/res/next "de mentira" (objetos simples + jest.fn). Não há app, não há
//   supertest, não há rede, não há HTTP.
//
//   FUNDAMENTAÇÃO (Cap. 8 — Eng. de Software Moderna, Marco Tulio Valente):
//   - "Testes de Unidade": exercitam uma unidade isolada das suas dependências.
//     A única dependência externa do middleware é o BANCO. Aqui ele é dublado
//     pelo fakeSupabase (USE_FAKE_DB=1) — um MOCK/STUB escrito à mão que
//     implementa a MESMA interface encadeável do supabase-js e devolve dados
//     prontos, SEM acessar servidor remoto. É exatamente o padrão de mock do
//     livro: "um mock deve implementar a interface do objeto real... retornando
//     [dados] sem acessar servidores remotos".
//   - FIRST: cada teste é rápido (sem I/O), isolado (banco zerado no beforeEach
//     global do setup.js) e determinístico (token assinado com JWT_SECRET fixo).
//
//   COMPORTAMENTO TESTADO (4 caminhos do porteiro):
//     1) sem header Authorization        -> 401 "Token não fornecido"
//     2) token inválido (não verifica)   -> 401 "Token inválido ou expirado"
//     3) token válido + user NÃO existe   -> 401 "Usuário não encontrado..."
//     4) token válido + user existe       -> chama next() e seta req.user
//
//   CUIDADO COM O CACHE: o middleware tem um Map de cache de user_id por 60s,
//   no escopo do MÓDULO (não é resetado entre testes). Para os testes ficarem
//   independentes, cada caso usa um id de usuário ÚNICO e alto — assim nenhum
//   teste "vê" o usuário cacheado por outro.
// ============================================================================

const jwt = require('jsonwebtoken');

// A unidade sob teste, chamada diretamente (sem subir o app).
const authMiddleware = require('../../src/middleware/auth');

// O banco DUBLADO (mock/stub em memória). Como USE_FAKE_DB=1 (setup.js), o
// require('../database') de dentro do middleware resolve para ESTE mesmo módulo,
// então semear aqui é o que o middleware enxerga ao consultar sp_users.
const fakeSupabase = require('../fakeSupabase');

// Mesmo segredo fixado em setup.js: tokens assinados aqui batem com o que o
// middleware espera ao chamar jwt.verify.
const JWT_SECRET = 'sprint-planner-secret-dev';

// ----------------------------------------------------------------------------
// Helpers de DUBLÊ (test doubles) para req/res/next.
// ----------------------------------------------------------------------------

// res falso: status(code) guarda o código e devolve o próprio res (para o
// encadeamento res.status(401).json({...}) funcionar igual ao Express); json(body)
// guarda o corpo. Ambos são jest.fn para permitir asserts de "foi chamado com".
function criarRes() {
  const res = {};
  res.statusCode = undefined;
  res.body = undefined;
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res; // permite .status(...).json(...)
  });
  res.json = jest.fn((body) => {
    res.body = body;
    return res;
  });
  return res;
}

// req falso: só precisa do objeto headers (é tudo que o middleware lê).
function criarReq(headers = {}) {
  return { headers };
}

describe('UNIDADE: authMiddleware(req, res, next) chamado direto', () => {
  // -------------------------------------------------------------------------
  // 1) Classe de equivalência INVÁLIDA: requisição sem credencial nenhuma.
  //    Técnica: Particionamento por Classes de Equivalência (entrada "sem header").
  //    Verifica que, sem o header Authorization, o porteiro barra com 401 e NÃO
  //    chama next() (não deixa passar).
  // -------------------------------------------------------------------------
  it('sem header Authorization -> 401 "Token não fornecido" e não chama next', async () => {
    // Arrange — req sem headers de autenticação; res/next dublês.
    const req = criarReq({}); // sem authorization
    const res = criarRes();
    const next = jest.fn();

    // Act — chama o middleware diretamente.
    await authMiddleware(req, res, next);

    // Assert — barrou com 401, mensagem correta e não seguiu o fluxo.
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token não fornecido' });
    expect(next).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 2) Classe de equivalência INVÁLIDA: token presente porém não decodificável.
  //    Técnica: Classe de Equivalência (entrada "token corrompido") — qualquer
  //    string que jwt.verify rejeite cai na mesma classe.
  //    Verifica que jwt.verify lança, o catch responde 401 e next não é chamado.
  // -------------------------------------------------------------------------
  it('token inválido -> 401 "Token inválido ou expirado" e não chama next', async () => {
    // Arrange — header com um "token" que não é um JWT assinado válido.
    const req = criarReq({ authorization: 'Bearer isto-nao-e-um-jwt' });
    const res = criarRes();
    const next = jest.fn();

    // Act
    await authMiddleware(req, res, next);

    // Assert — 401 do branch de catch, sem deixar passar.
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido ou expirado' });
    expect(next).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 3) Classe de equivalência INVÁLIDA na DEPENDÊNCIA: token bem assinado, mas
  //    apontando para usuário que NÃO existe no banco (conta deletada/banco novo).
  //    Técnica: Classe de Equivalência (consulta ao banco dublado retorna vazio).
  //    Aqui o banco MOCKADO devolve "nenhuma linha" para sp_users, então o
  //    middleware barra com 401. id alto/único (97001) evita o cache de 60s.
  // -------------------------------------------------------------------------
  it('token válido mas usuário inexistente no banco -> 401 "Usuário não encontrado..."', async () => {
    // Arrange — token válido de um id fantasma que nunca foi semeado no fake.
    const idFantasma = 97001;
    const token = jwt.sign({ id: idFantasma, username: 'fantasma' }, JWT_SECRET);
    const req = criarReq({ authorization: `Bearer ${token}` });
    const res = criarRes();
    const next = jest.fn();

    // Act
    await authMiddleware(req, res, next);

    // Assert — passou pelo jwt.verify, mas o banco (mock) não tem o user -> 401.
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Usuário não encontrado. Faça login novamente.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 4) Caminho FELIZ (classe VÁLIDA): token bem assinado + usuário existente.
  //    Técnica: Caminho feliz / Classe de Equivalência válida.
  //    Aqui o banco MOCKADO contém o usuário; o middleware deve chamar next()
  //    UMA vez, NÃO responder com erro e anexar req.user com o payload do token.
  //    id alto/único (97002) para isolar do cache de 60s do módulo.
  // -------------------------------------------------------------------------
  it('token válido + usuário existe -> chama next() e seta req.user', async () => {
    // Arrange — semeia o usuário no banco dublado e assina um token para ele.
    // O fake gera o id (auto-incremento); pegamos o id REAL devolvido para
    // assinar o token, garantindo que jwt.verify case com a consulta a sp_users.
    const [usuario] = fakeSupabase.__seed('sp_users', {
      username: 'maria', email: 'maria@exemplo.com', password: 'hash-fake',
    });
    const token = jwt.sign({ id: usuario.id, username: usuario.username }, JWT_SECRET);
    const req = criarReq({ authorization: `Bearer ${token}` });
    const res = criarRes();
    const next = jest.fn();

    // Act
    await authMiddleware(req, res, next);

    // Assert — deixou passar (next 1x), sem responder erro, com req.user setado.
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: usuario.id, username: 'maria' });
  });
});
