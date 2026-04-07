const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Record a POS sale (authenticated)
router.post('/sale', authenticateToken, async (req, res) => {
  try {
    const shopId = req.user.shop_id;

    const { rows: shopRows } = await db.query(
      'SELECT id, pos_enabled, status FROM shops WHERE id = $1',
      [shopId]
    );
    if (shopRows.length === 0) return res.status(401).json({ message: 'Shop not found' });
    const shop = shopRows[0];
    if (!shop.pos_enabled) return res.status(403).json({ message: 'POS is not enabled for this shop' });
    if (shop.status === 'closed' || shop.status === 'suspended') return res.status(403).json({ message: 'Shop is not active' });

    const { items, payment_method, payment_reference, customer_name, customer_phone, discount } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ message: 'No items in sale' });

    const validPaymentMethods = ['cash', 'mpesa', 'bank_transfer'];
    if (!validPaymentMethods.includes(payment_method)) return res.status(400).json({ message: 'Invalid payment method' });

    const customerName = customer_name?.trim() || 'Walk-in Customer';
    const customerContact = customer_phone?.trim() || 'N/A';
    const discountAmount = parseFloat(discount) || 0;
    const subtotal = items.reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0);
    const total = Math.max(0, subtotal - discountAmount);
    const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;

    const createdOrders = [];
    const now = new Date().toISOString();

    for (const item of items) {
      const { product_id, size, price, quantity = 1 } = item;
      const itemSubtotal = price * quantity;
      const saleAmount = Math.max(0, itemSubtotal - (itemSubtotal * discountRatio));

      const notes = `POS sale. Payment: ${payment_method}${quantity > 1 ? `. Qty: ${quantity}` : ''}${discountAmount > 0 ? `. Discount applied: KSh ${discountAmount}` : ''}`;

      const { rows: orderRows } = await db.query(
        `INSERT INTO orders (shop_id, customer_name, customer_contact, product_id, size, status, source,
                             payment_reference, payment_status, paid_at, confirmed_by, sale_amount, notes)
         VALUES ($1,$2,$3,$4,$5,'completed','pos',$6,'confirmed',$7,$8,$9,$10) RETURNING id`,
        [shopId, customerName, customerContact, product_id, size,
         payment_reference || null, now, shopId, saleAmount, notes]
      );
      createdOrders.push(orderRows[0].id);

      // Update inventory
      const { rows: sizeRows } = await db.query(
        'SELECT id, quantity FROM product_sizes WHERE product_id = $1 AND size = $2',
        [product_id, size]
      );
      if (sizeRows.length > 0) {
        const newQty = Math.max(0, (sizeRows[0].quantity || 0) - quantity);
        await db.query(
          'UPDATE product_sizes SET quantity = $1, in_stock = $2 WHERE id = $3',
          [newQty, newQty > 0, sizeRows[0].id]
        );
      }
    }

    res.status(201).json({ message: 'Sale recorded successfully', order_ids: createdOrders, total });
  } catch (error) {
    console.error('POS sale error:', error);
    res.status(500).json({ message: 'Failed to record sale' });
  }
});

// Get POS sales summary (today + this week)
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const shopId = req.user.shop_id;
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const { rows: orders } = await db.query(
      `SELECT sale_amount, paid_at FROM orders
       WHERE shop_id = $1 AND source = 'pos' AND payment_status = 'confirmed' AND paid_at >= $2
       ORDER BY paid_at DESC`,
      [shopId, weekStart.toISOString()]
    );

    const todayOrders = orders.filter(o => new Date(o.paid_at) >= todayStart);

    const sumRevenue = (list) => list.reduce((sum, o) => sum + parseFloat(o.sale_amount || 0), 0);

    const hourlyMap = {};
    todayOrders.forEach(o => {
      const label = `${new Date(o.paid_at).getHours()}:00`;
      if (!hourlyMap[label]) hourlyMap[label] = { label, revenue: 0, sales: 0 };
      hourlyMap[label].revenue += parseFloat(o.sale_amount || 0);
      hourlyMap[label].sales++;
    });

    const dailyMap = {};
    orders.forEach(o => {
      const day = new Date(o.paid_at).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' });
      if (!dailyMap[day]) dailyMap[day] = { label: day, revenue: 0, sales: 0 };
      dailyMap[day].revenue += parseFloat(o.sale_amount || 0);
      dailyMap[day].sales++;
    });

    res.json({
      today: { sales: todayOrders.length, revenue: sumRevenue(todayOrders), by_hour: Object.values(hourlyMap) },
      week:  { sales: orders.length,      revenue: sumRevenue(orders),      by_day:  Object.values(dailyMap) }
    });
  } catch (error) {
    console.error('POS summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
