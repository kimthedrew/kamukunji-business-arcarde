const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const PLAN_FEATURES = {
  free:    { pos_enabled: false, credit_enabled: false },
  basic:   { pos_enabled: true,  credit_enabled: true  },
  premium: { pos_enabled: true,  credit_enabled: true  }
};

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const { rows } = await db.query('SELECT * FROM admins WHERE username = $1', [username]);
    const admin = rows[0];
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { admin_id: admin.id, username: admin.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    res.json({ message: 'Login successful', token, admin: { id: admin.id, username: admin.username, email: admin.email } });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all shops (admin only)
router.get('/shops', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*,
              sub.plan, sub.status AS subscription_status, sub.monthly_fee, sub.end_date AS subscription_end_date
       FROM shops s
       LEFT JOIN shop_subscriptions sub ON s.id = sub.shop_id
       ORDER BY s.created_at DESC`
    );

    const now = new Date();
    const shops = rows.map(shop => {
      const isExpired = shop.subscription_end_date && new Date(shop.subscription_end_date) < now;
      return {
        ...shop,
        plan: shop.plan || 'free',
        subscription_status: isExpired ? 'expired' : (shop.subscription_status || 'active'),
        monthly_fee: parseFloat(shop.monthly_fee) || 0
      };
    });

    res.json(shops);
  } catch (error) {
    console.error('Shops fetch error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Update shop status
router.put('/shops/:id/status', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE shops SET status = $1 WHERE id = $2 RETURNING id',
      [req.body.status, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Shop not found' });
    res.json({ message: 'Shop status updated successfully' });
  } catch (error) {
    console.error('Shop status update error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Toggle shop features
router.put('/shops/:id/features', authenticateToken, async (req, res) => {
  try {
    const { pos_enabled, is_featured, credit_enabled } = req.body;
    const setClauses = [];
    const values = [];
    let idx = 1;
    if (pos_enabled !== undefined)    { setClauses.push(`pos_enabled = $${idx++}`);    values.push(pos_enabled); }
    if (is_featured !== undefined)    { setClauses.push(`is_featured = $${idx++}`);    values.push(is_featured); }
    if (credit_enabled !== undefined) { setClauses.push(`credit_enabled = $${idx++}`); values.push(credit_enabled); }

    if (setClauses.length === 0) return res.json({ message: 'Nothing to update' });

    values.push(req.params.id);
    await db.query(`UPDATE shops SET ${setClauses.join(', ')} WHERE id = $${idx}`, values);
    res.json({ message: 'Shop features updated successfully' });
  } catch (error) {
    console.error('Shop features update error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Update shop subscription
router.put('/shops/:id/subscription', authenticateToken, async (req, res) => {
  try {
    const { plan, monthly_fee, status, end_date } = req.body;
    const shopId = req.params.id;

    await db.query('DELETE FROM shop_subscriptions WHERE shop_id = $1', [shopId]);
    await db.query(
      `INSERT INTO shop_subscriptions (shop_id, plan, monthly_fee, status, start_date, end_date)
       VALUES ($1,$2,$3,$4,NOW(),$5)`,
      [shopId, plan, monthly_fee, status, end_date || null]
    );

    const planDefaults = PLAN_FEATURES[plan] || PLAN_FEATURES.free;
    await db.query(
      'UPDATE shops SET pos_enabled = $1, credit_enabled = $2 WHERE id = $3',
      [planDefaults.pos_enabled, planDefaults.credit_enabled, shopId]
    );

    res.json({ message: 'Shop subscription updated successfully' });
  } catch (error) {
    console.error('Subscription update error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Change admin password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { rows } = await db.query('SELECT * FROM admins WHERE id = $1', [req.user.admin_id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Admin not found' });

    const isValid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isValid) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE admins SET password = $1 WHERE id = $2', [hashed, req.user.admin_id]);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Dashboard stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [total, active, products, orders, featured, subs] = await Promise.all([
      db.query('SELECT COUNT(*) FROM shops'),
      db.query("SELECT COUNT(*) FROM shops WHERE status = 'active'"),
      db.query('SELECT COUNT(*) FROM products'),
      db.query('SELECT COUNT(*) FROM orders'),
      db.query('SELECT COUNT(*) FROM shops WHERE is_featured = true'),
      db.query('SELECT plan, status, monthly_fee FROM shop_subscriptions')
    ]);

    const allSubs = subs.rows;
    const activeSubs = allSubs.filter(s => s.status === 'active');
    const monthlyRevenue = activeSubs.reduce((sum, s) => sum + parseFloat(s.monthly_fee || 0), 0);
    const planBreakdown = { free: 0, basic: 0, premium: 0 };
    allSubs.forEach(s => { if (planBreakdown[s.plan] !== undefined) planBreakdown[s.plan]++; });

    res.json({
      totalShops: parseInt(total.rows[0].count),
      activeShops: parseInt(active.rows[0].count),
      totalProducts: parseInt(products.rows[0].count),
      totalOrders: parseInt(orders.rows[0].count),
      featuredShops: parseInt(featured.rows[0].count),
      monthlyRevenue,
      planBreakdown
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

module.exports = router;
