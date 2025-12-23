import { MyContext } from "../types.js";
import { InlineKeyboard, CallbackQueryContext } from "grammy";

export const profile = async (ctx: CallbackQueryContext<MyContext>) => {
    ctx.answerCallbackQuery('Профиль');
  
    ctx.callbackQuery.message?.editText(
      `Здравствуйте, ${ctx.from.first_name}.\nВаш ID: ${ctx.from.id}\n`,
      {
        reply_markup: new InlineKeyboard().text('< На главную', 'back'),
      });
      await ctx.answerCallbackQuery();
  }