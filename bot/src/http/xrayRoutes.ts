import { Router, Request, Response, NextFunction } from 'express';
import {
  addUserToXray,
  removeUserFromXray,
  getUserStats,
  resetUserStats,
  getInboundUsers,
  generateVlessLink,
} from '../services/xray-service/index.js';

const router = Router();

// Middleware для проверки admin-токена
const verifyAdminToken = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers['x-admin-token'];
  const validToken = process.env.XRAY_ADMIN_TOKEN;

  if (!validToken) {
    res.status(500).json({ error: 'XRAY_ADMIN_TOKEN not configured on server' });
    return;
  }

  if (token !== validToken) {
    res.status(403).json({ error: 'Forbidden: Invalid admin token' });
    return;
  }

  next();
};

// Применяем middleware ко всем роутам
router.use(verifyAdminToken);

/**
 * POST /xray/users
 * Добавить нового пользователя в Xray
 * Body: { uuid: string, email: string, level?: number }
 */
router.post('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const { uuid, email, level } = req.body;

    if (!uuid || !email) {
      res.status(400).json({ error: 'uuid and email are required' });
      return;
    }

    await addUserToXray({ uuid, email, level });

    res.status(201).json({ message: 'User added successfully', email, uuid });
  } catch (error: any) {
    console.error('[XrayRoutes] Error adding user:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * DELETE /xray/users/:email
 * Удалить пользователя из Xray
 */
router.delete('/users/:email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.params;

    if (!email) {
      res.status(400).json({ error: 'email is required' });
      return;
    }

    await removeUserFromXray({ email });

    res.status(200).json({ message: 'User removed successfully', email });
  } catch (error: any) {
    console.error('[XrayRoutes] Error removing user:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /xray/users/:email/stats
 * Получить статистику пользователя
 */
router.get('/users/:email/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.params;

    if (!email) {
      res.status(400).json({ error: 'email is required' });
      return;
    }

    const stats = await getUserStats(email);

    res.status(200).json({ email, stats });
  } catch (error: any) {
    console.error('[XrayRoutes] Error getting stats:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /xray/users/:email/stats/reset
 * Сбросить статистику пользователя
 */
router.post('/users/:email/stats/reset', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.params;

    if (!email) {
      res.status(400).json({ error: 'email is required' });
      return;
    }

    await resetUserStats(email);

    res.status(200).json({ message: 'Stats reset successfully', email });
  } catch (error: any) {
    console.error('[XrayRoutes] Error resetting stats:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /xray/users
 * Получить список всех пользователей в inbound
 */
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await getInboundUsers();

    res.status(200).json({ users, count: users.length });
  } catch (error: any) {
    console.error('[XrayRoutes] Error getting users:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /xray/vless-link
 * Сгенерировать VLESS-ссылку
 * Body: { uuid, serverIp, serverPort, sni, publicKey, shortId, locationName?, locationFlag? }
 */
router.post('/vless-link', (req: Request, res: Response): void => {
  try {
    const { uuid, serverIp, serverPort, sni, publicKey, shortId, locationName, locationFlag } =
      req.body;

    if (!uuid || !serverIp || !serverPort || !sni || !publicKey || !shortId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const vlessLink = generateVlessLink({
      uuid,
      serverIp,
      serverPort: Number(serverPort),
      sni,
      publicKey,
      shortId,
      locationName,
      locationFlag,
    });

    res.status(200).json({ vlessLink });
  } catch (error: any) {
    console.error('[XrayRoutes] Error generating VLESS link:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
