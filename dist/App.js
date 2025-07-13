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
dotenv_1.default.config();
const bot = new telegraf_1.Telegraf(process.env.BOT_TOKEN);
const foldersData = JSON.parse(fs.readFileSync('./data/videoAPI.json', 'utf-8'));
const fileIdMap = new Map();
let videoCounter = 0;
//method to keep the last video sent per user in memory
const lastVideoMessageMap = new Map(); // chatId → messageId
// method to keep the folder state per user in memory
const userFolderState = new Map(); // chatId → folderId
bot.command('start', (ctx) => {
    return ctx.reply('👋 Привіт! Я твій бот для тренувань.', telegraf_1.Markup.inlineKeyboard([
        [telegraf_1.Markup.button.callback('🏋🏼‍♂️ Розпочати тренування:', 'open_menu')]
    ]));
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