const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../database-adapter');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const STAFF_LIMITS = { free: 0, basic: 1, premium: 3 };

// Staff login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: staff, error } = await supabase
      .from('shop_staff')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('is_active', true)
      .single();

    if (error || !staff) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, staff.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        shop_id: staff.shop_id,
        staff_id: staff.id,
        role: 'staff',
        staff_name: staff.name
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        shop_id: staff.shop_id
      }
    });
  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all staff for shop (owner only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'staff') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { data, error } = await supabase
      .from('shop_staff')
      .select('id, name, email, role, is_active, created_at')
      .eq('shop_id', req.user.shop_id)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ message: 'Database error' });

    res.json(data || []);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add staff member (owner only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'staff') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const shopId = req.user.shop_id;
    const { name, email, password, role = 'attendant' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, and password are required' });
    }

    // Check plan limit
    const { data: subscription } = await supabase
      .from('shop_subscriptions')
      .select('plan')
      .eq('shop_id', shopId)
      .single();

    const plan = subscription?.plan || 'free';
    const limit = STAFF_LIMITS[plan] ?? 0;

    if (limit === 0) {
      return res.status(403).json({
        message: 'Staff accounts require a Basic or Premium plan.',
        code: 'PLAN_LIMIT',
        plan
      });
    }

    const { count: currentCount } = await supabase
      .from('shop_staff')
      .select('id', { count: 'exact' })
      .eq('shop_id', shopId)
      .eq('is_active', true);

    if ((currentCount || 0) >= limit) {
      return res.status(403).json({
        message: `Your ${plan} plan allows ${limit} staff account${limit > 1 ? 's' : ''}. Upgrade to Premium to add more.`,
        code: 'STAFF_LIMIT',
        limit,
        plan
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('shop_staff')
      .insert({
        shop_id: shopId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role
      })
      .select('id, name, email, role, is_active, created_at')
      .single();

    if (error) {
      if (error.code === '23505' || error.message?.includes('unique')) {
        return res.status(409).json({ message: 'A staff member with this email already exists' });
      }
      console.error('Staff create error:', error);
      return res.status(500).json({ message: 'Failed to create staff account' });
    }

    res.status(201).json({ message: 'Staff account created', staff: data });
  } catch (error) {
    console.error('Staff create error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update staff — role or active status (owner only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'staff') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { role, is_active } = req.body;
    const updates = {};
    if (role !== undefined) updates.role = role;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabase
      .from('shop_staff')
      .update(updates)
      .eq('id', req.params.id)
      .eq('shop_id', req.user.shop_id)
      .select('id, name, email, role, is_active');

    if (error) return res.status(500).json({ message: 'Database error' });
    if (!data || data.length === 0) return res.status(404).json({ message: 'Staff not found' });

    res.json({ message: 'Staff updated', staff: data[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete staff (owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'staff') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { data, error } = await supabase
      .from('shop_staff')
      .delete()
      .eq('id', req.params.id)
      .eq('shop_id', req.user.shop_id)
      .select();

    if (error) return res.status(500).json({ message: 'Database error' });
    if (!data || data.length === 0) return res.status(404).json({ message: 'Staff not found' });

    res.json({ message: 'Staff removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
