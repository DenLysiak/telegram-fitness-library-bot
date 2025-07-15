"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addUser = addUser;
exports.removeUser = removeUser;
exports.isUserAllowed = isUserAllowed;
exports.getAllUsers = getAllUsers;
const db_1 = __importDefault(require("../data/db"));
function addUser(user) {
    const stmt = db_1.default.prepare(`
    INSERT OR IGNORE INTO allowed_users (user_id, first_name, last_name, username)
    VALUES (?, ?, ?, ?)
  `);
    const result = stmt.run(user.id, user.first_name, user.last_name || null, user.username || null);
    return result.changes > 0;
}
function removeUser(userId) {
    const stmt = db_1.default.prepare('DELETE FROM allowed_users WHERE user_id = ?');
    const result = stmt.run(userId);
    return result.changes > 0;
}
function isUserAllowed(userId) {
    const stmt = db_1.default.prepare('SELECT 1 FROM allowed_users WHERE user_id = ?');
    return !!stmt.get(userId);
}
function getAllUsers() {
    const stmt = db_1.default.prepare('SELECT * FROM allowed_users');
    return stmt.all();
}
//# sourceMappingURL=userServices.js.map