import Database from 'better-sqlite3';

const db = new Database('./data/users.db');

// Create a table to store allowed users
db.prepare(`
  CREATE TABLE IF NOT EXISTS allowed_users (
    user_id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    username TEXT
  )
`).run();

export default db;
