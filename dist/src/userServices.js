"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addUser = addUser;
exports.removeUser = removeUser;
exports.isUserAllowed = isUserAllowed;
exports.getAllUsers = getAllUsers;
const App_1 = require("./App");
const googleDriveService_1 = require("./googleDriveService");
async function addUser(user) {
    try {
        const stmt = App_1.db.prepare(`
      INSERT OR IGNORE INTO allowed_users (user_id, first_name, last_name, username)
      VALUES (?, ?, ?, ?)
    `);
        stmt.run(user.id, user.first_name, user.last_name || null, user.username || null);
        await (0, googleDriveService_1.uploadDatabaseToDrive)();
        return `✅ Користувача ${user.first_name ?? user.id} успішно додано.`;
    }
    catch (error) {
        console.error('Error while adding user:', error);
        return '❌ Сталася помилка при додаванні користувача.';
    }
}
async function removeUser(userId) {
    const stmt = App_1.db.prepare('DELETE FROM allowed_users WHERE user_id = ?');
    const result = stmt.run(userId);
    if (result.changes > 0) {
        await (0, googleDriveService_1.uploadDatabaseToDrive)();
        return true;
    }
    return false;
}
function isUserAllowed(userId) {
    const stmt = App_1.db.prepare('SELECT 1 FROM allowed_users WHERE user_id = ?');
    return !!stmt.get(userId);
}
function getAllUsers() {
    const stmt = App_1.db.prepare('SELECT * FROM allowed_users');
    return stmt.all();
}
//# sourceMappingURL=userServices.js.map