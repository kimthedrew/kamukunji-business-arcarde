const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../database-adapter');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Plan → default features map
const PLAN_FEATURES = {
  free:    { pos_enabled: false, credit_enabled: false },
  basic:   { pos_enabled: true,  credit_enabled: true  },
  premium: { pos_enabled: true,  credit_enabled: true  }
};

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { admin_id: admin.id, username: admin.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      admin: { id: admin.id, username: admin.username, email: admin.email }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all shops (admin only)
router.get('/shops', authenticateToken, async (req, res) => {
  try {
    const { data: shops, error } = await supabase
      .from('shops')
      .select(`
        *,
        shop_subscriptions(plan, status, monthly_fee, end_date)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ message: 'Database error' });
    }

    const now = new Date();
    const transformedShops = shops.map(shop => {
      const sub = shop.shop_subscriptions?.[0];
      const isExpired = sub?.end_date && new Date(sub.end_date) < now;
      return {
        ...shop,
        plan: sub?.plan || 'free',
        subscription_status: isExpired ? 'expired' : (sub?.status || 'active'),
        monthly_fee: sub?.monthly_fee || 0,
        subscription_end_date: sub?.end_date || null
      };
    });

    res.json(transformedShops);
  } catch (error) {
    console.error('Shops fetch error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Update shop status
router.put('/shops/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const shopId = req.params.id;

    const { data, error } = await supabase
      .from('shops')
      .update({ status })
      .eq('id', shopId)
      .select();

    if (error) return res.status(500).json({ message: 'Database error' });
    if (!data || data.length === 0) return res.status(404).json({ message: 'Shop not found' });

    res.json({ message: 'Shop status updated successfully' });
  } catch (error) {
    console.error('Shop status update error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Toggle shop features (pos_enabled, is_featured, credit_enabled)
router.put('/shops/:id/features', authenticateToken, async (req, res) => {
  try {
    const { pos_enabled, is_featured, credit_enabled } = req.body;
    const shopId = req.params.id;

    const updates = {};
    if (pos_enabled !== undefined) updates.pos_enabled = pos_enabled;
    if (is_featured !== undefined) updates.is_featured = is_featured;
    if (credit_enabled !== undefined) updates.credit_enabled = credit_enabled;

    const { error } = await supabase
      .from('shops')
      .update(updates)
      .eq('id', shopId);

    if (error) {
      console.error('Shop features update error:', error);
      return res.status(500).json({ message: 'Database error' });
    }

    res.json({ message: 'Shop features updated successfully' });
  } catch (error) {
    console.error('Shop features update error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Update shop subscription
router.put('/shops/:id/subscription', authenticateToken, async (req, res) => {
  try {
    const { plan, monthly_fee, status, end_date } = req.body;
    const shopId = req.params.id;

    // Delete existing subscription
    await supabase
      .from('shop_subscriptions')
      .delete()
      .eq('shop_id', shopId);

    // Insert new subscription
    const { error } = await supabase
      .from('shop_subscriptions')
      .insert({
        shop_id: shopId,
        plan,
        monthly_fee,
        status,
        start_date: new Date().toISOString(),
        end_date: end_date || null
      });

    if (error) {
      console.error('Subscription update error:', error);
      return res.status(500).json({ message: 'Database error' });
    }

    // Auto-apply plan-based features (can be overridden manually after)
    const planDefaults = PLAN_FEATURES[plan] || PLAN_FEATURES.free;
    await supabase
      .from('shops')
      .update(planDefaults)
      .eq('id', shopId);

    res.json({ message: 'Shop subscription updated successfully' });
  } catch (error) {
    console.error('Subscription update error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Change admin password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.user.admin_id;

    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('id', adminId)
      .single();

    if (adminError || !admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, admin.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from('admins')
      .update({ password: hashedPassword })
      .eq('id', adminId);

    if (updateError) {
      return res.status(500).json({ message: 'Failed to update password' });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get dashboard stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [shopsResult, activeShopsResult, productsResult, ordersResult, featuredResult] = await Promise.all([
      supabase.from('shops').select('id', { count: 'exact' }),
      supabase.from('shops').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('products').select('id', { count: 'exact' }),
      supabase.from('orders').select('id', { count: 'exact' }),
      supabase.from('shops').select('id', { count: 'exact' }).eq('is_featured', true)
    ]);

    res.json({
      totalShops: shopsResult.count || 0,
      activeShops: activeShopsResult.count || 0,
      totalProducts: productsResult.count || 0,
      totalOrders: ordersResult.count || 0,
      featuredShops: featuredResult.count || 0
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

module.exports = router;
