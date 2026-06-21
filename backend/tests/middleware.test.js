// ============================================================================
// middleware.test.js — testes do middleware de autenticação (src/middleware/auth.js)
// ============================================================================
// O QUE ESTAMOS TESTANDO (pra explicar pro professor):
//   O authMiddleware é o "porteiro" de TODAS as rotas protegidas. Antes de a
//   requisição chegar na rota, ele precisa decidir: deixa passar ou barra com 401?
//   Ele barra em três situações e libera em uma:
//     1) não veio o header Authorization        -> 401 "Token não fornecido"
//     2) veio um token, mas ele é inválido       -> 401 "Token inválido ou expirado"
//     3) token válido, mas o user não existe mais -> 401 "Usuário não encontrado..."
//     4) token válido + user existe no banco      -> deixa passar (200)
//
//   Para exercitar o porteiro usamos uma rota protegida REAL e simples:
//   GET /api/invitations. Essa rota só exige estar autenticado (não exige ser
//   membro de projeto). Como o usuário do teste não tem nenhum convite, a rota
//   responde 200 com lista vazia [] — perfeito para isolar o comportamento do
//   middleware sem ruído de outras regras de negócio.
//
//   Seguimos o padrão AAA (Arrange / Act / Assert) e FIRST: cada teste é
//   independente (o beforeEach global limpa o banco fake antes de cada um).
// ============================================================================

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { tokenDe, criarUsuario } = require('./helpers');

// Rota protegida usada como "cobaia" para acionar o middleware.
const ROTA_PROTEGIDA = '/api/invitations';

describe('authMiddleware (porteiro das rotas protegidas)', () => {
  // Verifica que, SEM o header Authorization, o porteiro barra com 401.
  // É o caso de alguém tentando acessar uma rota protegida sem fazer login.
  it('retorna 401 quando não envia o header Authorization', async () => {
    // Arrange — nada a preparar: a requisição vai SEM header de autenticação.

    // Act — chama a rota protegida sem mandar token.
    const resposta = await request(app).get(ROTA_PROTEGIDA);

    // Assert — porteiro barra com 401 e mensagem de token ausente.
    expect(resposta.status).toBe(401);
    expect(resposta.body.error).toBe('Token não fornecido');
  });

  // Verifica que um token QUEBRADO (não decodificável) é barrado com 401.
  // Simula um token adulterado ou lixo enviado no header.
  it('retorna 401 quando o token é inválido', async () => {
    // Arrange — um texto qualquer que NÃO é um JWT válido.
    const tokenInvalido = 'isto-nao-e-um-jwt-de-verdade';

    // Act — manda esse token quebrado no header Authorization.
    const resposta = await request(app)
      .get(ROTA_PROTEGIDA)
      .set('Authorization', `Bearer ${tokenInvalido}`);

    // Assert — porteiro barra com 401 e mensagem de token inválido.
    expect(resposta.status).toBe(401);
    expect(resposta.body.error).toBe('Token inválido ou expirado');
  });

  // Verifica que um token BEM assinado, mas de um usuário que não existe no
  // banco, é barrado com 401. Isso protege contra token de conta deletada.
  // Usamos um id ALTO (99999) que nenhum teste semeia, para evitar o cache de
  // 60s do middleware (ids semeados reiniciam do 1 a cada teste).
  it('retorna 401 quando o usuário do token não existe no banco', async () => {
    // Arrange — token válido apontando para um usuário inexistente (id fantasma).
    const usuarioFantasma = { id: 99999, username: 'fantasma' };
    const token = tokenDe(usuarioFantasma);

    // Act — manda o token válido, mas o user nunca foi semeado no fake.
    const resposta = await request(app)
      .get(ROTA_PROTEGIDA)
      .set('Authorization', `Bearer ${token}`);

    // Assert — porteiro barra com 401 e mensagem de usuário não encontrado.
    expect(resposta.status).toBe(401);
    expect(resposta.body.error).toBe('Usuário não encontrado. Faça login novamente.');
  });

  // Verifica o caminho FELIZ: token válido + usuário existente no banco => passa.
  // O middleware libera e a rota responde 200 (lista vazia, pois não há convites).
  it('retorna 200 quando o token é válido e o usuário existe no banco', async () => {
    // Arrange — cria o usuário no fake e assina um token válido para ele.
    const usuario = criarUsuario({ username: 'maria', email: 'maria@exemplo.com' });
    const token = tokenDe(usuario);

    // Act — chama a rota protegida com o token do usuário existente.
    const resposta = await request(app)
      .get(ROTA_PROTEGIDA)
      .set('Authorization', `Bearer ${token}`);

    // Assert — porteiro deixou passar; a rota respondeu 200.
    expect(resposta.status).toBe(200);
  });
});
