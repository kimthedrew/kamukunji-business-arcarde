const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware: optional customer auth (attach customer if token present)
const optionalCustomerAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return next();
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) req.customer = user;
    next();
  });
};

// ── Get reviews for a shop ────────────────────────────────────────────────────
// GET /api/reviews/shop/:shopId
router.get('/shop/:shopId', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const { rows } = await db.query(
      `SELECT r.*,
              COALESCE(r.reviewer_name, 'Anonymous') AS reviewer_name
       FROM shop_reviews r
       WHERE r.shop_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.shopId, limit, offset]
    );

    const { rows: countRows } = await db.query(
      'SELECT COUNT(*), AVG(rating)::NUMERIC(3,1) AS avg_rating FROM shop_reviews WHERE shop_id = $1',
      [req.params.shopId]
    );

    res.json({
      reviews: rows,
      total: parseInt(countRows[0].count),
      avg_rating: parseFloat(countRows[0].avg_rating) || 0,
      page: Number(page)
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Submit a review ───────────────────────────────────────────────────────────
// POST /api/reviews/shop/:shopId
// Body: { rating (1-5), comment, reviewer_name }
// Customer auth optional — anonymous reviews allowed
router.post('/shop/:shopId', optionalCustomerAuth, async (req, res) => {
  try {
    const { rating, comment, reviewer_name } = req.body;
    const shopId = req.params.shopId;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Prevent duplicate reviews from same IP within 24h (basic spam guard)
    const ip = req.ip || req.connection.remoteAddress;
    const { rows: recent } = await db.query(
      `SELECT id FROM shop_reviews
       WHERE shop_id = $1 AND reviewer_ip = $2 AND created_at > NOW() - INTERVAL '24 hours'`,
      [shopId, ip]
    );
    if (recent.length > 0) {
      return res.status(429).json({ message: 'You have already submitted a review for this shop recently' });
    }

    const customerId = req.customer?.customer_id || null;

    const { rows } = await db.query(
      `INSERT INTO shop_reviews (shop_id, customer_id, rating, comment, reviewer_name, reviewer_ip)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
      [shopId, customerId, rating, comment || null, reviewer_name || 'Anonymous', ip]
    );

    res.status(201).json({ message: 'Review submitted', review_id: rows[0].id });
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Delete a review (shop owner can remove inappropriate reviews) ─────────────
// DELETE /api/reviews/:reviewId
router.delete('/:reviewId', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM shop_reviews WHERE id = $1 AND shop_id = $2 RETURNING id',
      [req.params.reviewId, req.user.shop_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Review not found or not authorized' });
    res.json({ message: 'Review removed' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
