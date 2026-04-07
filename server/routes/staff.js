const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const STAFF_LIMITS = { free: 0, basic: 1, premium: 3 };

// Staff login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await db.query(
      'SELECT * FROM shop_staff WHERE email = $1 AND is_active = true',
      [email.trim().toLowerCase()]
    );
    const staff = rows[0];
    if (!staff) return res.status(401).json({ message: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, staff.password);
    if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { shop_id: staff.shop_id, staff_id: staff.id, role: 'staff', staff_name: staff.name },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful', token,
      staff: { id: staff.id, name: staff.name, email: staff.email, role: staff.role, shop_id: staff.shop_id }
    });
  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all staff for shop (owner only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'staff') return res.status(403).json({ message: 'Not authorized' });
    const { rows } = await db.query(
      'SELECT id, name, email, role, is_active, created_at FROM shop_staff WHERE shop_id = $1 ORDER BY created_at ASC',
      [req.user.shop_id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add staff member (owner only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'staff') return res.status(403).json({ message: 'Not authorized' });

    const shopId = req.user.shop_id;
    const { name, email, password, role = 'attendant' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'name, email, and password are required' });

    const { rows: subRows } = await db.query('SELECT plan FROM shop_subscriptions WHERE shop_id = $1', [shopId]);
    const plan = subRows[0]?.plan || 'free';
    const limit = STAFF_LIMITS[plan] ?? 0;

    if (limit === 0) return res.status(403).json({ message: 'Staff accounts require a Basic or Premium plan.', code: 'PLAN_LIMIT', plan });

    const { rows: countRows } = await db.query(
      'SELECT COUNT(*) FROM shop_staff WHERE shop_id = $1 AND is_active = true',
      [shopId]
    );
    if (parseInt(countRows[0].count) >= limit) {
      return res.status(403).json({
        message: `Your ${plan} plan allows ${limit} staff account${limit > 1 ? 's' : ''}. Upgrade to Premium to add more.`,
        code: 'STAFF_LIMIT', limit, plan
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO shop_staff (shop_id, name, email, password, role)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role, is_active, created_at`,
      [shopId, name.trim(), email.trim().toLowerCase(), hashedPassword, role]
    );

    res.status(201).json({ message: 'Staff account created', staff: rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'A staff member with this email already exists' });
    console.error('Staff create error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update staff (owner only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'staff') return res.status(403).json({ message: 'Not authorized' });

    const { role, is_active } = req.body;
    const setClauses = [];
    const values = [];
    let idx = 1;
    if (role !== undefined)      { setClauses.push(`role = $${idx++}`);      values.push(role); }
    if (is_active !== undefined) { setClauses.push(`is_active = $${idx++}`); values.push(is_active); }
    if (setClauses.length === 0) return res.json({ message: 'Nothing to update' });

    values.push(req.params.id, req.user.shop_id);
    const { rows } = await db.query(
      `UPDATE shop_staff SET ${setClauses.join(', ')} WHERE id = $${idx} AND shop_id = $${idx + 1} RETURNING id, name, email, role, is_active`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Staff not found' });
    res.json({ message: 'Staff updated', staff: rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete staff (owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'staff') return res.status(403).json({ message: 'Not authorized' });
    const { rows } = await db.query(
      'DELETE FROM shop_staff WHERE id = $1 AND shop_id = $2 RETURNING id',
      [req.params.id, req.user.shop_id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Staff not found' });
    res.json({ message: 'Staff removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
