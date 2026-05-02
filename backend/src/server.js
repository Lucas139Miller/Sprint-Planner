const express = require('express');
// CORS permite que o frontend (porta 5173) faça requisições ao backend (porta 3001)
// Sem isso, o navegador bloqueia as requisições por segurança (Same-Origin Policy)
const cors = require('cors');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const invitationRoutes = require('./routes/invitations');
const storyRoutes = require('./routes/stories');
const sprintRoutes = require('./routes/sprints');
const dashboardRoutes = require('./routes/dashboard');

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
app.use('/api/invitations', invitationRoutes);

// Rota simples para verificar se o servidor está no ar (deve vir ANTES do mount de /api)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mount no /api para suportar /projects/:id/stories (rotas aninhadas)
app.use('/api', storyRoutes);

// Mount em /api - rotas de sprints aninhadas em /projects/:id/sprints e /sprints/:id
app.use('/api', sprintRoutes);

// Dashboard montado em /api porque tem rotas aninhadas em /sprints e /projects
app.use('/api', dashboardRoutes);

// Inicia o servidor HTTP na porta definida
app.listen(PORT, () => {
  console.log(`Sprint Planner API rodando na porta ${PORT}`);
});
