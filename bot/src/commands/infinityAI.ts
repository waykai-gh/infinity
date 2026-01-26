import { MyContext } from "../types.js";
import { InlineKeyboard, CallbackQueryContext } from "grammy";

export const infinityAI = async (ctx: CallbackQueryContext<MyContext>) => {
    ctx.answerCallbackQuery('XOR');
  
    ctx.callbackQuery.message?.editText(
      `XOR это наша модель на основе chat GPT которая ответит на все ваши вопросы🤖: @infinityXorAi_bot`,
      {
        reply_markup: new InlineKeyboard().text('⬅️ На главную', 'back'),
      });
      await ctx.answerCallbackQuery();
  }