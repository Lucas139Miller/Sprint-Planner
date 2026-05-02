# Diagrama de Classes — Sprint Planner

Como o projeto é JavaScript/TypeScript sem classes formais, o diagrama representa:
- **Entidades do domínio** (tabelas Supabase) com seus atributos
- **Serviços de backend** (módulos de rotas) com operações principais
- **Componentes de frontend** (pages e components React) com responsabilidades
- **Relacionamentos** (1:N, N:N, dependências)

---

## 📦 Visão Geral — Entidades do Domínio

```mermaid
classDiagram
    class User {
        +bigint id PK
        +string username UK
        +string email UK
        +string password "bcrypt hash"
        +timestamp created_at
        +register() Token
        +login() Token
    }

    class Project {
        +bigint id PK
        +string name
        +string description
        +bigint owner_id FK
        +timestamp created_at
        +create()
        +list()
        +delete()
    }

    class ProjectMember {
        +bigint id PK
        +bigint project_id FK
        +bigint user_id FK
        +string role "PO|SM|Dev"
        +timestamp invited_at
    }

    class Invitation {
        +bigint id PK
        +bigint project_id FK
        +bigint inviter_id FK
        +bigint invitee_id FK
        +string role "PO|SM|Dev"
        +string status "pending|accepted|rejected"
        +timestamp created_at
        +accept() ProjectMember
        +reject()
    }

    class Sprint {
        +bigint id PK
        +bigint project_id FK
        +string name
        +string goal
        +date start_date
        +date end_date
        +string status "planning|active|completed"
        +timestamp created_at
        +start()
        +complete()
    }

    class UserStory {
        +bigint id PK
        +bigint project_id FK
        +string title
        +string description
        +string acceptance_criteria
        +int story_points
        +string label "feature|bug|tech_debt"
        +int priority
        +string status "to_do|in_progress|in_review|done"
        +bigint sprint_id FK "nullable"
        +bigint assignee_id FK "nullable"
        +timestamp created_at
        +moveToSprint()
        +changeStatus()
        +assignTo()
    }

    User "1" --o "*" Project : owns
    User "1" --o "*" ProjectMember : participates
    Project "1" --o "*" ProjectMember : has
    Project "1" --o "*" Invitation : has
    Project "1" --o "*" Sprint : has
    Project "1" --o "*" UserStory : contains
    User "1" --o "*" Invitation : invites
    User "1" --o "*" Invitation : invited_to
    Sprint "0..1" --o "*" UserStory : groups
    User "0..1" --o "*" UserStory : assigned_to
```

---

## 🔧 Backend — Camada de Serviços (Express Routes)

```mermaid
classDiagram
    class Database {
        <<Supabase Client>>
        +from(table) Query
        +select() Data
        +insert() Data
        +update() Data
        +delete() void
    }

    class AuthMiddleware {
        <<middleware>>
        +JWT_SECRET string
        +userCache Map
        +verify(token) Decoded
        +validateUserExists(id) bool
        +inject_req_user()
    }

    class AuthRoutes {
        <<routes/auth.js>>
        +POST_register()
        +POST_login()
        -hashPassword(plain) string
        -compareHash(plain, hash) bool
        -generateJWT(user) string
    }

    class ProjectRoutes {
        <<routes/projects.js>>
        +POST_create()
        +GET_list()
        +DELETE_remove()
        +POST_inviteMember()
        +GET_listMembers()
        -isMember(projectId, userId) bool
    }

    class InvitationRoutes {
        <<routes/invitations.js>>
        +GET_listPending()
        +POST_accept()
        +POST_reject()
    }

    class StoryRoutes {
        <<routes/stories.js>>
        +POST_create()
        +GET_listBacklog()
        +PUT_update()
        +DELETE_remove()
        +PUT_moveToSprint()
        +GET_sprintStories()
        +PUT_changeStatus()
        +GET_kanbanBoard()
        -getStoryAndCheckAccess(id, userId)
    }

    class SprintRoutes {
        <<routes/sprints.js>>
        +POST_create()
        +GET_list()
        +PUT_update()
        +DELETE_remove()
        -getSprintAndCheckAccess(id, userId)
    }

    class DashboardRoutes {
        <<routes/dashboard.js>>
        +GET_sprintMetrics()
        +GET_velocity()
    }

    class AiRoutes {
        <<routes/ai.js>>
        +POST_generateStories()
        +POST_sprintSummary()
        +POST_projectOnboarding()
        -callGemini(prompt) string
        -GEMINI_API_KEY string
        -GEMINI_MODEL string
    }

    class App {
        <<server.js>>
        +express()
        +useCors()
        +useJSON()
        +mountRoutes()
    }

    AuthMiddleware --> Database : queries users
    AuthRoutes --> Database
    ProjectRoutes --> Database
    InvitationRoutes --> Database
    StoryRoutes --> Database
    SprintRoutes --> Database
    DashboardRoutes --> Database
    AiRoutes --> Database

    ProjectRoutes ..> AuthMiddleware : uses
    InvitationRoutes ..> AuthMiddleware : uses
    StoryRoutes ..> AuthMiddleware : uses
    SprintRoutes ..> AuthMiddleware : uses
    DashboardRoutes ..> AuthMiddleware : uses
    AiRoutes ..> AuthMiddleware : uses

    App --> AuthRoutes : mount /api/auth
    App --> ProjectRoutes : mount /api/projects
    App --> InvitationRoutes : mount /api/invitations
    App --> StoryRoutes : mount /api
    App --> SprintRoutes : mount /api
    App --> DashboardRoutes : mount /api
    App --> AiRoutes : mount /api/ai

    AiRoutes ..> "Gemini API" : HTTPS
```

---

## 🎨 Frontend — Componentes React

```mermaid
classDiagram
    class App {
        <<root component>>
        -token string
        -user User
        -page Page
        -selectedProjectId number
        +handleLogin()
        +handleLogout()
        +renderPage()
    }

    class ApiHelper {
        <<api.ts>>
        +API_URL string
        +apiFetch(path, options) T
        +ApiError class
        -getToken() string
        -handle401() void
    }

    class Login {
        <<page>>
        -email string
        -password string
        +handleSubmit()
    }

    class Register {
        <<page>>
        -username string
        -email string
        -password string
        +handleSubmit()
    }

    class Projects {
        <<page>>
        -projects Project[]
        -loading bool
        +refresh()
        +handleDelete()
    }

    class CreateProject {
        <<wizard 3 steps>>
        -step Step
        -messages Message[]
        -stories Story[]
        +startChat()
        +sendAnswer()
        +finalize()
    }

    class ProjectWorkspace {
        <<shell with tabs>>
        -tab Tab
        -sprints Sprint[]
        -selectedSprintId number
        +renderTab()
    }

    class Backlog {
        <<page>>
        -stories Story[]
        -sprints Sprint[]
        -members Member[]
        +moveToSprint()
        +assignMember()
    }

    class Sprints {
        <<page>>
        -sprints Sprint[]
        +setStatus()
        +handleDelete()
    }

    class KanbanBoard {
        <<page>>
        -board Board
        -draggedId number
        +moveStory() optimistic
        +onDrop()
    }

    class StoryForm {
        <<modal>>
        +handleSubmit()
    }

    class SprintForm {
        <<modal>>
        +handleSubmit()
    }

    class StoryDetailPanel {
        <<slide-out>>
        +saveText()
        +updateField()
    }

    class MembersModal {
        <<modal>>
        +handleInvite()
    }

    class InvitationsPanel {
        <<dropdown>>
        +respond(action)
    }

    class AiGenerateModal {
        <<modal>>
        -suggestions Story[]
        +generate()
        +accept(idx)
    }

    class AiSummaryModal {
        <<modal>>
        -summary string
        +renderMarkdown()
    }

    class Avatar {
        <<component>>
        +username string
        +size Size
    }

    class ConfirmModal {
        <<component>>
        +variant default|danger
    }

    class Skeleton {
        <<components>>
        +SkeletonCard()
        +SkeletonList()
        +SkeletonGrid()
    }

    App --> Login
    App --> Register
    App --> Projects
    App --> CreateProject
    App --> ProjectWorkspace
    App --> InvitationsPanel
    App --> Avatar

    ProjectWorkspace --> Backlog
    ProjectWorkspace --> Sprints
    ProjectWorkspace --> KanbanBoard
    ProjectWorkspace --> MembersModal

    Backlog --> StoryForm
    Backlog --> AiGenerateModal
    Backlog --> StoryDetailPanel
    Backlog --> ConfirmModal
    Backlog --> Skeleton
    Backlog --> Avatar

    Sprints --> SprintForm
    Sprints --> AiSummaryModal
    Sprints --> ConfirmModal
    Sprints --> Skeleton

    KanbanBoard --> Avatar
    KanbanBoard --> Skeleton

    Projects --> ConfirmModal
    Projects --> Skeleton

    MembersModal --> Avatar
    StoryDetailPanel --> Avatar

    Login ..> ApiHelper
    Register ..> ApiHelper
    Projects ..> ApiHelper
    CreateProject ..> ApiHelper
    Backlog ..> ApiHelper
    Sprints ..> ApiHelper
    KanbanBoard ..> ApiHelper
    StoryForm ..> ApiHelper
    SprintForm ..> ApiHelper
    StoryDetailPanel ..> ApiHelper
    MembersModal ..> ApiHelper
    InvitationsPanel ..> ApiHelper
    AiGenerateModal ..> ApiHelper
    AiSummaryModal ..> ApiHelper
```

---

## 🌐 Visão Completa — Camadas

```mermaid
classDiagram
    direction TB

    class FrontendLayer {
        <<React + TypeScript>>
        App.tsx
        13 pages
        4 components
        api.ts helper
    }

    class ServerlessLayer {
        <<Vercel Functions>>
        api/index.js
        Express app handler
    }

    class BackendLayer {
        <<Express + Node>>
        7 route modules
        1 middleware
        1 database client
    }

    class DataLayer {
        <<Supabase PostgreSQL>>
        sp_users
        sp_projects
        sp_project_members
        sp_invitations
        sp_sprints
        sp_user_stories
    }

    class ExternalServices {
        <<APIs>>
        Google Gemini
        2.5-flash-lite
    }

    class SecurityLayer {
        <<cross-cutting>>
        bcrypt hash
        JWT tokens
        AuthMiddleware
        isMember checks
        FK + CHECK constraints
        env vars in vault
    }

    FrontendLayer --> ServerlessLayer : HTTPS /api/*
    ServerlessLayer --> BackendLayer : delegates
    BackendLayer --> DataLayer : @supabase/supabase-js
    BackendLayer --> ExternalServices : fetch + GEMINI_API_KEY
    SecurityLayer ..> BackendLayer : enforces
    SecurityLayer ..> DataLayer : constraints
```

---

## 🔄 Fluxo: Criar projeto com IA (sequência)

```mermaid
sequenceDiagram
    actor User
    participant CP as CreateProject (Wizard)
    participant API as apiFetch
    participant AI as routes/ai.js
    participant Gemini
    participant DB as Supabase

    User->>CP: Clica "Continuar com IA"
    CP->>API: POST /api/ai/project-onboarding
    API->>AI: messages=[]
    AI->>Gemini: prompt(descrição)
    Gemini-->>AI: "Qual é o público-alvo?"
    AI-->>CP: {done:false, message}

    loop 3-4 turnos
        User->>CP: Responde
        CP->>API: POST /api/ai/project-onboarding
        API->>AI: messages=[...]
        AI->>Gemini: prompt(conversa)
        Gemini-->>AI: próxima pergunta
        AI-->>CP: {done:false, message}
    end

    User->>CP: Última resposta
    CP->>AI: POST com 4 turnos
    AI->>Gemini: prompt(gerar JSON)
    Gemini-->>AI: stories JSON
    AI-->>CP: {done:true, stories[]}

    User->>CP: Seleciona histórias e confirma
    CP->>API: POST /api/projects
    API->>DB: INSERT sp_projects
    DB-->>API: project.id
    API->>DB: INSERT sp_project_members (PO)
    par Paralelo
        CP->>API: POST /api/projects/:id/stories (×N)
        API->>DB: INSERT sp_user_stories
    end
    CP-->>User: Redireciona para workspace
```

---

## 🔐 Modelo de Autorização

```mermaid
classDiagram
    class Request {
        +headers.Authorization
        +body
        +params
    }

    class AuthMiddleware {
        +verify(token) Decoded
        +validateUserExists(id) bool
        ±userCache 60s TTL
    }

    class IsMemberCheck {
        <<helper>>
        +isMember(projectId, userId) bool
    }

    class GetStoryAndCheckAccess {
        <<helper>>
        +returns {story, error}
    }

    class GetSprintAndCheckAccess {
        <<helper>>
        +returns {sprint, error}
    }

    class CrossProjectIDOR {
        <<rule>>
        sprint.project_id == story.project_id
    }

    class OwnerOnlyOps {
        <<rule>>
        DELETE project: only owner_id
        Invite member: only owner_id
    }

    Request --> AuthMiddleware : 401 if invalid
    AuthMiddleware --> IsMemberCheck : sets req.user
    IsMemberCheck --> GetStoryAndCheckAccess
    IsMemberCheck --> GetSprintAndCheckAccess
    GetStoryAndCheckAccess --> CrossProjectIDOR
    AuthMiddleware --> OwnerOnlyOps
```

---

## 📊 Resumo dos relacionamentos

| Origem | Cardinalidade | Destino | Tipo |
|--------|--------------|---------|------|
| User | 1:N | Project | owner |
| User | N:N (via ProjectMember) | Project | participação |
| User | 1:N | Invitation | inviter / invitee |
| User | 1:N | UserStory | assignee (opcional) |
| Project | 1:N | Sprint | tem |
| Project | 1:N | UserStory | contém |
| Sprint | 1:N | UserStory | agrupa (opcional) |

**11 entidades / módulos principais**, **20+ relacionamentos**.
