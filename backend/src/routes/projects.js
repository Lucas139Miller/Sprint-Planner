const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Todas as rotas deste arquivo exigem autenticação
// O middleware verifica o JWT e coloca os dados do usuário em req.user
router.use(authMiddleware);

// POST /api/projects - Cria um novo projeto
// O usuário logado se torna o dono (owner) e é adicionado automaticamente como PO
router.post('/', (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nome do projeto é obrigatório' });
  }

  try {
    // Insere o projeto com o owner_id do usuário autenticado
    const project = db.prepare(
      'INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)'
    ).run(name, description || '', req.user.id);

    // Adiciona o criador como membro com papel PO automaticamente
    // Assim todo projeto já nasce com pelo menos um membro
    db.prepare(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
    ).run(project.lastInsertRowid, req.user.id, 'PO');

    res.status(201).json({
      id: project.lastInsertRowid,
      name,
      description: description || '',
      owner_id: req.user.id,
      role: 'PO',
    });
  } catch {
    res.status(500).json({ error: 'Erro ao criar projeto' });
  }
});

// GET /api/projects - Lista projetos do usuário logado
// Retorna todos os projetos onde o usuário é dono OU membro
router.get('/', (req, res) => {
  // JOIN com project_members para buscar o papel do usuário em cada projeto
  // WHERE filtra apenas projetos onde o usuário logado é membro
  const projects = db.prepare(`
    SELECT p.id, p.name, p.description, p.owner_id, p.created_at, pm.role
    FROM projects p
    INNER JOIN project_members pm ON pm.project_id = p.id
    WHERE pm.user_id = ?
    ORDER BY p.created_at DESC
  `).all(req.user.id);

  res.json(projects);
});

// POST /api/projects/:id/members - Convida um membro ao projeto
// Apenas o dono do projeto pode convidar. Busca o usuário por email ou username.
router.post('/:id/members', (req, res) => {
  const { identifier, role } = req.body;
  const projectId = req.params.id;

  // Valida campos obrigatórios
  if (!identifier || !role) {
    return res.status(400).json({ error: 'Identificador e papel são obrigatórios' });
  }

  // Verifica se o usuário logado é o dono do projeto
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND owner_id = ?')
    .get(projectId, req.user.id);

  if (!project) {
    return res.status(403).json({ error: 'Apenas o dono do projeto pode convidar membros' });
  }

  // Busca o usuário convidado por email primeiro, depois por username
  const invitedUser = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?')
    .get(identifier, identifier);

  if (!invitedUser) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  try {
    db.prepare(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
    ).run(projectId, invitedUser.id, role);

    res.status(201).json({
      id: invitedUser.id, username: invitedUser.username,
      email: invitedUser.email, role,
    });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Usuário já é membro deste projeto' });
    }
    res.status(500).json({ error: 'Erro ao convidar membro' });
  }
});

// GET /api/projects/:id/members - Lista membros de um projeto
// Qualquer membro do projeto pode ver a lista de membros
router.get('/:id/members', (req, res) => {
  const projectId = req.params.id;

  // Verifica se o usuário logado é membro do projeto
  const isMember = db.prepare(
    'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(projectId, req.user.id);

  if (!isMember) {
    return res.status(403).json({ error: 'Você não é membro deste projeto' });
  }

  // JOIN com users para retornar dados do membro (sem a senha!)
  const members = db.prepare(`
    SELECT u.id, u.username, u.email, pm.role, pm.invited_at
    FROM project_members pm
    INNER JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
  `).all(projectId);

  res.json(members);
});

module.exports = router;
