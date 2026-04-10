const express = require('express');
// CORS permite que o frontend (porta 5173) faça requisições ao backend (porta 3001)
// Sem isso, o navegador bloqueia as requisições por segurança (Same-Origin Policy)
const cors = require('cors');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares - funções que processam TODAS as requisições antes de chegar nas rotas
app.use(cors());           // Libera requisições de qualquer origem
app.use(express.json());   // Converte o body das requisições de JSON para objeto JS

// Monta as rotas de autenticação no prefixo /api/auth
// Então POST /api/auth/login chama a rota '/login' definida em auth.js
app.use('/api/auth', authRoutes);

// Monta as rotas de projetos no prefixo /api/projects (protegidas por JWT)
app.use('/api/projects', projectRoutes);

// Rota simples para verificar se o servidor está no ar
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Inicia o servidor HTTP na porta definida
app.listen(PORT, () => {
  console.log(`Sprint Planner API rodando na porta ${PORT}`);
});
