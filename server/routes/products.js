const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const PLAN_PRODUCT_LIMITS = { free: 20, basic: 100, premium: Infinity };

// Helper: get sizes as comma-string "size:in_stock:quantity,..."
const sizesToString = (sizes) =>
  sizes.map(s => `${s.size}:${s.in_stock ? '1' : '0'}:${s.quantity || 0}`).join(',');

// Helper: check product limit for a shop
async function checkProductLimit(shopId) {
  const { rows: subRows } = await db.query('SELECT plan FROM shop_subscriptions WHERE shop_id = $1', [shopId]);
  const plan = subRows[0]?.plan || 'free';
  const limit = PLAN_PRODUCT_LIMITS[plan] ?? 20;
  if (isFinite(limit)) {
    const { rows } = await db.query('SELECT COUNT(*) FROM products WHERE shop_id = $1', [shopId]);
    const count = parseInt(rows[0].count);
    if (count >= limit) return { exceeded: true, plan, limit };
  }
  return { exceeded: false };
}

// Public product search
router.get('/search', async (req, res) => {
  try {
    const { query, category, minPrice, maxPrice } = req.query;
    const conditions = ["s.status != 'closed'"];
    const values = [];
    let idx = 1;

    if (query) {
      conditions.push(`(p.name ILIKE $${idx} OR p.description ILIKE $${idx})`);
      values.push(`%${query}%`); idx++;
    }
    if (category) { conditions.push(`p.category = $${idx++}`); values.push(category); }
    if (minPrice)  { conditions.push(`p.price >= $${idx++}`);   values.push(minPrice); }
    if (maxPrice)  { conditions.push(`p.price <= $${idx++}`);   values.push(maxPrice); }

    const { rows } = await db.query(
      `SELECT p.*, s.shop_number, s.shop_name, s.contact, s.till_number, s.payment_provider, s.payment_notes,
         COALESCE(json_agg(json_build_object('size', ps.size, 'in_stock', ps.in_stock))
           FILTER (WHERE ps.id IS NOT NULL), '[]') AS product_sizes
       FROM products p
       JOIN shops s ON p.shop_id = s.id
       LEFT JOIN product_sizes ps ON p.id = ps.product_id
       WHERE ${conditions.join(' AND ')}
       GROUP BY p.id, s.shop_number, s.shop_name, s.contact, s.till_number, s.payment_provider, s.payment_notes
       ORDER BY p.created_at DESC`,
      values
    );

    const data = rows.map(p => ({
      ...p,
      sizes: p.product_sizes.map(s => `${s.size}:${s.in_stock ? '1' : '0'}`).join(',')
    }));
    res.json(data);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Get shop's own products (authenticated)
router.get('/my-products', authenticateToken, async (req, res) => {
  try {
    const { rows: shopCheck } = await db.query('SELECT id FROM shops WHERE id = $1', [req.user.shop_id]);
    if (shopCheck.length === 0) return res.status(401).json({ message: 'Invalid shop. Please log in again.', code: 'INVALID_SHOP' });

    const { rows } = await db.query(
      `SELECT p.*,
         COALESCE(json_agg(json_build_object('size', ps.size, 'in_stock', ps.in_stock, 'quantity', ps.quantity))
           FILTER (WHERE ps.id IS NOT NULL), '[]') AS product_sizes
       FROM products p
       LEFT JOIN product_sizes ps ON p.id = ps.product_id
       WHERE p.shop_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [req.user.shop_id]
    );

    res.json(rows.map(p => ({ ...p, sizes: sizesToString(p.product_sizes) })));
  } catch (error) {
    console.error('My products error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Search shop's own products (authenticated)
router.get('/my-products/search', authenticateToken, async (req, res) => {
  try {
    const { query, category, minPrice, maxPrice } = req.query;
    const conditions = ['p.shop_id = $1'];
    const values = [req.user.shop_id];
    let idx = 2;

    if (query)    { conditions.push(`(p.name ILIKE $${idx} OR p.description ILIKE $${idx})`); values.push(`%${query}%`); idx++; }
    if (category) { conditions.push(`p.category = $${idx++}`); values.push(category); }
    if (minPrice) { conditions.push(`p.price >= $${idx++}`);   values.push(minPrice); }
    if (maxPrice) { conditions.push(`p.price <= $${idx++}`);   values.push(maxPrice); }

    const { rows } = await db.query(
      `SELECT p.*,
         COALESCE(json_agg(json_build_object('size', ps.size, 'in_stock', ps.in_stock, 'quantity', ps.quantity))
           FILTER (WHERE ps.id IS NOT NULL), '[]') AS product_sizes
       FROM products p
       LEFT JOIN product_sizes ps ON p.id = ps.product_id
       WHERE ${conditions.join(' AND ')}
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      values
    );

    res.json(rows.map(p => ({ ...p, sizes: sizesToString(p.product_sizes) })));
  } catch (error) {
    console.error('Shop products search error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Add new product (authenticated)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, price, image_url, public_id, category, sizes } = req.body;
    const shopId = req.user.shop_id;

    if (req.user.role === 'staff') return res.status(403).json({ message: 'Staff cannot add products' });

    const { rows: shopRows } = await db.query('SELECT id, status FROM shops WHERE id = $1', [shopId]);
    if (shopRows.length === 0) return res.status(401).json({ message: 'Invalid shop.', code: 'INVALID_SHOP' });
    const shop = shopRows[0];
    if (shop.status === 'closed')   return res.status(403).json({ message: 'Your shop is currently closed.', code: 'SHOP_CLOSED' });
    if (shop.status === 'pending')  return res.status(403).json({ message: 'Your shop is pending approval.', code: 'SHOP_PENDING' });

    const limitCheck = await checkProductLimit(shopId);
    if (limitCheck.exceeded) {
      return res.status(403).json({
        message: `Product limit reached. Your ${limitCheck.plan} plan allows ${limitCheck.limit} products. Upgrade to add more.`,
        code: 'PRODUCT_LIMIT_REACHED', limit: limitCheck.limit, plan: limitCheck.plan
      });
    }

    const { rows } = await db.query(
      `INSERT INTO products (shop_id, name, description, price, image_url, public_id, category)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [shopId, name, description, price, image_url, public_id, category || 'shoes']
    );
    const productId = rows[0].id;

    if (sizes && sizes.length > 0) {
      for (const s of sizes.filter(s => s.size?.trim())) {
        await db.query(
          'INSERT INTO product_sizes (product_id, size, in_stock, quantity) VALUES ($1,$2,$3,$4)',
          [productId, s.size, s.in_stock !== undefined ? s.in_stock : true, s.quantity || 0]
        );
      }
    }

    res.json({ message: 'Product created successfully', product_id: productId });
  } catch (error) {
    console.error('Product creation error:', error);
    res.status(500).json({ message: 'Failed to create product' });
  }
});

// Bulk import products from CSV (authenticated)
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { products: rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ message: 'No products provided' });
    if (req.user.role === 'staff') return res.status(403).json({ message: 'Staff cannot import products' });

    const shopId = req.user.shop_id;
    const limitCheck = await checkProductLimit(shopId);

    const { rows: countRows } = await db.query('SELECT COUNT(*) FROM products WHERE shop_id = $1', [shopId]);
    const currentCount = parseInt(countRows[0].count);
    const limit = PLAN_PRODUCT_LIMITS[limitCheck.plan ?? 'free'] ?? 20;
    const slotsLeft = isFinite(limit) ? limit - currentCount : rows.length;

    if (slotsLeft <= 0) {
      return res.status(403).json({ message: `Product limit reached.`, code: 'PRODUCT_LIMIT_REACHED', imported: 0, skipped: rows.length });
    }

    const toImport = rows.slice(0, slotsLeft);
    let imported = 0;
    const errors = [];

    for (const row of toImport) {
      try {
        const { rows: pr } = await db.query(
          `INSERT INTO products (shop_id, name, description, price, image_url, category)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [shopId, row.name, row.description || '', parseFloat(row.price) || 0, row.image_url || '', row.category || 'shoes']
        );
        const productId = pr[0].id;
        if (row.sizes && String(row.sizes).trim()) {
          const sizeList = String(row.sizes).split(',').map(s => s.trim()).filter(Boolean);
          for (const s of sizeList) {
            await db.query(
              'INSERT INTO product_sizes (product_id, size, in_stock, quantity) VALUES ($1,$2,true,0)',
              [productId, s]
            );
          }
        }
        imported++;
      } catch { errors.push(row.name); }
    }

    res.json({ message: 'Import complete', imported, skipped: (rows.length - toImport.length) + errors.length, errors });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ message: 'Import failed' });
  }
});

// Update product (authenticated)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'staff') return res.status(403).json({ message: 'Staff cannot edit products' });
    const { name, description, price, image_url, public_id, category, sizes } = req.body;
    const productId = req.params.id;

    const { rows } = await db.query(
      `UPDATE products SET name=$1, description=$2, price=$3, image_url=$4, public_id=$5, category=$6
       WHERE id=$7 AND shop_id=$8 RETURNING id`,
      [name, description, price, image_url, public_id, category, productId, req.user.shop_id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Product not found or not authorized' });

    if (sizes && sizes.length > 0) {
      await db.query('DELETE FROM product_sizes WHERE product_id = $1', [productId]);
      for (const s of sizes.filter(s => s.size?.trim())) {
        await db.query(
          'INSERT INTO product_sizes (product_id, size, in_stock, quantity) VALUES ($1,$2,$3,$4)',
          [productId, s.size, s.in_stock !== undefined ? s.in_stock : true, s.quantity || 0]
        );
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
    await db.query(
      'UPDATE product_sizes SET in_stock = $1 WHERE product_id = $2 AND size = $3',
      [req.body.in_stock, req.params.id, req.params.size]
    );
    res.json({ message: 'Size updated successfully' });
  } catch (error) {
    console.error('Size update error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Delete product (authenticated)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'staff') return res.status(403).json({ message: 'Staff cannot delete products' });
    const { rows } = await db.query(
      'DELETE FROM products WHERE id = $1 AND shop_id = $2 RETURNING id',
      [req.params.id, req.user.shop_id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Product not found or not authorized' });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Product delete error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Debug token
router.get('/debug/token', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, shop_number, shop_name, status FROM shops WHERE id = $1', [req.user.shop_id]);
    if (rows.length === 0) return res.status(401).json({ valid: false, message: 'Invalid shop', shop_id: req.user.shop_id });
    res.json({ valid: true, shop: rows[0], token_info: { shop_id: req.user.shop_id, shop_number: req.user.shop_number } });
  } catch (error) {
    res.status(500).json({ valid: false, message: 'Token validation error', error: error.message });
  }
});

module.exports = router;
