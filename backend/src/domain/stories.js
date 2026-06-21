// ============================================================================
// domain/stories.js — LÓGICA DE DOMÍNIO de histórias, SEM I/O
// ============================================================================
// Regras puras extraídas de routes/stories.js: cálculo da próxima prioridade,
// conjunto de status válidos do Kanban e a montagem do objeto de UPDATE parcial.
// Tudo entrada -> saída, sem Supabase nem req/res. Comportamento preservado.
// ============================================================================

// Conjunto de status válidos do board Kanban (US6). É a MESMA lista que a rota
// PUT /api/stories/:id/status usa para validar o campo `status`. Centralizada
// aqui para virar fonte única (a rota passa a importar daqui).
const VALID_STATUSES = ['to_do', 'in_progress', 'in_review', 'done'];

// ----------------------------------------------------------------------------
// statusValido(status) -> boolean
//
// Espelha `VALID_STATUSES.includes(status)` da rota de Kanban. Usado para
// decidir entre 200 (status conhecido) e 400 (status inválido).
// Casos de borda: status undefined/null/'' / valor fora da lista -> false.
// ----------------------------------------------------------------------------
function statusValido(status) {
  return VALID_STATUSES.includes(status);
}

// ----------------------------------------------------------------------------
// proximaPrioridade(maxAtual) -> number
//
// A rota POST /api/projects/:projectId/stories calcula a próxima priority como
// (maior priority existente) + 1, tratando "nenhuma história ainda" como 0:
//   const priority = (maxRow?.priority || 0) + 1;
// Aqui recebemos o valor de priority do registro de maior priority (ou
// null/undefined quando o backlog está vazio) e devolvemos o próximo número.
// Valores-limite: null -> 1 (primeira história); 0 -> 1; 5 -> 6.
// ----------------------------------------------------------------------------
function proximaPrioridade(maxAtual) {
  return (maxAtual || 0) + 1;
}

// Campos que a atualização parcial de história aceita (PUT /api/stories/:id).
// assignee_id entra aqui porque a rota permite atribuir membro a partir do
// Backlog; null é valor válido (= remover responsável).
const CAMPOS_ATUALIZAVEIS_STORY = [
  'title', 'description', 'acceptance_criteria', 'story_points', 'label', 'assignee_id',
];

// ----------------------------------------------------------------------------
// montarUpdatesStory(body) -> objeto só com os campos ENVIADOS
//
// Replica o forEach da rota: copia para o objeto de update apenas os campos da
// lista branca que NÃO são undefined. Isso garante PATCH parcial — campos não
// enviados não são tocados, mas `null` é preservado (ex.: limpar assignee).
//   ['title',...,'assignee_id'].forEach(k => { if (body[k] !== undefined) updates[k] = body[k]; })
// ----------------------------------------------------------------------------
function montarUpdatesStory(body) {
  const origem = body || {};
  const updates = {};
  CAMPOS_ATUALIZAVEIS_STORY.forEach(k => {
    if (origem[k] !== undefined) updates[k] = origem[k];
  });
  return updates;
}

module.exports = {
  VALID_STATUSES,
  statusValido,
  proximaPrioridade,
  CAMPOS_ATUALIZAVEIS_STORY,
  montarUpdatesStory,
};
