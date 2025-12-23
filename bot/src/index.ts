import 'dotenv/config';
import { GrammyError, HttpError, InlineKeyboard, Bot } from 'grammy';
import { MyContext } from './types.js'; 
import { hydrate } from '@grammyjs/hydrate';
import { profile, subscrice, infinityAI, payments} from './commands/exports.js';


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
const mainKeyboard = new InlineKeyboard().text('Наши услуги', 'services').text('Профиль', 'profile').row().text('Подписка', 'subscrice').text('Оплата', 'payments');
const backKeyboard = new InlineKeyboard().text('< На главную', 'back');
const serviceKeyboard = new InlineKeyboard().text('Infinity AI', 'infinityAI').text('VPN-Service', 'vpn').row().text('< На главную', 'back');

// Добавляем middleware для обработки команд
bot.use(hydrate());

// Обработчик команды /start
bot.command('start', async (ctx) => {
  await ctx.reply('Регистрация прошла успешно! Добро пожаловать в Infinity!\nВыберите один из пунктов меню:', {
    reply_markup: mainKeyboard,
  });
});

bot.callbackQuery('subscrice', subscrice);

bot.callbackQuery('back', async (ctx) => {
  await ctx.callbackQuery.message?.editText('Вы на главной странице', {
    reply_markup: mainKeyboard
  });
  await ctx.answerCallbackQuery();
});

bot.command('menu', async (ctx) => {
  await ctx.reply('Главное меню', {
    reply_markup: mainKeyboard
  });
});

bot.callbackQuery('services', async (ctx) => {
  await ctx.callbackQuery.message?.editText('Выберите интересующий сервис:', {
    reply_markup: serviceKeyboard
  });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery('profile', profile);

bot.callbackQuery('infinityAI', infinityAI);

bot.callbackQuery('payments', payments);

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
