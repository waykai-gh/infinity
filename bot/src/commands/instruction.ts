import { MyContext } from "../types.js";
import { InlineKeyboard, CallbackQueryContext } from "grammy";

const botToken = process.env.BOT_TOKEN;
if (!botToken) {
  throw new Error('BOT_TOKEN is not defined');
}

export const instruction = async (ctx: CallbackQueryContext<MyContext>) => {
    ctx.answerCallbackQuery('instruction');
  
    ctx.callbackQuery.message?.editText(
      `all instructions🔍: https://infinity-ecosys.ru/landing-instruction`,
      {
        reply_markup: new InlineKeyboard().text('⬅️ На главную', 'back'),
      });
      await ctx.answerCallbackQuery();
  }