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
