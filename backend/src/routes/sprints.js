const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
// Aplica JWT em todas as rotas deste router (todas exigem login)
router.use(authMiddleware);

// Helper: verifica se o usuário é membro do projeto
// Mesma lógica usada em stories.js - sprints só podem ser geridos por membros
function isMember(projectId, userId) {
  return db.prepare(
    'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(projectId, userId);
}

// Helper: busca um sprint + valida que o usuário é membro do projeto dele
// Retorna { sprint, error } - se error existe, deve responder com error
// Pattern reutilizado de stories.js para manter validação consistente
function getSprintAndCheckAccess(sprintId, userId) {
  const sprint = db.prepare('SELECT * FROM sprints WHERE id = ?').get(sprintId);
  if (!sprint) return { error: { status: 404, message: 'Sprint não encontrado' } };
  if (!isMember(sprint.project_id, userId)) {
    return { error: { status: 403, message: 'Você não é membro deste projeto' } };
  }
  return { sprint };
}

// POST /api/projects/:projectId/sprints - Cria um novo sprint
// Apenas membros do projeto podem criar sprints (qualquer papel)
router.post('/projects/:projectId/sprints', (req, res) => {
  const { projectId } = req.params;
  const { name, goal, start_date, end_date, status } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }

  // Garante que o usuário tem acesso ao projeto antes de criar
  if (!isMember(projectId, req.user.id)) {
    return res.status(403).json({ error: 'Você não é membro deste projeto' });
  }

  // status é opcional no body - default 'planning' é aplicado pelo banco
  const result = db.prepare(`
    INSERT INTO sprints (project_id, name, goal, start_date, end_date, status)
    VALUES (?, ?, ?, ?, ?, COALESCE(?, 'planning'))
  `).run(projectId, name, goal || '', start_date || null, end_date || null, status || null);

  // Retorna o sprint completo (busca de novo para pegar created_at e status default)
  const sprint = db.prepare('SELECT * FROM sprints WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(sprint);
});

// GET /api/projects/:projectId/sprints - Lista sprints do projeto
// Ordena por created_at DESC (mais recente primeiro - sprints ativos costumam ser os recentes)
router.get('/projects/:projectId/sprints', (req, res) => {
  const { projectId } = req.params;

  if (!isMember(projectId, req.user.id)) {
    return res.status(403).json({ error: 'Você não é membro deste projeto' });
  }

  const sprints = db.prepare(`
    SELECT * FROM sprints
    WHERE project_id = ?
    ORDER BY created_at DESC
  `).all(projectId);

  res.json(sprints);
});

// PUT /api/sprints/:id - Atualiza um sprint (parcial)
// Aceita campos parciais via COALESCE - mesmo padrão de stories.js
router.put('/sprints/:id', (req, res) => {
  const { sprint, error } = getSprintAndCheckAccess(req.params.id, req.user.id);
  if (error) return res.status(error.status).json({ error: error.message });

  const { name, goal, start_date, end_date, status } = req.body;

  // COALESCE: usa o novo valor se enviado, mantém o antigo se ausente (NULL)
  // Permite atualizar só o status (start/active/completed) sem reenviar todo o sprint
  db.prepare(`
    UPDATE sprints SET
      name = COALESCE(?, name),
      goal = COALESCE(?, goal),
      start_date = COALESCE(?, start_date),
      end_date = COALESCE(?, end_date),
      status = COALESCE(?, status)
    WHERE id = ?
  `).run(name, goal, start_date, end_date, status, sprint.id);

  const updated = db.prepare('SELECT * FROM sprints WHERE id = ?').get(sprint.id);
  res.json(updated);
});

// DELETE /api/sprints/:id - Remove um sprint
// Histórias com sprint_id apontando pra ele ficam órfãs (sprint_id passa a ser inválido)
// Em US futura podemos limpar sprint_id das histórias antes de deletar
router.delete('/sprints/:id', (req, res) => {
  const { sprint, error } = getSprintAndCheckAccess(req.params.id, req.user.id);
  if (error) return res.status(error.status).json({ error: error.message });

  db.prepare('DELETE FROM sprints WHERE id = ?').run(sprint.id);
  res.json({ success: true });
});

module.exports = router;
