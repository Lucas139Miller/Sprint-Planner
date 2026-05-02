// Configuração do Express isolada para ser reutilizável tanto em dev local
// (start.js chama listen) quanto em serverless da Vercel (api/index.js exporta).
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const { router: projectRoutes } = require('./routes/projects');
const invitationRoutes = require('./routes/invitations');
const storyRoutes = require('./routes/stories');
const sprintRoutes = require('./routes/sprints');
const dashboardRoutes = require('./routes/dashboard');
const aiRoutes = require('./routes/ai');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/invitations', invitationRoutes);

// Health check antes do mount genérico /api para não conflitar com middleware
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', storyRoutes);
app.use('/api', sprintRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/ai', aiRoutes);

module.exports = app;
