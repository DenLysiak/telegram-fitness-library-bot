import { Markup, Telegraf, Telegram } from 'telegraf';
import dotenv from 'dotenv';
import * as fs from 'fs';
import { FileType, FolderType } from './types';
import { getFolderList } from './getFolderList';
import { deletePreviousVideo } from './deletePreviousVideo';

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN as string);
const foldersData = JSON.parse(fs.readFileSync('./data/videoAPI.json', 'utf-8'));
const fileIdMap = new Map<string, string>();
let videoCounter = 0;

//method to keep the last video sent per user in memory
const lastVideoMessageMap = new Map<number, number>(); // chatId → messageId

// method to keep the folder state per user in memory
const userFolderState = new Map<number, string>(); // chatId → folderId

bot.command('start', (ctx) => {
  return ctx.reply('👋 Привіт! Я твій бот для тренувань.', Markup.inlineKeyboard([
    [Markup.button.callback('🏋🏼‍♂️ Розпочати тренування:', 'open_menu')]
  ]));
});

bot.action('open_menu', async (ctx) => {
  await ctx.editMessageText('🏆 Виберіть категорію вправ:', Markup.inlineKeyboard(getFolderList(foldersData)));
});

bot.action('close_menu', async (ctx) => {
  await ctx.editMessageText('👋 Привіт! Я твій бот для тренувань.', Markup.inlineKeyboard([
    [Markup.button.callback('🏋🏼‍♂️ Розпочати тренування:', 'open_menu')]
  ]));
});

bot.action(/open_folder:(.+)/, async (ctx) => {
  const folderId = ctx.match[1];
  const folder = foldersData.find((f: FolderType) => f.folderId === folderId);
  const chatId = ctx.chat?.id;

  if (chatId) {
    userFolderState.set(chatId, folderId);
  }

  if (!folder) {
    return ctx.reply('❌ Папку не знайдено.');
  }

  const buttons = folder.dataList.map((video: FileType) => {
    const shortId = `vid${videoCounter++}`;
    fileIdMap.set(shortId, video.fileId);

    return [Markup.button.callback(video.fileName, `play_video:${shortId}`)];
  });

  buttons.push([Markup.button.callback('🔙 Назад', 'back_to_folders')]);

    await ctx.editMessageText(
      `📁 *Категорія*: ${folder.folderName}\n🔽 Оберіть вправу:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    }
  );
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
  await deletePreviousVideo(chatId, ctx.telegram, lastVideoMessageMap);

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
    await deletePreviousVideo(chatId, ctx.telegram, lastVideoMessageMap);
  }

  await ctx.editMessageText(
    '🏆 Виберіть категорію вправ:',
    Markup.inlineKeyboard(getFolderList(foldersData))
  );
});

// Start the bot
bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

