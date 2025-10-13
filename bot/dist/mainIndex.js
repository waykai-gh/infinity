import 'dotenv/config';
import { GrammyError, HttpError, Bot } from 'grammy';
const botToken = process.env.BOT_TOKEN;
if (!botToken) {
    throw new Error('BOT_TOKEN is not defined');
}
const bot = new Bot(botToken);
// Обработка ошибок согласно документации
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
        console.error('Error in request:', e.description);
    }
    else if (e instanceof HttpError) {
        console.error('Could not contact Telegram:', e);
    }
    else {
        console.error('Unknown error:', e);
    }
});
// Функция запуска бота
async function startBot() {
    try {
        bot.start();
        console.log('Bot started');
    }
    catch (error) {
        console.error('Error in startBot:', error);
    }
}
startBot();
