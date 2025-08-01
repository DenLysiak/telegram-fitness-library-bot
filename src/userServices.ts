import { db } from './App';
import { uploadDatabaseToDrive } from './googleDriveService';

export type AllowedUser = {
  user_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

export async function addUser(user: {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}): Promise<string> {
  try {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO allowed_users (user_id, first_name, last_name, username)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(user.id, user.first_name, user.last_name || null, user.username || null);

    await uploadDatabaseToDrive();

    return `✅ Користувача ${user.first_name ?? user.id} успішно додано.`;
  } catch (error) {
      console.error('Error while adding user:', error);

    return '❌ Сталася помилка при додаванні користувача.';
  }
}

export async function removeUser(userId: number): Promise<boolean> {
  const stmt = db.prepare('DELETE FROM allowed_users WHERE user_id = ?');
  const result = stmt.run(userId);

  if (result.changes > 0) {  
    await uploadDatabaseToDrive(); 

    return true;
  }

  return false;
}

export function isUserAllowed(userId: number): boolean {
  const stmt = db.prepare('SELECT 1 FROM allowed_users WHERE user_id = ?');

  return !!stmt.get(userId);
}

export function getAllUsers(): AllowedUser[] {
  const stmt = db.prepare('SELECT * FROM allowed_users');

  return stmt.all() as AllowedUser[];
}
