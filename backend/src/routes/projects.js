const express = require('express');
const supabase = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Helper async: verifica se o usuário é membro do projeto
async function isMember(projectId, userId) {
  const { data } = await supabase
    .from('sp_project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

// POST /api/projects - Cria projeto e adiciona criador como PO
router.post('/', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome do projeto é obrigatório' });

  const { data: project, error } = await supabase
    .from('sp_projects')
    .insert({ name, description: description || '', owner_id: req.user.id })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Erro ao criar projeto' });

  // Insere o criador como PO automaticamente
  await supabase.from('sp_project_members').insert({
    project_id: project.id, user_id: req.user.id, role: 'PO',
  });

  res.status(201).json({ ...project, role: 'PO' });
});

// GET /api/projects - Lista projetos do usuário (onde é membro)
// Faz 2 queries: 1) memberships do user, 2) projetos com esses ids
router.get('/', async (req, res) => {
  const { data: memberships } = await supabase
    .from('sp_project_members')
    .select('project_id, role')
    .eq('user_id', req.user.id);

  if (!memberships || memberships.length === 0) return res.json([]);

  const ids = memberships.map(m => m.project_id);
  const { data: projects } = await supabase
    .from('sp_projects').select('*').in('id', ids).order('created_at', { ascending: false });

  // Anexa o role de cada projeto a partir do array de memberships
  const result = (projects || []).map(p => ({
    ...p, role: memberships.find(m => m.project_id === p.id).role,
  }));
  res.json(result);
});

// POST /api/projects/:id/members - Convida membro (cria invitation pending)
router.post('/:id/members', async (req, res) => {
  const { identifier, role } = req.body;
  const projectId = req.params.id;

  if (!identifier || !role) return res.status(400).json({ error: 'Identificador e papel são obrigatórios' });

  // Apenas o dono pode convidar
  const { data: project } = await supabase
    .from('sp_projects').select('*').eq('id', projectId).eq('owner_id', req.user.id).maybeSingle();
  if (!project) return res.status(403).json({ error: 'Apenas o dono do projeto pode convidar membros' });

  // Busca usuário por email OU username
  const { data: invitedUser } = await supabase
    .from('sp_users').select('*').or(`email.eq.${identifier},username.eq.${identifier}`).maybeSingle();
  if (!invitedUser) return res.status(404).json({ error: 'Usuário não encontrado' });

  if (invitedUser.id === req.user.id) {
    return res.status(400).json({ error: 'Você não pode se convidar' });
  }

  // Já é membro?
  if (await isMember(projectId, invitedUser.id)) {
    return res.status(409).json({ error: 'Usuário já é membro deste projeto' });
  }

  // Já tem convite pendente?
  const { data: pending } = await supabase.from('sp_invitations')
    .select('id').eq('project_id', projectId).eq('invitee_id', invitedUser.id).eq('status', 'pending').maybeSingle();
  if (pending) return res.status(409).json({ error: 'Convite pendente já enviado para este usuário' });

  const { data: invite } = await supabase.from('sp_invitations').insert({
    project_id: projectId, inviter_id: req.user.id, invitee_id: invitedUser.id, role,
  }).select().single();

  res.status(201).json({
    id: invite.id,
    invitee: { id: invitedUser.id, username: invitedUser.username, email: invitedUser.email },
    role, status: 'pending',
  });
});

// GET /api/projects/:id/members - Lista membros (qualquer membro pode ver)
router.get('/:id/members', async (req, res) => {
  const projectId = req.params.id;
  if (!(await isMember(projectId, req.user.id))) {
    return res.status(403).json({ error: 'Você não é membro deste projeto' });
  }

  // 2 queries: memberships do projeto + dados dos users
  const { data: members } = await supabase
    .from('sp_project_members').select('user_id, role, invited_at').eq('project_id', projectId);
  const userIds = (members || []).map(m => m.user_id);
  const { data: users } = await supabase.from('sp_users').select('id, username, email').in('id', userIds);

  const result = (users || []).map(u => {
    const m = members.find(x => x.user_id === u.id);
    return { ...u, role: m.role, invited_at: m.invited_at };
  });
  res.json(result);
});

module.exports = { router, isMember };
