# 🎤 Roteiro de Apresentação — Sprint Planner (4 pessoas · 5 min)

Distribuição das falas do `APRESENTACAO.md` (deck Marp, 12 telas). Cada bloco tem 3 slides e ~1,2 min. Preencha os nomes abaixo.

| Bloco | Apresentador | Slides | Tema | Tempo |
|-------|--------------|--------|------|-------|
| **A** | _______________ | 1, 2, 3 | Abertura + Problema + tese dos 2 eixos de IA | ~1:15 |
| **B** | _______________ | 4, 5, 6 | IA construindo o sistema + 1ª feature do produto | ~1:15 |
| **C** | _______________ | 7, 8, 9 | Features de IA (US8/US9) + arquitetura da camada de IA | ~1:15 |
| **D** | _______________ | 10, 11, 12 | Stack + **demo ao vivo** + encerramento/perguntas | ~1:15 |

> **Sugestão de papéis:** quem conhece melhor o código (Rafael, 59 commits) fica no **Bloco D** pra conduzir a demo ao vivo e responder perguntas. Quem abre (Bloco A) só precisa vender o problema, é a entrada mais leve.

---

## 🅰️ Bloco A — Abertura + Problema (slides 1-3)

**Slide 1 (capa):**
- "Boa tarde, somos o grupo [nomes]. Nosso projeto é o **Sprint Planner**, um gerenciador Scrum com IA integrada."
- Frase-âncora: "O foco da nossa apresentação é **como usamos IA de duas formas**: pra construir o sistema e dentro do produto."

**Slide 2 (O Problema):**
- Times Scrum usam Jira, Azure, Linear, mas pra times pequenos isso é complexo e burocrático demais, e sem IA no fluxo.
- "Nossa proposta é uma ferramenta enxuta, com IA como diferencial."

**Slide 3 (Dois Eixos de IA):**
- Apresenta a tabela: **Eixo 1 = construção** (Claude Code) e **Eixo 2 = produto** (Gemini).
- 🔁 *Transição:* "Vou passar pro [nome] explicar como a IA construiu o sistema."

---

## 🅱️ Bloco B — IA na construção + 1ª feature (slides 4-6)

**Slide 4 (Eixo 1: Copiloto):**
- Claude Code foi usado no desenvolvimento inteiro: 30+ commits, 9 user stories, sub-agentes em paralelo, refactor SQLite→Supabase.
- Punchline: "Sem IA levaria semanas; com IA, dias."

**Slide 5 (Eixo 2: IA no produto):**
- São **3 funcionalidades de IA** pro usuário final: wizard ao criar projeto, gerar histórias e resumo do sprint. Todas no Gemini 2.5 Flash Lite.

**Slide 6 (Feature 1: Wizard Conversacional):**
- Ao criar projeto, a IA faz perguntas (público, pagamento, etc.) e devolve o backlog já populado.
- "Acaba com a tela em branco do Jira/Trello."
- 🔁 *Transição:* "O [nome] vai mostrar as outras duas features de IA."

---

## 🅲 Bloco C — Features US8/US9 + Arquitetura (slides 7-9)

**Slide 7 (Feature 2: Gerar histórias / US8):**
- `POST /api/ai/generate-stories`: recebe uma descrição livre e devolve 3-6 histórias no formato "Como X, quero Y para Z", com story points em Fibonacci e label.
- O usuário revê os cards e escolhe quais vão pro backlog.

**Slide 8 (Feature 3: Resumo retrospectivo / US9):**
- `POST /api/ai/sprint-summary`: a IA analisa o sprint e gera entregas, gargalos e sugestões.
- Métricas são pré-calculadas no backend, então os números saem corretos e economiza tokens.

**Slide 9 (Arquitetura da camada de IA):**
- Frontend → backend → Gemini. A **chave da API fica só no backend**, todo endpoint exige JWT e valida membership.
- 🔁 *Transição:* "Pra fechar, o [nome] mostra a stack e a demo ao vivo."

---

## 🅳 Bloco D — Stack + Demo + Encerramento (slides 10-12)

**Slide 10 (Stack técnica):**
- Rápido: React+TS+Vite no front, Express serverless no back, Supabase, JWT+bcrypt, Vercel. Construção com Claude Code.

**Slide 11 (Demo ao vivo) — momento principal:**
- Abrir https://sprint-planner-murex.vercel.app e fazer o fluxo:
  1. Criar conta + projeto **com o wizard de IA**
  2. Mostrar o backlog gerado automaticamente
  3. `✨ Gerar com IA` pra criar mais histórias
  4. Mover pro sprint + Kanban
  5. Encerrar sprint → `✨ Resumo IA`
- ⚠️ *Plano B:* se a internet/IA falhar, ter print/gravação pronta. A IA depende do Gemini, então teste 5 min antes.

**Slide 12 (Obrigado / Perguntas):**
- Agradecer, repetir o link da demo e o repositório, abrir pra perguntas.
- Quem fez a demo (conhece o código) puxa as respostas; os outros complementam.

---

## ⏱️ Dicas de cronometragem
- 5 min é curto: cada pessoa tem ~1:15. **Não leia o slide**, fale por cima dos bullets.
- A demo (Bloco D) é o que mais arrasta; reserve ~2 min só pra ela e corte os outros blocos se precisar.
- Ensaiem uma vez inteiro com cronômetro. As transições nomeadas ("vou passar pro...") evitam silêncio entre as trocas.

---

## 📦 Como gerar/distribuir o deck (PDF/PPTX)
O `APRESENTACAO.md` é **Marp**. Pra exportar:
- **VS Code:** extensão *Marp for VS Code* → abrir o `.md` → "Export slide deck" → PDF/PPTX/HTML.
- **CLI:** `npx @marp-team/marp-cli APRESENTACAO.md --pdf` (ou `--pptx`, `--html`).

Mande o PDF/HTML exportado no grupo pra todo mundo ter a versão offline (não depende de renderizar Markdown na hora).
