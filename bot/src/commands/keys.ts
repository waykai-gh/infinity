import { MyContext } from '../types.js';
import { InlineKeyboard, CallbackQueryContext } from "grammy";
import { UserService } from '../services/user-service/userService.js';
import { getDnsServers, getHysteria2Configs, getVlessLinks, resolveTier } from '../config/access.js';

export async function keys(ctx: CallbackQueryContext<MyContext>) {
  ctx.answerCallbackQuery('Ключи');
  if (!ctx.from) return;

  try {
    // 1. Убедиться, что юзер есть в БД
    await UserService.findOrCreateByTelegram(
      ctx.from.id,
      ctx.from.username,
      ctx.from.language_code
    );

    const tier = resolveTier(ctx.from.id);
    const vlessLinks = getVlessLinks(ctx.from.id);
    const dnsServers = getDnsServers(ctx.from.id);
    const hysteria2 = getHysteria2Configs(ctx.from.id);

    const lines: string[] = [];
    lines.push(`🔐 Доступ: ${tier}`);
    lines.push('');
    lines.push('🧷 VLESS:');
    if (vlessLinks.length) {
      for (const link of vlessLinks) lines.push(link);
    } else {
      lines.push('не настроено');
    }

    if (dnsServers.length) {
      lines.push('');
      lines.push('🌐 DNS:');
      for (const dns of dnsServers) lines.push(dns);
    }

    if (hysteria2.length) {
      lines.push('');
      lines.push('🛰 Hysteria2:');
      for (const cfg of hysteria2) lines.push(cfg);
    }

    await ctx.callbackQuery.message?.editText(
      lines.join('\n'),
      {
        link_preview_options: { is_disabled: true },
        reply_markup: new InlineKeyboard().text('⬅️ На главную', 'back'),
      });
  } catch (e) {
    console.error(e);
    await ctx.reply('Не удалось получить ключи. Проверь .env (FRIEND_IDS и VLESS_*), и попробуй позже.');
  }
}