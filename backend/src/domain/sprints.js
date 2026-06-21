// ============================================================================
// domain/sprints.js — LÓGICA DE DOMÍNIO de sprints, SEM I/O
// ============================================================================
// Extrai de routes/sprints.js a montagem dos objetos de INSERT e de UPDATE
// parcial a partir do body. São transformações puras (body -> objeto pronto pro
// banco), sem Supabase nem req/res. Comportamento idêntico ao das rotas.
// ============================================================================

// ----------------------------------------------------------------------------
// montarInsertSprint(projectId, body) -> objeto pronto para insert
//
// Replica fielmente o trecho da rota POST /api/projects/:projectId/sprints:
//   const insertObj = { project_id: Number(projectId), name, goal: goal || '' };
//   if (start_date) insertObj.start_date = start_date;
//   if (end_date)   insertObj.end_date   = end_date;
//   if (status)     insertObj.status     = status;
//
// Regras de domínio preservadas:
//   - project_id é convertido para Number (vem como string no :param);
//   - name é copiado como veio (a rota já validou que existe ANTES de chamar isto);
//   - goal vazio/ausente vira '' (default explícito);
//   - start_date / end_date / status só entram quando "truthy" — assim o banco
//     aplica seus próprios defaults (ex.: status 'planning') quando omitidos.
// ----------------------------------------------------------------------------
function montarInsertSprint(projectId, body) {
  const { name, goal, start_date, end_date, status } = body || {};

  const insertObj = { project_id: Number(projectId), name, goal: goal || '' };
  if (start_date) insertObj.start_date = start_date;
  if (end_date) insertObj.end_date = end_date;
  if (status) insertObj.status = status;

  return insertObj;
}

// Campos que a atualização parcial de sprint aceita (PUT /api/sprints/:id).
const CAMPOS_ATUALIZAVEIS_SPRINT = ['name', 'goal', 'start_date', 'end_date', 'status'];

// ----------------------------------------------------------------------------
// montarUpdatesSprint(body) -> objeto só com os campos ENVIADOS
//
// Igual ao forEach da rota PUT /api/sprints/:id: copia apenas os campos da lista
// branca que não são undefined (PATCH parcial). Campos omitidos não são tocados.
// ----------------------------------------------------------------------------
function montarUpdatesSprint(body) {
  const origem = body || {};
  const updates = {};
  CAMPOS_ATUALIZAVEIS_SPRINT.forEach(k => {
    if (origem[k] !== undefined) updates[k] = origem[k];
  });
  return updates;
}

module.exports = {
  montarInsertSprint,
  CAMPOS_ATUALIZAVEIS_SPRINT,
  montarUpdatesSprint,
};
