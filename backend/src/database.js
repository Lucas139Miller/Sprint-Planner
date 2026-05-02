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

// Exporta a conexão do banco para ser usada em outros arquivos
module.exports = db;
