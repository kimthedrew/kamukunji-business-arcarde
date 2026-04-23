const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Middleware: authenticate customer token
const authCustomer = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Login required' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    if (!user.customer_id) return res.status(403).json({ message: 'Customer token required' });
    req.customer = user;
    next();
  });
};

// ── Register ─────────────────────────────────────────────────────────────────
// POST /api/customers/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }

    const { rows: existing } = await db.query('SELECT id FROM customers WHERE email = $1', [email]);
    if (existing.length) return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      'INSERT INTO customers (name, email, phone, password) VALUES ($1,$2,$3,$4) RETURNING id',
      [name, email, phone || null, hashed]
    );

    const token = jwt.sign({ customer_id: rows[0].id, email }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ message: 'Registered successfully', token, customer: { id: rows[0].id, name, email, phone } });
  } catch (error) {
    console.error('Customer register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────
// POST /api/customers/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await db.query('SELECT * FROM customers WHERE email = $1', [email]);
    const customer = rows[0];
    if (!customer) return res.status(401).json({ message: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, customer.password);
    if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ customer_id: customer.id, email: customer.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      message: 'Login successful',
      token,
      customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone }
    });
  } catch (error) {
    console.error('Customer login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Get profile ───────────────────────────────────────────────────────────────
// GET /api/customers/profile
router.get('/profile', authCustomer, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, name, email, phone, created_at FROM customers WHERE id = $1', [req.customer.customer_id]);
    if (!rows.length) return res.status(404).json({ message: 'Customer not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Update profile ────────────────────────────────────────────────────────────
// PUT /api/customers/profile
router.put('/profile', authCustomer, async (req, res) => {
  try {
    const { name, phone } = req.body;
    await db.query('UPDATE customers SET name = COALESCE($1, name), phone = COALESCE($2, phone) WHERE id = $3', [name, phone, req.customer.customer_id]);
    res.json({ message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Order history ─────────────────────────────────────────────────────────────
// GET /api/customers/orders
router.get('/orders', authCustomer, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const { rows } = await db.query(
      `SELECT o.id, o.status, o.size, o.notes, o.payment_status, o.created_at, o.sale_amount,
              p.name AS product_name, p.image_url, p.price,
              s.shop_name, s.shop_number, s.contact AS shop_contact
       FROM orders o
       JOIN products p ON o.product_id = p.id
       JOIN shops s ON o.shop_id = s.id
       WHERE o.customer_contact = (SELECT phone FROM customers WHERE id = $1)
          OR o.customer_name    = (SELECT name  FROM customers WHERE id = $1)
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.customer.customer_id, limit, offset]
    );

    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) FROM orders o
       WHERE o.customer_contact = (SELECT phone FROM customers WHERE id = $1)`,
      [req.customer.customer_id]
    );

    res.json({ orders: rows, total: parseInt(countRows[0].count), page: Number(page) });
  } catch (error) {
    console.error('Customer orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
