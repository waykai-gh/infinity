// src/services/vpn-service/vpnService.ts
import { pool } from '../db-service/db.js';
import crypto from 'crypto';
import { addUserToAllServers } from '../xray-service/multiServerXrayService.js';



interface VpnServer {
  id: number;
  ip: string;
  port: number;
  location: 'KZ' | 'NL' | 'KR';
  status: string;
  publicKey: string;
  shortId: string; // ✅ ДОБАВЛЕНО
}


interface VpnUser {
  id: number;
  telegramId: number;
}


const LOCATION_CONFIG: Record<'KZ' | 'NL' | 'KR', { name: string; flag: string}> = {
  KZ: {name: 'Kazakhstan', flag: '🇰🇿'},
  NL: {name: 'Netherlands', flag: '🇳🇱'},
  KR: {name: 'South Korea', flag: '🇰🇷'}
};


export class VpnService {


  private static neededSNI(location: 'KZ' | 'NL' | 'KR'): string {
    switch (location) {
      case 'KZ':
        return 'www.aikyn.kz';
      case 'KR':
        return 'images.apple.com';
      case 'NL':
        return 'gitlab.com';
    }
  }
  
  private static generateVlessLink(
    server: VpnServer,
    uuid: string,
    shortId: string
  ): string {


    const locationConfig = LOCATION_CONFIG[server.location];
    if (!locationConfig) {
      throw new Error(`Missing location config for: ${server.location}`);
    }


    const sni = this.neededSNI(server.location);
    const locationName = locationConfig.name;
    const locationFlag = locationConfig.flag;


    return (
      `vless://${uuid}@${server.ip}:${server.port}?` 
      +
      `encryption=none&security=reality&sni=${sni}&fp=chrome&pbk=${server.publicKey}` 
      +
      `&sid=${shortId}&type=tcp&flow=xtls-rprx-vision#${locationName} | ${locationFlag}`
    );
  }


  static async generateSubscription(telegramId: number): Promise<string> {


    const client = await pool.connect();
    try {
      // 1. Находим пользователя
      const userRes = await client.query(
        'SELECT * FROM "User" WHERE "telegramId" = $1',
        [telegramId]
      );
      const user = userRes.rows[0];
      if (!user) throw new Error('User not found');
  
      /* ✅ ВАЖНО: Добавляем publicKey и shortId в SELECT!  
      *!Сейчас мы берем любой активный сервер, но в будущем мы должны выбрать сервер по его загруженности!
      * Тут есть пространство чтобы реализовать это, но сейчас мы не будем этого делать!
      */
      const serversRes = await client.query(
        'SELECT id, ip, port, location, status, publickey as "publicKey", "shortId" FROM "Server" WHERE status = $1 ORDER BY location, id',
        ['active']
      );
      const servers = serversRes.rows;
      if (servers.length === 0) throw new Error('No active servers');
  
      // 3. Генерируем VLESS ссылки для каждого сервера
      const vlessLinks: string[] = [];
      
      for (const server of servers) {
        // ✅ ПРОВЕРКА: Убедимся что у сервера есть shortId
        if (!server.shortId) {
          throw new Error(`Server ${server.location} (id: ${server.id}) has no shortId configured in database`);
        }

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
          // ✅ ИЗМЕНЕНО: Берём shortId из сервера
          uuid = crypto.randomUUID();
          shortId = server.shortId;
  
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
              this.neededSNI(server.location),
              server.port,
            ]
          );
        }
  
        // Генерируем VLESS ссылку (используем существующий или новый ключ)
        const vlessLink = this.generateVlessLink(server, uuid, shortId);
        vlessLinks.push(vlessLink);
      }
  
      // 4. Объединяем ссылки через перенос строки и кодируем в base64
      const subscriptionContent = vlessLinks.join('\n');
      const subscriptionBase64 = Buffer.from(subscriptionContent).toString('base64');
  
      return subscriptionBase64;
    } catch (error) {
      console.error('Error generating subscrition:', error);
      throw error;
    } finally {
      client.release();
    }
  }
   /**
   * Генерирует подписку И добавляет пользователя на Xray серверы
   */
   static async generateSubscriptionAndActivate(telegramId: number): Promise<string> {
    const client = await pool.connect();
    
    try {
      // 1. Генерируем подписку
      const subscriptionBase64 = await this.generateSubscription(telegramId);


      // 2. Получаем ID пользователя
      const userRes = await client.query(
        'SELECT id FROM "User" WHERE "telegramId" = $1',
        [telegramId]
      );
      
      if (userRes.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const userId = userRes.rows[0].id;


      // 3. Добавляем на все серверы
      await addUserToAllServers(userId);


      return subscriptionBase64;
    } finally {
      client.release();
    }
  }
}
