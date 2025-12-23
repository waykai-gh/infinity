import { MyContext } from "../types.js";
import { InlineKeyboard, CallbackQueryContext } from "grammy";
import { Telegraf } from 'telegraf';

export const payments = async (ctx: CallbackQueryContext<MyContext>) => {
    ctx.answerCallbackQuery('payments');
  
    ctx.callbackQuery.message?.editText(
      `Вы сможете оплатить подписку чуть позже через Юкасса или telegram Star...`,
      {
        reply_markup: new InlineKeyboard().text('< На главную', 'back'),
      });
      await ctx.answerCallbackQuery();
  }
