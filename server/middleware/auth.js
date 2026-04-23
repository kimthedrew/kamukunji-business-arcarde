const jwt = require('jsonwebtoken');
const db = require('../database');

if (!process.env.JWT_SECRET) {
  console.warn('[WARN] JWT_SECRET env var is not set. Using fallback — set it in .env for production!');
}

const JWT_SECRET = process.env.JWT_SECRET || 'kba-dev-secret-change-in-production';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken, JWT_SECRET };

