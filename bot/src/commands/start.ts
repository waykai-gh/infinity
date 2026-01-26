import { Context } from 'grammy';
import { UserService } from '../services/user-service/userService.js';
import { InlineKeyboard } from "grammy";

export async function start(ctx: Context) {
  if (!ctx.from) return;

  // /start или /start ABCD1234
  const args = ctx.match?.toString().trim() || '';
  const referralCode = args || null;

  const user = await UserService.findOrCreateByTelegram(
    ctx.from.id,
    ctx.from.username,
    ctx.from.language_code,
    referralCode,
  );

  const refLink = `https://t.me/${ctx.me.username}?start=${user.ref_code}`;

  await ctx.reply(
    `✳️Добро пожаловать в Infinity, ${ctx.from.first_name}!\n💎Твой план: ${user.plan}.\n🔗🫶Твой реф-код: ${user.ref_code}.\n🔗🫶Реф-ссылка: ${refLink}`,
    {
        reply_markup: new InlineKeyboard().text('На главную ➡️', 'back'),
    }
  );
};
