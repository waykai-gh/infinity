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

    // Формируем subscription URL
    const baseUrl = process.env.SUBSCRIPTION_BASE_URL || 'https://infinity-ecosys.ru';
    const subscriptionUrl = `${baseUrl}/subscription/${ctx.from.id}`;

    await ctx.callbackQuery.message?.editText(
      `Ваша подписка:\n\n` +
      `Subscription URL:\n\`${subscriptionUrl}\`\n\n` +
      `Скопируйте эту ссылку и добавьте в ваш VPN клиент как subscription.`,
      {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true },
        reply_markup: new InlineKeyboard().text('< На главную', 'back'),
      });
  } catch (e) {
    console.error(e);
    await ctx.reply('Не удалось создать подписку. Обратитесь в техническую поддержку: @InfinitySup_bot.');
  }
  await ctx.answerCallbackQuery();
}