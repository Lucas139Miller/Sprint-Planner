# Sprint Planner

Gerenciador de Sprints com Inteligência Artificial.
Aplicação web para times pequenos gerenciarem sprints de forma intuitiva, com board Kanban, dashboards e assistência de IA.

## Comandos

- **Backend**: `cd backend && npm install && npm run dev`
- **Frontend**: `cd frontend && npm install && npx vite --port 5173`
- **Type check**: `cd frontend && npx tsc --noEmit`
- **Testar API**: `curl -s http://localhost:3001/api/health`

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript, Tailwind CSS v3, Vite 5 |
| Backend | Node.js + Express 4, API REST |
| Banco | SQLite via better-sqlite3 |
| Auth | bcrypt (hash de senhas) + JWT (tokens) |
| IA | Claude API (Anthropic) - features do produto |

> **Nota**: Node.js 20.18 requer Vite 5 (não Vite 6+). Tailwind v3 usa PostCSS (não plugin Vite).

## Estrutura do Projeto

```
sprint-planner/
├── backend/
│   ├── src/
│   │   ├── server.js          # Servidor Express + middlewares + montagem de rotas
│   │   ├── database.js        # Conexão SQLite + criação de tabelas (users, projects, project_members)
│   │   ├── middleware/
│   │   │   └── auth.js        # Middleware JWT - verifica token e anexa req.user
│   │   └── routes/
│   │       ├── auth.js        # POST /register e /login (bcrypt + JWT)
│   │       └── projects.js    # CRUD projetos + convite/listagem de membros
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx           # Entry point React
│   │   ├── App.tsx            # Componente raiz - gerencia auth + navegação
│   │   ├── index.css          # Tailwind imports
│   │   └── pages/
│   │       ├── Login.tsx          # Formulário de login
│   │       ├── Register.tsx       # Formulário de registro
│   │       ├── Projects.tsx       # Lista de projetos (grid cards)
│   │       ├── CreateProject.tsx  # Formulário criar projeto
│   │       └── ProjectDetail.tsx  # Detalhes + convite de membros
│   ├── tailwind.config.js
│   └── package.json
├── docs/
│   └── commits.md             # Diagramas Mermaid de cada commit
├── CLAUDE.md                  # Este arquivo
└── .gitignore
```

## Padrões de Código

- **Indentação**: 2 espaços (não tabs)
- **Backend**: CommonJS (`require`/`module.exports`), JavaScript puro
- **Frontend**: ESModules (`import`/`export`), TypeScript estrito
- **Nomes de arquivo**: kebab-case para pastas, PascalCase para componentes React
- **Variáveis/funções**: camelCase
- **Comentários**: todo código deve ser bem comentado explicando o "porquê", não apenas o "quê"

## Regras de Commit

1. **Máximo ~100 linhas de código por commit** (scaffold/gerado não conta)
2. **Mensagem clara**: título curto + corpo explicando o que e por quê
3. **Diagrama Mermaid**: cada commit deve incluir ou atualizar `docs/commits.md` com um diagrama Mermaid documentando o que foi feito
4. **Código comentado**: todo código novo deve ter comentários explicativos
5. **Testar antes de commitar**: rodar type check no frontend e testar endpoints no backend
6. **Co-author**: incluir `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`

## Endpoints da API

| Método | Rota | Descrição | Body | Auth |
|--------|------|-----------|------|------|
| GET | `/api/health` | Health check | - | Não |
| POST | `/api/auth/register` | Criar conta | `{ username, email, password }` | Não |
| POST | `/api/auth/login` | Login | `{ email, password }` | Não |
| POST | `/api/projects` | Criar projeto | `{ name, description }` | JWT |
| GET | `/api/projects` | Listar projetos do usuário | - | JWT |
| POST | `/api/projects/:id/members` | Convidar membro (cria invitation pendente) | `{ identifier, role }` | JWT (owner) |
| GET | `/api/projects/:id/members` | Listar membros | - | JWT (membro) |
| GET | `/api/invitations` | Listar convites pendentes do usuário | - | JWT |
| POST | `/api/invitations/:id/accept` | Aceitar convite (vira membro) | - | JWT (invitee) |
| POST | `/api/invitations/:id/reject` | Rejeitar convite | - | JWT (invitee) |
| POST | `/api/projects/:id/stories` | Cria história no backlog | `{ title, description?, story_points?, label? }` | JWT (membro) |
| GET | `/api/projects/:id/stories` | Lista histórias do backlog | `?include=all` (opcional) | JWT (membro) |
| PUT | `/api/stories/:id` | Atualiza história (parcial) | qualquer campo | JWT (membro) |
| DELETE | `/api/stories/:id` | Remove história | - | JWT (membro) |
| POST | `/api/projects/:id/sprints` | Cria sprint do projeto | `{ name, goal?, start_date?, end_date?, status? }` | JWT (membro) |
| GET | `/api/projects/:id/sprints` | Lista sprints do projeto | - | JWT (membro) |
| PUT | `/api/sprints/:id` | Atualiza sprint (parcial) | qualquer campo | JWT (membro) |
| DELETE | `/api/sprints/:id` | Remove sprint | - | JWT (membro) |
| GET | `/api/sprints/:id/dashboard` | Métricas agregadas do sprint (pontos, progresso, status) | - | JWT (membro) |
| GET | `/api/projects/:id/velocity` | Média de pontos concluídos em sprints passados | - | JWT (membro) |

## Histórias de Usuário (Roadmap)

- [x] **US1**: Criar conta e fazer login
- [x] **US2**: Criar projeto e convidar membros
- [x] **US3**: Adicionar histórias ao backlog (PO)
- [x] **US4**: Criar sprint com datas
- [ ] **US5**: Mover histórias do backlog para o sprint
- [ ] **US6**: Board Kanban (To Do / In Progress / In Review / Done)
- [x] **US7**: Dashboard com progresso do sprint
- [ ] **US8**: Gerar sugestões de histórias via IA
- [ ] **US9**: Encerrar sprint com resumo automático por IA

## Arquitetura (Mermaid)

```mermaid
graph TB
    subgraph Frontend["Frontend (React + TS - porta 5173)"]
        App[App.tsx<br/>Auth + Navegação]
        Login[Login.tsx]
        Register[Register.tsx]
        Projects[Projects.tsx<br/>Grid de cards]
        CreateProj[CreateProject.tsx]
        ProjDetail[ProjectDetail.tsx<br/>Membros + Convite]
    end

    subgraph Backend["Backend (Express - porta 3001)"]
        Server[server.js<br/>Express + CORS]
        AuthMW[middleware/auth.js<br/>Verifica JWT]
        AuthRoutes[routes/auth.js<br/>register + login]
        ProjRoutes[routes/projects.js<br/>CRUD + membros]
    end

    subgraph Database["SQLite"]
        Users[(users)]
        ProjectsDB[(projects)]
        Members[(project_members)]
    end

    App --> Login & Register & Projects & CreateProj & ProjDetail
    Login & Register -->|"/api/auth/*"| AuthRoutes
    Projects & CreateProj & ProjDetail -->|"/api/projects/*"| AuthMW
    AuthMW --> ProjRoutes
    AuthRoutes --> Users
    ProjRoutes --> ProjectsDB & Members
    Users --- Members
    ProjectsDB --- Members
```

## Fluxo de Autenticação (Mermaid)

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend (React)
    participant B as Backend (Express)
    participant DB as SQLite

    Note over U,DB: REGISTRO
    U->>F: Preenche username, email, senha
    F->>B: POST /api/auth/register
    B->>B: bcrypt.hashSync(senha, 10)
    B->>DB: INSERT INTO users
    DB-->>B: id do novo usuário
    B->>B: jwt.sign({ id, username })
    B-->>F: { token, user }
    F->>F: localStorage.setItem(token, user)
    F-->>U: Redireciona para tela principal

    Note over U,DB: LOGIN
    U->>F: Preenche email, senha
    F->>B: POST /api/auth/login
    B->>DB: SELECT * FROM users WHERE email = ?
    DB-->>B: dados do usuário (com hash)
    B->>B: bcrypt.compareSync(senha, hash)
    alt Senha correta
        B->>B: jwt.sign({ id, username })
        B-->>F: { token, user }
        F->>F: localStorage.setItem(token, user)
        F-->>U: Redireciona para tela principal
    else Senha incorreta
        B-->>F: 401 "Credenciais inválidas"
        F-->>U: Mostra mensagem de erro
    end
```
