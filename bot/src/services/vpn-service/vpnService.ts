// src/services/vpn-service/vpnService.ts
import { pool } from '../db-service/db.js';
import crypto from 'crypto';

export class VpnService {
  static generateShortId(): string {
    return crypto.randomBytes(8).toString('hex'); // 16 hex
  }

  static async createKeyForUser(telegramId: number) {
    const client = await pool.connect();
    try {
      // 1. находим пользователя
      const userRes = await client.query(
        'SELECT * FROM "User" WHERE "telegramId" = $1',
        [telegramId.toString()]
      );
      const user = userRes.rows[0];
      if (!user) throw new Error('User not found');

      // 2. берём первый активный сервер
      const serverRes = await client.query(
        'SELECT * FROM "Server" WHERE status = $1 LIMIT 1',
        ['active']
      );
      const server = serverRes.rows[0];
      if (!server) throw new Error('No active servers');

      // 3. генерируем UUID и shortId
      const uuid = crypto.randomUUID();
      const shortId = this.generateShortId();
      const sni = user.plan === 'premium' ? 'github.com' : 'aikyn.kz';
      const port = server.port;

      // 4. сохраняем в VpnKey
      await client.query(
        `INSERT INTO "VpnKey"
         ("userId","serverId", uuid, "shortId", sni, port)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [user.id, server.id, uuid, shortId, sni, port]
      );

      // 5. собираем VLESS‑ссылку
      const vlessLink =
        `vless://${uuid}@${server.ip}:${port}?` +
        `encryption=none&security=reality&sni=${sni}&fp=chrome&pbk=${process.env.PUBLIC_KEY!}` +
        `&sid=${shortId}&type=tcp&flow=xtls-rprx-vision#VPN-${user.plan.toUpperCase()}`;

      return vlessLink;
    } finally {
      client.release();
    }
  }
}
