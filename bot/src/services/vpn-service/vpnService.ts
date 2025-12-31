// src/services/vpn-service/vpnService.ts
import { pool } from '../db-service/db.js';
import crypto from 'crypto';

const LOCATION_CONFIG: Record<string, { name: string; flag: string}> = {
  KZ: {name: 'Kazakhstan', flag: '🇰🇿'},
  NL: {name: 'Netherlands', flag: '🇳🇱'},
  KR: {name: 'South Korea', flag: '🇰🇷'}
};

export class VpnService {
  static generateShortId(): string {
    return crypto.randomBytes(8).toString('hex'); // 16 hex
  }

  private static generateVlessLink(
    server: any,
    user: any,
    uuid: string,
    shortId: string
  ): string {
    const sni = user.plan === 'premium' ? 'github.com' : 'aikyn.kz';
    const port = server.port; // используем только port, без portFree/portPremium
    
    const location = server.location || 'KZ';
    const locationConfig = LOCATION_CONFIG[location] || LOCATION_CONFIG.KZ;
    const locationName = locationConfig.name;
    const locationFlag = locationConfig.flag;

    return (
      `vless://${uuid}@${server.ip}:${port}?` +
      `encryption=none&security=reality&sni=${sni}&fp=chrome&pbk=${process.env.PUBLIC_KEY!}` +
      `&sid=${shortId}&type=tcp&flow=xtls-rprx-vision#${locationName}${locationFlag}`
    );
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
      const vlessLink = this.generateVlessLink(server, user, uuid, shortId);

      // 4. сохраняем в VpnKey
      await client.query(
        `INSERT INTO "VpnKey"
         ("userId","serverId", uuid, "shortId", sni, port)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          user.id,
          server.id,
          uuid,
          shortId,
          user.plan === 'premium' ? 'github.com' : 'aikyn.kz',
          server.port
        ]
      );

      return vlessLink;
    } finally {
      client.release();
    }
  }

  static async generateSubscription(telegramId: number): Promise<string> {
    const client = await pool.connect();
    try {
      // 1. Находим пользователя
      const userRes = await client.query(
        'SELECT * FROM "User" WHERE "telegramId" = $1',
        [telegramId.toString()]
      );
      const user = userRes.rows[0];
      if (!user) throw new Error('User not found');
  
      // 2. Получаем все активные серверы
      const serversRes = await client.query(
        'SELECT * FROM "Server" WHERE status = $1 ORDER BY location, id',
        ['active']
      );
      const servers = serversRes.rows;
      if (servers.length === 0) throw new Error('No active servers');
  
      // 3. Генерируем VLESS ссылки для каждого сервера
      const vlessLinks: string[] = [];
      
      for (const server of servers) {
        // ИСПРАВЛЕНИЕ: Проверяем, есть ли уже ключ для этого пользователя и сервера
        const existingKeyRes = await client.query(
          `SELECT * FROM "VpnKey" 
           WHERE "userId" = $1 AND "serverId" = $2 AND status = 'active'
           ORDER BY "createdAt" DESC LIMIT 1`,
          [user.id, server.id]
        );
  
        let uuid: string;
        let shortId: string;
  
        if (existingKeyRes.rows.length > 0) {
          // Используем существующий ключ
          const existingKey = existingKeyRes.rows[0];
          uuid = existingKey.uuid;
          shortId = existingKey.shortId;
        } else {
          // Создаем новый ключ только если его нет
          uuid = crypto.randomUUID();
          shortId = this.generateShortId();
  
          // Сохраняем новый ключ в БД
          await client.query(
            `INSERT INTO "VpnKey"
             ("userId","serverId", uuid, "shortId", sni, port)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [
              user.id,
              server.id,
              uuid,
              shortId,
              user.plan === 'premium' ? 'github.com' : 'aikyn.kz',
              server.port,
            ]
          );
        }
  
        // Генерируем VLESS ссылку (используем существующий или новый ключ)
        const vlessLink = this.generateVlessLink(server, user, uuid, shortId);
        vlessLinks.push(vlessLink);
      }
  
      // 4. Объединяем ссылки через перенос строки и кодируем в base64
      const subscriptionContent = vlessLinks.join('\n');
      const subscriptionBase64 = Buffer.from(subscriptionContent).toString('base64');
  
      return subscriptionBase64;
    } finally {
      client.release();
    }
  }
}