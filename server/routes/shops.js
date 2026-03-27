const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../database-adapter');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Shop login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: shop, error } = await supabase
      .from('shops')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !shop) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, shop.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { shop_id: shop.id, shop_number: shop.shop_number },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      shop: {
        id: shop.id,
        shop_number: shop.shop_number,
        shop_name: shop.shop_name,
        contact: shop.contact,
        email: shop.email,
        status: shop.status
      }
    });
  } catch (error) {
    console.error('Shop login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all shops (public) - active shops, featured first
router.get('/', async (req, res) => {
  try {
    const { data: shops, error } = await supabase
      .from('shops')
      .select('id, shop_number, shop_name, contact, email, status, is_featured, banner_url, business_hours')
      .eq('status', 'active')
      .order('is_featured', { ascending: false })
      .order('shop_number');

    if (error) {
      console.error('Shops fetch error:', error);
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(shops);
  } catch (error) {
    console.error('Shops fetch error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Get all shops (admin only) - including pending shops
router.get('/admin/all', authenticateToken, async (req, res) => {
  try {
    const { data: shops, error } = await supabase
      .from('shops')
      .select('id, shop_number, shop_name, contact, email, status, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Admin shops fetch error:', error);
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(shops);
  } catch (error) {
    console.error('Admin shops fetch error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Get products from a specific shop (public)
router.get('/:id/products', async (req, res) => {
  try {
    const shopId = req.params.id;

    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id, shop_number, shop_name, contact, status, till_number, payment_provider, payment_notes, banner_url, business_hours, is_featured')
      .eq('id', shopId)
      .eq('status', 'active')
      .single();

    if (shopError || !shop) {
      return res.status(404).json({ message: 'Shop not found or not active' });
    }

    const { data: products, error: productError } = await supabase
      .from('products')
      .select('*, product_sizes(size, in_stock, quantity)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (productError) {
      console.error('Shop products fetch error:', productError);
      return res.status(500).json({ message: 'Database error' });
    }

    const transformedProducts = products.map(product => ({
      ...product,
      shop_number: shop.shop_number,
      shop_name: shop.shop_name,
      contact: shop.contact,
      till_number: shop.till_number || null,
      payment_provider: shop.payment_provider || null,
      payment_notes: shop.payment_notes || null,
      sizes: product.product_sizes.map(ps => `${ps.size}:${ps.in_stock ? '1' : '0'}:${ps.quantity || 0}`).join(',')
    }));

    res.json({
      shop: {
        id: shop.id,
        shop_number: shop.shop_number,
        shop_name: shop.shop_name,
        contact: shop.contact,
        banner_url: shop.banner_url || null,
        business_hours: shop.business_hours || null,
        is_featured: shop.is_featured || false
      },
      products: transformedProducts
    });
  } catch (error) {
    console.error('Shop products fetch error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Get shop profile (authenticated) — includes subscription plan
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { data: shop, error } = await supabase
      .from('shops')
      .select('id, shop_number, shop_name, contact, email, status, till_number, payment_provider, payment_notes, pos_enabled, banner_url, business_hours, is_featured, credit_enabled')
      .eq('id', req.user.shop_id)
      .single();

    if (error || !shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Get subscription plan
    const { data: subscription } = await supabase
      .from('shop_subscriptions')
      .select('plan, status, end_date')
      .eq('shop_id', req.user.shop_id)
      .single();

    const now = new Date();
    const isExpired = subscription?.end_date && new Date(subscription.end_date) < now;

    res.json({
      ...shop,
      plan: subscription?.plan || 'free',
      subscription_status: isExpired ? 'expired' : (subscription?.status || 'active'),
      subscription_end_date: subscription?.end_date || null
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Update shop profile (authenticated)
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { shop_name, contact, email, till_number, payment_provider, payment_notes, banner_url, business_hours } = req.body;

    const { error } = await supabase
      .from('shops')
      .update({
        shop_name,
        contact,
        email,
        till_number: till_number ?? null,
        payment_provider: payment_provider ?? null,
        payment_notes: payment_notes ?? null,
        banner_url: banner_url ?? null,
        business_hours: business_hours ?? null
      })
      .eq('id', req.user.shop_id);

    if (error) {
      console.error('Profile update error:', error);
      return res.status(500).json({ message: 'Database error' });
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Get shop catalog (authenticated) — for WhatsApp sharing
router.get('/catalog', authenticateToken, async (req, res) => {
  try {
    const shopId = req.user.shop_id;

    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id, shop_number, shop_name, contact, email, till_number, payment_provider, payment_notes, banner_url, business_hours')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, name, description, price, image_url, category, product_sizes(size, in_stock, quantity)')
      .eq('shop_id', shopId)
      .order('category')
      .order('name');

    if (productError) {
      return res.status(500).json({ message: 'Database error' });
    }

    res.json({ shop, products });
  } catch (error) {
    console.error('Catalog fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change shop password (authenticated)
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const shopId = req.user.shop_id;

    const { data: shop, error: fetchError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (fetchError || !shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, shop.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from('shops')
      .update({ password: hashedPassword })
      .eq('id', shopId);

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(500).json({ message: 'Failed to update password' });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
