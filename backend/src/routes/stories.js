const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Helper: verifica se o usuário é membro do projeto
// Usado em todas as rotas para garantir que apenas membros vejam/modifiquem histórias
function isMember(projectId, userId) {
  return db.prepare(
    'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(projectId, userId);
}

// POST /api/projects/:projectId/stories - Cria uma nova história
// Apenas membros do projeto podem criar histórias
router.post('/projects/:projectId/stories', (req, res) => {
  const { projectId } = req.params;
  const { title, description, acceptance_criteria, story_points, label } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Título é obrigatório' });
  }

  // Valida que o usuário tem acesso ao projeto
  if (!isMember(projectId, req.user.id)) {
    return res.status(403).json({ error: 'Você não é membro deste projeto' });
  }

  // Calcula a próxima prioridade (última posição + 1)
  // Histórias novas vão para o fim do backlog por padrão
  const maxPriority = db.prepare(
    'SELECT MAX(priority) as max FROM user_stories WHERE project_id = ?'
  ).get(projectId);
  const priority = (maxPriority?.max || 0) + 1;

  const result = db.prepare(`
    INSERT INTO user_stories (project_id, title, description, acceptance_criteria, story_points, label, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    projectId, title, description || '', acceptance_criteria || '',
    story_points || 0, label || 'feature', priority
  );

  res.status(201).json({
    id: result.lastInsertRowid,
    project_id: Number(projectId), title,
    description: description || '', acceptance_criteria: acceptance_criteria || '',
    story_points: story_points || 0, label: label || 'feature',
    priority, status: 'to_do', sprint_id: null,
  });
});

// GET /api/projects/:projectId/stories - Lista histórias do backlog do projeto
// Por padrão, retorna apenas histórias sem sprint (backlog puro)
// Query param ?include=all retorna todas (backlog + em sprints)
router.get('/projects/:projectId/stories', (req, res) => {
  const { projectId } = req.params;

  if (!isMember(projectId, req.user.id)) {
    return res.status(403).json({ error: 'Você não é membro deste projeto' });
  }

  // Filtra apenas histórias do backlog (sprint_id IS NULL) por padrão
  const filter = req.query.include === 'all' ? '' : 'AND sprint_id IS NULL';

  const stories = db.prepare(`
    SELECT * FROM user_stories
    WHERE project_id = ? ${filter}
    ORDER BY priority ASC
  `).all(projectId);

  res.json(stories);
});

// Helper: busca uma história + valida que o usuário é membro do projeto dela
// Retorna { story, error } - se error existe, deve responder com error
function getStoryAndCheckAccess(storyId, userId) {
  const story = db.prepare('SELECT * FROM user_stories WHERE id = ?').get(storyId);
  if (!story) return { error: { status: 404, message: 'História não encontrada' } };
  if (!isMember(story.project_id, userId)) {
    return { error: { status: 403, message: 'Você não é membro deste projeto' } };
  }
  return { story };
}

// PUT /api/stories/:id - Atualiza uma história existente
// Aceita campos parciais (só atualiza o que for enviado)
router.put('/stories/:id', (req, res) => {
  const { story, error } = getStoryAndCheckAccess(req.params.id, req.user.id);
  if (error) return res.status(error.status).json({ error: error.message });

  const { title, description, acceptance_criteria, story_points, label } = req.body;

  // COALESCE no SQL: usa o novo valor se enviado, senão mantém o antigo
  // Permite atualização parcial sem precisar enviar todos os campos
  db.prepare(`
    UPDATE user_stories SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      acceptance_criteria = COALESCE(?, acceptance_criteria),
      story_points = COALESCE(?, story_points),
      label = COALESCE(?, label)
    WHERE id = ?
  `).run(title, description, acceptance_criteria, story_points, label, story.id);

  // Retorna a história atualizada
  const updated = db.prepare('SELECT * FROM user_stories WHERE id = ?').get(story.id);
  res.json(updated);
});

// DELETE /api/stories/:id - Remove uma história
router.delete('/stories/:id', (req, res) => {
  const { story, error } = getStoryAndCheckAccess(req.params.id, req.user.id);
  if (error) return res.status(error.status).json({ error: error.message });

  db.prepare('DELETE FROM user_stories WHERE id = ?').run(story.id);
  res.json({ success: true });
});

// PUT /api/stories/:id/move-to-sprint - Move uma história entre backlog e sprint
// Body: { sprint_id: number | null }
//   - número: move a história para esse sprint
//   - null: devolve a história para o backlog (sprint_id = NULL)
// Endpoint dedicado (em vez de reutilizar PUT /stories/:id) porque movimentar
// é uma ação semanticamente diferente de editar campos da história.
router.put('/stories/:id/move-to-sprint', (req, res) => {
  const { story, error } = getStoryAndCheckAccess(req.params.id, req.user.id);
  if (error) return res.status(error.status).json({ error: error.message });

  // Aceita undefined? Não — exigimos a chave explicitamente, mas null é válido.
  // hasOwnProperty distingue "não enviou" de "enviou null" (mover para backlog).
  if (!Object.prototype.hasOwnProperty.call(req.body, 'sprint_id')) {
    return res.status(400).json({ error: 'sprint_id é obrigatório (use null para voltar ao backlog)' });
  }
  const { sprint_id } = req.body;

  // Atualiza o sprint_id da história. Se for null, vai para o backlog.
  db.prepare('UPDATE user_stories SET sprint_id = ? WHERE id = ?')
    .run(sprint_id, story.id);

  // Retorna a história atualizada para o frontend refletir o estado novo
  const updated = db.prepare('SELECT * FROM user_stories WHERE id = ?').get(story.id);
  res.json(updated);
});

// GET /api/sprints/:sprintId/stories - Lista histórias atribuídas a um sprint
// Ordena por priority para manter a ordem do backlog ao mover
// Validação: usuário precisa ser membro do projeto ao qual o sprint pertence.
// Como a tabela sprints é construída em paralelo (US4), descobrimos o project_id
// indiretamente, pegando qualquer história já no sprint. Se ainda não há histórias,
// não há nada para validar (lista vazia é segura).
router.get('/sprints/:sprintId/stories', (req, res) => {
  const { sprintId } = req.params;

  // Busca a primeira história do sprint para descobrir o project_id e checar acesso.
  // Esta abordagem evita depender da tabela 'sprints' que é criada em paralelo (US4).
  const sample = db.prepare(
    'SELECT project_id FROM user_stories WHERE sprint_id = ? LIMIT 1'
  ).get(sprintId);

  if (sample && !isMember(sample.project_id, req.user.id)) {
    return res.status(403).json({ error: 'Você não é membro deste projeto' });
  }

  const stories = db.prepare(`
    SELECT * FROM user_stories
    WHERE sprint_id = ?
    ORDER BY priority ASC
  `).all(sprintId);

  res.json(stories);
});

module.exports = router;
