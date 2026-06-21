// ============================================================================
// domain/ai.js — LÓGICA DE DOMÍNIO das rotas de IA (US8/US9), SEM I/O
// ============================================================================
// Lição de TESTABILIDADE do Cap. 8 (IMCServlet -> IMCModel): a regra de domínio
// não pode ficar enterrada dentro do handler HTTP. Aqui extraímos as partes
// PURAS (entrada -> saída, sem fetch/Gemini, sem Supabase, sem req/res) que
// antes estavam inline em routes/ai.js. Assim conseguimos testá-las isoladas,
// rápidas e determinísticas (base da pirâmide de testes).
//
// Estas funções NÃO mudam comportamento: são exatamente o que a rota já fazia,
// só que agora reaproveitáveis e testáveis fora do Express.
// ============================================================================

// ----------------------------------------------------------------------------
// calcularMetricasSprint(stories) -> { totalPoints, donePoints, percentDone,
//                                       inProgressCount, inReviewCount, storiesCount }
//
// Agrega as métricas de um sprint a partir da lista de histórias. É o mesmo
// cálculo que estava inline na rota POST /api/ai/sprint-summary:
//   - totalPoints   : soma de story_points (ausente/null conta como 0);
//   - donePoints    : soma de story_points apenas das histórias com status 'done';
//   - inProgressCount: quantidade com status 'in_progress';
//   - inReviewCount : quantidade com status 'in_review';
//   - percentDone   : Math.round(donePoints / totalPoints * 100), ou 0 quando
//                     totalPoints é 0 (evita divisão por zero — valor-limite).
//
// Entrada tolerante: aceita undefined/null/[] e devolve zeros (a rota já trata
// o caso "sprint sem histórias" antes, mas mantemos a função robusta e pura).
// ----------------------------------------------------------------------------
function calcularMetricasSprint(stories) {
  const lista = Array.isArray(stories) ? stories : [];

  const totalPoints = lista.reduce((s, x) => s + (x.story_points || 0), 0);
  const donePoints = lista
    .filter(s => s.status === 'done')
    .reduce((s, x) => s + (x.story_points || 0), 0);
  const inProgressCount = lista.filter(s => s.status === 'in_progress').length;
  const inReviewCount = lista.filter(s => s.status === 'in_review').length;

  // Math.round preserva o comportamento original (arredonda 0.5 pra cima).
  const percentDone = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

  return {
    totalPoints,
    donePoints,
    percentDone,
    inProgressCount,
    inReviewCount,
    storiesCount: lista.length,
  };
}

// ----------------------------------------------------------------------------
// limparCercasJson(text) -> string
//
// O Gemini às vezes embrulha o JSON em cercas markdown (```json ... ```), mesmo
// pedindo "sem markdown". Esta função remove essas cercas e apara espaços, igual
// ao trecho que estava inline na rota. É puramente transformação de string.
//   text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
//
// Tolerante a entrada não-string (null/undefined/number): trata como '' para
// não quebrar (a rota sempre recebe string do callGemini, mas isolamos a função).
// ----------------------------------------------------------------------------
function limparCercasJson(text) {
  const str = typeof text === 'string' ? text : '';
  return str.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

// ----------------------------------------------------------------------------
// parsearStories(text) -> array de histórias
//
// Limpa as cercas e faz JSON.parse, devolvendo o array `stories`. Replica a
// regra da rota POST /api/ai/generate-stories: `res.json({ stories: parsed.stories || [] })`.
// Se o JSON não tiver a chave `stories`, devolve [] (mesmo default da rota).
// Se o JSON for inválido, PROPAGA o erro de parse (a rota captura no try/catch e
// responde 500 "Erro ao gerar histórias com IA") — preservamos esse contrato.
// ----------------------------------------------------------------------------
function parsearStories(text) {
  const cleaned = limparCercasJson(text);
  const parsed = JSON.parse(cleaned); // pode lançar SyntaxError — comportamento mantido
  return parsed.stories || [];
}

// ----------------------------------------------------------------------------
// tentarParsearStories(text) -> array de histórias | null
//
// Variante "tolerante" usada pela rota POST /api/ai/project-onboarding: lá o
// parse é feito num try/catch interno e, se falhar OU se não houver `stories`,
// cai no fallback de "próxima pergunta". Aqui devolvemos:
//   - o array de stories quando o JSON é válido E tem a chave `stories`;
//   - null quando o JSON é inválido OU não tem `stories` (sinaliza fallback).
// Mantém EXATAMENTE a decisão que a rota já tomava (apenas extraída).
// ----------------------------------------------------------------------------
function tentarParsearStories(text) {
  try {
    const parsed = JSON.parse(limparCercasJson(text));
    if (parsed.stories) return parsed.stories;
    return null;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// deveGerarHistorias(messages) -> boolean
//
// Regra de corte do onboarding: o modelo deve PARAR de perguntar e gerar as
// histórias quando o usuário já mandou 3+ turnos. Era inline na rota:
//   const userTurns = messages.filter(m => m.role === 'user').length;
//   const shouldGenerate = userTurns >= 3;
// Valor-limite importante (>= 3): 2 -> false, 3 -> true.
// ----------------------------------------------------------------------------
function deveGerarHistorias(messages) {
  const lista = Array.isArray(messages) ? messages : [];
  const userTurns = lista.filter(m => m.role === 'user').length;
  return userTurns >= 3;
}

module.exports = {
  calcularMetricasSprint,
  limparCercasJson,
  parsearStories,
  tentarParsearStories,
  deveGerarHistorias,
};
