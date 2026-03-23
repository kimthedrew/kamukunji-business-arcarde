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

    const customerName = customer_name?.trim() || 'Walk-in Customer';
    const customerContact = customer_phone?.trim() || 'N/A';
    const createdOrders = [];

    for (const item of items) {
      const { product_id, size, price, quantity = 1 } = item;

      // Insert one order record per item (quantity handled as separate rows for simplicity,
      // or we store quantity in notes — here we create one order per line item)
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
          notes: `POS sale. Payment: ${payment_method}${quantity > 1 ? `. Qty: ${quantity}` : ''}${discount > 0 ? `. Discount applied: KSh ${discount}` : ''}`
        })
        .select()
        .single();

      if (orderError) {
        console.error('POS order insert error:', orderError);
        return res.status(500).json({ message: 'Failed to record sale' });
      }

      createdOrders.push(order.id);

      // Update inventory: decrement quantity or mark out of stock
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
          .update({
            quantity: newQty,
            in_stock: newQty > 0
          })
          .eq('id', sizeRecord.id);
      }
    }

    // Calculate total
    const subtotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    const total = Math.max(0, subtotal - (discount || 0));

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

module.exports = router;
