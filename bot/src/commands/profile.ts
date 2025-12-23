import { MyContext } from "../types.js";
import { InlineKeyboard, CallbackQueryContext } from "grammy";
import { UserService } from '../services/user-service/userService.js';


export const profile = async (ctx: CallbackQueryContext<MyContext>) => {
    ctx.answerCallbackQuery('Профиль');

    const args = ctx.match?.toString().trim() || '';
    const referralCode = args || null;
  
    const user = await UserService.findOrCreateByTelegram(
      ctx.from.id,
      ctx.from.username,
      ctx.from.language_code,
      referralCode,
    );

    const refLink = `https://t.me/${ctx.me.username}?start=${user.ref_code}`;

    ctx.callbackQuery.message?.editText(
      `Твой профиль, ${ctx.from.first_name}!\n\nТвой план: ${user.plan}.\nТвой реф-код: ${user.ref_code}.\nРеф-ссылка: ${refLink}`,
      {
        reply_markup: new InlineKeyboard().text('< На главную', 'back'),
      });
      await ctx.answerCallbackQuery();
  }