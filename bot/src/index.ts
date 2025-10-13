import 'dotenv/config';
import { GrammyError, HttpError, InlineKeyboard, Bot} from 'grammy';
import { MyContext } from './types.js'; 
import { hydrate } from '@grammyjs/hydrate';
import { inlineKeyboard } from 'telegraf/markup';
import { vpn, infinityAI} from './commands/exports.js';
import { subscrice } from './commands/subcrise.js';


const botToken = process.env.BOT_TOKEN;
if (!botToken) {
  throw new Error('BOT_TOKEN is not defined');
}

export const bot = new Bot<MyContext>(botToken);
const mainKeyboard = new InlineKeyboard().text('Наши услуги', 'services').text('Профиль', 'profile').text('Поддержка', 'help').text('Подписка', 'subscrice');
const backKeyboard = new InlineKeyboard().text('< На главную', 'back');
const menuKeyboard = new InlineKeyboard().text('Infinity AI', 'infinityAI').text('Ollama Model (not aviable yet)', 'ollama').text('AI-VPN-Service (not aviable yet)', 'vpn').row().text('< На главную', 'back');

// Добавляем middleware для обработки команд
bot.use(hydrate());

// Обработчик команды /start
bot.command('start', async (ctx) => {
  await ctx.reply('Вы успешно зарегистрированы!\n', {
    reply_markup: mainKeyboard,
  });
});

// Обработчик команды /help
bot.callbackQuery('help', async (ctx) => {
  await ctx.callbackQuery.message?.editText('Напишите ваше обращение, вам ответит первый освободившийся специалист!', {
    reply_markup: backKeyboard,
  });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery('back', async (ctx) => {
  await ctx.callbackQuery.message?.editText('Вы на главной странице', {
    reply_markup: mainKeyboard
  });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery('services', async (ctx) => {
  await ctx.callbackQuery.message?.editText('Выберите модель!', {
    reply_markup: menuKeyboard
  });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery('profile', async (ctx) => {
  await ctx.callbackQuery.message?.editText('Профиль\n ', {
    reply_markup: backKeyboard
  });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery('vpn', vpn);

bot.callbackQuery('infinityAI', infinityAI);

bot.callbackQuery('subscrice', subscrice);
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

// Функция запуска бота
async function startBot() {
  try {
    bot.start();
    console.log('Bot started');
  } catch (error) {
    console.error('Error in startBot:', error);
  }
}

startBot();
