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

// Exporta a conexão do banco para ser usada em outros arquivos
module.exports = db;
