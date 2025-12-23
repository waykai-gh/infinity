import { MyContext } from '../types.js';
import { InlineKeyboard, CallbackQueryContext } from "grammy";
import { VpnService } from '../services/vpn-service/vpnService.js';
import { UserService } from '../services/user-service/userService.js';

export async function subscrice(ctx: CallbackQueryContext<MyContext>) {
  ctx.answerCallbackQuery('Подписка');
  if (!ctx.from) return;

  try {
    // 1. Убедиться, что юзер есть в БД
    const user = await UserService.findOrCreateByTelegram(
      ctx.from.id,
      ctx.from.username,
    );

    // 2. Создать ключ уже по user.id
    const link = await VpnService.createKeyForUser(ctx.from.id);

    await ctx.callbackQuery.message?.editText(
      `Ваша подписка:\n\nВаш VLESS key:\n\`${link}\``,
      {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true },
        reply_markup: new InlineKeyboard().text('< На главную', 'back'),
      });
  } catch (e) {
    console.error(e);
    await ctx.reply('Не удалось создать ключ. Обратитесь в техническую поддержку: @InfinitySup_bot.');
  }
  await ctx.answerCallbackQuery();
}