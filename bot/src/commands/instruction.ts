import { MyContext } from "../types.js";
import { InlineKeyboard, CallbackQueryContext } from "grammy";

export const instruction = async (ctx: CallbackQueryContext<MyContext>) => {
    ctx.answerCallbackQuery('instruction');
  
    ctx.callbackQuery.message?.editText(
      `all instructions🔍: https://infinity-ecosys.ru/landing-instruction`,
      {
        reply_markup: new InlineKeyboard().text('⬅️ На главную', 'back'),
      });
      await ctx.answerCallbackQuery();
  }