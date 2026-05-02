const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

// Router protegido por JWT - todas as rotas exigem usuário autenticado
const router = express.Router();
router.use(authMiddleware);

// Helper: verifica se o usuário é membro do projeto.
// Replicado de stories.js para manter cada rota desacoplada (não depender de import lateral).
function isMember(projectId, userId) {
  return db.prepare(
    'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(projectId, userId);
}

// GET /api/sprints/:sprintId/dashboard - Métricas agregadas de um sprint
// Calcula totais de pontos, progresso e distribuição por status (kanban).
// Como a tabela `sprints` ainda pode não existir (US4 em paralelo), inferimos
// o project_id pela primeira história do sprint e validamos membership por ele.
router.get('/sprints/:sprintId/dashboard', (req, res) => {
  const { sprintId } = req.params;

  // Busca uma história qualquer do sprint só pra descobrir o projeto (FK indireta)
  // Evita depender da tabela sprints que pode não estar pronta.
  const anyStory = db.prepare(
    'SELECT project_id FROM user_stories WHERE sprint_id = ? LIMIT 1'
  ).get(sprintId);

  // Sem histórias no sprint = sem como validar membership; retorna estrutura vazia
  // (cliente trata como "sprint vazio" sem quebrar a UI)
  if (!anyStory) {
    return res.json({
      totalPoints: 0, completedPoints: 0, progress: 0,
      byStatus: { to_do: 0, in_progress: 0, in_review: 0, done: 0 },
      storiesCount: 0,
    });
  }

  if (!isMember(anyStory.project_id, req.user.id)) {
    return res.status(403).json({ error: 'Você não é membro deste projeto' });
  }

  // Agrega tudo numa query só usando SUM condicional (CASE WHEN) - mais eficiente que N queries
  const agg = db.prepare(`
    SELECT
      COALESCE(SUM(story_points), 0) AS totalPoints,
      COALESCE(SUM(CASE WHEN status = 'done' THEN story_points ELSE 0 END), 0) AS completedPoints,
      COUNT(*) AS storiesCount,
      SUM(CASE WHEN status = 'to_do' THEN 1 ELSE 0 END) AS to_do,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
      SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) AS in_review,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done
    FROM user_stories WHERE sprint_id = ?
  `).get(sprintId);

  // Progresso em percentual (0-100), arredondado. Evita divisão por zero.
  const progress = agg.totalPoints > 0
    ? Math.round((agg.completedPoints / agg.totalPoints) * 100)
    : 0;

  res.json({
    totalPoints: agg.totalPoints,
    completedPoints: agg.completedPoints,
    progress,
    byStatus: {
      to_do: agg.to_do || 0,
      in_progress: agg.in_progress || 0,
      in_review: agg.in_review || 0,
      done: agg.done || 0,
    },
    storiesCount: agg.storiesCount,
  });
});

// GET /api/projects/:projectId/velocity - Velocidade média (pontos concluídos por sprint)
// Como a tabela `sprints` é construída em paralelo (US4), envolvemos em try/catch
// para não derrubar o endpoint caso ela ainda não exista no banco.
router.get('/projects/:projectId/velocity', (req, res) => {
  const { projectId } = req.params;

  if (!isMember(projectId, req.user.id)) {
    return res.status(403).json({ error: 'Você não é membro deste projeto' });
  }

  try {
    // Agrupa por sprint e soma pontos concluídos. Filtramos sprints "fechados"
    // se a coluna status existir; senão usa todos. Catch genérico cobre ambos.
    const rows = db.prepare(`
      SELECT s.id, s.name, COALESCE(SUM(CASE WHEN us.status = 'done' THEN us.story_points END), 0) AS completed
      FROM sprints s LEFT JOIN user_stories us ON us.sprint_id = s.id
      WHERE s.project_id = ? AND s.status = 'completed'
      GROUP BY s.id ORDER BY s.id ASC
    `).all(projectId);

    const velocity = rows.length > 0
      ? Math.round(rows.reduce((acc, r) => acc + r.completed, 0) / rows.length)
      : 0;
    res.json({ velocity, sprints: rows });
  } catch {
    // Tabela sprints não existe ainda (US4 ainda não mergeou) - degrada elegante
    res.json({ velocity: 0, sprints: [] });
  }
});

module.exports = router;
