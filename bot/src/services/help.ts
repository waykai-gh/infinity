import { MyContext } from "../types.js";
import { InlineKeyboard, CallbackQueryContext, Bot } from "grammy";

export const help = async (ctx: CallbackQueryContext<MyContext>) => {
  await ctx.callbackQuery.message?.editText('Напишите ваше обращение, вам ответит первый освободившийся специалист!', {
    reply_markup: new InlineKeyboard().text('< На главную', 'back'),
  });
  await ctx.answerCallbackQuery();
}