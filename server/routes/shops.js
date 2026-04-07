const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Shop login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await db.query('SELECT * FROM shops WHERE email = $1', [email]);
    const shop = rows[0];
    if (!shop) return res.status(401).json({ message: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, shop.password);
    if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { shop_id: shop.id, shop_number: shop.shop_number },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    res.json({
      message: 'Login successful', token,
      shop: { id: shop.id, shop_number: shop.shop_number, shop_name: shop.shop_name, contact: shop.contact, email: shop.email, status: shop.status }
    });
  } catch (error) {
    console.error('Shop login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all active shops (public) — featured first
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, shop_number, shop_name, contact, email, status, is_featured, banner_url, business_hours
       FROM shops WHERE status = 'active'
       ORDER BY is_featured DESC, shop_number ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Shops fetch error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Get all shops (admin)
router.get('/admin/all', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, shop_number, shop_name, contact, email, status, created_at FROM shops ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Admin shops fetch error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Get shop profile (authenticated) — includes subscription
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { rows: shopRows } = await db.query(
      `SELECT id, shop_number, shop_name, contact, email, status, till_number, payment_provider, payment_notes,
              pos_enabled, banner_url, business_hours, is_featured, credit_enabled
       FROM shops WHERE id = $1`,
      [req.user.shop_id]
    );
    if (shopRows.length === 0) return res.status(404).json({ message: 'Shop not found' });
    const shop = shopRows[0];

    const { rows: subRows } = await db.query(
      'SELECT plan, status, end_date FROM shop_subscriptions WHERE shop_id = $1',
      [req.user.shop_id]
    );
    const sub = subRows[0];
    const isExpired = sub?.end_date && new Date(sub.end_date) < new Date();

    res.json({
      ...shop,
      plan: sub?.plan || 'free',
      subscription_status: isExpired ? 'expired' : (sub?.status || 'active'),
      subscription_end_date: sub?.end_date || null
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Update shop profile (authenticated)
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { shop_name, contact, email, till_number, payment_provider, payment_notes, banner_url, business_hours } = req.body;
    await db.query(
      `UPDATE shops SET shop_name=$1, contact=$2, email=$3, till_number=$4, payment_provider=$5,
              payment_notes=$6, banner_url=$7, business_hours=$8 WHERE id=$9`,
      [shop_name, contact, email, till_number ?? null, payment_provider ?? null,
       payment_notes ?? null, banner_url ?? null, business_hours ?? null, req.user.shop_id]
    );
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Get products from a specific shop (public)
router.get('/:id/products', async (req, res) => {
  try {
    const shopId = req.params.id;
    const { rows: shopRows } = await db.query(
      `SELECT id, shop_number, shop_name, contact, status, till_number, payment_provider, payment_notes,
              banner_url, business_hours, is_featured
       FROM shops WHERE id = $1 AND status = 'active'`,
      [shopId]
    );
    if (shopRows.length === 0) return res.status(404).json({ message: 'Shop not found or not active' });
    const shop = shopRows[0];

    const { rows: products } = await db.query(
      `SELECT p.*,
         COALESCE(json_agg(json_build_object('size', ps.size, 'in_stock', ps.in_stock, 'quantity', ps.quantity))
           FILTER (WHERE ps.id IS NOT NULL), '[]') AS product_sizes
       FROM products p
       LEFT JOIN product_sizes ps ON p.id = ps.product_id
       WHERE p.shop_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [shopId]
    );

    const transformedProducts = products.map(p => ({
      ...p,
      shop_number: shop.shop_number,
      shop_name: shop.shop_name,
      contact: shop.contact,
      till_number: shop.till_number || null,
      payment_provider: shop.payment_provider || null,
      payment_notes: shop.payment_notes || null,
      sizes: p.product_sizes.map(s => `${s.size}:${s.in_stock ? '1' : '0'}:${s.quantity || 0}`).join(',')
    }));

    res.json({
      shop: {
        id: shop.id, shop_number: shop.shop_number, shop_name: shop.shop_name, contact: shop.contact,
        banner_url: shop.banner_url || null, business_hours: shop.business_hours || null,
        is_featured: shop.is_featured || false,
        till_number: shop.till_number || null, payment_provider: shop.payment_provider || null
      },
      products: transformedProducts
    });
  } catch (error) {
    console.error('Shop products fetch error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Get shop catalog (authenticated) — for WhatsApp sharing
router.get('/catalog', authenticateToken, async (req, res) => {
  try {
    const shopId = req.user.shop_id;
    const { rows: shopRows } = await db.query(
      `SELECT id, shop_number, shop_name, contact, email, till_number, payment_provider, payment_notes, banner_url, business_hours
       FROM shops WHERE id = $1`,
      [shopId]
    );
    if (shopRows.length === 0) return res.status(404).json({ message: 'Shop not found' });

    const { rows: products } = await db.query(
      `SELECT p.id, p.name, p.description, p.price, p.image_url, p.category,
         COALESCE(json_agg(json_build_object('size', ps.size, 'in_stock', ps.in_stock))
           FILTER (WHERE ps.id IS NOT NULL), '[]') AS product_sizes
       FROM products p
       LEFT JOIN product_sizes ps ON p.id = ps.product_id
       WHERE p.shop_id = $1
       GROUP BY p.id
       ORDER BY p.category, p.name`,
      [shopId]
    );

    res.json({ shop: shopRows[0], products });
  } catch (error) {
    console.error('Catalog fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change shop password (authenticated)
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { rows } = await db.query('SELECT password FROM shops WHERE id = $1', [req.user.shop_id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Shop not found' });

    const isValid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isValid) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE shops SET password = $1 WHERE id = $2', [hashed, req.user.shop_id]);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

module.exports = router;
