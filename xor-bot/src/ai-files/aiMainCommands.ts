import { MyContext } from "../types.js";
import { InlineKeyboard, CallbackQueryContext, } from "grammy";


export const infinityAI = async (ctx: CallbackQueryContext<MyContext>) => {
    await ctx.callbackQuery.message?.editText('Добро пожаловать в XOR!\n ', {
      reply_markup: new InlineKeyboard().text('< На главную', 'back').text('Наши услуги', 'services'),
    });
    await ctx.answerCallbackQuery();
  }
