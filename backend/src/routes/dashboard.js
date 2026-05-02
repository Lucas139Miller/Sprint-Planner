const express = require('express');
const supabase = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Helper async: verifica se o usuário é membro do projeto
async function isMember(projectId, userId) {
  const { data } = await supabase.from('sp_project_members')
    .select('id').eq('project_id', projectId).eq('user_id', userId).maybeSingle();
  return !!data;
}

// GET /api/sprints/:sprintId/dashboard - Métricas agregadas do sprint
// Como o supabase-js não suporta agregações complexas (CASE WHEN) diretamente,
// fazemos uma única query buscando todas as histórias do sprint e agregamos no Node.
router.get('/sprints/:sprintId/dashboard', async (req, res) => {
  const { sprintId } = req.params;

  // Busca uma story qualquer só para descobrir o project_id (validação)
  const { data: anyStory } = await supabase.from('sp_user_stories')
    .select('project_id').eq('sprint_id', sprintId).limit(1).maybeSingle();

  if (!anyStory) {
    // Sprint vazio - retorna estrutura zerada para a UI não quebrar
    return res.json({
      totalPoints: 0, completedPoints: 0, progress: 0,
      byStatus: { to_do: 0, in_progress: 0, in_review: 0, done: 0 },
      storiesCount: 0,
    });
  }

  if (!(await isMember(anyStory.project_id, req.user.id))) {
    return res.status(403).json({ error: 'Você não é membro deste projeto' });
  }

  // Busca todas as histórias do sprint e agrega no Node (mais simples que SQL agregado)
  const { data: stories } = await supabase.from('sp_user_stories')
    .select('story_points, status').eq('sprint_id', sprintId);

  let totalPoints = 0, completedPoints = 0;
  const byStatus = { to_do: 0, in_progress: 0, in_review: 0, done: 0 };

  for (const s of (stories || [])) {
    totalPoints += s.story_points || 0;
    if (s.status === 'done') completedPoints += s.story_points || 0;
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
  }

  const progress = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  res.json({
    totalPoints, completedPoints, progress, byStatus, storiesCount: (stories || []).length,
  });
});

// GET /api/projects/:projectId/velocity - Velocidade média de sprints completados
router.get('/projects/:projectId/velocity', async (req, res) => {
  const { projectId } = req.params;
  if (!(await isMember(projectId, req.user.id))) {
    return res.status(403).json({ error: 'Você não é membro deste projeto' });
  }

  // Sprints completados do projeto
  const { data: sprints } = await supabase.from('sp_sprints')
    .select('id, name').eq('project_id', projectId).eq('status', 'completed').order('id');

  if (!sprints || sprints.length === 0) return res.json({ velocity: 0, sprints: [] });

  // Para cada sprint, soma pontos concluídos (status='done')
  const sprintIds = sprints.map(s => s.id);
  const { data: doneStories } = await supabase.from('sp_user_stories')
    .select('sprint_id, story_points').eq('status', 'done').in('sprint_id', sprintIds);

  const result = sprints.map(s => {
    const completed = (doneStories || [])
      .filter(st => st.sprint_id === s.id)
      .reduce((acc, st) => acc + (st.story_points || 0), 0);
    return { id: s.id, name: s.name, completed };
  });

  const velocity = Math.round(result.reduce((acc, r) => acc + r.completed, 0) / result.length);
  res.json({ velocity, sprints: result });
});

module.exports = router;
