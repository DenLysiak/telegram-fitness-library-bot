import db from '../data/db';

export function addUser(user: {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}): boolean {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO allowed_users (user_id, first_name, last_name, username)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(user.id, user.first_name, user.last_name || null, user.username || null);

  return result.changes > 0;
}

export function removeUser(userId: number): boolean {
  const stmt = db.prepare('DELETE FROM allowed_users WHERE user_id = ?');
  const result = stmt.run(userId);

  return result.changes > 0;
}

export function isUserAllowed(userId: number): boolean {
  const stmt = db.prepare('SELECT 1 FROM allowed_users WHERE user_id = ?');

  return !!stmt.get(userId);
}

export type AllowedUser = {
  user_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

export function getAllUsers(): AllowedUser[] {
  const stmt = db.prepare('SELECT * FROM allowed_users');

  return stmt.all() as AllowedUser[];
}
