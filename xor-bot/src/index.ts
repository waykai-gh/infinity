import 'dotenv/config';
import { GrammyError, HttpError, InlineKeyboard, Bot} from 'grammy';
import { MyContext } from './types.js';
import fetch from 'node-fetch';

const botToken = process.env.BOT_XOR_TOKEN;
if (!botToken) {
  throw new Error('BOT_TOKEN is not defined');
}

const bot = new Bot<MyContext>(botToken);
const aiBaseUrl = process.env.AI_BASE_URL;

bot.command('start', async (ctx) => {
  await ctx.reply('Добро пожаловать в XOR! Работает на gemma 3\n');
})

bot.on('message:text', async (ctx) => {
  const userMessage = ctx.message.text;

  await ctx.api.sendChatAction(ctx.chat.id, 'typing');

  try {
    const response = await fetch(`${aiBaseUrl}/api/llm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userMessage })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
      await ctx.reply(`Ошибка: ${errorData?.error} || 'Не удалось получить ответ от AI'`);
      return;
    }
    
    const data = await response.json() as { model: string; response: string };
    await ctx.reply(data.response || 'Пустой ответ от AI');
  } catch (error) {
    console.error('---Error calling LLM:', error);
    await ctx.reply('Извините, произошла ошибка при обращении к AI. Попробуйте ещё раз.');
  } 
});

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
    console.log('XOR-Bot started');
  } catch (error) {
    console.error('Error in startBot:', error);
  }
}

startBot();