import 'dotenv/config';
import { GrammyError, HttpError, InlineKeyboard, Bot } from 'grammy';
import { MyContext } from './types.js';
import { hydrate } from '@grammyjs/hydrate';
import { profile, keys, start, instruction } from './commands/exports.js';
import { loadAccessConfig, prefetchAccessDatabase } from './config/access.js';

const botToken = process.env.BOT_TOKEN;
if (!botToken) {
  throw new Error('BOT_TOKEN is not defined');
}
const bot = new Bot<MyContext>(botToken);

bot.api.setMyCommands([
  {
    command: 'start',
    description: 'Нажмите для регистрации',
  },
  {
    command: 'keys',
    description: 'Ключи безопасности',
  },
]);

//Клавиатуры меню
const mainKeyboard = new InlineKeyboard().text('Профиль👤', 'profile').row().text('Ключи✅', 'keys').row().text('📄Инструкции❓', 'instruction');
const backKeyboard = new InlineKeyboard().text('⬅️ На главную', 'back');

// Добавляем middleware для обработки команд
bot.use(hydrate());

// Обработчик команды /start
bot.command('start', start);

bot.callbackQuery('keys', keys);

bot.callbackQuery('profile', profile);

bot.callbackQuery('instruction', instruction);

bot.callbackQuery('back', async (ctx) => {
  await ctx.callbackQuery.message?.editText('🖼Возвращаем на главную страницу!\nВыберите один из пунктов меню:', {
    reply_markup: mainKeyboard
  });
  await ctx.answerCallbackQuery();
});

bot.command('menu', async (ctx) => {
  await ctx.reply('🖼Вы на главной странице!\nВыберите один из пунктов меню:', {
    reply_markup: mainKeyboard
  });
});

// Обработка ошибок согласно документации
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;

  if (e instanceof GrammyError) {
    console.error('Error in request:', e.description);
  } else if (e instanceof HttpError) {
    console.error('Could not contact Telegram:', e);
  } else {
    console.error('Unknown error:', e);
  }
});

async function startBot() {
  try {
    await prefetchAccessDatabase();
    loadAccessConfig();
    bot.start();
    console.log('Bot started');
  } catch (error) {
    console.error('Error in startBot:', error);
    process.exit(1);
  }
}

startBot();