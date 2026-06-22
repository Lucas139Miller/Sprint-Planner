# 🧪 Divisão dos Testes por Pessoa — Sprint Planner (TP2)

Cola pra defender os testes na apresentação. Cada teste tem **um dono** (sem contar duas vezes). Total: **165 testes** (156 Jest + 9 E2E Cypress), todos passando.

## Números por pessoa

| Integrante | Fatia | Testes | Comando (em `backend/`) |
|-----------|-------|:------:|--------------------------|
| **Gabriel Camargos** | Unidade (ai, sprints, middleware) + integração `projects` | **47** | `npm run test:gabriel` |
| **Lucas Miller** | API: auth, middleware, invitations, dashboard, ai, smoke | **43** | `npm run test:lucas` |
| **Miguel Eduardo** | Unidade (dashboard, stories) + integração `sprints` | **41** | `npm run test:miguel` |
| **Rafael Pinheiro** | E2E (9, dono do ambiente) + Banco/`stories` (25) | **34** | `npm run e2e` (raiz) · `npm run test:rafael` |

Proporção: Gabriel 28,5% · Lucas 26,1% · Miguel 24,8% · Rafael 20,6% (o E2E é a fatia mais pesada por teste, então a carga real fica equilibrada).

> **Botão geral:** duplo-clique em `RODAR_TESTES.bat` (raiz) roda tudo menos o E2E, com cobertura (156 verdes, ≥80%).

---

## Panorama (o que falar)
- **3 camadas (pirâmide):** **63 unidade** (funções puras `src/domain/*`), **93 integração** (rotas com Supertest + Supabase fake `tests/fakeSupabase.js`), **9 E2E** (Cypress no navegador).
- **Cobertura:** 97% statements · 90% branches · 100% functions · 99% lines (gate ≥ 80%).
- **Front-end:** garantido por TypeScript estrito (`tsc --noEmit`, 0 erros) + cobertura pelo E2E.
- Vocabulário do livro nos testes de unidade: **partição de equivalência**, **valor-limite**, **robustez**.

---

## 🟩 Gabriel — Unidade + integração de projects (47)
**Cobre:** unidade de `ai` (19), `sprints` (9), `middleware` (4) = 32 + integração de `projects` (15: criar, listar, deletar, convidar membro com 403/404/409).
- *"O que é teste de unidade?"* → Isola uma função pura, sem rede/banco; rápido e determinístico.
- *"O que é a whitelist no update?"* → Só campos permitidos entram; `id`/`project_id`/"hacker" são ignorados (anti mass-assignment).

## 🟥 Lucas — API / integração das rotas (43)
**Cobre:** `auth` (8), `middleware` (4), `invitations` (7), `dashboard` (7), `ai` (16, Gemini mockado), `smoke` (1). Cada teste dispara HTTP real (Supertest) e valida o contrato.
- *"O que é integração aqui?"* → Junta rota + middleware de auth + persistência no banco fake; testa o endpoint de fora.
- *"Como cobrem segurança?"* → 400 (validação), 401 (token), 403 (não-membro/IDOR), 404, 409 (conflito). IA: JSON ok, JSON quebrado, erro HTTP.

## 🟪 Miguel — Unidade + integração de sprints (41)
**Cobre:** unidade de `dashboard` (15) e `stories` (16) = 31 + integração de `sprints` (10: CRUD, status padrão `planning`, 403 não-membro). Também responde pelo type-check do front (`tsc --noEmit`).
- *"Como o dashboard/velocity é calculado?"* → Soma pontos das histórias `done` por sprint; testes cobrem lista vazia (0, sem divisão por zero) e Math.round.

## 🟦 Rafael — E2E + Banco (34)
**Cobre:** 9 testes E2E (Cypress) — dono do ambiente: sobe backend `USE_FAKE_DB=1` + front e roda o Cypress (`npm run e2e`). + integração de `stories` (25: persistência, mover backlog↔sprint, board por status). Camada de dados: `fakeSupabase`, 6 tabelas `sp_*`, constraints (UNIQUE/FK CASCADE/CHECK).
- *"Testam no banco real?"* → Não; dublê em memória pros testes serem rápidos e isolados; o schema real (com constraints) está versionado.

---

## E2E — 9 testes, 4 vídeos (importante)
O Cypress grava **1 vídeo por arquivo de spec**, e os 9 testes estão em **4 arquivos**, então saem **4 vídeos** — cada um mostra os testes daquele arquivo em sequência:

| Vídeo (arquivo) | Testes `it()` |
|-----------------|:--:|
| `01-registro-login.cy.js.mp4` | 3 (registro, login, senha errada) |
| `02-criar-projeto.cy.js.mp4` | 2 (cria projeto, papel PO) |
| `03-backlog-kanban.cy.js.mp4` | 2 (cria história, arrasta no Kanban) |
| `04-sprint.cy.js.mp4` | 2 (cria sprint, move história) |

No dashboard de testes (`test-dashboard/`) os **9 testes aparecem como 9 cards** (um por `it()` real), e cada card aponta pro vídeo do seu arquivo (o nome do arquivo fica visível). Pra ter 9 vídeos distintos seria preciso separar os `it()` em 9 specs e regravar — todos reais.

---

## Conceitos pra decorar (1 frase)
- **Pirâmide de testes:** muitos de unidade, alguns de integração, poucos de E2E.
- **Unidade × integração × E2E:** unidade isola uma função; integração junta rota+middleware+"banco"; E2E roda tudo pelo navegador.
- **Dublê (fake) × mock:** Supabase fake em memória (banco) e Gemini mockado (IA) deixam os testes determinísticos.
- **Cobertura ≠ corretude:** 97% mostra o quanto do código é exercitado, não prova ausência de bug.
