const express = require('express');
const supabase = require('../database-adapter');
const { authenticateToken } = require('../middleware/auth');
const { sendNotificationToShop } = require('./notifications');

const router = express.Router();

// Create order (public)
router.post('/', async (req, res) => {
  try {
    const { shop_id, customer_name, customer_contact, product_id, size, notes, payment_reference } = req.body;
    
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        shop_id,
        customer_name,
        customer_contact,
        product_id,
        size,
        notes,
        status: 'pending',
        payment_reference: payment_reference || null,
        payment_status: payment_reference ? 'pending' : 'unpaid'
      })
      .select()
      .single();

    if (error) {
      console.error('Order creation error:', error);
      return res.status(500).json({ message: 'Failed to create order' });
    }
    
    // Send notification to shop
    await sendNotificationToShop(
      shop_id, 
      'New Order Received!', 
      `You have a new order from ${customer_name}`
    );
    
    res.status(201).json({ 
      message: 'Order created successfully',
      order_id: order.id 
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ message: 'Failed to create order' });
  }
});

// Get shop's orders (authenticated)
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        products!inner(name, price),
        shops!inner(shop_name)
      `)
      .eq('shop_id', req.user.shop_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Orders fetch error:', error);
      return res.status(500).json({ message: 'Database error' });
    }

    // Transform the data to match expected format
    const transformedOrders = orders.map(order => ({
      id: order.id,
      customer_name: order.customer_name,
      customer_contact: order.customer_contact,
      product_name: order.products.name,
      price: order.products.price,
      size: order.size,
      status: order.status,
      notes: order.notes,
      created_at: order.created_at,
      shop_name: order.shops.shop_name,
      payment_reference: order.payment_reference || null,
      payment_status: order.payment_status || 'unpaid'
    }));

    res.json(transformedOrders);
  } catch (error) {
    console.error('Orders fetch error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Update order status (authenticated)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;
    
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .eq('shop_id', req.user.shop_id)
      .select();

    if (error) {
      console.error('Order status update error:', error);
      return res.status(500).json({ message: 'Database error' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Order not found or not authorized' });
    }

    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Order status update error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Confirm payment (authenticated - shop)
router.put('/:id/payment', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { payment_status } = req.body; // expected 'confirmed' or 'rejected'

    const update = {
      payment_status: payment_status,
      paid_at: payment_status === 'confirmed' ? new Date().toISOString() : null,
      confirmed_by: req.user.shop_id
    };

    const { data, error } = await supabase
      .from('orders')
      .update(update)
      .eq('id', orderId)
      .eq('shop_id', req.user.shop_id)
      .select();

    if (error) {
      console.error('Payment confirm error:', error);
      return res.status(500).json({ message: 'Database error' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Order not found or not authorized' });
    }

    res.json({ message: 'Payment status updated' });
  } catch (error) {
    console.error('Payment confirm error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

module.exports = router;
