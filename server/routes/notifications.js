const express = require('express');
const webpush = require('web-push');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

const vapidConfigured = vapidKeys.publicKey && vapidKeys.privateKey &&
  vapidKeys.publicKey !== 'your_vapid_public_key';

if (vapidConfigured) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'admin@kamukunji.com'}`,
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

// Subscribe shop to push notifications
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { subscription } = req.body;
    const shopId = req.user.shop_id;

    await db.query(
      `INSERT INTO shop_subscription_data (shop_id, subscription_data)
       VALUES ($1, $2)
       ON CONFLICT (shop_id) DO UPDATE SET subscription_data = EXCLUDED.subscription_data`,
      [shopId, JSON.stringify(subscription)]
    );

    res.json({ message: 'Subscription saved successfully' });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ message: 'Failed to save subscription' });
  }
});

// Internal helper — send notification to a shop
const sendNotificationToShop = async (shopId, title, body) => {
  if (!vapidConfigured) return;
  try {
    const { rows } = await db.query(
      'SELECT subscription_data FROM shop_subscription_data WHERE shop_id = $1',
      [shopId]
    );
    if (rows.length === 0 || !rows[0].subscription_data) return;

    const subscription = rows[0].subscription_data;
    const payload = JSON.stringify({ title, body, icon: '/icon-192x192.png', badge: '/badge-72x72.png' });
    await webpush.sendNotification(subscription, payload);
  } catch (err) {
    console.error('Error sending notification:', err.message);
  }
};

// Test notification
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { title, body } = req.body;
    await sendNotificationToShop(req.user.shop_id, title || 'Test Notification', body || 'This is a test notification');
    res.json({ message: 'Test notification sent' });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ message: 'Failed to send test notification' });
  }
});

// Get VAPID public key
router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

module.exports = { router, sendNotificationToShop };
