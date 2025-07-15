"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWelcome = sendWelcome;
const telegraf_1 = require("telegraf");
async function sendWelcome(bot, userId) {
    await bot.telegram.sendMessage(userId, '👋 Привіт! Я твій бот для тренувань.', telegraf_1.Markup.inlineKeyboard([
        [telegraf_1.Markup.button.callback('🏋🏼‍♂️ Розпочати тренування:', 'open_menu')]
    ]));
}
//# sourceMappingURL=start.js.map