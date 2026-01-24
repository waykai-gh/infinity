import { MyContext } from "../types.js";
import { InlineKeyboard, CallbackQueryContext, Bot } from "grammy";
import { hydrate } from "@grammyjs/hydrate";

const botToken = process.env.BOT_TOKEN;
if (!botToken) {
  throw new Error('BOT_TOKEN is not defined');
}
const bot = new Bot<MyContext>(botToken);

export const instruction = async (ctx: CallbackQueryContext<MyContext>) => {
    ctx.answerCallbackQuery('instruction');
  
    ctx.callbackQuery.message?.editText(
      `Выберите инструкцию:`,
      {
        reply_markup: new InlineKeyboard().text('Linux', 'linux').text('Windows', 'windows').text('Android', 'android').text('IOS', 'ios').row().text('< На главную', 'back'),
      });
      await ctx.answerCallbackQuery();
  }

bot.callbackQuery('linux', async (ctx) => {
  await ctx.callbackQuery.message?.editText('Linux инструкция', {
    reply_markup: new InlineKeyboard().text('< На главную', 'back'),
  });
  await ctx.answerCallbackQuery();
});