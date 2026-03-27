const express = require('express');
const supabase = require('../database-adapter');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Record a POS sale (authenticated)
router.post('/sale', authenticateToken, async (req, res) => {
  try {
    const shopId = req.user.shop_id;

    // Verify shop exists and has POS enabled
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id, pos_enabled, status')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      return res.status(401).json({ message: 'Shop not found' });
    }

    if (!shop.pos_enabled) {
      return res.status(403).json({ message: 'POS is not enabled for this shop' });
    }

    if (shop.status === 'closed' || shop.status === 'suspended') {
      return res.status(403).json({ message: 'Shop is not active' });
    }

    const { items, payment_method, payment_reference, customer_name, customer_phone, discount } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items in sale' });
    }

    const validPaymentMethods = ['cash', 'mpesa', 'bank_transfer'];
    if (!validPaymentMethods.includes(payment_method)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    const customerName = customer_name?.trim() || 'Walk-in Customer';
    const customerContact = customer_phone?.trim() || 'N/A';
    const createdOrders = [];
    const discountAmount = parseFloat(discount) || 0;
    const subtotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    const total = Math.max(0, subtotal - discountAmount);

    // Distribute discount proportionally across items
    const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;

    for (const item of items) {
      const { product_id, size, price, quantity = 1 } = item;
      const itemSubtotal = price * quantity;
      const itemDiscount = itemSubtotal * discountRatio;
      const saleAmount = Math.max(0, itemSubtotal - itemDiscount);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          shop_id: shopId,
          customer_name: customerName,
          customer_contact: customerContact,
          product_id,
          size,
          status: 'completed',
          source: 'pos',
          payment_reference: payment_reference || null,
          payment_status: 'confirmed',
          paid_at: new Date().toISOString(),
          confirmed_by: shopId,
          sale_amount: saleAmount,
          notes: `POS sale. Payment: ${payment_method}${quantity > 1 ? `. Qty: ${quantity}` : ''}${discountAmount > 0 ? `. Discount applied: KSh ${discountAmount}` : ''}`
        })
        .select()
        .single();

      if (orderError) {
        console.error('POS order insert error:', orderError);
        return res.status(500).json({ message: 'Failed to record sale' });
      }

      createdOrders.push(order.id);

      // Update inventory
      const { data: sizeRecord } = await supabase
        .from('product_sizes')
        .select('id, quantity, in_stock')
        .eq('product_id', product_id)
        .eq('size', size)
        .single();

      if (sizeRecord) {
        const soldQty = quantity || 1;
        const newQty = Math.max(0, (sizeRecord.quantity || 0) - soldQty);
        await supabase
          .from('product_sizes')
          .update({ quantity: newQty, in_stock: newQty > 0 })
          .eq('id', sizeRecord.id);
      }
    }

    res.status(201).json({
      message: 'Sale recorded successfully',
      order_ids: createdOrders,
      total
    });
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
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // Fetch all POS orders from the past week
    const { data: orders, error } = await supabase
      .from('orders')
      .select('sale_amount, paid_at, notes, products(price)')
      .eq('shop_id', shopId)
      .eq('source', 'pos')
      .eq('payment_status', 'confirmed')
      .gte('paid_at', weekStart.toISOString())
      .order('paid_at', { ascending: false });

    if (error) {
      console.error('Summary fetch error:', error);
      return res.status(500).json({ message: 'Database error' });
    }

    const todayOrders = orders.filter(o => new Date(o.paid_at) >= todayStart);
    const weekOrders = orders;

    const sumRevenue = (list) =>
      list.reduce((sum, o) => sum + parseFloat(o.sale_amount || o.products?.price || 0), 0);

    // Group today's sales by hour for the chart
    const hourlyMap = {};
    todayOrders.forEach(o => {
      const hour = new Date(o.paid_at).getHours();
      const label = `${hour}:00`;
      if (!hourlyMap[label]) hourlyMap[label] = { label, revenue: 0, sales: 0 };
      hourlyMap[label].revenue += parseFloat(o.sale_amount || o.products?.price || 0);
      hourlyMap[label].sales++;
    });

    // Group weekly sales by day
    const dailyMap = {};
    weekOrders.forEach(o => {
      const day = new Date(o.paid_at).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' });
      if (!dailyMap[day]) dailyMap[day] = { label: day, revenue: 0, sales: 0 };
      dailyMap[day].revenue += parseFloat(o.sale_amount || o.products?.price || 0);
      dailyMap[day].sales++;
    });

    res.json({
      today: {
        sales: todayOrders.length,
        revenue: sumRevenue(todayOrders),
        by_hour: Object.values(hourlyMap)
      },
      week: {
        sales: weekOrders.length,
        revenue: sumRevenue(weekOrders),
        by_day: Object.values(dailyMap)
      }
    });
  } catch (error) {
    console.error('POS summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
