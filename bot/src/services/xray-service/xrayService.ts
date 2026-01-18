import { getXtlsClient } from './xtlsClient.js';


const INBOUND_TAG = process.env.XRAY_INBOUND_TAG || 'vless-inbound';


export interface AddUserParams {
  uuid: string;
  email: string;
  level?: number;
}


export interface RemoveUserParams {
  email: string;
}


/**
 * Добавляет нового VLESS пользователя в Xray
 */
export const addUserToXray = async (params: AddUserParams): Promise<void> => {
  const { uuid, email, level = 0 } = params;
  const client = getXtlsClient();


  try {
    // Правильная структура из документации
    const response = await client.handler.addVlessUser({
      tag: INBOUND_TAG,
      username: email,
      uuid: uuid,
      flow: 'xtls-rprx-vision',
      level: level,
    });


    // Response имеет поле isOk (не success)
    if (!response.isOk) {
      throw new Error(response.message || 'Failed to add user');
    }


    console.log(`[XrayService] User added: ${email} (UUID: ${uuid})`);
  } catch (error: any) {
    console.error(`[XrayService] Failed to add user ${email}:`, error.message);
    throw new Error(`Xray API error: ${error.message}`);
  }
};


/**
 * Удаляет пользователя из Xray
 */
export const removeUserFromXray = async (params: RemoveUserParams): Promise<void> => {
  const { email } = params;
  const client = getXtlsClient();


  try {
    // removeUser принимает два аргумента: tag и username
    const response = await client.handler.removeUser(INBOUND_TAG, email);


    if (!response.isOk) {
      throw new Error(response.message || 'Failed to remove user');
    }


    console.log(`[XrayService] User removed: ${email}`);
  } catch (error: any) {
    console.error(`[XrayService] Failed to remove user ${email}:`, error.message);
    throw new Error(`Xray API error: ${error.message}`);
  }
};


/**
 * Получает статистику пользователя (uplink/downlink)
 */
export const getUserStats = async (
  email: string
): Promise<{ uplink: number; downlink: number }> => {
  const client = getXtlsClient();


  try {
    const response = await client.stats.getUserStats(email, false);


    if (!response.isOk || !response.data) {
      console.warn(`[XrayService] Stats not found for ${email}, returning zeros`);
      return { uplink: 0, downlink: 0 };
    }


    // response.data содержит статистику пользователя
    return {
      uplink: Number(response.data.user?.uplink || 0),
      downlink: Number(response.data.user?.downlink || 0),
    };
  } catch (error: any) {
    console.error(`[XrayService] Failed to get stats for ${email}:`, error.message);
    return { uplink: 0, downlink: 0 };
  }
};


/**
 * Сбрасывает статистику пользователя
 */
export const resetUserStats = async (email: string): Promise<void> => {
  const client = getXtlsClient();


  try {
    // reset = true сбрасывает счетчики
    const response = await client.stats.getUserStats(email, true);


    if (!response.isOk) {
      throw new Error(response.message || 'Failed to reset stats');
    }


    console.log(`[XrayService] Stats reset for user: ${email}`);
  } catch (error: any) {
    console.error(`[XrayService] Failed to reset stats for ${email}:`, error.message);
    throw new Error(`Xray API error: ${error.message}`);
  }
};


/**
 * Получает список всех пользователей в inbound
 */
export const getInboundUsers = async (): Promise<any[]> => {
  const client = getXtlsClient();


  try {
    const response = await client.handler.getInboundUsers(INBOUND_TAG);


    if (!response.isOk || !response.data) {
      throw new Error(response.message || 'Failed to get users');
    }


    return response.data.users || [];
  } catch (error: any) {
    console.error(`[XrayService] Failed to get inbound users:`, error.message);
    return [];
  }
};


/**
 * Генерирует VLESS-ссылку для клиента
 */
export const generateVlessLink = (params: {
  uuid: string;
  serverIp: string;
  serverPort: number;
  sni: string;
  publicKey: string;
  shortId: string;
  locationName?: string;
  locationFlag?: string;
}): string => {
  const {
    uuid,
    serverIp,
    serverPort,
    sni,
    publicKey,
    shortId,
    locationName = 'Server',
    locationFlag = '🌐',
  } = params;


  return (
    `vless://${uuid}@${serverIp}:${serverPort}?` +
    `encryption=none&security=reality&sni=${sni}&fp=chrome&pbk=${publicKey}` +
    `&sid=${shortId}&type=tcp&flow=xtls-rprx-vision#${locationName}${locationFlag}`
  );
};
