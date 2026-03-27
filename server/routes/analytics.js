const express = require('express');
const supabase = require('../database-adapter');
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

    if (period === 'day') {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      startDate = new Date(now);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select('sale_amount, paid_at, notes, products(price, name, category)')
      .eq('shop_id', shopId)
      .eq('source', 'pos')
      .eq('payment_status', 'confirmed')
      .gte('paid_at', startDate.toISOString())
      .order('paid_at', { ascending: true });

    if (error) {
      console.error('Revenue analytics error:', error);
      return res.status(500).json({ message: 'Database error' });
    }

    const revenueMap = {};
    let totalRevenue = 0;
    let totalSales = 0;

    orders.forEach(order => {
      const amount = parseFloat(order.sale_amount || order.products?.price || 0);
      totalRevenue += amount;
      totalSales++;

      const date = new Date(order.paid_at);
      let key;
      if (period === 'day') {
        key = `${String(date.getHours()).padStart(2, '0')}:00`;
      } else {
        key = date.toISOString().split('T')[0];
      }

      if (!revenueMap[key]) revenueMap[key] = { label: key, revenue: 0, sales: 0 };
      revenueMap[key].revenue += amount;
      revenueMap[key].sales++;
    });

    const revenueByPeriod = Object.values(revenueMap).sort((a, b) => a.label.localeCompare(b.label));

    res.json({
      period,
      total_revenue: Math.round(totalRevenue),
      total_sales: totalSales,
      average_order_value: totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0,
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
    if (period === 'day') { startDate = new Date(now); startDate.setHours(0, 0, 0, 0); }
    else if (period === 'week') startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    else startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const { data: orders, error } = await supabase
      .from('orders')
      .select('product_id, size, notes, sale_amount, products(name, price, image_url, category)')
      .eq('shop_id', shopId)
      .eq('source', 'pos')
      .eq('payment_status', 'confirmed')
      .gte('paid_at', startDate.toISOString());

    if (error) return res.status(500).json({ message: 'Database error' });

    const productMap = {};
    orders.forEach(order => {
      const pid = order.product_id;
      const qty = extractQuantity(order.notes);
      if (!productMap[pid]) {
        productMap[pid] = {
          product_id: pid,
          name: order.products?.name || 'Unknown',
          image_url: order.products?.image_url,
          category: order.products?.category,
          price: order.products?.price,
          units_sold: 0,
          revenue: 0
        };
      }
      productMap[pid].units_sold += qty;
      productMap[pid].revenue += parseFloat(order.sale_amount || order.products?.price || 0);
    });

    const bestsellers = Object.values(productMap)
      .sort((a, b) => b.units_sold - a.units_sold)
      .slice(0, parseInt(limit));

    res.json(bestsellers);
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

    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, image_url, category, price, product_sizes(size, quantity, in_stock)')
      .eq('shop_id', shopId);

    if (error) return res.status(500).json({ message: 'Database error' });

    const lowStock = [];
    (products || []).forEach(product => {
      const lowSizes = (product.product_sizes || []).filter(
        s => s.in_stock && s.quantity !== null && s.quantity <= threshold
      );
      if (lowSizes.length > 0) {
        lowStock.push({ ...product, low_stock_sizes: lowSizes });
      }
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
