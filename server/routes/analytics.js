const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function extractQuantity(notes) {
  if (!notes) return 1;
  const match = notes.match(/Qty:\s*(\d+)/);
  return match ? parseInt(match[1]) : 1;
}

// Revenue summary — period: day | week | month
router.get('/revenue', authenticateToken, async (req, res) => {
  try {
    const shopId = req.user.shop_id;
    const { period = 'week' } = req.query;

    const now = new Date();
    let startDate;
    if (period === 'day') { startDate = new Date(now); startDate.setHours(0, 0, 0, 0); }
    else if (period === 'month') { startDate = new Date(now); startDate.setDate(1); startDate.setHours(0, 0, 0, 0); }
    else startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const { rows: orders } = await db.query(
      `SELECT sale_amount, paid_at, notes FROM orders
       WHERE shop_id = $1 AND source = 'pos' AND payment_status = 'confirmed' AND paid_at >= $2
       ORDER BY paid_at ASC`,
      [shopId, startDate.toISOString()]
    );

    const revenueMap = {};
    let totalRevenue = 0;

    orders.forEach(o => {
      const amount = parseFloat(o.sale_amount || 0);
      totalRevenue += amount;
      const date = new Date(o.paid_at);
      const key = period === 'day'
        ? `${String(date.getHours()).padStart(2, '0')}:00`
        : date.toISOString().split('T')[0];
      if (!revenueMap[key]) revenueMap[key] = { label: key, revenue: 0, sales: 0 };
      revenueMap[key].revenue += amount;
      revenueMap[key].sales++;
    });

    const revenueByPeriod = Object.values(revenueMap).sort((a, b) => a.label.localeCompare(b.label));

    res.json({
      period,
      total_revenue: Math.round(totalRevenue),
      total_sales: orders.length,
      average_order_value: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
      revenue_by_period: revenueByPeriod
    });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Best-selling products
router.get('/bestsellers', authenticateToken, async (req, res) => {
  try {
    const shopId = req.user.shop_id;
    const { period = 'month', limit = 10 } = req.query;

    const now = new Date();
    let startDate;
    if (period === 'day')   { startDate = new Date(now); startDate.setHours(0, 0, 0, 0); }
    else if (period === 'week') startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    else startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const { rows: orders } = await db.query(
      `SELECT o.product_id, o.notes, o.sale_amount, p.name, p.price, p.image_url, p.category
       FROM orders o
       JOIN products p ON o.product_id = p.id
       WHERE o.shop_id = $1 AND o.source = 'pos' AND o.payment_status = 'confirmed' AND o.paid_at >= $2`,
      [shopId, startDate.toISOString()]
    );

    const productMap = {};
    orders.forEach(o => {
      const pid = o.product_id;
      const qty = extractQuantity(o.notes);
      if (!productMap[pid]) {
        productMap[pid] = { product_id: pid, name: o.name, image_url: o.image_url, category: o.category, price: o.price, units_sold: 0, revenue: 0 };
      }
      productMap[pid].units_sold += qty;
      productMap[pid].revenue += parseFloat(o.sale_amount || o.price || 0);
    });

    res.json(Object.values(productMap).sort((a, b) => b.units_sold - a.units_sold).slice(0, parseInt(limit)));
  } catch (error) {
    console.error('Bestsellers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Low stock products
router.get('/lowstock', authenticateToken, async (req, res) => {
  try {
    const shopId = req.user.shop_id;
    const threshold = parseInt(req.query.threshold) || 5;

    const { rows: products } = await db.query(
      `SELECT p.id, p.name, p.image_url, p.category, p.price,
         COALESCE(json_agg(json_build_object('size', ps.size, 'quantity', ps.quantity, 'in_stock', ps.in_stock))
           FILTER (WHERE ps.id IS NOT NULL), '[]') AS product_sizes
       FROM products p
       LEFT JOIN product_sizes ps ON p.id = ps.product_id
       WHERE p.shop_id = $1
       GROUP BY p.id`,
      [shopId]
    );

    const lowStock = [];
    products.forEach(p => {
      const lowSizes = p.product_sizes.filter(s => s.in_stock && s.quantity !== null && s.quantity <= threshold);
      if (lowSizes.length > 0) lowStock.push({ ...p, low_stock_sizes: lowSizes });
    });

    lowStock.sort((a, b) => {
      const aMin = Math.min(...a.low_stock_sizes.map(s => s.quantity));
      const bMin = Math.min(...b.low_stock_sizes.map(s => s.quantity));
      return aMin - bMin;
    });

    res.json(lowStock);
  } catch (error) {
    console.error('Low stock error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
