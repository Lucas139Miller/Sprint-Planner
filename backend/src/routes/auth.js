const express = require('express');
// bcrypt: biblioteca para criar hashes de senha seguros
// Um hash é uma transformação irreversível: "123456" → "$2a$10$xK8f..."
// Mesmo com o hash, não é possível descobrir a senha original
const bcrypt = require('bcryptjs');
// JWT (JSON Web Token): gera tokens de autenticação assinados digitalmente
// O token contém dados do usuário (id, username) e uma assinatura que garante que não foi alterado
const jwt = require('jsonwebtoken');
const db = require('../database');

const router = express.Router();

// Chave secreta usada para assinar os tokens JWT
// Em produção, deve vir de uma variável de ambiente segura
const JWT_SECRET = process.env.JWT_SECRET || 'sprint-planner-secret-dev';

// ============================================
// POST /api/auth/register - Cria nova conta
// ============================================
// Recebe: { username, email, password }
// Retorna: { token, user: { id, username, email } }
router.post('/register', (req, res) => {
  // Desestrutura os dados enviados pelo frontend no body da requisição
  const { username, email, password } = req.body;

  // Validação: todos os campos são obrigatórios
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  // Gera o hash da senha com bcrypt
  // O número 10 é o "salt rounds" - quanto maior, mais seguro mas mais lento
  // Isso transforma "123456" em algo como "$2a$10$xK8f..." (60 caracteres)
  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    // Insere o novo usuário no banco de dados
    // Os "?" são placeholders que previnem SQL Injection (ataque de segurança)
    const stmt = db.prepare(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)'
    );
    const result = stmt.run(username, email, hashedPassword);

    // Gera um token JWT contendo o id e username do usuário
    // Este token será enviado pelo frontend em futuras requisições para provar que está logado
    // expiresIn: '7d' = o token expira em 7 dias, depois disso o usuário precisa logar novamente
    const token = jwt.sign({ id: result.lastInsertRowid, username }, JWT_SECRET, {
      expiresIn: '7d',
    });

    // Retorna status 201 (Created) com o token e dados do usuário (sem a senha!)
    res.status(201).json({ token, user: { id: result.lastInsertRowid, username, email } });
  } catch (err) {
    // Se o username ou email já existe no banco, o SQLite lança erro de UNIQUE constraint
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Username ou email já cadastrado' });
    }
    // Qualquer outro erro inesperado
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

// ============================================
// POST /api/auth/login - Autentica usuário
// ============================================
// Recebe: { email, password }
// Retorna: { token, user: { id, username, email } }
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Validação: email e senha são obrigatórios
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  // Busca o usuário no banco pelo email
  // .get() retorna apenas um resultado (ou undefined se não encontrar)
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  // Verifica se o usuário existe E se a senha está correta
  // bcrypt.compareSync compara a senha digitada com o hash salvo no banco
  // Exemplo: compareSync("123456", "$2a$10$xK8f...") → true
  // Usamos a mesma mensagem genérica para email não encontrado e senha errada
  // Isso evita que um atacante descubra quais emails estão cadastrados
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  // Se chegou aqui, email e senha estão corretos - gera o token JWT
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '7d',
  });

  // Retorna o token e dados públicos do usuário (sem a senha!)
  res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
});

module.exports = router;
