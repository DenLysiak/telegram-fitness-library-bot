import { Telegraf, Markup } from 'telegraf';

export async function sendWelcome(bot: Telegraf, userId: number) {
  await bot.telegram.sendMessage(userId, '👋 Привіт! Я твій бот для тренувань.', Markup.inlineKeyboard([
    [Markup.button.callback('🏋🏼‍♂️ Розпочати тренування:', 'open_menu')]
  ]));
}
