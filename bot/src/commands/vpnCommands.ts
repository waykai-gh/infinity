import { Context } from "grammy";
import { VpnService } from '../services/vpn-service/vpnService.js';
import { UserService } from '../services/user-service/userService.js';

export async function keyCommand(ctx: Context) {
  if (!ctx.from) return;

  try {
    // 1. Убедиться, что юзер есть в БД
    const user = await UserService.findOrCreateByTelegram(
      ctx.from.id,
      ctx.from.username,
    );

    // 2. Создать ключ уже по user.id
    const link = await VpnService.createKeyForUser(ctx.from.id);

    await ctx.reply(
      `Вот твой VPN ключ:\n\`${link}\``,
      {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true },
      },
    );
  } catch (e) {
    console.error(e);
    await ctx.reply('Не удалось создать ключ. Напиши админу.');
  }
}