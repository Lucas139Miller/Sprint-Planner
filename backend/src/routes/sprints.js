const express = require('express');
const supabase = require('../database');
const authMiddleware = require('../middleware/auth');
// Montagem PURA dos objetos de insert/update extraída para o domínio (Cap. 8).
const { montarInsertSprint, montarUpdatesSprint } = require('../domain/sprints');

const router = express.Router();
router.use(authMiddleware);

// Helper async: verifica membership no projeto
async function isMember(projectId, userId) {
  const { data } = await supabase.from('sp_project_members')
    .select('id').eq('project_id', projectId).eq('user_id', userId).maybeSingle();
  return !!data;
}

// Helper async: busca sprint + valida acesso
async function getSprintAndCheckAccess(sprintId, userId) {
  const { data: sprint } = await supabase.from('sp_sprints')
    .select('*').eq('id', sprintId).maybeSingle();
  if (!sprint) return { error: { status: 404, message: 'Sprint não encontrado' } };
  if (!(await isMember(sprint.project_id, userId))) {
    return { error: { status: 403, message: 'Você não é membro deste projeto' } };
  }
  return { sprint };
}

// POST /api/projects/:projectId/sprints - Cria sprint
router.post('/projects/:projectId/sprints', async (req, res) => {
  const { projectId } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  if (!(await isMember(projectId, req.user.id))) {
    return res.status(403).json({ error: 'Você não é membro deste projeto' });
  }

  // status default 'planning' é aplicado pelo banco se não for enviado.
  // Montagem do objeto de insert é pura e mora em domain/sprints.js.
  const insertObj = montarInsertSprint(projectId, req.body);

  const { data: sprint, error } = await supabase.from('sp_sprints').insert(insertObj).select().single();
  if (error) return res.status(500).json({ error: 'Erro ao criar sprint' });
  res.status(201).json(sprint);
});

// GET /api/projects/:projectId/sprints - Lista sprints (DESC por created_at)
router.get('/projects/:projectId/sprints', async (req, res) => {
  const { projectId } = req.params;
  if (!(await isMember(projectId, req.user.id))) {
    return res.status(403).json({ error: 'Você não é membro deste projeto' });
  }
  const { data } = await supabase.from('sp_sprints')
    .select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  res.json(data || []);
});

// PUT /api/sprints/:id - Atualização parcial
router.put('/sprints/:id', async (req, res) => {
  const { sprint, error: errAccess } = await getSprintAndCheckAccess(req.params.id, req.user.id);
  if (errAccess) return res.status(errAccess.status).json({ error: errAccess.message });

  // Só inclui campos que foram enviados (undefined some no objeto Supabase).
  // Montagem do PATCH parcial é pura e mora em domain/sprints.js.
  const updates = montarUpdatesSprint(req.body);

  const { data: updated } = await supabase.from('sp_sprints')
    .update(updates).eq('id', sprint.id).select().single();
  res.json(updated);
});

// DELETE /api/sprints/:id
router.delete('/sprints/:id', async (req, res) => {
  const { sprint, error: errAccess } = await getSprintAndCheckAccess(req.params.id, req.user.id);
  if (errAccess) return res.status(errAccess.status).json({ error: errAccess.message });
  await supabase.from('sp_sprints').delete().eq('id', sprint.id);
  res.json({ success: true });
});

module.exports = router;
