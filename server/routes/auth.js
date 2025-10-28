const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const router = express.Router();

// Register shop
router.post('/register', async (req, res) => {
  try {
    const { shop_number, shop_name, contact, email, password } = req.body;

    // Check if shop number or email already exists
    const { data: existingShop, error: checkError } = await supabase
      .from('shops')
      .select('id')
      .or(`shop_number.eq.${shop_number},email.eq.${email}`)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing shop:', checkError);
      return res.status(500).json({ message: 'Database error' });
    }

    if (existingShop) {
      return res.status(400).json({ message: 'Shop number or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new shop
    const { data: newShop, error: shopError } = await supabase
      .from('shops')
      .insert({
        shop_number,
        shop_name,
        contact,
        email,
        password: hashedPassword,
        status: 'pending'
      })
      .select()
      .single();

    if (shopError) {
      console.error('Failed to create shop:', shopError);
      return res.status(500).json({ message: 'Failed to create shop' });
    }

    // Create default free subscription
    const { error: subscriptionError } = await supabase
      .from('shop_subscriptions')
      .insert({
        shop_id: newShop.id,
        plan: 'free',
        monthly_fee: 0,
        status: 'active'
      });

    if (subscriptionError) {
      console.error('Failed to create subscription:', subscriptionError);
    }

    res.status(201).json({ 
      message: 'Shop registered successfully',
      shop_id: newShop.id 
    });
  } catch (error) {
    console.error('Shop registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login shop
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

module.exports = router;
