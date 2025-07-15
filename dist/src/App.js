"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const dotenv_1 = __importDefault(require("dotenv"));
const fs = __importStar(require("fs"));
const getFolderList_1 = require("./getFolderList");
const deletePreviousVideo_1 = require("./deletePreviousVideo");
const userServices_1 = require("./userServices");
const start_1 = require("./start");
dotenv_1.default.config();
const bot = new telegraf_1.Telegraf(process.env.BOT_TOKEN);
const foldersData = JSON.parse(fs.readFileSync('./data/videoAPI.json', 'utf-8'));
const fileIdMap = new Map();
let videoCounter = 0;
const ADMIN_DEVELOPER = parseInt(process.env.ADMIN_DEVELOPER_ID || '0', 10);
const ADMIN_OWNER = parseInt(process.env.ADMIN_OWNER_ID || '0', 10);
const ADMINS = [ADMIN_OWNER, ADMIN_DEVELOPER];
//method to keep the last video sent per user in memory
const lastVideoMessageMap = new Map(); // chatId → messageId
// method to keep the folder state per user in memory
const userFolderState = new Map(); // chatId → folderId
// method to keep track of pending requests
const pendingRequests = new Map();
bot.command('start', async (ctx) => {
    const id = ctx.from.id;
    const username = ctx.from.username;
    if ((0, userServices_1.isUserAllowed)(id) || ADMINS.includes(id)) {
        return (0, start_1.sendWelcome)(bot, id);
    }
    ctx.reply(`⛔️ Доступ до бота закрито.\n🆔 Ваш user ID: <code>${id}</code>\nUsername: @${username || 'немає'}`, { parse_mode: 'HTML' });
    // return ctx.reply('🔐 Ви можете надіслати запит на доступ:', Markup.inlineKeyboard([
    //   Markup.button.callback('🔓 Запросити доступ', `request_access_${id}`)
    // ]));
    const requestMsg = await ctx.reply('🔐 Ви можете надіслати запит на доступ:', telegraf_1.Markup.inlineKeyboard([
        telegraf_1.Markup.button.callback('🔓 Запросити доступ', `request_access_${id}`)
    ]));
    // 3. Зберігаємо ID повідомлення в карту (щоб потім видалити)
    pendingRequests.set(id, {
        chatId: ctx.chat.id,
        messageId: requestMsg.message_id
    });
});
bot.action(/request_access_(\d+)/, async (ctx) => {
    const requestedId = parseInt(ctx.match[1]);
    const from = ctx.from;
    if (requestedId !== from.id) {
        return ctx.answerCbQuery('⚠️ Це не ваш запит.');
    }
    ctx.answerCbQuery('📩 Запит надіслано адміністраторам.');
    bot.telegram.sendMessage(ADMIN_OWNER, `📥 <b>Запит на доступ до бота:</b>\n\n👤 <b>Ім’я:</b> ${from.first_name} ${from.last_name || ''}\n🆔 <b>ID:</b> <code>${from.id}</code>\n🔗 <b>Username:</b> @${from.username || 'немає'}`, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [[
                    { text: '✅ Надати доступ', callback_data: `approve_${from.id}` },
                    { text: '❌ Відхилити', callback_data: `reject_${from.id}` }
                ]]
        }
    });
});
bot.action(/approve_(\d+)/, async (ctx) => {
    const adminId = ctx.from.id;
    if (!ADMINS.includes(adminId))
        return ctx.answerCbQuery('⛔️ Ви не адміністратор.');
    const userId = parseInt(ctx.match[1]);
    const chat = await bot.telegram.getChat(userId);
    if (chat.type !== 'private') {
        return ctx.reply('❌ Неможливо додати — це не користувач.');
    }
    const added = (0, userServices_1.addUser)({
        id: chat.id,
        first_name: chat.first_name,
        last_name: chat.last_name,
        username: chat.username
    });
    const userInfo = pendingRequests.get(userId);
    if (userInfo) {
        try {
            await bot.telegram.deleteMessage(userInfo.chatId, userInfo.messageId);
        }
        catch (e) {
            if (e instanceof Error) {
                console.warn('⚠️ Не вдалося видалити повідомлення:', e.message);
            }
            else {
                console.warn('⚠️ Не вдалося видалити повідомлення:', e);
            }
        }
        pendingRequests.delete(userId);
    }
    if (added) {
        await ctx.answerCbQuery('✅ Доступ надано!');
        await ctx.editMessageReplyMarkup(undefined);
        await bot.telegram.sendMessage(userId, '✅ Ваш доступ до бота підтверджено!');
        await (0, start_1.sendWelcome)(bot, userId);
    }
    else {
        ctx.answerCbQuery('⚠️ Користувач вже має доступ.');
    }
});
bot.action(/reject_(\d+)/, async (ctx) => {
    const adminId = ctx.from.id;
    if (!ADMINS.includes(adminId))
        return ctx.answerCbQuery('⛔️ Ви не адміністратор.');
    const rejectedId = parseInt(ctx.match[1]);
    ctx.answerCbQuery('❌ Запит відхилено.');
    ctx.editMessageReplyMarkup(undefined); // remove inline keyboard
    bot.telegram.sendMessage(rejectedId, '❌ Ваш запит на доступ було відхилено адміністратором.');
});
bot.command('users', async (ctx) => {
    if (!ADMINS.includes(ctx.from.id))
        return ctx.reply('⛔️ Лише для адміністраторів');
    const users = (0, userServices_1.getAllUsers)();
    if (users.length === 0)
        return ctx.reply('📭 Немає користувачів.');
    const list = users.map(user => {
        const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
        const username = user.username ? `@${user.username}` : '(немає username)';
        return `👤 <b>${fullName}</b>\n🆔 <code>${user.user_id}</code>\n🔗 ${username}`;
    }).join('\n\n');
    const buttons = users.map(user => [
        {
            text: `❌ Видалити ${user.user_id}`,
            callback_data: `remove_user_${user.user_id}`
        }
    ]);
    await ctx.reply(list, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons }
    });
});
bot.action(/remove_user_(\d+)/, async (ctx) => {
    const adminId = ctx.from.id;
    if (!ADMINS.includes(adminId))
        return ctx.answerCbQuery('⛔️ Ви не адміністратор.');
    const userId = parseInt(ctx.match[1]);
    const removed = (0, userServices_1.removeUser)(userId);
    if (removed) {
        await ctx.answerCbQuery('✅ Користувача видалено');
        await ctx.editMessageReplyMarkup(undefined);
        // Повідомити користувача (опціонально)
        try {
            await bot.telegram.sendMessage(userId, '⛔️ Ваш доступ до бота було скасовано адміністратором.');
        }
        catch (e) {
            // Користувач міг заблокувати бота — не критично
        }
        await ctx.reply(`❌ Користувач ${userId} видалений.`);
    }
    else {
        ctx.answerCbQuery('⚠️ Користувач вже не має доступу.');
    }
});
bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) {
        // Якщо немає info про користувача, просто пропускаємо
        return;
    }
    if ((0, userServices_1.isUserAllowed)(userId) || ADMINS.includes(userId)) {
        // Дозволяємо продовжувати обробку
        return next();
    }
    else {
        // Якщо доступ закрито
        await ctx.editMessageText('⛔️ Вибачте, у вас немає доступу до цього бота.');
        // Не виконуємо наступні хендлери
    }
});
bot.action('open_menu', async (ctx) => {
    await ctx.editMessageText('🏆 Виберіть категорію вправ:', telegraf_1.Markup.inlineKeyboard((0, getFolderList_1.getFolderList)(foldersData)));
});
bot.action('close_menu', async (ctx) => {
    await ctx.editMessageText('👋 Привіт! Я твій бот для тренувань.', telegraf_1.Markup.inlineKeyboard([
        [telegraf_1.Markup.button.callback('🏋🏼‍♂️ Розпочати тренування:', 'open_menu')]
    ]));
});
bot.action(/open_folder:(.+)/, async (ctx) => {
    const folderId = ctx.match[1];
    const folder = foldersData.find((f) => f.folderId === folderId);
    const chatId = ctx.chat?.id;
    if (chatId) {
        userFolderState.set(chatId, folderId);
    }
    if (!folder) {
        return ctx.reply('❌ Папку не знайдено.');
    }
    const buttons = folder.dataList.map((video) => {
        const shortId = `vid${videoCounter++}`;
        fileIdMap.set(shortId, video.fileId);
        return [telegraf_1.Markup.button.callback(video.fileName, `play_video:${shortId}`)];
    });
    buttons.push([telegraf_1.Markup.button.callback('🔙 Назад', 'back_to_folders')]);
    await ctx.editMessageText(`📁 *Категорія*: ${folder.folderName}\n🔽 Оберіть вправу:`, {
        parse_mode: 'Markdown',
        ...telegraf_1.Markup.inlineKeyboard(buttons)
    });
});
bot.action(/play_video:(.+)/, async (ctx) => {
    const shortId = ctx.match[1];
    const fileId = fileIdMap.get(shortId);
    const chatId = ctx.chat?.id;
    if (!fileId) {
        return ctx.reply('❌ Відео не знайдено.');
    }
    if (!chatId) {
        return ctx.reply('❌ Неможливо визначити чат.');
    }
    await ctx.answerCbQuery();
    // Delete previous video message if exists
    await (0, deletePreviousVideo_1.deletePreviousVideo)(chatId, ctx.telegram, lastVideoMessageMap);
    // Send new video
    const sentMessage = await ctx.replyWithVideo(fileId, {
        caption: 'Ось ваша вправа:',
    });
    // 💾 Save new message ID
    lastVideoMessageMap.set(chatId, sentMessage.message_id);
});
bot.action('back_to_folders', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (chatId) {
        // Attempt to delete the previous video message if it exists
        await (0, deletePreviousVideo_1.deletePreviousVideo)(chatId, ctx.telegram, lastVideoMessageMap);
    }
    await ctx.editMessageText('🏆 Виберіть категорію вправ:', telegraf_1.Markup.inlineKeyboard((0, getFolderList_1.getFolderList)(foldersData)));
});
// Start the bot
bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
//# sourceMappingURL=App.js.map