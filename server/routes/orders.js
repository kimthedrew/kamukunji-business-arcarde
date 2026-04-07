const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { sendNotificationToShop } = require('./notifications');

const router = express.Router();

// Create order (public)
router.post('/', async (req, res) => {
  try {
    const { shop_id, customer_name, customer_contact, product_id, size, notes, payment_reference } = req.body;

    const { rows } = await db.query(
      `INSERT INTO orders (shop_id, customer_name, customer_contact, product_id, size, notes, status, payment_reference, payment_status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8) RETURNING id`,
      [shop_id, customer_name, customer_contact, product_id, size, notes,
       payment_reference || null, payment_reference ? 'pending' : 'unpaid']
    );

    await sendNotificationToShop(shop_id, 'New Order Received!', `You have a new order from ${customer_name}`);

    res.status(201).json({ message: 'Order created successfully', order_id: rows[0].id });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ message: 'Failed to create order' });
  }
});

// Get shop's orders (authenticated)
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT o.id, o.customer_name, o.customer_contact, p.name as product_name, p.price,
              o.size, o.status, o.notes, o.created_at, s.shop_name,
              o.payment_reference, o.payment_status, o.source
       FROM orders o
       JOIN products p ON o.product_id = p.id
       JOIN shops s ON o.shop_id = s.id
       WHERE o.shop_id = $1
       ORDER BY o.created_at DESC`,
      [req.user.shop_id]
    );

    const orders = rows.map(o => ({
      ...o,
      payment_reference: o.payment_reference || null,
      payment_status: o.payment_status || 'unpaid',
      source: o.source || 'online'
    }));

    res.json(orders);
  } catch (error) {
    console.error('Orders fetch error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Update order status (authenticated)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const { rows } = await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2 AND shop_id = $3 RETURNING id',
      [status, req.params.id, req.user.shop_id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Order not found or not authorized' });
    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Order status update error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Confirm payment (authenticated)
router.put('/:id/payment', authenticateToken, async (req, res) => {
  try {
    const { payment_status } = req.body;
    const paidAt = payment_status === 'confirmed' ? new Date().toISOString() : null;

    const { rows } = await db.query(
      `UPDATE orders SET payment_status = $1, paid_at = $2, confirmed_by = $3
       WHERE id = $4 AND shop_id = $5 RETURNING id`,
      [payment_status, paidAt, req.user.shop_id, req.params.id, req.user.shop_id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Order not found or not authorized' });
    res.json({ message: 'Payment status updated' });
  } catch (error) {
    console.error('Payment confirm error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

module.exports = router;
