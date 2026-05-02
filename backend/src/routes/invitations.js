const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Todas as rotas exigem autenticação
router.use(authMiddleware);

// GET /api/invitations - Lista convites pendentes recebidos pelo usuário logado
// Retorna dados do projeto e do convidador para o usuário decidir
router.get('/', (req, res) => {
  const invitations = db.prepare(`
    SELECT
      i.id, i.role, i.status, i.created_at,
      p.id AS project_id, p.name AS project_name, p.description AS project_description,
      u.username AS inviter_username
    FROM invitations i
    INNER JOIN projects p ON p.id = i.project_id
    INNER JOIN users u ON u.id = i.inviter_id
    WHERE i.invitee_id = ? AND i.status = 'pending'
    ORDER BY i.created_at DESC
  `).all(req.user.id);

  res.json(invitations);
});

// POST /api/invitations/:id/accept - Aceita um convite pendente
// Move o convite para 'accepted' e adiciona o usuário em project_members
router.post('/:id/accept', (req, res) => {
  // Busca o convite e verifica se pertence ao usuário logado
  const invitation = db.prepare(
    "SELECT * FROM invitations WHERE id = ? AND invitee_id = ? AND status = 'pending'"
  ).get(req.params.id, req.user.id);

  if (!invitation) {
    return res.status(404).json({ error: 'Convite não encontrado ou já respondido' });
  }

  // Transação: atualiza status E insere em project_members atomicamente
  // Se um falhar, o outro é desfeito automaticamente
  const transaction = db.transaction(() => {
    db.prepare("UPDATE invitations SET status = 'accepted' WHERE id = ?").run(invitation.id);
    db.prepare(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
    ).run(invitation.project_id, invitation.invitee_id, invitation.role);
  });

  try {
    transaction();
    res.json({ success: true, project_id: invitation.project_id });
  } catch {
    res.status(500).json({ error: 'Erro ao aceitar convite' });
  }
});

// POST /api/invitations/:id/reject - Rejeita um convite pendente
router.post('/:id/reject', (req, res) => {
  const result = db.prepare(
    "UPDATE invitations SET status = 'rejected' WHERE id = ? AND invitee_id = ? AND status = 'pending'"
  ).run(req.params.id, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Convite não encontrado ou já respondido' });
  }

  res.json({ success: true });
});

module.exports = router;
