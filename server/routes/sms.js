const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Lazy-init Africa's Talking so missing env vars don't crash the server
function getAT() {
  const apiKey   = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME || 'sandbox';
  if (!apiKey) throw new Error('Africa\'s Talking API key not configured (AT_API_KEY)');
  const AfricasTalking = require('africastalking');
  const at = AfricasTalking({ apiKey, username });
  return at.SMS;
}

// Helper: send SMS, returns { status, message }
async function sendSMS(to, message) {
  const sms = getAT();
  const phones = Array.isArray(to) ? to : [to];
  // Normalise to +254...
  const normPhones = phones.map(p => String(p).replace(/^0/, '+254'));
  const result = await sms.send({ to: normPhones, message, from: process.env.AT_SENDER_ID });
  return result;
}

// ── Send SMS for credit payment reminder ─────────────────────────────────────
// POST /api/sms/credit-reminder
// Body: { credit_id } — sends reminder to the debtor
router.post('/credit-reminder', authenticateToken, async (req, res) => {
  try {
    const { credit_id } = req.body;
    const { rows } = await db.query(
      `SELECT cs.*, s.shop_name FROM credit_sales cs
       JOIN shops s ON cs.shop_id = s.id
       WHERE cs.id = $1 AND cs.shop_id = $2`,
      [credit_id, req.user.shop_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Credit record not found' });

    const credit = rows[0];
    if (!credit.customer_phone) return res.status(400).json({ message: 'No phone number on file for this customer' });

    const msg = `Hi ${credit.customer_name}, you have an outstanding balance of KSh ${Number(credit.balance).toLocaleString()} at ${credit.shop_name}. Please settle at your earliest convenience. Thank you!`;

    await sendSMS(credit.customer_phone, msg);
    res.json({ message: 'Reminder sent successfully' });
  } catch (error) {
    console.error('SMS credit reminder error:', error.message);
    res.status(500).json({ message: `SMS failed: ${error.message}` });
  }
});

// ── Send SMS order confirmation to customer ──────────────────────────────────
// POST /api/sms/order-confirmation
// Body: { order_id }
router.post('/order-confirmation', authenticateToken, async (req, res) => {
  try {
    const { order_id } = req.body;
    const { rows } = await db.query(
      `SELECT o.*, s.shop_name, s.contact AS shop_contact, p.name AS product_name
       FROM orders o
       JOIN shops s ON o.shop_id = s.id
       JOIN products p ON o.product_id = p.id
       WHERE o.id = $1 AND o.shop_id = $2`,
      [order_id, req.user.shop_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Order not found' });

    const order = rows[0];
    if (!order.customer_contact || order.customer_contact === 'N/A') {
      return res.status(400).json({ message: 'No phone number on file for this customer' });
    }

    const msg = `Hi ${order.customer_name}, your order for ${order.product_name} (Size: ${order.size}) has been confirmed by ${order.shop_name}. Contact: ${order.shop_contact}. Order #${order.id}. Thank you!`;

    await sendSMS(order.customer_contact, msg);
    res.json({ message: 'Order confirmation SMS sent' });
  } catch (error) {
    console.error('SMS order confirmation error:', error.message);
    res.status(500).json({ message: `SMS failed: ${error.message}` });
  }
});

// ── Low-stock alert to shop owner ───────────────────────────────────────────
// POST /api/sms/low-stock-alert
// Body: { product_ids: [...] } — or send for all low-stock products
router.post('/low-stock-alert', authenticateToken, async (req, res) => {
  try {
    const { rows: shopRows } = await db.query('SELECT shop_name, contact FROM shops WHERE id = $1', [req.user.shop_id]);
    if (!shopRows.length) return res.status(404).json({ message: 'Shop not found' });

    const { rows: lowStock } = await db.query(
      `SELECT p.name, ps.size, ps.quantity
       FROM product_sizes ps
       JOIN products p ON ps.product_id = p.id
       WHERE p.shop_id = $1 AND ps.quantity <= 3 AND ps.quantity > 0
       ORDER BY ps.quantity ASC LIMIT 10`,
      [req.user.shop_id]
    );

    if (!lowStock.length) return res.json({ message: 'No low-stock items found' });

    const lines = lowStock.map(item => `${item.name} (Size ${item.size}): ${item.quantity} left`).join(', ');
    const msg = `[${shopRows[0].shop_name}] Low stock alert: ${lines}. Restock soon!`;

    await sendSMS(shopRows[0].contact, msg);
    res.json({ message: 'Low stock alert sent', items: lowStock.length });
  } catch (error) {
    console.error('SMS low-stock alert error:', error.message);
    res.status(500).json({ message: `SMS failed: ${error.message}` });
  }
});

// ── Send custom SMS ───────────────────────────────────────────────────────────
// POST /api/sms/send  (premium shops only)
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { rows: subRows } = await db.query('SELECT plan FROM shop_subscriptions WHERE shop_id = $1', [req.user.shop_id]);
    const plan = subRows[0]?.plan || 'free';
    if (plan !== 'premium') return res.status(403).json({ message: 'Custom SMS is a premium feature' });

    const { to, message } = req.body;
    if (!to || !message) return res.status(400).json({ message: 'to and message are required' });
    if (message.length > 160) return res.status(400).json({ message: 'Message exceeds 160 characters' });

    await sendSMS(to, message);
    res.json({ message: 'SMS sent successfully' });
  } catch (error) {
    console.error('Custom SMS error:', error.message);
    res.status(500).json({ message: `SMS failed: ${error.message}` });
  }
});

module.exports = router;
