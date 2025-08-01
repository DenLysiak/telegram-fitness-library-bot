import { Markup, Telegraf, Telegram } from 'telegraf';
import dotenv from 'dotenv';
import * as fs from 'fs';
import { FileType, FolderType } from './types';
import { getFolderList } from './getFolderList';
import { deletePreviousVideo } from './deletePreviousVideo';
import { isUserAllowed, addUser, getAllUsers, removeUser } from './userServices';
import { sendWelcome } from './start';
import { getDB, initDB } from '../data/db';
import Database from 'better-sqlite3';
import path from 'path';
import { downloadDatabaseFromDrive } from './googleDriveService';

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN as string);
const foldersData = JSON.parse(fs.readFileSync('./data/videoAPI.json', 'utf-8'));
const fileIdMap = new Map<string, string>();
let videoCounter = 0;

const ADMIN = parseInt(process.env.ADMIN_OWNER_ID || '0', 10);

export let db: Database.Database;
const dbPath = path.resolve(__dirname, '../../data/users.db');

//method to keep the last video sent per user in memory
const lastVideoMessageMap = new Map<number, number>(); // chatId → messageId

// method to keep the folder state per user in memory
const userFolderState = new Map<number, string>(); // chatId → folderId

// method to keep track of pending requests
const pendingRequests = new Map<number, { chatId: number, messageId: number }>();

bot.command('start', async (ctx) => {
  const id = ctx.from.id;
  const username = ctx.from.username;

  if (isUserAllowed(id) || ADMIN === id) {
    return sendWelcome(bot, id);
  }

  ctx.reply(
    `⛔️ Доступ до бота закрито.\n🆔 Ваш user ID: <code>${id}</code>\nUsername: @${username || 'немає'}`,
    { parse_mode: 'HTML' }
  );

  const requestMsg = await ctx.reply(
    '🔐 Ви можете надіслати запит на доступ:',
    Markup.inlineKeyboard([
      Markup.button.callback('🔓 Запросити доступ', `request_access_${id}`)
    ])
  );

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

  bot.telegram.sendMessage(
    ADMIN,
    `📥 <b>Запит на доступ до бота:</b>\n\n👤 <b>Ім’я:</b> ${from.first_name} ${from.last_name || ''}\n🆔 <b>ID:</b> <code>${from.id}</code>\n🔗 <b>Username:</b> @${from.username || 'немає'}`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Надати доступ', callback_data: `approve_${from.id}` },
          { text: '❌ Відхилити', callback_data: `reject_${from.id}` }
        ]]
      }
    }
    );
});

bot.action(/approve_(\d+)/, async (ctx) => {
  const adminId = ctx.from.id;

  if (ADMIN !== adminId) return ctx.answerCbQuery('⛔️ Ви не адміністратор.');

  const userId = parseInt(ctx.match[1]);

  const chat = await bot.telegram.getChat(userId);

  if (chat.type !== 'private') {
    return ctx.reply('❌ Неможливо додати — це не користувач.');
  }

  const added = await addUser({
    id: chat.id,
    first_name: chat.first_name,
    last_name: chat.last_name,
    username: chat.username
  });

  const userInfo = pendingRequests.get(userId);

  if (userInfo) {
    try {
      await bot.telegram.deleteMessage(userInfo.chatId, userInfo.messageId);

    } catch (e) {
      if (e instanceof Error) {
        console.warn('⚠️ Не вдалося видалити повідомлення:', e.message);
      } else {
        console.warn('⚠️ Не вдалося видалити повідомлення:', e);
      }
    }

    pendingRequests.delete(userId);
  }

  if (added) {
    await ctx.reply(added);
    await ctx.editMessageReplyMarkup(undefined);
    await bot.telegram.sendMessage(userId, '✅ Ваш доступ до бота підтверджено!');

    await sendWelcome(bot, userId);
  } else {
    ctx.answerCbQuery('⚠️ Користувач вже має доступ.');
  }
});

bot.action(/reject_(\d+)/, async (ctx) => {
  const adminId = ctx.from.id;

  if (ADMIN !== adminId) return ctx.answerCbQuery('⛔️ Ви не адміністратор.');

  const rejectedId = parseInt(ctx.match[1]);

  ctx.answerCbQuery('❌ Запит відхилено.');
  ctx.editMessageReplyMarkup(undefined); // remove inline keyboard

  bot.telegram.sendMessage(
    rejectedId,
    '❌ Ваш запит на доступ було відхилено адміністратором.'
  );
});

bot.command('users', async (ctx) => {
  if (ADMIN !== ctx.from.id) return ctx.reply('⛔️ Лише для адміністраторів');

  const users = getAllUsers();

  if (users.length === 0) return ctx.reply('🕵🏼‍♂️ Немає жодного користувача.');


  for (const user of users) {
    const text = `👤 <b>${user.first_name || ''} ${user.last_name || ''}</b>
      🆔 <code>${user.user_id}</code>
      🔗 @${user.username || 'немає'}`;

    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: `❌ Видалити ${user.first_name || 'не вказано'} ${user.last_name || user.user_id}`, callback_data: `remove_user_${user.user_id}` }
        ]]
      }
    });
  }
});

bot.action(/remove_user_(\d+)/, async (ctx) => {
  const adminId = ctx.from.id;

  if (ADMIN !== adminId) return ctx.answerCbQuery('⛔️ Ви не адміністратор.');

  const userId = parseInt(ctx.match[1]);

  const removed = await removeUser(userId);

  if (removed) {
    await ctx.answerCbQuery('✅ Користувача видалено');
    await ctx.editMessageReplyMarkup(undefined);

    // Повідомити користувача (опціонально)
    try {
      await bot.telegram.sendMessage(
        userId,
        '⛔️ Ваш доступ до бота було скасовано адміністратором.'
      );
    } catch (e) {
      // Користувач міг заблокувати бота — не критично
    }

    await ctx.reply(`❌ Користувач ${userId} видалений.`);
  } else {
    ctx.answerCbQuery('⚠️ Користувач вже не має доступу.');
  }
});

bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;

  if (!userId) {
    // Якщо немає info про користувача, просто пропускаємо
    return;
  }

  if (isUserAllowed(userId) || ADMIN === userId) {
    // Дозволяємо продовжувати обробку
    return next();
  } else {
    // Якщо доступ закрито
    await ctx.editMessageText('⛔️ Вибачте, у вас немає доступу до цього бота.');
    // Не виконуємо наступні хендлери
  }
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
(async () => {
  try {
    console.log('🔽 Завантаження бази даних з Google Drive...');
    await downloadDatabaseFromDrive();
  } catch (err) {
    console.warn('⚠️ Не вдалося завантажити базу з Google Drive. Створюємо нову.');
    initDB(dbPath);
  }

  initDB(dbPath);

  db = getDB();

  await bot.launch();
  console.log('🤖 Бот запущено!');
})();


process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

