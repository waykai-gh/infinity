import 'dotenv/config';
import { GrammyError, HttpError, InlineKeyboard, Bot } from 'grammy';
import { MyContext } from './types.js'; 
import { hydrate } from '@grammyjs/hydrate';
import { profile, subscrice, infinityAI, payments, start, instruction} from './commands/exports.js';
import './http/index.js';

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
    command: 'menu',
    description: 'Меню и услуги',
  },
]);

//Клавиатуры меню
const mainKeyboard = new InlineKeyboard().text('Наши услуги📍', 'services').text('Профиль👤', 'profile').row().text('Подписка✅', 'subscrice').text('Оплата💳', 'payments').row().text('📄Инструкции❓', 'instruction');
const backKeyboard = new InlineKeyboard().text('⬅️ На главную', 'back');
const serviceKeyboard = new InlineKeyboard().row().text('Infinity AI🤖', 'infinityAI').row().text('Free internet access🛜', 'internetAcces').row().text('Site🌐', 'site').row().text('⬅️ На главную', 'back');

// Добавляем middleware для обработки команд
bot.use(hydrate());

// Обработчик команды /start
bot.command('start', start);

bot.callbackQuery('subscrice', subscrice);

bot.callbackQuery('profile', profile);

bot.callbackQuery('infinityAI', infinityAI);

bot.callbackQuery('payments', payments);

bot.callbackQuery('internetAcces', subscrice);

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

bot.callbackQuery('services', async (ctx) => {
  await ctx.callbackQuery.message?.editText('🔎Выберите вас интересующий сервис:', {
    reply_markup: serviceKeyboard
  });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery('site', async (ctx) => {
  await ctx.callbackQuery.message?.editText('🌐Наш сайт: https://infinity-ecosys.ru/landing-instruction', {
    reply_markup: backKeyboard
  });
  await ctx.answerCallbackQuery();
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