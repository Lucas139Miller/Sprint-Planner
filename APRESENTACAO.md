---
marp: true
theme: default
paginate: true
header: 'Sprint Planner — Engenharia de Software (DCC 603)'
footer: 'Apresentação · 5 min'
style: |
  section {
    font-family: 'Segoe UI', sans-serif;
  }
  h1 { color: #1d4ed8; }
  h2 { color: #1e40af; }
  strong { color: #1d4ed8; }
  .small { font-size: 0.8em; color: #6b7280; }
  table { font-size: 0.85em; }
  code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
---

<!-- _class: lead -->
<!-- _paginate: false -->

# 🎯 Sprint Planner

## Gerenciador Scrum com **Inteligência Artificial integrada**

<br>

**Foco da apresentação:** como a IA foi usada
1. Para **construir** o sistema (copiloto)
2. **Dentro do produto** como funcionalidade

<br>

> Demo ao vivo: https://sprint-planner-murex.vercel.app

---

# 🎯 O Problema

**Times Scrum** dependem de ferramentas como Jira, Azure DevOps, Linear.

Mas essas ferramentas são:
- 🐢 **Complexas demais** para times pequenos
- 📚 **Burocráticas** para quem está aprendendo Scrum
- ❌ **Sem IA integrada** ao fluxo de planning/retrospectiva

**Nossa proposta:** uma ferramenta enxuta + **IA como diferencial competitivo**.

---

# 🤖 Dois Eixos de IA no Projeto

<br>

| Eixo | O quê | Ferramentas |
|------|-------|-------------|
| **1. Construção** | IA gerando o código do sistema | Claude Code (Anthropic) |
| **2. Produto** | IA como feature pro usuário final | Google Gemini (gemini-2.5-flash-lite) |

<br>

**Diferencial:** o usuário do Sprint Planner também tem IA ajudando a gerenciar o backlog, criar histórias e analisar sprints.

---

# 🛠️ Eixo 1: IA como Copiloto

**Claude Code (CLI da Anthropic)** foi usado durante todo o desenvolvimento:

- ✅ **30+ commits** gerados em colaboração com IA
- ✅ **9 user stories** implementadas em poucas horas
- ✅ **Agentes em paralelo**: 4 sub-agentes implementaram US4-US7 simultaneamente
- ✅ **Refactor automático**: migração SQLite → Supabase em 1 commit
- ✅ **Code review**: agentes auditando bugs antes da apresentação

**Sem IA, este projeto levaria semanas. Com IA: dias.**

---

# 🤖 Eixo 2: IA dentro do Produto

**3 funcionalidades de IA** acessíveis ao usuário:

<br>

| # | Feature | Onde |
|---|---------|------|
| 1 | **Wizard conversacional** ao criar projeto | `+ Novo Projeto` |
| 2 | **Geração de histórias** a partir de descrição | Botão `✨ Gerar com IA` no Backlog |
| 3 | **Resumo retrospectivo** do sprint | Botão `✨ Resumo IA` em cada sprint |

<br>

Todas usam o mesmo modelo: **Google Gemini 2.5 Flash Lite**.

---

# 💬 Feature 1: Wizard Conversacional

**Ao criar um projeto**, em vez de só pedir nome+descrição:

```
1. Usuário: "E-commerce de roupas"
2. IA: "Qual é o público-alvo?"
3. Usuário: "Mulheres 25-45"
4. IA: "Quais formas de pagamento?"
5. Usuário: "Cartão e Pix"
6. IA → gera 4-6 histórias formatadas para o backlog
```

**Por que importa:** o PO inicia o projeto com **backlog populado** e bem estruturado, em vez de tela em branco.

---

# ✨ Feature 2: Geração de Histórias (US8)

**Endpoint:** `POST /api/ai/generate-stories`

**Input:** descrição livre (ex: "Sistema de delivery de comida")

**Prompt estruturado em PT-BR pedindo JSON estrito:**

```
"Gere 3-6 histórias no formato 'Como X, quero Y para Z'
- story_points em Fibonacci (1,2,3,5,8,13)
- label: feature | bug | tech_debt
- Responda APENAS com JSON válido"
```

**Output:** lista de cards revisáveis — usuário escolhe quais ir pro backlog.

---

# 📊 Feature 3: Resumo Retrospectivo (US9)

**Endpoint:** `POST /api/ai/sprint-summary`

A IA analisa todas as histórias do sprint e gera markdown com:

- 📦 **Entregas**: o que foi concluído vs planejado
- 🚧 **Gargalos**: tarefas paradas em revisão, baixa conclusão
- 💡 **Sugestões**: 2-3 melhorias acionáveis para o próximo sprint

**Métricas pré-calculadas** no backend (totalPoints, donePoints, byStatus) e enviadas ao prompt — economiza tokens e garante números corretos.

---

# 🏗️ Arquitetura da Camada de IA

```
Frontend (React)
    ↓ POST /api/ai/*
Backend (Express serverless)  ← chave Gemini APENAS aqui (.env)
    ↓ + JWT auth + validação de membership
Google Gemini API
    ↓
Resposta JSON / Markdown
```

**Princípios de segurança:**
- 🔒 Chave da API **nunca chega ao frontend** (proxy via backend)
- 🔒 Todos os endpoints exigem **JWT válido**
- 🔒 Validação de membership no projeto antes de expor dados

---

# ⚙️ Stack Técnica

<br>

| Camada | Tecnologia |
|--------|-----------|
| **IA** | Google Gemini 2.5 Flash Lite |
| **Frontend** | React 18 + TypeScript + Tailwind + Vite |
| **Backend** | Node.js + Express (serverless na Vercel) |
| **Banco** | Supabase (PostgreSQL) |
| **Auth** | JWT + bcrypt |
| **Deploy** | Vercel (frontend estático + backend serverless) |
| **Construção** | Claude Code, Anthropic API |

---

<!-- _class: lead -->

# 🎬 Demo ao Vivo

<br>

1. Criar conta + projeto **com wizard de IA**
2. Backlog gerado automaticamente
3. Gerar mais histórias com `✨ Gerar com IA`
4. Mover para sprint + Kanban
5. Encerrar sprint → `✨ Resumo IA`

<br>

**URL:** https://sprint-planner-murex.vercel.app

---

<!-- _class: lead -->

# 🙏 Obrigado

## Perguntas?

<br>

**Repositório:** github.com/Lucas139Miller/Sprint-Planner

**Demo:** sprint-planner-murex.vercel.app

<br>

<span class="small">Engenharia de Software · DCC 603 · Prof. Marco Túlio Valente</span>
