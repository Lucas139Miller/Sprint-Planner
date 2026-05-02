# Histórico de Commits - Sprint Planner

Documentação visual de cada commit com diagramas Mermaid mostrando a evolução da arquitetura.

---

## Commit 1 — `10dd475` Inicializa backend com Express e banco SQLite

**O que foi feito:** Criou a base do servidor backend com Express e o banco de dados SQLite com a tabela de usuários.

**Arquivos criados:** `.gitignore`, `backend/package.json`, `backend/src/server.js`, `backend/src/database.js`

```mermaid
graph LR
    subgraph Backend["Backend (porta 3001)"]
        Server["server.js<br/>Express + CORS + JSON"]
        DB["database.js<br/>Conexão SQLite"]
    end

    subgraph SQLite["Banco de Dados"]
        Users[("users<br/>id | username | email<br/>password | created_at")]
    end

    Client(("Cliente<br/>(qualquer)")) -->|"GET /api/health"| Server
    Server -->|"{ status: ok }"| Client
    DB -->|"CREATE TABLE IF NOT EXISTS"| Users

    style Server fill:#4a90d9,color:#fff
    style DB fill:#f0ad4e,color:#fff
    style Users fill:#5cb85c,color:#fff
```

**Conceitos introduzidos:**
- Express como framework HTTP
- SQLite como banco local (arquivo `.db`)
- CORS para permitir requisições cross-origin
- Health check como rota de verificação

---

## Commit 2 — `acf9b2a` Adiciona rotas de registro e login com JWT

**O que foi feito:** Implementou as duas rotas de autenticação: registro (criar conta) e login. Usa bcrypt para hash de senhas e JWT para tokens.

**Arquivos criados:** `backend/src/routes/auth.js`  
**Arquivos modificados:** `backend/src/server.js` (adicionou import + montagem das rotas)

```mermaid
graph TB
    subgraph Registro["POST /api/auth/register"]
        R1["Recebe username, email, senha"] --> R2["bcrypt.hashSync(senha, 10)<br/>Gera hash irreversível"]
        R2 --> R3["INSERT INTO users<br/>(username, email, hash)"]
        R3 --> R4["jwt.sign({ id, username })<br/>Gera token válido por 7 dias"]
        R4 --> R5["Retorna { token, user }"]
    end

    subgraph Login["POST /api/auth/login"]
        L1["Recebe email, senha"] --> L2["SELECT * FROM users<br/>WHERE email = ?"]
        L2 --> L3{"bcrypt.compareSync<br/>senha vs hash do banco"}
        L3 -->|"Correto"| L4["jwt.sign({ id, username })<br/>Gera token"]
        L3 -->|"Incorreto"| L5["401 Credenciais inválidas"]
        L4 --> L6["Retorna { token, user }"]
    end

    subgraph Erros["Tratamento de Erros"]
        E1["400 - Campos obrigatórios faltando"]
        E2["409 - Username ou email duplicado"]
        E3["401 - Senha incorreta ou email não existe"]
        E4["500 - Erro interno"]
    end

    style R2 fill:#d9534f,color:#fff
    style R4 fill:#5bc0de,color:#fff
    style L3 fill:#f0ad4e,color:#fff
    style L4 fill:#5bc0de,color:#fff
    style L5 fill:#d9534f,color:#fff
```

**Conceitos introduzidos:**
- **bcrypt**: hash de senha com salt (10 rounds) — irreversível, mesmo com acesso ao banco não se descobre a senha
- **JWT**: token assinado digitalmente contendo `{ id, username }`, expira em 7 dias
- **Prepared statements** (`?`): previnem SQL Injection
- **Mensagem genérica de erro** no login: não revela se o email existe ou se a senha está errada

---

## Commit 3 — `18c9474` Inicializa frontend React + TypeScript com Tailwind CSS

**O que foi feito:** Criou o projeto frontend com Vite (scaffold React + TypeScript). Configurou Tailwind CSS para estilização. Limpou os arquivos de template.

**Arquivos criados:** Todo o diretório `frontend/` (scaffold Vite)  
**Arquivos modificados:** `App.tsx` (limpou template), `index.css` (Tailwind), `vite.config.ts` (plugin)

```mermaid
graph TB
    subgraph Vite["Vite (Dev Server - porta 5173)"]
        Config["vite.config.ts<br/>Plugin React"]
    end

    subgraph React["React + TypeScript"]
        Main["main.tsx<br/>Entry point<br/>createRoot + StrictMode"]
        App["App.tsx<br/>Componente raiz<br/>(apenas título por enquanto)"]
        CSS["index.css<br/>@tailwind base/components/utilities"]
    end

    subgraph Tailwind["Tailwind CSS v3"]
        TW_Config["tailwind.config.js<br/>content: src/**/*.tsx"]
        PostCSS["postcss.config.js<br/>autoprefixer + tailwind"]
    end

    Config -->|"Serve"| Main
    Main -->|"Renderiza"| App
    App -->|"Classes utilitárias"| CSS
    CSS -->|"Processado por"| PostCSS
    PostCSS -->|"Configurado em"| TW_Config

    style Config fill:#646cff,color:#fff
    style App fill:#61dafb,color:#333
    style TW_Config fill:#38bdf8,color:#fff
```

**Conceitos introduzidos:**
- **Vite**: bundler rápido com HMR (Hot Module Replacement)
- **TypeScript**: tipagem estática para JavaScript
- **Tailwind CSS**: classes utilitárias (`bg-blue-700`, `p-4`, `rounded`) direto no HTML
- **Scaffold limpo**: removeu boilerplate do Vite (logos, contador, CSS padrão)

---

## Commit 4 — `a4adcec` Adiciona páginas de Login e Registro

**O que foi feito:** Criou os dois componentes de formulário (Login e Register) com validação, chamadas à API e exibição de erros.

**Arquivos criados:** `frontend/src/pages/Login.tsx`, `frontend/src/pages/Register.tsx`

```mermaid
graph TB
    subgraph LoginPage["Login.tsx"]
        LF["Formulário Controlado"]
        LE["useState: email"]
        LP["useState: password"]
        LErr["useState: error"]
        LSubmit["handleSubmit()"]

        LF --> LE & LP
        LF -->|"onSubmit"| LSubmit
        LSubmit -->|"fetch POST"| API_Login["/api/auth/login"]
        API_Login -->|"Sucesso"| OnLogin["onLogin(token, user)<br/>Callback para o App"]
        API_Login -->|"Erro"| LErr
    end

    subgraph RegisterPage["Register.tsx"]
        RF["Formulário Controlado"]
        RU["useState: username"]
        RE["useState: email"]
        RP["useState: password"]
        RErr["useState: error"]
        RSubmit["handleSubmit()"]

        RF --> RU & RE & RP
        RF -->|"onSubmit"| RSubmit
        RSubmit -->|"fetch POST"| API_Register["/api/auth/register"]
        API_Register -->|"Sucesso"| OnLogin2["onLogin(token, user)<br/>Callback para o App"]
        API_Register -->|"Erro"| RErr
    end

    subgraph Props["Props recebidas do App"]
        P1["onSwitch: () => void<br/>Alterna entre Login ↔ Registro"]
        P2["onLogin: (token, user) => void<br/>Salva sessão no App"]
    end

    Props -->|"Passadas como prop"| LoginPage & RegisterPage

    style LSubmit fill:#4a90d9,color:#fff
    style RSubmit fill:#4a90d9,color:#fff
    style OnLogin fill:#5cb85c,color:#fff
    style OnLogin2 fill:#5cb85c,color:#fff
    style LErr fill:#d9534f,color:#fff
    style RErr fill:#d9534f,color:#fff
```

**Conceitos introduzidos:**
- **Formulários controlados**: cada input vinculado a um `useState` — React controla o valor
- **Props com callback**: filho (Login) avisa o pai (App) quando o login é bem-sucedido via `onLogin()`
- **fetch API**: requisições HTTP nativas do navegador para o backend
- **Validação HTML5**: `required` e `type="email"` validam antes de enviar

---

## Commit 5 — `74ed7d8` Integra autenticação no App com persistência em localStorage

**O que foi feito:** Conectou Login e Register ao App.tsx. Gerencia o estado de autenticação (logado/deslogado) com persistência no localStorage para sobreviver a recarregamentos.

**Arquivos modificados:** `frontend/src/App.tsx`

```mermaid
stateDiagram-v2
    [*] --> Verificando: App carrega

    Verificando --> Deslogado: Sem token no localStorage
    Verificando --> Logado: Token encontrado no localStorage

    state Deslogado {
        [*] --> TelaLogin
        TelaLogin --> TelaRegistro: Clica "Criar conta"
        TelaRegistro --> TelaLogin: Clica "Fazer login"

        TelaLogin --> Autenticando: Submete formulário
        TelaRegistro --> Autenticando: Submete formulário

        Autenticando --> TelaLogin: API retorna erro
        Autenticando --> TelaRegistro: API retorna erro
    }

    Deslogado --> Logado: API retorna { token, user }\nlocalStorage.setItem()

    state Logado {
        [*] --> TelaPrincipal
        TelaPrincipal: Header "Olá, username"\nBotão Sair\nConteúdo do app
    }

    Logado --> Deslogado: Clica "Sair"\nlocalStorage.removeItem()

    note right of Logado
        Token + User salvos em:
        - React state (memória)
        - localStorage (persistência)
    end note
```

**Conceitos introduzidos:**
- **localStorage**: armazenamento no navegador que persiste após fechar a aba
- **useEffect**: roda ao carregar o componente para recuperar sessão salva
- **Renderização condicional**: `if (!token)` decide qual tela mostrar
- **Lifting state up**: App é o "dono" do estado de auth, filhos comunicam via callbacks

---

## Commit 6 — `45555c0` Adiciona CLAUDE.md com padrões do projeto e diagramas Mermaid

**O que foi feito:** Criou o arquivo CLAUDE.md documentando stack, estrutura, comandos, regras de commit, endpoints e diagramas de arquitetura.

**Arquivos criados:** `CLAUDE.md`

```mermaid
graph TB
    subgraph CLAUDE_MD["CLAUDE.md - Guia do Projeto"]
        S1["📋 Comandos<br/>Como rodar backend, frontend, testes"]
        S2["🔧 Stack<br/>React, Express, SQLite, JWT, bcrypt"]
        S3["📁 Estrutura<br/>Árvore de diretórios comentada"]
        S4["📏 Padrões de Código<br/>Indentação, naming, imports"]
        S5["📝 Regras de Commit<br/>~100 linhas, Mermaid, comentários"]
        S6["🔌 Endpoints<br/>Tabela de rotas da API"]
        S7["🗺️ Roadmap<br/>9 User Stories com status"]
        S8["📊 Diagramas Mermaid<br/>Arquitetura + Fluxo de Auth"]
    end

    Dev(("Desenvolvedor")) -->|"Lê antes de codar"| CLAUDE_MD
    Claude(("Claude Code")) -->|"Carrega automaticamente"| CLAUDE_MD

    CLAUDE_MD -->|"Garante"| Consistencia["Consistência<br/>entre devs e sessões"]

    style CLAUDE_MD fill:#f8f9fa,stroke:#333
    style Dev fill:#4a90d9,color:#fff
    style Claude fill:#7c3aed,color:#fff
```

**Conceitos introduzidos:**
- **CLAUDE.md**: arquivo de instruções persistentes carregado pelo Claude Code em toda sessão
- **Diagramas Mermaid**: visualização de arquitetura renderizada no GitHub
- **Roadmap com checklist**: tracking visual do progresso das user stories

---

## Commit 7 — `acfd105` Comenta todo o código e corrige compatibilidade Vite 5 + Tailwind v3

**O que foi feito:** Adicionou comentários explicativos em todos os arquivos. Corrigiu incompatibilidade do Vite 6 com Node 20.18, migrando para Vite 5 + Tailwind v3 com PostCSS.

**Arquivos modificados:** Todos os arquivos de código do backend e frontend

```mermaid
graph TB
    subgraph Antes["❌ Antes (incompatível)"]
        V6["Vite 6+<br/>Requer Node 20.19+"]
        TW4["Tailwind v4<br/>Plugin @tailwindcss/vite"]
        Node["Node.js 20.18.0"]
        V6 -.->|"ERRO: rolldown binding"| Node
    end

    subgraph Depois["✅ Depois (compatível)"]
        V5["Vite 5<br/>Compatível com Node 20.18"]
        TW3["Tailwind v3<br/>Via PostCSS + autoprefixer"]
        NodeOK["Node.js 20.18.0"]
        V5 -->|"Funciona"| NodeOK
    end

    subgraph Comentarios["📝 Código Comentado"]
        C1["database.js<br/>Explica WAL, UNIQUE, AUTOINCREMENT"]
        C2["auth.js<br/>Explica bcrypt rounds, JWT, SQL Injection"]
        C3["server.js<br/>Explica CORS, middleware, montagem de rotas"]
        C4["App.tsx<br/>Explica useState, useEffect, localStorage"]
        C5["Login.tsx<br/>Explica formulário controlado, fetch, callbacks"]
        C6["Register.tsx<br/>Explica registro automático com login"]
    end

    Antes -->|"Migração"| Depois

    style V6 fill:#d9534f,color:#fff
    style V5 fill:#5cb85c,color:#fff
    style TW4 fill:#d9534f,color:#fff
    style TW3 fill:#5cb85c,color:#fff
```

**Conceitos introduzidos:**
- **Compatibilidade de versões**: Node 20.18 não suporta Vite 6+ (que usa rolldown nativo)
- **PostCSS**: processador CSS que o Tailwind v3 usa para compilar as classes utilitárias
- **Código auto-documentado**: comentários explicando o "porquê" de cada decisão

---

## Commit 8 — Adiciona tabelas projects/project_members e middleware JWT

**O que foi feito:** Criou as tabelas de projetos e membros no banco de dados. Criou o middleware de autenticação JWT que protege rotas privadas.

**Arquivos criados:** `backend/src/middleware/auth.js`  
**Arquivos modificados:** `backend/src/database.js`

```mermaid
graph TB
    subgraph Banco["SQLite - Tabelas"]
        Users[("users<br/>id | username | email<br/>password | created_at")]
        Projects[("projects<br/>id | name | description<br/>owner_id → users.id<br/>created_at")]
        Members[("project_members<br/>id | project_id → projects.id<br/>user_id → users.id<br/>role (PO/SM/Dev)<br/>UNIQUE(project, user)")]
    end

    Users -->|"1:N — um user cria vários projetos"| Projects
    Users -->|"N:N — um user participa de vários projetos"| Members
    Projects -->|"1:N — um projeto tem vários membros"| Members

    subgraph Middleware["middleware/auth.js"]
        MW1["Extrai header Authorization: Bearer token"]
        MW2["jwt.verify(token, SECRET)"]
        MW3["req.user = { id, username }"]
        MW4["next() → rota executa"]
    end

    MW1 --> MW2 --> MW3 --> MW4

    ReqProtegida(("Requisição<br/>protegida")) -->|"Header: Bearer eyJ..."| MW1
    MW4 -->|"req.user disponível"| Rota["Rota protegida<br/>(projects, members...)"]

    style Projects fill:#f0ad4e,color:#fff
    style Members fill:#5bc0de,color:#fff
    style Users fill:#5cb85c,color:#fff
    style MW2 fill:#7c3aed,color:#fff
```

**Conceitos introduzidos:**
- **FOREIGN KEY**: garante integridade referencial (owner_id deve existir em users)
- **CHECK constraint**: role só aceita 'PO', 'Scrum Master' ou 'Dev' no nível do banco
- **UNIQUE composto**: (project_id, user_id) impede membro duplicado
- **Middleware Express**: função que intercepta a requisição antes da rota, ideal para auth

---

## Commit 9 — Adiciona rotas CRUD de projetos (criar e listar)

**O que foi feito:** Criou as rotas para criar e listar projetos. O criador do projeto é automaticamente adicionado como PO. Todas as rotas são protegidas pelo middleware JWT.

**Arquivos criados:** `backend/src/routes/projects.js`  
**Arquivos modificados:** `backend/src/server.js` (monta rotas em /api/projects)

```mermaid
sequenceDiagram
    participant U as Usuário (logado)
    participant F as Frontend
    participant MW as Middleware Auth
    participant R as routes/projects.js
    participant DB as SQLite

    Note over U,DB: CRIAR PROJETO (POST /api/projects)
    U->>F: Nome + Descrição
    F->>MW: Authorization: Bearer token
    MW->>MW: jwt.verify(token)
    MW->>R: req.user = { id, username }
    R->>DB: INSERT INTO projects (name, desc, owner_id)
    DB-->>R: project.id
    R->>DB: INSERT INTO project_members (project_id, user_id, 'PO')
    R-->>F: { id, name, description, role: 'PO' }

    Note over U,DB: LISTAR PROJETOS (GET /api/projects)
    F->>MW: Authorization: Bearer token
    MW->>R: req.user = { id }
    R->>DB: SELECT projects JOIN project_members WHERE user_id = ?
    DB-->>R: lista de projetos com role
    R-->>F: [{ id, name, description, role, created_at }]
```

**Conceitos introduzidos:**
- **Criador = PO automático**: ao criar projeto, o dono é inserido em project_members como PO
- **INNER JOIN**: combina dados de projects + project_members para retornar o role do usuário
- **router.use(authMiddleware)**: aplica autenticação em TODAS as rotas do arquivo de uma vez

---

## Commit 10 — Adiciona rotas de convite e listagem de membros

**O que foi feito:** Implementou as rotas para convidar membros a um projeto (por email ou username) e listar os membros atuais. Apenas o dono do projeto pode convidar.

**Arquivos modificados:** `backend/src/routes/projects.js`

```mermaid
graph TB
    subgraph Convidar["POST /api/projects/:id/members"]
        C1["Recebe { identifier, role }"]
        C2{"Usuário logado é<br/>o dono do projeto?"}
        C2 -->|"Não"| C3["403 Apenas o dono pode convidar"]
        C2 -->|"Sim"| C4["Busca user por email OR username"]
        C4 -->|"Não encontrou"| C5["404 Usuário não encontrado"]
        C4 -->|"Encontrou"| C6["INSERT INTO project_members"]
        C6 -->|"UNIQUE violado"| C7["409 Já é membro"]
        C6 -->|"Sucesso"| C8["201 { id, username, email, role }"]
    end

    subgraph Listar["GET /api/projects/:id/members"]
        L1{"Usuário logado<br/>é membro?"}
        L1 -->|"Não"| L2["403 Não é membro"]
        L1 -->|"Sim"| L3["SELECT users JOIN project_members"]
        L3 --> L4["200 [{ username, email, role }]"]
    end

    style C3 fill:#d9534f,color:#fff
    style C5 fill:#f0ad4e,color:#fff
    style C7 fill:#f0ad4e,color:#fff
    style C8 fill:#5cb85c,color:#fff
    style L2 fill:#d9534f,color:#fff
    style L4 fill:#5cb85c,color:#fff
```

**Conceitos introduzidos:**
- **Busca flexível**: `WHERE email = ? OR username = ?` permite convidar por email ou username
- **Controle de acesso**: apenas owner_id pode convidar, qualquer membro pode listar
- **Tratamento de duplicata**: UNIQUE constraint capturada como erro 409

---

## Commit 11 — Adiciona página de lista de projetos no frontend

**O que foi feito:** Criou o componente Projects.tsx que exibe os projetos do usuário em cards com badges de role. Atualizou App.tsx com sistema de navegação por estado.

**Arquivos criados:** `frontend/src/pages/Projects.tsx`  
**Arquivos modificados:** `frontend/src/App.tsx`

```mermaid
graph TB
    subgraph AppNavigation["App.tsx - Navegação por Estado"]
        State["page state"]
        State -->|"'login'"| Login["Login.tsx"]
        State -->|"'register'"| Register["Register.tsx"]
        State -->|"'projects'"| Projects["Projects.tsx"]
        State -->|"'create-project'"| CP["CreateProject.tsx<br/>(próximo commit)"]
        State -->|"'project-detail'"| PD["ProjectDetail.tsx<br/>(próximo commit)"]
    end

    subgraph ProjectsPage["Projects.tsx"]
        Mount["useEffect ao montar"] -->|"GET /api/projects<br/>Bearer token"| API["Backend API"]
        API -->|"[{ id, name, role, ... }]"| Grid["Grid de Cards"]
        Grid --> Card1["Card Projeto 1<br/>nome + descrição<br/>badge PO"]
        Grid --> Card2["Card Projeto 2<br/>nome + descrição<br/>badge Dev"]
        BtnNew["Botão + Novo Projeto"] -->|"onCreateProject()"| CP
        Card1 -->|"onSelectProject(id)"| PD
    end

    style Projects fill:#61dafb,color:#333
    style Login fill:#ccc,color:#333
    style Register fill:#ccc,color:#333
    style CP fill:#ddd,color:#999,stroke-dasharray: 5 5
    style PD fill:#ddd,color:#999,stroke-dasharray: 5 5
```

**Conceitos introduzidos:**
- **Navegação por estado**: em vez de react-router, usa useState para controlar qual página exibir
- **Grid responsivo**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` adapta ao tamanho da tela
- **Role badges**: cores diferentes por papel (PO=roxo, SM=verde, Dev=azul)

---

## Commit 12 — Adiciona formulário de criação de projeto

**O que foi feito:** Criou o componente CreateProject.tsx com formulário para nome e descrição. Após criar, volta automaticamente para a lista de projetos.

**Arquivos criados:** `frontend/src/pages/CreateProject.tsx`  
**Arquivos modificados:** `frontend/src/App.tsx`

```mermaid
graph LR
    subgraph Fluxo["Fluxo de Criação de Projeto"]
        List["Projects.tsx<br/>Lista de projetos"]
        List -->|"Clica + Novo Projeto"| Form["CreateProject.tsx<br/>Formulário"]
        Form -->|"POST /api/projects<br/>{ name, description }"| API["Backend"]
        API -->|"201 Created"| List
        Form -->|"Clica Voltar"| List
    end

    subgraph FormFields["Campos do Formulário"]
        F1["Nome * (obrigatório)"]
        F2["Descrição (opcional, textarea)"]
        F3["Botão Criar Projeto"]
        F4["Botão Voltar"]
    end

    style Form fill:#61dafb,color:#333
    style List fill:#5cb85c,color:#fff
    style API fill:#4a90d9,color:#fff
```

**Conceitos introduzidos:**
- **textarea controlado**: campo de múltiplas linhas vinculado a useState
- **Callback de sucesso**: onCreated() muda o estado do App para voltar à lista
- **Token no header**: Authorization Bearer token em toda requisição autenticada

---

## Commit 13 — Adiciona página de detalhes do projeto com convite de membros

**O que foi feito:** Criou ProjectDetail.tsx com lista de membros atuais e formulário de convite (email/username + dropdown de role). App.tsx agora renderiza 3 páginas internas.

**Arquivos criados:** `frontend/src/pages/ProjectDetail.tsx`  
**Arquivos modificados:** `frontend/src/App.tsx`

```mermaid
graph TB
    subgraph ProjectDetail["ProjectDetail.tsx"]
        Mount["useEffect → fetchMembers()"]
        Mount -->|"GET /projects/:id/members"| MemberList

        subgraph MemberList["Lista de Membros"]
            M1["👤 owner — owner@t.com — PO"]
            M2["👤 dev1 — dev1@t.com — Dev"]
        end

        subgraph InviteForm["Formulário de Convite"]
            Input["Input: email ou username"]
            Select["Select: Dev | Scrum Master | PO"]
            Btn["Botão Convidar"]
        end

        Btn -->|"POST /projects/:id/members<br/>{ identifier, role }"| API["Backend"]
        API -->|"Sucesso"| Success["✅ 'dev2 adicionado como Dev'"]
        API -->|"Erro"| Error["❌ 'Usuário já é membro'"]
        Success --> Mount
    end

    subgraph Navigation["Navegação no App.tsx"]
        Projects["Projects.tsx"] -->|"Clica no card"| ProjectDetail
        ProjectDetail -->|"← Voltar aos projetos"| Projects
    end

    style Success fill:#5cb85c,color:#fff
    style Error fill:#d9534f,color:#fff
    style MemberList fill:#f0f4ff,stroke:#4a90d9
```

**Conceitos introduzidos:**
- **Refresh após ação**: fetchMembers() é chamado novamente após convite bem-sucedido
- **select controlado**: dropdown HTML vinculado a useState com 3 opções de role
- **Feedback visual**: mensagens de sucesso (verde) e erro (vermelho) distintas

---

## Commit 14 — Atualiza CLAUDE.md com endpoints, estrutura e diagrama da US2

**O que foi feito:** Atualizou a documentação do projeto: novos endpoints (projects, members), estrutura de diretórios expandida, diagrama de arquitetura atualizado e US2 marcada como concluída.

**Arquivos modificados:** `CLAUDE.md`, `docs/commits.md`

```mermaid
graph TB
    subgraph US2["US2 Concluída - Criar projeto e convidar membros"]
        subgraph BackendUS2["Backend (3 commits)"]
            DB["Tabelas projects +<br/>project_members"]
            MW["Middleware JWT"]
            Routes["4 endpoints REST"]
        end

        subgraph FrontendUS2["Frontend (3 commits)"]
            ProjList["Projects.tsx<br/>Grid de cards"]
            ProjCreate["CreateProject.tsx<br/>Formulário"]
            ProjDetail["ProjectDetail.tsx<br/>Membros + Convite"]
        end
    end

    DB --> Routes
    MW --> Routes
    ProjList -->|"GET /projects"| Routes
    ProjCreate -->|"POST /projects"| Routes
    ProjDetail -->|"GET + POST /projects/:id/members"| Routes

    style US2 fill:#dff0d8,stroke:#5cb85c
    style BackendUS2 fill:#d9edf7,stroke:#5bc0de
    style FrontendUS2 fill:#fef3cd,stroke:#f0ad4e
```

**Resumo da US2:** 7 commits, ~600 linhas, backend completo com auth middleware + CRUD projetos + membros, frontend com 3 novas páginas e navegação por estado.

---

## Commit 15 — Adiciona tabela invitations para convites pendentes

**O que foi feito:** Criou a tabela `invitations` para suportar fluxo de convite com aceitar/rejeitar. Antes, convidar adicionava direto em `project_members` (sem aceitação). Agora será um convite pendente.

**Arquivos modificados:** `backend/src/database.js`

```mermaid
erDiagram
    users ||--o{ invitations : "envia (inviter)"
    users ||--o{ invitations : "recebe (invitee)"
    projects ||--o{ invitations : "tem"
    invitations {
        int id PK
        int project_id FK
        int inviter_id FK
        int invitee_id FK
        string role "PO|SM|Dev"
        string status "pending|accepted|rejected"
        datetime created_at
    }
    invitations ||..|| project_members : "vira membro ao aceitar"
```

**Conceitos introduzidos:**
- **Status enum**: pending (aguardando), accepted (virou membro), rejected (recusou)
- **Histórico preservado**: convites rejeitados/aceitos ficam no banco para auditoria
- **2 FKs ao users**: inviter_id e invitee_id apontam para a mesma tabela

---

## Commit 16 — Refatora rota de convite para criar invitation pendente

**O que foi feito:** A rota `POST /api/projects/:id/members` agora cria um registro em `invitations` com status `pending` em vez de adicionar direto em `project_members`. O convidado precisará aceitar o convite.

**Arquivos modificados:** `backend/src/routes/projects.js`

```mermaid
graph TB
    Owner["Dono do Projeto"] -->|"POST /api/projects/:id/members<br/>{ identifier, role }"| Route["routes/projects.js"]

    Route --> Check1{"Dono do<br/>projeto?"}
    Check1 -->|"Não"| E1["403 Apenas dono pode convidar"]
    Check1 -->|"Sim"| Check2["Busca user por email/username"]

    Check2 --> Check3{"Achou?"}
    Check3 -->|"Não"| E2["404 Usuário não encontrado"]
    Check3 -->|"Sim"| Check4{"É a si mesmo?"}

    Check4 -->|"Sim"| E3["400 Não pode se convidar"]
    Check4 -->|"Não"| Check5{"Já é membro?"}

    Check5 -->|"Sim"| E4["409 Já é membro"]
    Check5 -->|"Não"| Check6{"Convite<br/>pendente?"}

    Check6 -->|"Sim"| E5["409 Convite já enviado"]
    Check6 -->|"Não"| Insert["INSERT INTO invitations<br/>status = 'pending'"]

    Insert --> Success["201 { id, invitee, role, status: pending }"]

    style E1 fill:#d9534f,color:#fff
    style E2 fill:#f0ad4e,color:#fff
    style E3 fill:#f0ad4e,color:#fff
    style E4 fill:#f0ad4e,color:#fff
    style E5 fill:#f0ad4e,color:#fff
    style Success fill:#5cb85c,color:#fff
```

**Conceitos introduzidos:**
- **Validações em cascata**: cada erro tem código HTTP apropriado e mensagem específica
- **Auto-convite bloqueado**: 400 se o dono tentar se convidar
- **Idempotência**: não cria convite duplicado se já existe um pendente

---

## Commit 17 — Adiciona rotas de listar/aceitar/rejeitar convites

**O que foi feito:** Criou `routes/invitations.js` com 3 rotas para o convidado gerenciar seus convites pendentes. Aceitar usa transação SQL para atomicidade.

**Arquivos criados:** `backend/src/routes/invitations.js`  
**Arquivos modificados:** `backend/src/server.js`

```mermaid
sequenceDiagram
    participant Inviter as Alice (Dono)
    participant API
    participant DB
    participant Invitee as Bob (Convidado)

    Inviter->>API: POST /projects/6/members<br/>{ identifier: 'bob', role: 'Dev' }
    API->>DB: INSERT INTO invitations status='pending'

    Note over Invitee: Bob abre o app
    Invitee->>API: GET /api/invitations
    API->>DB: SELECT JOIN projects + users WHERE invitee_id = bob
    DB-->>API: [{ project_name: 'X', inviter: 'alice', role: 'Dev' }]
    API-->>Invitee: Lista de convites pendentes

    Invitee->>API: POST /invitations/1/accept

    rect rgb(220, 240, 220)
        Note over API,DB: Transação atômica
        API->>DB: UPDATE invitations SET status='accepted'
        API->>DB: INSERT INTO project_members
    end

    API-->>Invitee: { success: true }
    Note over Invitee: Bob agora vê projeto na lista
```

**Conceitos introduzidos:**
- **Transação SQL**: `db.transaction()` garante que UPDATE + INSERT executam atomicamente
- **JOIN triplo**: invitations + projects + users para retornar contexto completo
- **Idempotência via WHERE**: aceitar/rejeitar duas vezes retorna 404 (não dá erro grave)

---

## Commit 18 — Adiciona sino de notificações e painel de convites no app

**O que foi feito:** Criou `InvitationsPanel.tsx` (dropdown com lista de convites pendentes e botões aceitar/rejeitar). Adicionou no header do App.tsx um sino 🔔 com badge vermelho mostrando a quantidade de convites pendentes. Polling a cada 10s atualiza o contador.

**Arquivos criados:** `frontend/src/pages/InvitationsPanel.tsx`  
**Arquivos modificados:** `frontend/src/App.tsx`

```mermaid
graph TB
    subgraph Header["Header do App"]
        Bell["🔔 Sino<br/>Badge vermelho com<br/>quantidade pendente"]
        Polling["setInterval 10s<br/>GET /api/invitations<br/>conta resultados"]
        Polling -->|"atualiza"| Bell
    end

    Bell -->|"clica"| Panel["InvitationsPanel<br/>(dropdown)"]

    subgraph Panel["Painel de Convites"]
        Card1["📁 Projeto X<br/>alice te convidou como Dev<br/>[Aceitar] [Rejeitar]"]
        Card2["📁 Projeto Y<br/>bob te convidou como Scrum Master<br/>[Aceitar] [Rejeitar]"]
    end

    Card1 -->|"Aceitar"| Accept["POST /invitations/:id/accept"]
    Card1 -->|"Rejeitar"| Reject["POST /invitations/:id/reject"]
    Accept -->|"Refresh"| Polling
    Reject -->|"Refresh"| Polling
    Accept -->|"vira membro"| ProjectsList["Aparece em Projects.tsx"]

    style Bell fill:#4a90d9,color:#fff
    style Accept fill:#5cb85c,color:#fff
    style Reject fill:#999,color:#fff
```

**Conceitos introduzidos:**
- **Polling com setInterval**: atualiza badge a cada 10s sem WebSocket
- **Cleanup do useEffect**: `return () => clearInterval()` evita memory leak
- **Badge condicional**: número só aparece se houver convites (pendingInvites > 0)
- **Dropdown absoluto**: posição `absolute` para flutuar sobre o conteúdo

---

## Commit 19 — Ajusta mensagem de convite + atualiza CLAUDE.md

**O que foi feito:** Mudou a mensagem de sucesso em ProjectDetail para refletir que o convite agora é pendente (não direto). Adicionou os 3 endpoints de invitations na tabela do CLAUDE.md.

**Arquivos modificados:** `frontend/src/pages/ProjectDetail.tsx`, `CLAUDE.md`

```mermaid
graph LR
    Owner["Dono"] -->|"Convidar Bob"| Form["Formulário"]
    Form -->|"POST /projects/:id/members"| API["Backend"]
    API -->|"INSERT invitations<br/>status=pending"| DB[(SQLite)]
    API -->|"201"| Form
    Form -->|"Mensagem"| Msg["✅ Convite enviado para bob como Dev<br/>Aguardando aceitação."]

    style Msg fill:#d4edda,stroke:#5cb85c,color:#000
```

**Fluxo completo do sistema de convites:**
```mermaid
journey
    title Jornada de um Convite
    section Dono (Alice)
      Cria projeto: 5: Alice
      Vai em ProjectDetail: 5: Alice
      Convida Bob como Dev: 4: Alice
    section Convidado (Bob)
      Vê badge no sino 🔔: 5: Bob
      Abre painel de convites: 5: Bob
      Aceita o convite: 5: Bob
    section Após aceitação
      Bob aparece em members: 5: Alice, Bob
      Projeto aparece pra Bob: 5: Bob
```

---

## Commit 20 — Adiciona tabela user_stories para backlog (US3)

**O que foi feito:** Criou a tabela `user_stories` que armazena as histórias de usuário do backlog. Suporta também sprint_id (US5) e status (US6) para uso futuro.

**Arquivos modificados:** `backend/src/database.js`

```mermaid
erDiagram
    projects ||--o{ user_stories : "contém"
    user_stories {
        int id PK
        int project_id FK
        string title "Como X, quero Y..."
        string description
        string acceptance_criteria
        int story_points "1, 2, 3, 5, 8, 13"
        string label "feature|bug|tech_debt"
        int priority "ordem no backlog"
        string status "to_do|in_progress|in_review|done"
        int sprint_id "NULL = backlog"
        datetime created_at
    }
```

**Conceitos introduzidos:**
- **CHECK constraints**: garante valores válidos para label e status
- **sprint_id NULLable**: NULL significa "ainda no backlog", preenchido = está em sprint
- **priority**: campo numérico para drag & drop reordenar (US3 final)

---

## Commit 21 — Adiciona rotas POST e GET de histórias (backlog)

**O que foi feito:** Criou `routes/stories.js` com endpoints para criar e listar histórias do backlog. Apenas membros do projeto podem usar. Histórias novas vão para o final do backlog (priority crescente).

**Arquivos criados:** `backend/src/routes/stories.js`  
**Arquivos modificados:** `backend/src/server.js`

```mermaid
graph TB
    subgraph Routes["routes/stories.js"]
        Helper["isMember(projectId, userId)<br/>Helper para validação"]

        POST["POST /api/projects/:id/stories"]
        GET["GET /api/projects/:id/stories<br/>?include=all (default: backlog only)"]

        POST -->|"chama"| Helper
        GET -->|"chama"| Helper
    end

    POST -->|"calcula priority = MAX+1"| MaxQuery["SELECT MAX(priority)"]
    POST -->|"INSERT"| Stories[("user_stories")]
    GET -->|"SELECT WHERE sprint_id IS NULL<br/>ORDER BY priority"| Stories

    style Helper fill:#7c3aed,color:#fff
    style POST fill:#5cb85c,color:#fff
    style GET fill:#4a90d9,color:#fff
```

**Conceitos introduzidos:**
- **Helper isMember**: extrai validação de acesso comum em uma função reutilizável
- **Auto-priority**: priority = MAX+1 garante ordem cronológica de adição
- **Filtro condicional via query**: `?include=all` muda comportamento sem criar nova rota
- **Mount em /api**: necessário porque a URL é `/api/projects/:id/stories` (aninhada)

---

## Commit 22 — Adiciona rotas PUT e DELETE de histórias

**O que foi feito:** Adicionou `PUT /api/stories/:id` (atualização parcial via COALESCE) e `DELETE /api/stories/:id`. Helper `getStoryAndCheckAccess` valida existência da história e acesso do usuário.

**Arquivos modificados:** `backend/src/routes/stories.js`

```mermaid
graph TB
    subgraph Helper["getStoryAndCheckAccess(id, userId)"]
        H1["SELECT story WHERE id = ?"]
        H1 --> H2{"Existe?"}
        H2 -->|"Não"| E1["404 Não encontrada"]
        H2 -->|"Sim"| H3{"User é membro<br/>do projeto?"}
        H3 -->|"Não"| E2["403 Sem acesso"]
        H3 -->|"Sim"| OK["✓ Retorna { story }"]
    end

    PUT["PUT /api/stories/:id"] --> Helper
    DELETE["DELETE /api/stories/:id"] --> Helper

    PUT -->|"OK"| Update["UPDATE com COALESCE<br/>(atualização parcial)"]
    DELETE -->|"OK"| Del["DELETE FROM user_stories"]

    Update --> Return["Retorna história atualizada"]
    Del --> Success["{ success: true }"]

    style E1 fill:#f0ad4e,color:#fff
    style E2 fill:#d9534f,color:#fff
    style OK fill:#5cb85c,color:#fff
```

**Conceitos introduzidos:**
- **COALESCE em UPDATE**: `SET col = COALESCE(?, col)` mantém valor antigo se NULL enviado
- **PATCH semântico via PUT**: aceita campos parciais sem precisar enviar tudo
- **DRY com helper**: lógica de validação extraída em função reutilizável

---

## Commit 23 — Adiciona página Backlog e StoryForm modal

**O que foi feito:** Criou o Backlog (lista de histórias com label colorido, story points, editar/remover) e o StoryForm (modal para criar/editar com Fibonacci de pontos). ProjectDetail tem botão "Abrir Backlog".

**Arquivos criados:** `Backlog.tsx`, `StoryForm.tsx`  
**Arquivos modificados:** `ProjectDetail.tsx`, `App.tsx`

```mermaid
graph TB
    subgraph Backlog["Backlog.tsx"]
        Header["Cabeçalho<br/>+ Nova História"]
        StoryList["Lista de histórias"]

        Story1["📘 #1 [feature] Como user, quero login (3 pts)<br/>[Editar] [Remover]"]
        Story2["🐛 #2 [bug] Senha não valida (1 pts)<br/>[Editar] [Remover]"]
        Story3["⚙️ #3 [tech_debt] Refatorar auth (5 pts)<br/>[Editar] [Remover]"]

        StoryList --> Story1 & Story2 & Story3
    end

    Header -->|"clica + Nova"| Modal
    Story1 -->|"clica Editar"| Modal["StoryForm Modal"]

    subgraph Modal["StoryForm.tsx (modal)"]
        Title["Input título"]
        Desc["Textarea descrição"]
        Points["Select pontos: 0,1,2,3,5,8,13,21"]
        Label["Select label: feature/bug/tech_debt"]
        Save["[Salvar]"]
    end

    Save -->|"POST se nova<br/>PUT se editar"| API["Backend"]
    API -->|"refresh"| StoryList

    style Story1 fill:#dbeafe,stroke:#4a90d9
    style Story2 fill:#fee2e2,stroke:#d9534f
    style Story3 fill:#fef3c7,stroke:#f0ad4e
```

**Conceitos introduzidos:**
- **Modal com overlay**: `fixed inset-0 bg-black bg-opacity-50` cria fundo escurecido
- **stopPropagation**: clique dentro do form não fecha o modal (só clique no overlay)
- **Fibonacci para pontos**: padrão Scrum (0, 1, 2, 3, 5, 8, 13, 21)
- **Mesmo form para criar/editar**: prop `story` decide POST vs PUT

---

## Commit 24 — Adiciona tabela sprints para gestão de ciclos (US4)

**O que foi feito:** Criou a tabela `sprints` no banco. Sprints são o ciclo de trabalho do time Scrum, têm datas, meta e status (planning/active/completed). Histórias do backlog passarão a ter `sprint_id` apontando para esta tabela na US5.

**Arquivos modificados:** `backend/src/database.js`

```mermaid
erDiagram
    projects ||--o{ sprints : "tem ciclos"
    sprints ||--o{ user_stories : "(US5) recebe histórias"
    sprints {
        int id PK
        int project_id FK
        string name "Sprint 1"
        string goal "Meta do sprint"
        string start_date "YYYY-MM-DD"
        string end_date "YYYY-MM-DD"
        string status "planning|active|completed"
        datetime created_at
    }
```

**Conceitos introduzidos:**
- **Status como enum via CHECK**: 3 estados válidos garantidos no banco
- **Datas como TEXT (ISO)**: SQLite armazena datas como string YYYY-MM-DD (formato lex-ordenável)
- **DEFAULT 'planning'**: sprint nasce em planejamento (status inicial natural)

---

## Commit 25 — Adiciona rotas de dashboard e velocity (US7)

**O que foi feito:** Criou `routes/dashboard.js` com duas rotas: `GET /api/sprints/:id/dashboard` (totais, progresso, contagem por status) e `GET /api/projects/:id/velocity` (média de pontos concluídos em sprints passados). A rota de velocity usa try/catch para degradar quando a tabela `sprints` ainda não existir.

**Arquivos criados:** `backend/src/routes/dashboard.js`
**Arquivos modificados:** `backend/src/server.js` (mount em `/api`)

```mermaid
graph LR
    subgraph Dashboard["GET /api/sprints/:id/dashboard"]
        D1["Acha project_id via 1ª story do sprint"] --> D2{"isMember?"}
        D2 -->|"sim"| D3["SUM total + SUM done<br/>+ COUNT por status"]
        D3 --> D4["{ totalPoints, completedPoints,<br/>progress%, byStatus, storiesCount }"]
        D2 -->|"não"| D5["403"]
    end

    subgraph Velocity["GET /api/projects/:id/velocity"]
        V1["isMember?"] --> V2["try: GROUP BY sprint<br/>SUM(done points)"]
        V2 -->|"ok"| V3["{ velocity: avg, sprints: [...] }"]
        V2 -->|"catch"| V4["{ velocity: 0, sprints: [] }"]
    end

    style D3 fill:#5cb85c,color:#fff
    style D5 fill:#d9534f,color:#fff
    style V4 fill:#f0ad4e,color:#fff
```

**Conceitos introduzidos:**
- **SUM(CASE WHEN ...)**: agrega múltiplas métricas numa única query (sem N+1)
- **Inferir project_id por story do sprint**: evita acoplar à tabela `sprints` (US4 paralela)
- **try/catch graceful**: endpoint não quebra se tabela ainda não existir

---

## Commit 26 — Adiciona dependência recharts para gráficos (US7)

**O que foi feito:** Adicionou `recharts ^3.x` ao frontend. Biblioteca declarativa de gráficos React (Pie, Bar, Line) que será usada na tela de Dashboard pra mostrar progresso, distribuição por status e burndown.

**Arquivos modificados:** `frontend/package.json`, `frontend/package-lock.json`

```mermaid
graph LR
    Dash["Dashboard.tsx"] -->|"importa"| Pie["PieChart"]
    Dash --> Bar["BarChart"]
    Dash --> Line["LineChart (burndown)"]
    Pie & Bar & Line -->|"de"| RC["recharts ^3.x"]
    style RC fill:#8884d8,color:#fff
```

**Conceitos introduzidos:**
- **Recharts**: API declarativa baseada em componentes React, sem precisar manipular SVG na mão

---

## Commit 26 — Adiciona rotas CRUD de sprints (US4)

**O que foi feito:** Criou `routes/sprints.js` com 4 rotas REST para criar, listar, atualizar e deletar sprints. Reutiliza o pattern `isMember` de stories.js. PUT usa COALESCE para atualização parcial. Apenas membros do projeto podem operar.

**Arquivos criados:** `backend/src/routes/sprints.js`
**Arquivos modificados:** `backend/src/server.js`

```mermaid
graph TB
    subgraph Routes["routes/sprints.js"]
        Helper1["isMember(projectId, userId)<br/>Valida acesso ao projeto"]
        Helper2["getSprintAndCheckAccess(id, userId)<br/>Busca sprint + valida membro"]

        POST["POST /projects/:projectId/sprints<br/>Cria sprint (default status='planning')"]
        GET["GET /projects/:projectId/sprints<br/>Lista por created_at DESC"]
        PUT["PUT /sprints/:id<br/>Atualização parcial via COALESCE"]
        DELETE["DELETE /sprints/:id"]
    end

    POST --> Helper1
    GET --> Helper1
    PUT --> Helper2
    DELETE --> Helper2

    Helper2 -->|"404"| NotFound["Sprint não encontrado"]
    Helper2 -->|"403"| NoAccess["Não é membro"]
    Helper1 -->|"403"| NoAccess

    POST --> SprintsDB[("sprints")]
    GET --> SprintsDB
    PUT --> SprintsDB
    DELETE --> SprintsDB

    style Helper1 fill:#7c3aed,color:#fff
    style Helper2 fill:#7c3aed,color:#fff
    style POST fill:#5cb85c,color:#fff
    style GET fill:#4a90d9,color:#fff
    style PUT fill:#f0ad4e,color:#fff
    style DELETE fill:#d9534f,color:#fff
```

**Conceitos introduzidos:**
- **Reuso de pattern**: `isMember` e `getXAndCheckAccess` replicam a estrutura de stories.js
- **COALESCE em UPDATE**: permite mudar só o status sem reenviar todo o sprint (ex: 'planning'→'active')
- **DEFAULT no INSERT**: status default 'planning' aplicado pelo banco quando não enviado

---

## Commit 27 — Adiciona páginas Sprints e SprintForm no frontend (US4)

**O que foi feito:** Criou `Sprints.tsx` (lista de cards com badge colorido por status e datas formatadas DD/MM/YYYY) e `SprintForm.tsx` (modal de criar/editar com inputs de data, validação client-side e select de status só na edição). O badge segue cores definidas pela US4: planning=amarelo, active=verde, completed=cinza.

**Arquivos criados:** `frontend/src/pages/Sprints.tsx`, `frontend/src/pages/SprintForm.tsx`

```mermaid
graph TB
    subgraph Sprints["Sprints.tsx"]
        Header["+ Novo Sprint"]
        SList["Lista de Cards"]
        S1["Sprint 1 [Planejamento]<br/>Meta: ...<br/>📅 02/05 → 16/05"]
        S2["Sprint 2 [Em andamento]<br/>Meta: ...<br/>📅 ..."]
        SList --> S1 & S2
    end

    Header -->|"clica + Novo"| Modal
    S1 -->|"clica Editar"| Modal["SprintForm Modal"]

    subgraph Modal["SprintForm.tsx"]
        Name["Input nome (obrigatório)"]
        Goal["Textarea meta"]
        SD["Input date início"]
        ED["Input date fim"]
        Status["Select status (só em edição)"]
        Btn["[Salvar]"]
    end

    Btn -->|"POST /projects/:id/sprints (criar)"| API
    Btn -->|"PUT /sprints/:id (editar)"| API["Backend"]
    API -->|"refresh"| SList

    style S1 fill:#fef9c3,stroke:#f59e0b
    style S2 fill:#dcfce7,stroke:#22c55e
```

**Conceitos introduzidos:**
- **Badge cores por status**: amarelo (planning), verde (active), cinza (completed) - convenção de tráfego semântico
- **Inputs date nativos**: `<input type="date">` retorna YYYY-MM-DD compatível direto com a API
- **Status oculto na criação**: força o sprint a nascer 'planning' (estado inicial coerente)
- **Validação cliente**: `endDate < startDate` retorna erro antes de chamar a API

---

## Commit 28 — Adiciona rotas de Kanban: status e board (US6)

**O que foi feito:** Adicionou duas rotas em `stories.js`: `PUT /api/stories/:id/status` (move uma história entre colunas validando o enum) e `GET /api/sprints/:sprintId/board` (retorna histórias agrupadas em `{ to_do, in_progress, in_review, done }`). A coluna `assignee_id` (já adicionada na migração) é exposta com username via LEFT JOIN.

**Arquivos modificados:** `backend/src/routes/stories.js`

```mermaid
graph TB
    subgraph Status["PUT /stories/:id/status"]
        S1["Body: { status, assignee_id? }"]
        S1 --> S2{"status ∈<br/>VALID_STATUSES?"}
        S2 -->|"não"| S3["400 Status inválido"]
        S2 -->|"sim"| S4{"assignee_id<br/>foi enviado?"}
        S4 -->|"sim"| S5["UPDATE status, assignee_id"]
        S4 -->|"não"| S6["UPDATE status"]
        S5 & S6 --> S7["Retorna história atualizada"]
    end

    subgraph Board["GET /sprints/:id/board"]
        B1["Pega project_id de uma story<br/>(sem depender da tabela sprints)"]
        B1 --> B2{"isMember?"}
        B2 -->|"sim"| B3["SELECT s.*, u.username<br/>LEFT JOIN users<br/>ORDER BY priority"]
        B3 --> B4["Agrupa em 4 chaves:<br/>{ to_do, in_progress, in_review, done }"]
        B4 --> B5["Status inesperado<br/>cai em to_do (defensivo)"]
    end

    style S3 fill:#d9534f,color:#fff
    style S7 fill:#5cb85c,color:#fff
    style B4 fill:#5cb85c,color:#fff
    style B5 fill:#f0ad4e,color:#fff
```

**Conceitos introduzidos:**
- **Validação enum no app**: lista `VALID_STATUSES` espelha o CHECK do banco para mensagem clara
- **Agrupamento no backend**: frontend recebe pronto, evita 4×`.filter()` no cliente
- **LEFT JOIN para opcional**: traz `assignee_username` mesmo quando assignee_id é NULL
- **hasOwnProperty**: distingue "campo não enviado" de "campo enviado como null"

---

## Commit US5-A — Adiciona página SprintBoard com colunas Backlog ↔ Sprint (US5)

**O que foi feito:** Criou `SprintBoard.tsx`, página com duas colunas lado a lado (Backlog à esquerda, Sprint Atual à direita) e botões em cada card para mover histórias entre os dois estados. Cada coluna mostra contagem de histórias e total de pontos no topo, ajudando o PO a planejar capacidade do sprint. Consome os endpoints US5 do backend (`PUT /api/stories/:id/move-to-sprint` e `GET /api/sprints/:id/stories`).

**Arquivos criados:** `frontend/src/pages/SprintBoard.tsx`

```mermaid
graph TB
    subgraph Board["SprintBoard.tsx"]
        Header["📊 Sprint Board (#sprintId)"]
        Cols["Grid 2 colunas"]

        subgraph Backlog["📋 Backlog<br/>(N histórias · X pts)"]
            B1["Card #1 [feature] 3 pts<br/>[→ Mover para Sprint]"]
            B2["Card #2 [bug] 1 pt<br/>[→ Mover para Sprint]"]
        end

        subgraph Sprint["🚀 Sprint Atual<br/>(M histórias · Y pts)"]
            S1["Card #3 [feature] 5 pts<br/>[← Voltar ao Backlog]"]
            S2["Card #4 [tech_debt] 8 pts<br/>[← Voltar ao Backlog]"]
        end

        Cols --> Backlog & Sprint
    end

    B1 -->|"PUT /stories/1/move-to-sprint<br/>{ sprint_id: 1 }"| API["Backend"]
    S1 -->|"PUT /stories/3/move-to-sprint<br/>{ sprint_id: null }"| API
    API -->|"refresh ambas listas"| Cols

    Header -->|"useEffect"| Promise["Promise.all([<br/>GET /projects/:id/stories,<br/>GET /sprints/:id/stories<br/>])"]
    Promise --> Cols

    style Backlog fill:#f3f4f6,stroke:#9ca3af
    style Sprint fill:#dbeafe,stroke:#4a90d9
    style API fill:#4a90d9,color:#fff
```

**Conceitos introduzidos:**
- **Promise.all para fetch paralelo**: backlog e sprint carregam simultaneamente (latência mínima)
- **Card reutilizável**: mesma função `renderCard()` cria cards das duas colunas, mudando só o botão
- **Total de pontos no header**: `reduce` agrega story_points para o PO planejar capacidade
- **Layout responsivo**: `grid-cols-1 md:grid-cols-2` empilha colunas em telas pequenas

---

## Commit 31 — Adiciona página KanbanBoard com 4 colunas e botões de movimento (US6)

**O que foi feito:** Criou `KanbanBoard.tsx` com 4 colunas (To Do | In Progress | In Review | Done) que consomem `GET /api/sprints/:id/board`. Cada card mostra label, #id, story_points, título e assignee, com botões de seta esquerda/direita que movem para a coluna anterior/seguinte (sem drag-drop ainda). Cabeçalho de cada coluna mostra contagem e total de pontos.

**Arquivos criados:** `frontend/src/pages/KanbanBoard.tsx`

```mermaid
graph LR
    subgraph Kanban["KanbanBoard.tsx"]
        Fetch["fetchBoard()<br/>GET /sprints/:id/board"]
        State["board: { to_do, in_progress, in_review, done }"]
        Fetch --> State

        subgraph Cols["4 colunas (lg:grid-cols-4)"]
            C1["To Do<br/>n cards - X pts"]
            C2["In Progress<br/>n cards - X pts"]
            C3["In Review<br/>n cards - X pts"]
            C4["Done<br/>n cards - X pts"]
        end

        Card["Card<br/>label - id - pts<br/>titulo<br/>assignee + setas"]
        State --> C1 & C2 & C3 & C4
        C1 & C2 & C3 & C4 --> Card

        Card -->|"clica seta"| Move["moveStory(id, status)<br/>PUT /stories/:id/status"]
        Move --> Fetch
    end

    style C1 fill:#f3f4f6,stroke:#999
    style C2 fill:#dbeafe,stroke:#3b82f6
    style C3 fill:#fef3c7,stroke:#f59e0b
    style C4 fill:#dcfce7,stroke:#22c55e
    style Card fill:#fff,stroke:#666
```

**Conceitos introduzidos:**
- **COLUMNS array como source-of-truth**: ordem das colunas + lookup de prev/next em um único lugar
- **Setas no card**: aproximação de drag-drop sem dependência (movimento entre colunas adjacentes)
- **Disabled em extremos**: seta esquerda desabilitada em To Do, seta direita desabilitada em Done (semântica clara)
- **Estado inicial vazio**: `{ to_do: [], ... }` permite render imediato antes do fetch terminar

---

## Commit 29 — Adiciona página Dashboard com gráficos (US7)

**O que foi feito:** Criou `Dashboard.tsx` com 4 cards de métricas (Total/Completed/Progress/Stories), pie chart de status, bar chart de contagem e linha de burndown simplificado. Botão "📈 Dashboard (sprint #1)" no Backlog abre a tela; nova página `'dashboard'` no `App.tsx` orquestra a navegação.

**Arquivos criados:** `frontend/src/pages/Dashboard.tsx`
**Arquivos modificados:** `frontend/src/pages/Backlog.tsx` (botão), `frontend/src/App.tsx` (rota), `CLAUDE.md` (endpoints + US7 [x])

```mermaid
graph TB
    Backlog["Backlog.tsx<br/>+ botão Dashboard"] -->|"onOpenDashboard(1)"| App["App.tsx<br/>page='dashboard'"]
    App -->|"renderiza"| Dash["Dashboard.tsx"]

    subgraph Dash["Dashboard.tsx"]
        Cards["4 StatCards<br/>Total | Done | % | Stories"]
        Pie["PieChart<br/>histórias por status"]
        Bar["BarChart<br/>contagem por status"]
        Line["LineChart<br/>burndown simplificado"]
    end

    Dash -->|"GET /api/sprints/:id/dashboard"| API[Backend]
    API -->|"{ totalPoints, completedPoints,<br/>progress, byStatus, storiesCount }"| Dash

    style Cards fill:#3b82f6,color:#fff
    style Pie fill:#8884d8,color:#fff
    style Bar fill:#22c55e,color:#fff
    style Line fill:#f59e0b,color:#fff
```

**Conceitos introduzidos:**
- **Recharts ResponsiveContainer**: gráficos que se adaptam ao tamanho do parent
- **Cell por item**: cada fatia do Pie/barra com cor própria via `<Cell fill="..." />`
- **Burndown simplificado**: 3 pontos (início, hoje, fim) sem histórico diário ainda
- **StatCard reusável**: extrai cards repetitivos para evitar duplicação de classes Tailwind

---

## Commit US5-B — Integra SprintBoard na navegação e marca US5 concluída

**O que foi feito:** Adicionou prop `onOpenSprintBoard` em Backlog.tsx com botão temporário "📊 Sprint Board (sprint #1)" (fica ao lado do Dashboard/Kanban). Em App.tsx, registrou a página `'sprint-board'` com estado `selectedSprintId` e renderiza `<SprintBoard>` quando ativa. Atualizou CLAUDE.md com os 2 endpoints US5 (`PUT /api/stories/:id/move-to-sprint` e `GET /api/sprints/:id/stories`) e marcou US5 como [x] no roadmap.

**Arquivos modificados:** `frontend/src/App.tsx`, `frontend/src/pages/Backlog.tsx`, `CLAUDE.md`

```mermaid
graph LR
    Projects["Projects.tsx"] -->|"clica card"| PD["ProjectDetail.tsx"]
    PD -->|"📋 Abrir Backlog"| Backlog["Backlog.tsx"]
    Backlog -->|"📊 Sprint Board (sprint #1)"| Board["SprintBoard.tsx"]
    Board -->|"PUT move-to-sprint<br/>GET sprints/:id/stories"| API["Backend US5"]
    API -->|"refresh"| Board

    style Board fill:#fb923c,color:#fff
    style API fill:#4a90d9,color:#fff
    style Backlog fill:#dbeafe
```

**Conceitos introduzidos:**
- **State machine de páginas**: nova página `sprint-board` integra-se no switch de rendering
- **selectedSprintId no App**: estado dedicado para o sprint do board (separado de selectedProjectId)
- **Botão temporário com sprintId fixo**: simplifica testes da US5 enquanto US4 (seleção real) é construída
- **Endpoints US5 documentados**: tabela do CLAUDE.md reflete os 2 novos endpoints em uso

---

## Commit US6-final — Integra KanbanBoard na navegação e marca US6 concluída

**O que foi feito:** Adicionou prop `onOpenKanban` em Backlog.tsx com botão temporário "Kanban (sprint #1)". Em App.tsx, registrou a página `'kanban'` reusando o estado `selectedSprintId` e renderiza `<KanbanBoard>` quando ativa. Atualizou CLAUDE.md com os 2 endpoints US6 (`PUT /api/stories/:id/status` e `GET /api/sprints/:id/board`) e marcou US6 como [x] no roadmap.

**Arquivos modificados:** `frontend/src/App.tsx`, `frontend/src/pages/Backlog.tsx`, `CLAUDE.md`

```mermaid
graph LR
    Backlog["Backlog.tsx"] -->|"botao Kanban (sprint #1)"| Kanban["KanbanBoard.tsx"]
    Kanban -->|"GET sprints/:id/board"| API["Backend US6"]
    Kanban -->|"PUT stories/:id/status"| API
    API -->|"refresh"| Kanban

    style Kanban fill:#a855f7,color:#fff
    style API fill:#4a90d9,color:#fff
    style Backlog fill:#dbeafe
```

**Conceitos introduzidos:**
- **Reuso do selectedSprintId**: mesmo estado do Dashboard/SprintBoard, evita variaveis paralelas
- **Botao temporario fixo**: `onOpenKanban(1)` simplifica testes manuais ate a UI ter selecao real
- **Roadmap atualizado**: US6 [x] marca a feature completa (backend + frontend + integracao)

---

## Commit 38 — Migra banco de dados de SQLite para Supabase (PostgreSQL)

**O que foi feito:** Migrou todo o banco de SQLite local para Supabase. Criou schema com prefixo `sp_` no Supabase (6 tabelas + índices). Reescreveu `database.js` e todas as 6 rotas para usar `@supabase/supabase-js` com queries assíncronas. Adicionou variáveis de ambiente via `.env`.

**Arquivos modificados:**
- `backend/src/database.js` — agora exporta cliente Supabase
- `backend/src/routes/auth.js`, `projects.js`, `invitations.js`, `stories.js`, `sprints.js`, `dashboard.js` — todas async
- `backend/.env`, `backend/.env.example` — credenciais Supabase
- `backend/package.json` — `@supabase/supabase-js` + `dotenv` adicionados, `better-sqlite3` removido
- `CLAUDE.md` — atualizado com info do Supabase

```mermaid
graph LR
    subgraph Antes["❌ Antes - SQLite local"]
        SQLite[("sprint_planner.db<br/>arquivo local")]
        Sync["queries síncronas<br/>db.prepare(SQL).get()"]
        Sync --> SQLite
    end

    subgraph Depois["✅ Depois - Supabase"]
        SupaClient["@supabase/supabase-js"]
        Async["queries assíncronas<br/>await supabase.from('sp_users').select()"]
        SupaCloud[("Supabase Postgres<br/>nuvem")]
        Async --> SupaClient --> SupaCloud
    end

    Antes -->|"Migração"| Depois

    subgraph Tabelas["Tabelas no Supabase (prefixo sp_)"]
        T1["sp_users"]
        T2["sp_projects"]
        T3["sp_project_members"]
        T4["sp_invitations"]
        T5["sp_sprints"]
        T6["sp_user_stories"]
    end

    SupaCloud --> Tabelas

    style SQLite fill:#d9534f,color:#fff
    style SupaCloud fill:#3ECF8E,color:#fff
    style Async fill:#5cb85c,color:#fff
```

**Conceitos introduzidos:**
- **PostgreSQL na nuvem**: dados persistem globalmente, acessíveis de qualquer lugar
- **Cliente assíncrono**: todas as rotas viraram async/await (era síncrono no SQLite)
- **FK com ON DELETE CASCADE**: deletar projeto remove members, sprints e stories automaticamente
- **Variáveis de ambiente**: credenciais isoladas em `.env` (não commitado)
