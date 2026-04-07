const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

// Register shop
router.post('/register', async (req, res) => {
  try {
    const { shop_number, shop_name, contact, email, password, till_number, payment_provider, payment_notes } = req.body;

    const { rows: existing } = await db.query(
      'SELECT id FROM shops WHERE shop_number = $1 OR email = $2',
      [shop_number, email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Shop number or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows } = await db.query(
      `INSERT INTO shops (shop_number, shop_name, contact, email, password, till_number, payment_provider, payment_notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING id`,
      [shop_number, shop_name, contact, email, hashedPassword,
       till_number || null, payment_provider || null, payment_notes || null]
    );
    const newShop = rows[0];

    await db.query(
      `INSERT INTO shop_subscriptions (shop_id, plan, monthly_fee, status) VALUES ($1,'free',0,'active')`,
      [newShop.id]
    );

    res.status(201).json({ message: 'Shop registered successfully', shop_id: newShop.id });
  } catch (error) {
    console.error('Shop registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login shop
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
      message: 'Login successful',
      token,
      shop: { id: shop.id, shop_number: shop.shop_number, shop_name: shop.shop_name, contact: shop.contact, email: shop.email, status: shop.status }
    });
  } catch (error) {
    console.error('Shop login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
