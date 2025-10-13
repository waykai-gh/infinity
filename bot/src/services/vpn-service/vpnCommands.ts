import { MyContext } from "../../types.js";
import { InlineKeyboard, CallbackQueryContext } from "grammy";


export const vpn = async (ctx: CallbackQueryContext<MyContext>) => {
    await ctx.callbackQuery.message?.editText('Пока недоступно\n ', {
      reply_markup: new InlineKeyboard().text('< На главную', 'back').text('Наши услуги', 'services'),
    });
    await ctx.answerCallbackQuery();
  }