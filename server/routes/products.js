const express = require('express');
const supabase = require('../database-adapter');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all products (public search)
router.get('/search', async (req, res) => {
  try {
    const { query, category, minPrice, maxPrice } = req.query;
    
    // Build the query using Supabase
    let supabaseQuery = supabase
      .from('products')
      .select(`
        *,
        shops!inner(shop_number, shop_name, contact, status),
        product_sizes(size, in_stock)
      `)
      .neq('shops.status', 'closed');
    
    if (query) {
      supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    }
    
    if (category) {
      supabaseQuery = supabaseQuery.eq('category', category);
    }
    
    if (minPrice) {
      supabaseQuery = supabaseQuery.gte('price', minPrice);
    }
    
    if (maxPrice) {
      supabaseQuery = supabaseQuery.lte('price', maxPrice);
    }
    
    supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
    
    const { data, error } = await supabaseQuery;
    
    if (error) {
      console.error('Search error:', error);
      return res.status(500).json({ message: 'Database error' });
    }
    
    // Transform the data to match the expected format
    const transformedData = data.map(product => ({
      ...product,
      shop_number: product.shops.shop_number,
      shop_name: product.shops.shop_name,
      contact: product.shops.contact,
      sizes: product.product_sizes.map(ps => `${ps.size}:${ps.in_stock ? '1' : '0'}`).join(',')
    }));
    
    res.json(transformedData);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Get shop's products (authenticated)
router.get('/my-products', authenticateToken, async (req, res) => {
  try {
    // First, verify the shop exists
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id, shop_number, status')
      .eq('id', req.user.shop_id)
      .single();
    
    if (shopError || !shop) {
      console.error(`Shop not found: ${req.user.shop_id} (${req.user.shop_number || 'unknown'}) - IP: ${req.ip || 'unknown'}`);
      return res.status(401).json({ 
        message: 'Invalid shop. Please log in again.',
        code: 'INVALID_SHOP',
        details: 'Your session has expired or shop no longer exists'
      });
    }
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_sizes(size, in_stock, quantity)
      `)
      .eq('shop_id', req.user.shop_id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('My products error:', error);
      return res.status(500).json({ message: 'Database error' });
    }
    
    // Transform the data to match the expected format
    const transformedData = data.map(product => ({
      ...product,
      sizes: product.product_sizes.map(ps => `${ps.size}:${ps.in_stock ? '1' : '0'}:${ps.quantity || 0}`).join(',')
    }));
    
    res.json(transformedData);
  } catch (error) {
    console.error('My products error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Add new product (authenticated)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, price, image_url, public_id, category, sizes } = req.body;
    
    // First, verify the shop exists
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id, shop_number, status')
      .eq('id', req.user.shop_id)
      .single();
    
    if (shopError || !shop) {
      console.error(`Shop not found: ${req.user.shop_id} (${req.user.shop_number || 'unknown'}) - IP: ${req.ip || 'unknown'}`);
      return res.status(401).json({ 
        message: 'Invalid shop. Please log in again.',
        code: 'INVALID_SHOP',
        details: 'Your session has expired or shop no longer exists'
      });
    }
    
    if (shop.status === 'closed') {
      return res.status(403).json({ 
        message: 'Your shop is currently closed. Please contact admin.',
        code: 'SHOP_CLOSED'
      });
    }
    
    if (shop.status === 'pending') {
      return res.status(403).json({ 
        message: 'Your shop is pending approval. Please wait for admin approval before adding products.',
        code: 'SHOP_PENDING'
      });
    }
    
    // Create the product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        shop_id: req.user.shop_id,
        name,
        description,
        price,
        image_url,
        public_id,
        category: category || 'shoes'
      })
      .select()
      .single();
    
    if (productError) {
      console.error('Product creation error:', productError);
      return res.status(500).json({ message: 'Failed to create product' });
    }
    
    // Add sizes if provided
    if (sizes && sizes.length > 0) {
      const sizeData = sizes.map(size => ({
        product_id: product.id,
        size: size.size,
        in_stock: size.in_stock !== undefined ? size.in_stock : true,
        quantity: size.quantity || 0
      }));
      
      const { error: sizesError } = await supabase
        .from('product_sizes')
        .insert(sizeData);
      
      if (sizesError) {
        console.error('Sizes creation error:', sizesError);
        return res.status(500).json({ message: 'Failed to add sizes' });
      }
    }
    
    res.json({ message: 'Product created successfully', product_id: product.id });
  } catch (error) {
    console.error('Product creation error:', error);
    res.status(500).json({ message: 'Failed to create product' });
  }
});

// Update product (authenticated)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, price, image_url, public_id, category, sizes } = req.body;
    const productId = req.params.id;
    
    // Update the product
    const { data, error: updateError } = await supabase
      .from('products')
      .update({
        name,
        description,
        price,
        image_url,
        public_id,
        category
      })
      .eq('id', productId)
      .eq('shop_id', req.user.shop_id)
      .select();
    
    if (updateError) {
      console.error('Product update error:', updateError);
      return res.status(500).json({ message: 'Database error' });
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Product not found or not authorized' });
    }
    
    // Update sizes if provided
    if (sizes && sizes.length > 0) {
      // First, delete existing sizes
      const { error: deleteError } = await supabase
        .from('product_sizes')
        .delete()
        .eq('product_id', productId);
      
      if (deleteError) {
        console.error('Sizes delete error:', deleteError);
        return res.status(500).json({ message: 'Failed to update sizes' });
      }
      
      // Insert new sizes
      const sizeData = sizes.map(size => ({
        product_id: productId,
        size: size.size,
        in_stock: size.in_stock !== undefined ? size.in_stock : true,
        quantity: size.quantity || 0
      }));
      
      const { error: sizesError } = await supabase
        .from('product_sizes')
        .insert(sizeData);
      
      if (sizesError) {
        console.error('Sizes update error:', sizesError);
        return res.status(500).json({ message: 'Failed to update sizes' });
      }
    }
    
    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Product update error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Update product size stock (authenticated)
router.put('/:id/sizes/:size', authenticateToken, async (req, res) => {
  try {
    const productId = req.params.id;
    const size = req.params.size;
    const { in_stock } = req.body;
    
    const { error } = await supabase
      .from('product_sizes')
      .update({ in_stock })
      .eq('product_id', productId)
      .eq('size', size);
    
    if (error) {
      console.error('Size update error:', error);
      return res.status(500).json({ message: 'Database error' });
    }
    
    res.json({ message: 'Size updated successfully' });
  } catch (error) {
    console.error('Size update error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Delete product (authenticated)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const productId = req.params.id;
    
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('shop_id', req.user.shop_id)
      .select();
    
    if (error) {
      console.error('Product delete error:', error);
      return res.status(500).json({ message: 'Database error' });
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Product not found or not authorized' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Product delete error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Debug endpoint to check token validity
router.get('/debug/token', authenticateToken, async (req, res) => {
  try {
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id, shop_number, shop_name, status')
      .eq('id', req.user.shop_id)
      .single();
    
    if (shopError || !shop) {
      return res.status(401).json({
        valid: false,
        message: 'Invalid shop',
        shop_id: req.user.shop_id,
        shop_number: req.user.shop_number,
        error: shopError?.message
      });
    }
    
    res.json({
      valid: true,
      shop: {
        id: shop.id,
        shop_number: shop.shop_number,
        shop_name: shop.shop_name,
        status: shop.status
      },
      token_info: {
        shop_id: req.user.shop_id,
        shop_number: req.user.shop_number,
        iat: req.user.iat,
        exp: req.user.exp
      }
    });
  } catch (error) {
    res.status(500).json({
      valid: false,
      message: 'Token validation error',
      error: error.message
    });
  }
});

// Search shop's own products (authenticated)
router.get('/my-products/search', authenticateToken, async (req, res) => {
  try {
    const { query, category, minPrice, maxPrice } = req.query;
    
    // First, verify the shop exists
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id, shop_number, status')
      .eq('id', req.user.shop_id)
      .single();
    
    if (shopError || !shop) {
      console.error(`Shop not found: ${req.user.shop_id} (${req.user.shop_number || 'unknown'}) - IP: ${req.ip || 'unknown'}`);
      return res.status(401).json({ 
        message: 'Invalid shop. Please log in again.',
        code: 'INVALID_SHOP',
        details: 'Your session has expired or shop no longer exists'
      });
    }
    
    // Build search query for shop's products
    let supabaseQuery = supabase
      .from('products')
      .select(`
        *,
        product_sizes(size, in_stock, quantity)
      `)
      .eq('shop_id', req.user.shop_id);
    
    if (query) {
      supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    }
    
    if (category) {
      supabaseQuery = supabaseQuery.eq('category', category);
    }
    
    if (minPrice) {
      supabaseQuery = supabaseQuery.gte('price', minPrice);
    }
    
    if (maxPrice) {
      supabaseQuery = supabaseQuery.lte('price', maxPrice);
    }
    
    supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
    
    const { data, error } = await supabaseQuery;
    
    if (error) {
      console.error('Shop products search error:', error);
      return res.status(500).json({ message: 'Database error' });
    }
    
    // Transform the data to match the expected format
    const transformedData = data.map(product => ({
      ...product,
      sizes: product.product_sizes.map(ps => `${ps.size}:${ps.in_stock ? '1' : '0'}:${ps.quantity || 0}`).join(',')
    }));
    
    res.json(transformedData);
  } catch (error) {
    console.error('Shop products search error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

module.exports = router;
