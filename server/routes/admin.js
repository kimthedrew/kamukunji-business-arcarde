const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../database-adapter');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

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
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all shops (admin only)
router.get('/shops', authenticateToken, async (req, res) => {
  try {
    console.log('Admin requesting shops list');
    
    const { data: shops, error } = await supabase
      .from('shops')
      .select(`
        *,
        shop_subscriptions(plan, status, monthly_fee)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ message: 'Database error' });
    }
    
    // Transform the data to match expected format
    const transformedShops = shops.map(shop => ({
      ...shop,
      plan: shop.shop_subscriptions?.[0]?.plan || 'free',
      subscription_status: shop.shop_subscriptions?.[0]?.status || 'active',
      monthly_fee: shop.shop_subscriptions?.[0]?.monthly_fee || 0
    }));
    
    console.log('Found shops:', transformedShops.length);
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
    
    if (error) {
      console.error('Shop status update error:', error);
      return res.status(500).json({ message: 'Database error' });
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    
    res.json({ message: 'Shop status updated successfully' });
  } catch (error) {
    console.error('Shop status update error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Update shop subscription
router.put('/shops/:id/subscription', authenticateToken, async (req, res) => {
  try {
    const { plan, monthly_fee, status } = req.body;
    const shopId = req.params.id;
    
    // First, delete existing subscription
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
        start_date: new Date().toISOString()
      });
    
    if (error) {
      console.error('Subscription update error:', error);
      return res.status(500).json({ message: 'Database error' });
    }
    
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

    // Get current admin
    db.get('SELECT * FROM admins WHERE id = ?', [adminId], async (err, admin) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      if (!admin) {
        return res.status(404).json({ message: 'Admin not found' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, admin.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      db.run(
        'UPDATE admins SET password = ? WHERE id = ?',
        [hashedPassword, adminId],
        function(err) {
          if (err) {
            return res.status(500).json({ message: 'Failed to update password' });
          }
          res.json({ message: 'Password updated successfully' });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get dashboard stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    console.log('Admin requesting stats');
    
    // Get all stats in parallel
    const [shopsResult, activeShopsResult, productsResult, ordersResult] = await Promise.all([
      supabase.from('shops').select('id', { count: 'exact' }),
      supabase.from('shops').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('products').select('id', { count: 'exact' }),
      supabase.from('orders').select('id', { count: 'exact' })
    ]);
    
    const stats = {
      totalShops: shopsResult.count || 0,
      activeShops: activeShopsResult.count || 0,
      totalProducts: productsResult.count || 0,
      totalOrders: ordersResult.count || 0
    };
    
    console.log('Stats response:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

module.exports = router;
