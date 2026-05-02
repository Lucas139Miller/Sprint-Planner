const express = require('express');
const supabase = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Helper: verifica se o usuário é membro do projeto (versão async com Supabase)
async function isMember(projectId, userId) {
  const { data } = await supabase
    .from('sp_project_members').select('id')
    .eq('project_id', projectId).eq('user_id', userId).maybeSingle();
  return !!data;
}

// Helper: busca uma história e valida acesso
async function getStoryAndCheckAccess(storyId, userId) {
  const { data: story } = await supabase
    .from('sp_user_stories').select('*').eq('id', storyId).maybeSingle();
  if (!story) return { error: { status: 404, message: 'História não encontrada' } };
  if (!(await isMember(story.project_id, userId))) {
    return { error: { status: 403, message: 'Você não é membro deste projeto' } };
  }
  return { story };
}

// POST /api/projects/:projectId/stories - Cria história
router.post('/projects/:projectId/stories', async (req, res) => {
  const { projectId } = req.params;
  const { title, description, acceptance_criteria, story_points, label } = req.body;
  if (!title) return res.status(400).json({ error: 'Título é obrigatório' });
  if (!(await isMember(projectId, req.user.id))) {
    return res.status(403).json({ error: 'Você não é membro deste projeto' });
  }

  // Calcula próxima priority via aggregate (max+1)
  const { data: maxRow } = await supabase
    .from('sp_user_stories').select('priority').eq('project_id', projectId)
    .order('priority', { ascending: false }).limit(1).maybeSingle();
  const priority = (maxRow?.priority || 0) + 1;

  const { data: story, error } = await supabase.from('sp_user_stories').insert({
    project_id: Number(projectId), title,
    description: description || '', acceptance_criteria: acceptance_criteria || '',
    story_points: story_points || 0, label: label || 'feature', priority,
  }).select().single();

  if (error) return res.status(500).json({ error: 'Erro ao criar história' });
  res.status(201).json(story);
});

// GET /api/projects/:projectId/stories - Lista backlog (sprint_id IS NULL por padrão)
router.get('/projects/:projectId/stories', async (req, res) => {
  const { projectId } = req.params;
  if (!(await isMember(projectId, req.user.id))) {
    return res.status(403).json({ error: 'Você não é membro deste projeto' });
  }

  let query = supabase.from('sp_user_stories').select('*').eq('project_id', projectId)
    .order('priority', { ascending: true });
  if (req.query.include !== 'all') query = query.is('sprint_id', null);

  const { data } = await query;
  res.json(data || []);
});

// PUT /api/stories/:id - Atualização parcial (só campos enviados)
router.put('/stories/:id', async (req, res) => {
  const { story, error: errAccess } = await getStoryAndCheckAccess(req.params.id, req.user.id);
  if (errAccess) return res.status(errAccess.status).json({ error: errAccess.message });

  // Monta objeto só com campos definidos (undefined some no spread).
  // assignee_id incluído aqui pra permitir atribuir membro a partir do Backlog.
  // null é valor válido (= remover responsável).
  const updates = {};
  ['title', 'description', 'acceptance_criteria', 'story_points', 'label', 'assignee_id'].forEach(k => {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  });

  // Se está atribuindo a alguém (não null), valida que essa pessoa é membro do projeto
  // Evita atribuir tarefa para um random user_id qualquer (IDOR de assignee)
  if (updates.assignee_id !== undefined && updates.assignee_id !== null) {
    if (!(await isMember(story.project_id, updates.assignee_id))) {
      return res.status(400).json({ error: 'Usuário não é membro deste projeto' });
    }
  }

  const { data: updated } = await supabase
    .from('sp_user_stories').update(updates).eq('id', story.id).select().single();
  res.json(updated);
});

// DELETE /api/stories/:id
router.delete('/stories/:id', async (req, res) => {
  const { story, error: errAccess } = await getStoryAndCheckAccess(req.params.id, req.user.id);
  if (errAccess) return res.status(errAccess.status).json({ error: errAccess.message });
  await supabase.from('sp_user_stories').delete().eq('id', story.id);
  res.json({ success: true });
});

// PUT /api/stories/:id/move-to-sprint (US5)
// Valida que o sprint destino pertence ao mesmo projeto da história, evitando
// IDOR (mover história do projeto A para sprint do projeto B).
router.put('/stories/:id/move-to-sprint', async (req, res) => {
  const { story, error: errAccess } = await getStoryAndCheckAccess(req.params.id, req.user.id);
  if (errAccess) return res.status(errAccess.status).json({ error: errAccess.message });
  if (!Object.prototype.hasOwnProperty.call(req.body, 'sprint_id')) {
    return res.status(400).json({ error: 'sprint_id é obrigatório (use null para voltar ao backlog)' });
  }
  const sprintId = req.body.sprint_id;
  // Se for um sprint específico (não null), verifica que pertence ao mesmo projeto
  if (sprintId !== null) {
    const { data: sprint } = await supabase.from('sp_sprints')
      .select('project_id').eq('id', sprintId).maybeSingle();
    if (!sprint) return res.status(404).json({ error: 'Sprint não encontrado' });
    if (sprint.project_id !== story.project_id) {
      return res.status(403).json({ error: 'Sprint não pertence ao projeto da história' });
    }
  }
  const { data } = await supabase.from('sp_user_stories')
    .update({ sprint_id: sprintId }).eq('id', story.id).select().single();
  res.json(data);
});

// GET /api/sprints/:sprintId/stories (US5)
router.get('/sprints/:sprintId/stories', async (req, res) => {
  const { sprintId } = req.params;
  const { data: sprint } = await supabase
    .from('sp_sprints').select('project_id').eq('id', sprintId).maybeSingle();
  if (!sprint) return res.status(404).json({ error: 'Sprint não encontrado' });
  if (!(await isMember(sprint.project_id, req.user.id))) {
    return res.status(403).json({ error: 'Você não é membro deste projeto' });
  }
  const { data } = await supabase.from('sp_user_stories').select('*')
    .eq('sprint_id', sprintId).order('priority', { ascending: true });
  res.json(data || []);
});

const VALID_STATUSES = ['to_do', 'in_progress', 'in_review', 'done'];

// PUT /api/stories/:id/status (US6 Kanban)
router.put('/stories/:id/status', async (req, res) => {
  const { story, error: errAccess } = await getStoryAndCheckAccess(req.params.id, req.user.id);
  if (errAccess) return res.status(errAccess.status).json({ error: errAccess.message });
  const { status, assignee_id } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status inválido. Use: ${VALID_STATUSES.join(', ')}` });
  }
  const updates = { status };
  if (assignee_id !== undefined) updates.assignee_id = assignee_id;
  const { data } = await supabase.from('sp_user_stories')
    .update(updates).eq('id', story.id).select().single();
  res.json(data);
});

// GET /api/sprints/:sprintId/board (US6) - histórias agrupadas por status
router.get('/sprints/:sprintId/board', async (req, res) => {
  const { sprintId } = req.params;
  const { data: sprint } = await supabase
    .from('sp_sprints').select('project_id').eq('id', sprintId).maybeSingle();
  if (!sprint) return res.status(404).json({ error: 'Sprint não encontrado' });
  if (!(await isMember(sprint.project_id, req.user.id))) {
    return res.status(403).json({ error: 'Você não é membro deste projeto' });
  }

  const { data: stories } = await supabase.from('sp_user_stories').select('*')
    .eq('sprint_id', sprintId).order('priority', { ascending: true });

  // Busca usernames dos assignees em uma query
  const assigneeIds = [...new Set((stories || []).map(s => s.assignee_id).filter(Boolean))];
  let usernames = {};
  if (assigneeIds.length > 0) {
    const { data: users } = await supabase.from('sp_users').select('id, username').in('id', assigneeIds);
    usernames = Object.fromEntries((users || []).map(u => [u.id, u.username]));
  }

  // Agrupa por status, anexando assignee_username em cada card
  const grouped = { to_do: [], in_progress: [], in_review: [], done: [] };
  for (const s of (stories || [])) {
    grouped[s.status].push({ ...s, assignee_username: usernames[s.assignee_id] || null });
  }
  res.json(grouped);
});

module.exports = router;
