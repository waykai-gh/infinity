import express from 'express';
import { VpnService } from '../services/vpn-service/vpnService.js';

const app = express();

// Subscription endpoint
app.get('/subscription/:telegramId', async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId);
    if (isNaN(telegramId)) {
      return res.status(400).send('Invalid telegram ID');
    }

    const subscription = await VpnService.generateSubscription(telegramId);
    
    // Декодируем base64 и отправляем (клиент сам закодирует обратно)
    const decoded = Buffer.from(subscription, 'base64').toString('utf-8');
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="subscription.txt"');
    res.send(decoded);
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).send('Error generating subscription');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;