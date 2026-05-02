// Importa o driver SQLite (better-sqlite3 é síncrono, mais simples que o sqlite3 assíncrono)
const Database = require('better-sqlite3');
const path = require('path');

// Cria (ou abre) o arquivo do banco de dados na pasta backend/
const db = new Database(path.join(__dirname, '..', 'sprint_planner.db'));

// WAL (Write-Ahead Logging) permite leituras e escritas simultâneas sem travar o banco
db.pragma('journal_mode = WAL');

// Cria a tabela de usuários se ela ainda não existir
// - id: chave primária auto-incrementada (1, 2, 3...)
// - username: nome único do usuário (não pode repetir)
// - email: email único (não pode repetir)
// - password: armazena o HASH da senha, nunca a senha em texto puro
// - created_at: data/hora de criação, preenchida automaticamente
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Tabela de projetos - cada projeto tem um dono (owner_id) que é o usuário que criou
// - name: nome do projeto (obrigatório)
// - description: descrição opcional do projeto
// - owner_id: referência ao usuário criador (FOREIGN KEY para users.id)
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    owner_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  )
`);

// Tabela de membros do projeto - relacionamento N:N entre users e projects
// Um usuário pode estar em vários projetos, e um projeto pode ter vários membros
// - role: papel do membro no Scrum (PO, Scrum Master ou Dev)
// - CHECK: garante que só aceita os 3 papéis válidos no nível do banco
// - UNIQUE(project_id, user_id): impede que o mesmo usuário seja adicionado duas vezes
db.exec(`
  CREATE TABLE IF NOT EXISTS project_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('PO', 'Scrum Master', 'Dev')),
    invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(project_id, user_id)
  )
`);

// Tabela de convites pendentes - usuários precisam aceitar antes de virarem membros
// - inviter_id: quem está convidando (sempre o dono do projeto)
// - invitee_id: quem foi convidado (precisa aceitar)
// - status: 'pending' (aguardando), 'accepted' (já virou membro), 'rejected' (recusou)
// - UNIQUE: impede convites duplicados pendentes para o mesmo par (project, invitee)
db.exec(`
  CREATE TABLE IF NOT EXISTS invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    inviter_id INTEGER NOT NULL,
    invitee_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('PO', 'Scrum Master', 'Dev')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (inviter_id) REFERENCES users(id),
    FOREIGN KEY (invitee_id) REFERENCES users(id)
  )
`);

// Tabela de histórias de usuário (user stories) - itens do backlog
// - title: título da história (ex: "Como usuário, quero fazer login...")
// - description: detalhes da história
// - acceptance_criteria: critérios para considerar a história concluída
// - story_points: estimativa de complexidade (1, 2, 3, 5, 8, 13...)
// - label: categoria (feature, bug, tech_debt)
// - priority: ordem no backlog (menor = mais prioritário)
// - status: estado no kanban (to_do, in_progress, in_review, done)
// - sprint_id: NULL = está no backlog, número = está em um sprint
db.exec(`
  CREATE TABLE IF NOT EXISTS user_stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    acceptance_criteria TEXT,
    story_points INTEGER DEFAULT 0,
    label TEXT DEFAULT 'feature' CHECK(label IN ('feature', 'bug', 'tech_debt')),
    priority INTEGER DEFAULT 0,
    status TEXT DEFAULT 'to_do' CHECK(status IN ('to_do', 'in_progress', 'in_review', 'done')),
    sprint_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )
`);

// Tabela de sprints - cada sprint pertence a um projeto (US4)
// Por que ter uma tabela separada? Sprints têm ciclo de vida próprio (planejamento,
// execução, encerramento) e datas que delimitam o período em que o time vai trabalhar
// nas histórias selecionadas. Histórias do backlog "entram" no sprint pelo sprint_id.
// - name: nome curto do sprint (ex: "Sprint 1")
// - goal: objetivo/meta do sprint (frase que resume o que o time pretende entregar)
// - start_date e end_date: datas limites do sprint (ISO YYYY-MM-DD)
// - status: estado atual do sprint
//   - 'planning': planejamento (ainda escolhendo histórias)
//   - 'active': em andamento (time executando)
//   - 'completed': encerrado (histórias finalizadas/devolvidas ao backlog)
// - CHECK garante que só os 3 status válidos são aceitos no nível do banco
db.exec(`
  CREATE TABLE IF NOT EXISTS sprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    goal TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT NOT NULL DEFAULT 'planning' CHECK(status IN ('planning', 'active', 'completed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )
`);

// Migração: adiciona coluna assignee_id em user_stories (US6 - Kanban)
// Por que ALTER TABLE em vez de incluir no CREATE? Porque a tabela já existe em
// instalações antigas e CREATE TABLE IF NOT EXISTS não altera schema existente.
// SQLite não suporta `ADD COLUMN IF NOT EXISTS`, então usamos try/catch:
// se a coluna já existir, o ALTER lança erro e ignoramos silenciosamente.
// Isso torna a migração idempotente (segura para rodar múltiplas vezes).
try {
  db.exec(`ALTER TABLE user_stories ADD COLUMN assignee_id INTEGER REFERENCES users(id)`);
} catch (err) {
  // Coluna já existe (erro esperado em execuções subsequentes) - ignora silenciosamente
}

// Exporta a conexão do banco para ser usada em outros arquivos
module.exports = db;
