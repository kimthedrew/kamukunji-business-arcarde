const express = require('express');
const webpush = require('web-push');
const supabase = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// VAPID keys (you should generate these for production)
const vapidKeys = {
  publicKey: 'BOh70TBFA1GKcwup_jp4JQs_AfpyECUnT2UMSPXtNTRc4YVbiGh1N8xaHBU7exIjfYsqxw-RfL9rMO2NipxaF2E',
  privateKey: 'HZZdxoGfRH-S2OjcxOR8Lx_o7mJu45KqGvwuZzddp2Q'
};

webpush.setVapidDetails(
  'mailto:admin@kamukunji.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Subscribe shop to notifications
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { subscription } = req.body;
    const shopId = req.user.shop_id;

    // First, delete existing subscription for this shop
    await supabase
      .from('shop_subscription_data')
      .delete()
      .eq('shop_id', shopId);

    // Insert new subscription
    const { error } = await supabase
      .from('shop_subscription_data')
      .insert({
        shop_id: shopId,
        subscription_data: subscription
      });

    if (error) {
      console.error('Subscription save error:', error);
      return res.status(500).json({ message: 'Failed to save subscription' });
    }

    res.json({ message: 'Subscription saved successfully' });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ message: 'Failed to save subscription' });
  }
});

// Send notification to shop
const sendNotificationToShop = async (shopId, title, body) => {
  try {
    const { data, error } = await supabase
      .from('shop_subscription_data')
      .select('subscription_data')
      .eq('shop_id', shopId)
      .single();

    if (error || !data || !data.subscription_data) {
      console.error('No subscription found for shop:', shopId);
      return;
    }

    const subscription = data.subscription_data;
    const payload = JSON.stringify({
      title: title,
      body: body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png'
    });

    await webpush.sendNotification(subscription, payload);
    console.log('Notification sent to shop:', shopId);
  } catch (err) {
    console.error('Error sending notification:', err);
  }
};

// Test endpoint to send notification (for testing purposes)
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { title, body } = req.body;
    const shopId = req.user.shop_id;
    
    await sendNotificationToShop(shopId, title || 'Test Notification', body || 'This is a test notification');
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



