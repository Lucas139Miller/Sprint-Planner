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

module.exports = router;
