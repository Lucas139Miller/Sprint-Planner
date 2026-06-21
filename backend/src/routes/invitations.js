const express = require('express');
const supabase = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/invitations - Lista convites pendentes do usuário
// Faz JOIN manual: invitations + projects + users (inviter)
router.get('/', async (req, res) => {
  const { data: invitations } = await supabase
    .from('sp_invitations')
    .select('*')
    .eq('invitee_id', req.user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (!invitations || invitations.length === 0) return res.json([]);

  // Busca dados dos projetos e dos inviters em paralelo
  const projectIds = invitations.map(i => i.project_id);
  const inviterIds = invitations.map(i => i.inviter_id);

  const [{ data: projects }, { data: inviters }] = await Promise.all([
    supabase.from('sp_projects').select('id, name, description').in('id', projectIds),
    supabase.from('sp_users').select('id, username').in('id', inviterIds),
  ]);

  // Monta resposta com dados denormalizados (como antes)
  const result = invitations.map(i => {
    const p = projects.find(x => x.id === i.project_id);
    const u = inviters.find(x => x.id === i.inviter_id);
    return {
      id: i.id, role: i.role, status: i.status, created_at: i.created_at,
      project_id: p.id, project_name: p.name, project_description: p.description,
      inviter_username: u.username,
    };
  });
  res.json(result);
});

// POST /api/invitations/:id/accept - Aceita convite (vira membro)
// Faz UPDATE no convite + INSERT em project_members.
// Sem transação atômica como o SQLite tinha; em produção, criar uma RPC no Supabase.
router.post('/:id/accept', async (req, res) => {
  const { data: invitation } = await supabase
    .from('sp_invitations').select('*')
    .eq('id', req.params.id).eq('invitee_id', req.user.id).eq('status', 'pending')
    .maybeSingle();

  if (!invitation) return res.status(404).json({ error: 'Convite não encontrado ou já respondido' });

  // Cria a membership PRIMEIRO. Se falhar, o convite continua pending (recuperável).
  // Se invertêssemos a ordem (accepted antes), uma falha aqui deixaria o convite "fantasma":
  // marcado como aceito mas sem membership, sem como recuperar.
  const { error: memberError } = await supabase.from('sp_project_members').insert({
    project_id: invitation.project_id, user_id: invitation.invitee_id, role: invitation.role,
  });

  if (memberError) {
    // Se já é membro (UNIQUE), ainda assim marca o convite como aceito (idempotência)
    if (memberError.code !== '23505') {
      return res.status(500).json({ error: 'Erro ao aceitar convite' });
    }
  }

  // Só marca como aceito após a membership existir
  await supabase.from('sp_invitations').update({ status: 'accepted' }).eq('id', invitation.id);

  res.json({ success: true, project_id: invitation.project_id });
});

// POST /api/invitations/:id/reject - Rejeita convite
router.post('/:id/reject', async (req, res) => {
  const { data, error } = await supabase
    .from('sp_invitations').update({ status: 'rejected' })
    .eq('id', req.params.id).eq('invitee_id', req.user.id).eq('status', 'pending')
    .select();

  if (error || !data || data.length === 0) {
    return res.status(404).json({ error: 'Convite não encontrado ou já respondido' });
  }
  res.json({ success: true });
});

module.exports = router;
