import fetch from 'node-fetch';
import { MyContext } from "../types.js";
import { CallbackQueryContext } from "grammy";


export const xorHandler = async (ctx: MyContext) => {
  const text = ctx.callbackQuery?.message?.text ?? (ctx.message as unknown as { text?: string })?.text ?? '';
  const [, a, b] = text.split(' ');
  const baseUrl = process.env.AI_BASE_URL || 'http://ai-service-backend:3000';

const response = await fetch(`${baseUrl}/api/xor-predict`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ x: [Number(a), Number(b)] })
});
  const { result } = await response.json() as { result: number };
  await ctx.reply(`Результат XOR: ${result}`);
};