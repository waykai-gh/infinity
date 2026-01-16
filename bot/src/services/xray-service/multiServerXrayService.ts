// src/services/xray-service/multiServerXrayService.ts
import { XtlsApi } from '@remnawave/xtls-sdk';
import { pool } from '../db-service/db.js';

interface Server {
  id: number;
  ip: string;
  port: number;
  location: 'KZ' | 'NL' | 'KR';
}

interface VpnKey {
  uuid: string;
  shortId: string;
  serverId: number;
}

const INBOUND_TAG = process.env.XRAY_INBOUND_TAG || 'vless-inbound';
const XRAY_API_PORT = process.env.XRAY_API_PORT || '10085';

// Кеш клиентов для переиспользования
const clientCache = new Map<string, XtlsApi>();

/**
 * Создает XtlsApi клиент для сервера (аналогично getXtlsClient)
 */
function getXrayClientForServer(serverIp: string): XtlsApi {
  if (clientCache.has(serverIp)) {
    return clientCache.get(serverIp)!;
  }

  // Конструктор принимает два строковых аргумента: ip и port
  const client = new XtlsApi(serverIp, XRAY_API_PORT);
  
  clientCache.set(serverIp, client);
  console.log(`[MultiServerXray] Connected to Xray API at ${serverIp}:${XRAY_API_PORT}`);
  
  return client;
}

/**
 * Добавляет пользователя на ВСЕ активные серверы
 */
export async function addUserToAllServers(userId: number): Promise<void> {
  const client = await pool.connect();
  
  try {
    const userRes = await client.query(
      'SELECT * FROM "User" WHERE id = $1',
      [userId]
    );
    if (userRes.rows.length === 0) {
      throw new Error(`User ${userId} not found`);
    }
    const user = userRes.rows[0];

    const serversRes = await client.query<Server>(
      'SELECT id, ip, port, location FROM "Server" WHERE status = $1 ORDER BY location, id',
      ['active']
    );
    const servers = serversRes.rows;

    if (servers.length === 0) {
      throw new Error('No active servers found');
    }

    const keysRes = await client.query<VpnKey>(
      'SELECT uuid, "shortId", "serverId" FROM "VpnKey" WHERE "userId" = $1 AND status = $2',
      [userId, 'active']
    );
    const existingKeys = keysRes.rows;

    console.log(`[MultiServerXray] Adding user ${user.telegramId} to ${servers.length} servers`);

    for (const server of servers) {
      const key = existingKeys.find(k => k.serverId === server.id);
      
      if (!key) {
        console.warn(`[MultiServerXray] ⚠️ No key for user ${userId} on server ${server.id} (${server.location})`);
        continue;
      }

      try {
        const xrayClient = getXrayClientForServer(server.ip);
        const email = `user_${user.telegramId}_${server.location}`;
        
        console.log(`[MultiServerXray] Adding to ${server.location} (${server.ip})...`);
        
        const response = await xrayClient.handler.addVlessUser({
          tag: INBOUND_TAG,
          username: email,
          uuid: key.uuid,
          flow: 'xtls-rprx-vision',
          level: 0,
        });

        if (!response.isOk) {
          throw new Error(response.message || 'Failed to add user');
        }

        console.log(`[MultiServerXray] ✅ User ${user.telegramId} added to ${server.location}`);
      } catch (error: any) {
        console.error(`[MultiServerXray] ❌ Failed to add user to ${server.location}:`, error.message);
      }
    }

    console.log(`[MultiServerXray] ✅ Finished adding user ${userId}`);
  } finally {
    client.release();
  }
}

/**
 * Удаляет пользователя со ВСЕХ серверов
 */
export async function removeUserFromAllServers(userId: number): Promise<void> {
  const client = await pool.connect();
  
  try {
    const userRes = await client.query(
      'SELECT * FROM "User" WHERE id = $1',
      [userId]
    );
    if (userRes.rows.length === 0) {
      throw new Error(`User ${userId} not found`);
    }
    const user = userRes.rows[0];

    const serversRes = await client.query<Server>(
      'SELECT id, ip, port, location FROM "Server" WHERE status = $1',
      ['active']
    );

    console.log(`[MultiServerXray] Removing user ${user.telegramId} from ${serversRes.rows.length} servers`);

    for (const server of serversRes.rows) {
      try {
        const xrayClient = getXrayClientForServer(server.ip);
        const email = `user_${user.telegramId}_${server.location}`;
        
        const response = await xrayClient.handler.removeUser(INBOUND_TAG, email);

        if (!response.isOk) {
          throw new Error(response.message || 'Failed to remove user');
        }

        console.log(`[MultiServerXray] ✅ User ${user.telegramId} removed from ${server.location}`);
      } catch (error: any) {
        console.error(`[MultiServerXray] ❌ Failed to remove from ${server.location}:`, error.message);
      }
    }
  } finally {
    client.release();
  }
}
