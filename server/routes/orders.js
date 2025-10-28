const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const { sendNotificationToShop } = require('./notifications');

const router = express.Router();

// Create order (public)
router.post('/', async (req, res) => {
  try {
    const { shop_id, customer_name, customer_contact, product_id, size, notes } = req.body;
    
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        shop_id,
        customer_name,
        customer_contact,
        product_id,
        size,
        notes,
        status: 'pending'
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
      shop_name: order.shops.shop_name
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

module.exports = router;
