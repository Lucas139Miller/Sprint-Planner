const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sprint-planner-secret-dev';

// POST /api/auth/register - Cria nova conta de usuário no Supabase
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  // Insert no Supabase. .select().single() retorna o registro criado.
  const { data: user, error } = await supabase
    .from('sp_users')
    .insert({ username, email, password: hashedPassword })
    .select('id, username, email')
    .single();

  // Erro 23505 do Postgres = violação de UNIQUE (username/email duplicado)
  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Username ou email já cadastrado' });
    }
    return res.status(500).json({ error: 'Erro ao criar conta' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '7d',
  });

  res.status(201).json({ token, user });
});

// POST /api/auth/login - Autentica usuário existente
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  // Busca o usuário pelo email no Supabase
  const { data: user } = await supabase
    .from('sp_users')
    .select('*')
    .eq('email', email)
    .maybeSingle();   // maybeSingle não dá erro se não achar (retorna null)

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '7d',
  });

  res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
});

module.exports = router;
