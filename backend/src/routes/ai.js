// Rotas de IA (US8 e US9) usando Google Gemini.
// IMPORTANTE: a chave fica APENAS no servidor (.env). Frontend chama estes endpoints
// e o backend faz a requisição autenticada para o Gemini, nunca expondo a chave.
const express = require('express');
const supabase = require('../database');
const authMiddleware = require('../middleware/auth');
// Lógica de domínio PURA extraída desta rota (Cap. 8: separar domínio da apresentação).
const {
  calcularMetricasSprint,
  parsearStories,
  tentarParsearStories,
  deveGerarHistorias,
} = require('../domain/ai');

const router = express.Router();
router.use(authMiddleware);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Modelo flash-lite tem maior cota gratuita que o flash padrão.
// Override possível via env GEMINI_MODEL para futuro upgrade.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Helper de verificação de membership (replicado para evitar dependência circular)
async function isMember(projectId, userId) {
  const { data } = await supabase.from('sp_project_members')
    .select('id').eq('project_id', projectId).eq('user_id', userId).maybeSingle();
  return !!data;
}

// Wrapper genérico para chamada Gemini. Recebe prompt e retorna texto da resposta.
// Centralizado para fácil rotação de modelo / API e retry futuro.
async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY não configurada no .env');
  }
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      // Configuração baixa de temperatura = respostas mais determinísticas/úteis
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API erro ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// US8 - POST /api/ai/generate-stories
// Gera sugestões de histórias de usuário a partir de uma descrição livre.
// Body: { description: string, projectId: number }
router.post('/generate-stories', async (req, res) => {
  const { description, projectId } = req.body;
  if (!description) return res.status(400).json({ error: 'description é obrigatório' });
  if (projectId && !(await isMember(projectId, req.user.id))) {
    return res.status(403).json({ error: 'Você não é membro deste projeto' });
  }

  // Prompt estruturado em PT-BR pedindo JSON estrito (evita parsing frágil)
  const prompt = `Você é um Product Owner experiente em Scrum.

Analise a descrição abaixo e gere de 3 a 6 histórias de usuário no formato Scrum padrão.

Descrição: "${description}"

Responda APENAS com JSON válido (sem markdown, sem texto antes/depois) no formato:
{"stories":[{"title":"Como X, quero Y para Z","description":"detalhes","story_points":3,"label":"feature"}]}

Regras:
- title sempre no formato "Como [papel], quero [ação] para [benefício]"
- story_points em Fibonacci: 1, 2, 3, 5, 8 ou 13
- label: "feature", "bug" ou "tech_debt"
- description: 1 frase explicando contexto`;

  try {
    const text = await callGemini(prompt);
    // Limpa cercas markdown e parseia o JSON (função pura testável em domain/ai.js).
    // Se o JSON for inválido, parsearStories lança e caímos no catch (500) — igual antes.
    const stories = parsearStories(text);
    res.json({ stories });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar histórias com IA', details: err.message });
  }
});

// US9 - POST /api/ai/sprint-summary
// Gera resumo retrospectivo de um sprint analisando suas histórias.
// Body: { sprintId: number }
router.post('/sprint-summary', async (req, res) => {
  const { sprintId } = req.body;
  if (!sprintId) return res.status(400).json({ error: 'sprintId é obrigatório' });

  // Busca o sprint e valida membership
  const { data: sprint } = await supabase.from('sp_sprints')
    .select('*').eq('id', sprintId).maybeSingle();
  if (!sprint) return res.status(404).json({ error: 'Sprint não encontrado' });
  if (!(await isMember(sprint.project_id, req.user.id))) {
    return res.status(403).json({ error: 'Você não é membro deste projeto' });
  }

  // Busca todas as histórias do sprint para alimentar o prompt
  const { data: stories } = await supabase.from('sp_user_stories')
    .select('title, status, story_points, label').eq('sprint_id', sprintId);

  if (!stories || stories.length === 0) {
    return res.json({ summary: 'Este sprint não tem histórias para analisar ainda.' });
  }

  // Calcula métricas agregadas localmente (mais barato que pedir pro modelo somar).
  // Lógica pura extraída para domain/ai.js — testável sem subir o app.
  const { totalPoints, donePoints, percentDone, inProgressCount, inReviewCount } =
    calcularMetricasSprint(stories);

  const prompt = `Você é um Scrum Master analisando um sprint que está sendo encerrado.

Dados do sprint "${sprint.name}":
- Meta: ${sprint.goal || 'não definida'}
- Histórias totais: ${stories.length}
- Pontos planejados: ${totalPoints}
- Pontos concluídos: ${donePoints} (${percentDone}%)
- Em andamento: ${inProgressCount}
- Em revisão: ${inReviewCount}

Histórias do sprint:
${stories.map(s => `- [${s.status}] ${s.title} (${s.story_points} pts, ${s.label})`).join('\n')}

Gere um resumo em PT-BR contendo:
1. **Entregas**: o que foi concluído (1-2 frases)
2. **Gargalos**: problemas observados (tarefas paradas em revisão, baixa conclusão, etc.)
3. **Sugestões para o próximo sprint**: 2-3 pontos de melhoria acionáveis

Responda em markdown, conciso (máx 250 palavras). Sem preâmbulo.`;

  try {
    const summary = await callGemini(prompt);
    res.json({
      summary,
      metrics: { totalPoints, donePoints, storiesCount: stories.length, inProgressCount, inReviewCount },
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar resumo com IA', details: err.message });
  }
});

// POST /api/ai/project-onboarding
// Conversa multi-turno para refinar a ideia do projeto e gerar histórias iniciais.
// Body: { projectName, projectDescription, messages: [{role, content}] }
// Retorna ou uma próxima pergunta { done: false, message } ou as histórias finais
// { done: true, stories: [...] }. O modelo decide quando tem contexto suficiente.
router.post('/project-onboarding', async (req, res) => {
  const { projectName, projectDescription, messages = [] } = req.body;
  if (!projectDescription) return res.status(400).json({ error: 'projectDescription é obrigatório' });

  // Conta turnos do usuário para forçar geração de histórias após 3-4 trocas.
  // Sem isso, o modelo às vezes faz perguntas indefinidamente.
  // Regra de corte (>= 3 turnos) extraída para domain/ai.js (função pura).
  const shouldGenerate = deveGerarHistorias(messages);

  const systemInstruction = shouldGenerate
    ? `Baseado na conversa, gere 4-6 histórias de usuário para iniciar o backlog.
Responda APENAS com JSON válido (sem markdown, sem texto antes/depois):
{"done":true,"stories":[{"title":"Como X, quero Y para Z","description":"...","story_points":3,"label":"feature"}]}
- title: formato "Como [papel], quero [ação] para [benefício]"
- story_points: 1, 2, 3, 5, 8 ou 13 (Fibonacci)
- label: "feature", "bug" ou "tech_debt"`
    : `Faça UMA pergunta curta e objetiva para entender melhor o projeto.
Foque em: tipo de usuário, funcionalidade essencial, prioridades, ou prazo.
Responda APENAS com a pergunta em texto natural (sem JSON, sem listas, máximo 2 frases).`;

  const conversationText = messages.length > 0
    ? messages.map(m => `${m.role === 'user' ? 'Usuário' : 'Você'}: ${m.content}`).join('\n')
    : '(início da conversa)';

  const prompt = `Você é um Product Owner ajudando alguém a criar um novo projeto Scrum chamado "${projectName || 'Sem nome'}".

Descrição inicial: "${projectDescription}"

Conversa até agora:
${conversationText}

Tarefa atual: ${systemInstruction}`;

  try {
    const text = await callGemini(prompt);
    // Tenta parsear como JSON (caso o modelo tenha gerado histórias).
    // tentarParsearStories devolve o array quando há JSON válido com `stories`,
    // ou null para cair no fallback de "próxima pergunta" (mesma lógica de antes).
    if (shouldGenerate) {
      const stories = tentarParsearStories(text);
      if (stories) return res.json({ done: true, stories });
    }
    // Resposta natural (próxima pergunta)
    res.json({ done: false, message: text.trim() });
  } catch (err) {
    res.status(500).json({ error: 'Erro na conversa com IA', details: err.message });
  }
});

module.exports = router;
