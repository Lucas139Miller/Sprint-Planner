// ============================================================================
// domain/dashboard.js — LÓGICA DE DOMÍNIO do dashboard/velocity, SEM I/O
// ============================================================================
// Mesma lição de TESTABILIDADE do Cap. 8: as agregações que estavam dentro dos
// handlers de routes/dashboard.js são, no fundo, FUNÇÕES PURAS (recebem a lista
// de histórias/sprints já buscada do banco e calculam números). Extraídas aqui,
// rodam sem subir o app nem tocar o Supabase. Comportamento idêntico ao da rota.
// ============================================================================

// ----------------------------------------------------------------------------
// agregarDashboardSprint(stories) -> { totalPoints, completedPoints, progress,
//                                      byStatus: { to_do, in_progress, in_review, done },
//                                      storiesCount }
//
// Replica o laço da rota GET /api/sprints/:sprintId/dashboard:
//   - totalPoints     : soma de story_points (null/ausente = 0);
//   - completedPoints : soma de story_points das histórias com status 'done';
//   - byStatus        : contagem de histórias por coluna do Kanban;
//   - progress        : Math.round(completedPoints / totalPoints * 100) ou 0 se total = 0;
//   - storiesCount    : total de histórias.
//
// Observação fiel à rota: byStatus começa com as 4 chaves zeradas. Se aparecer
// um status fora das 4 (não deveria, mas o código original fazia
// `byStatus[s.status] = (byStatus[s.status] || 0) + 1`), ele é contado também —
// mantemos esse comportamento permissivo igual ao original.
// ----------------------------------------------------------------------------
function agregarDashboardSprint(stories) {
  const lista = Array.isArray(stories) ? stories : [];

  let totalPoints = 0;
  let completedPoints = 0;
  const byStatus = { to_do: 0, in_progress: 0, in_review: 0, done: 0 };

  for (const s of lista) {
    totalPoints += s.story_points || 0;
    if (s.status === 'done') completedPoints += s.story_points || 0;
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
  }

  const progress = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  return { totalPoints, completedPoints, progress, byStatus, storiesCount: lista.length };
}

// ----------------------------------------------------------------------------
// pontosConcluidosPorSprint(sprints, doneStories) -> [{ id, name, completed }]
//
// Para cada sprint, soma os story_points das histórias 'done' daquele sprint.
// É o `.map` da rota GET /api/projects/:projectId/velocity. Recebe a lista de
// sprints (com id/name) e a lista de histórias já filtradas por status='done'.
// `completed` soma story_points (null = 0) das histórias cujo sprint_id bate.
// ----------------------------------------------------------------------------
function pontosConcluidosPorSprint(sprints, doneStories) {
  const listaSprints = Array.isArray(sprints) ? sprints : [];
  const listaDone = Array.isArray(doneStories) ? doneStories : [];

  return listaSprints.map(s => {
    const completed = listaDone
      .filter(st => st.sprint_id === s.id)
      .reduce((acc, st) => acc + (st.story_points || 0), 0);
    return { id: s.id, name: s.name, completed };
  });
}

// ----------------------------------------------------------------------------
// calcularVelocity(resultados) -> number
//
// Velocidade = média (arredondada) dos pontos concluídos por sprint. É a linha:
//   Math.round(result.reduce((acc, r) => acc + r.completed, 0) / result.length)
// Valor-limite: lista vazia -> 0 (a rota já devolve 0 antes nesse caso, mas
// blindamos a função pura contra divisão por zero, preservando o resultado 0).
// ----------------------------------------------------------------------------
function calcularVelocity(resultados) {
  const lista = Array.isArray(resultados) ? resultados : [];
  if (lista.length === 0) return 0;
  const soma = lista.reduce((acc, r) => acc + (r.completed || 0), 0);
  return Math.round(soma / lista.length);
}

module.exports = {
  agregarDashboardSprint,
  pontosConcluidosPorSprint,
  calcularVelocity,
};
