// ============================================================================
// auth.test.js — testes das rotas de autenticação (US1: criar conta e logar)
// ============================================================================
// O que este arquivo cobre (rotas em src/routes/auth.js):
//   POST /api/auth/register -> 201 (ok), 400 (campos faltando), 409 (duplicado)
//   POST /api/auth/login    -> 200 (ok), 400 (campos faltando), 401 (inválido)
//
// Conceitos do Cap. 8 aplicados:
//   - AAA: cada teste tem // Arrange, // Act, // Assert explícitos.
//   - FIRST: testes rápidos, isolados (o setup.js zera o fake em cada teste),
//     repetíveis e auto-verificáveis.
//   - Test doubles: o banco é o FAKE em memória (fakeSupabase) ligado pelo
//     interruptor USE_FAKE_DB=1 no setup.js. Nada de rede nem Supabase real.
//   - Fixtures: o helper criarUsuario() semeia um usuário pronto no fake.
// ============================================================================

const request = require('supertest');     // cliente HTTP que fala com o app em memória
const bcrypt = require('bcryptjs');        // pra gerar o hash do login no caminho feliz
const app = require('../src/app');         // app Express já exportado SEM listen
const { criarUsuario } = require('../tests/helpers');  // fixture: semeia usuário no fake

describe('POST /api/auth/register', () => {
  // Caminho feliz: registrar com dados válidos cria a conta e devolve um token.
  it('retorna 201 com token e usuário quando os dados são válidos', async () => {
    // Arrange — banco vazio (o setup.js já limpou); preparo o corpo do registro.
    const corpo = { username: 'rafael', email: 'rafael@teste.com', password: 'senha123' };

    // Act — chama a rota de registro.
    const resposta = await request(app).post('/api/auth/register').send(corpo);

    // Assert — status 201 e o corpo traz token + dados do usuário criado.
    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({
      token: expect.any(String),
      user: { id: expect.any(Number), username: 'rafael', email: 'rafael@teste.com' },
    });
  });

  // Validação: faltando qualquer campo obrigatório, a rota recusa com 400.
  it('retorna 400 quando falta um campo obrigatório', async () => {
    // Arrange — corpo sem o campo password.
    const corpoIncompleto = { username: 'joao', email: 'joao@teste.com' };

    // Act — tenta registrar sem a senha.
    const resposta = await request(app).post('/api/auth/register').send(corpoIncompleto);

    // Assert — pedido rejeitado com 400.
    expect(resposta.status).toBe(400);
  });

  // Regra de unicidade: não dá pra registrar dois usuários com o MESMO email (UNIQUE 23505).
  it('retorna 409 quando o email já existe', async () => {
    // Arrange — já existe um usuário com este email no banco.
    criarUsuario({ username: 'existente', email: 'duplo@teste.com' });

    // Act — tenta registrar OUTRO usuário com o mesmo email.
    const resposta = await request(app).post('/api/auth/register').send({
      username: 'novo', email: 'duplo@teste.com', password: 'senha123',
    });

    // Assert — bloqueado com 409 (conflito de email).
    expect(resposta.status).toBe(409);
  });

  // Regra de unicidade: o username também é único (UNIQUE 23505).
  it('retorna 409 quando o username já existe', async () => {
    // Arrange — já existe um usuário com este username no banco.
    criarUsuario({ username: 'duplicado', email: 'um@teste.com' });

    // Act — tenta registrar OUTRO usuário reaproveitando o username.
    const resposta = await request(app).post('/api/auth/register').send({
      username: 'duplicado', email: 'dois@teste.com', password: 'senha123',
    });

    // Assert — bloqueado com 409 (conflito de username).
    expect(resposta.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  // Caminho feliz: logar com email e senha corretos devolve um token.
  it('retorna 200 com token quando email e senha estão corretos', async () => {
    // Arrange — semeia um usuário cuja senha gravada é o hash bcrypt de 'senha123'.
    criarUsuario({
      username: 'rafael',
      email: 'rafael@teste.com',
      password: bcrypt.hashSync('senha123', 10),
    });

    // Act — faz login com a senha em texto puro correta.
    const resposta = await request(app).post('/api/auth/login').send({
      email: 'rafael@teste.com', password: 'senha123',
    });

    // Assert — status 200 e um token é retornado.
    expect(resposta.status).toBe(200);
    expect(resposta.body.token).toEqual(expect.any(String));
  });

  // Validação: faltando email ou senha, a rota recusa com 400.
  it('retorna 400 quando falta email ou senha', async () => {
    // Arrange — corpo só com o email, sem a senha.
    const corpoIncompleto = { email: 'rafael@teste.com' };

    // Act — tenta logar sem a senha.
    const resposta = await request(app).post('/api/auth/login').send(corpoIncompleto);

    // Assert — pedido rejeitado com 400.
    expect(resposta.status).toBe(400);
  });

  // Segurança: senha errada para um usuário existente devolve 401 (não autoriza).
  it('retorna 401 quando a senha está errada', async () => {
    // Arrange — usuário existe, com a senha correta sendo 'senha123'.
    criarUsuario({
      username: 'rafael',
      email: 'rafael@teste.com',
      password: bcrypt.hashSync('senha123', 10),
    });

    // Act — tenta logar com uma senha diferente da cadastrada.
    const resposta = await request(app).post('/api/auth/login').send({
      email: 'rafael@teste.com', password: 'senha-errada',
    });

    // Assert — recusado com 401 (credenciais inválidas).
    expect(resposta.status).toBe(401);
  });

  // Segurança: email que não existe também devolve 401 (cobre o lado "!user" do
  // OR em src/routes/auth.js, distinto da senha errada).
  it('retorna 401 quando o usuário não existe', async () => {
    // Arrange — banco vazio: ninguém com este email foi cadastrado.

    // Act — tenta logar com um email inexistente.
    const resposta = await request(app).post('/api/auth/login').send({
      email: 'ninguem@teste.com', password: 'qualquer',
    });

    // Assert — recusado com 401 (credenciais inválidas).
    expect(resposta.status).toBe(401);
  });
});
