const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all credit sales for shop
router.get('/', authenticateToken, async (req, res) => {
  try {
    const shopId = req.user.shop_id;
    const { status } = req.query;

    let sql = `
      SELECT cs.*,
        COALESCE(json_agg(json_build_object(
          'id', cp.id, 'amount', cp.amount, 'payment_method', cp.payment_method,
          'payment_reference', cp.payment_reference, 'created_at', cp.created_at
        )) FILTER (WHERE cp.id IS NOT NULL), '[]') AS credit_payments
      FROM credit_sales cs
      LEFT JOIN credit_payments cp ON cs.id = cp.credit_sale_id
      WHERE cs.shop_id = $1`;
    const values = [shopId];

    if (status) { sql += ` AND cs.status = $2`; values.push(status); }
    sql += ' GROUP BY cs.id ORDER BY cs.created_at DESC';

    const { rows } = await db.query(sql, values);
    res.json(rows);
  } catch (error) {
    console.error('Credits fetch error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Create a credit sale
router.post('/', authenticateToken, async (req, res) => {
  try {
    const shopId = req.user.shop_id;
    const { customer_name, customer_phone, items, total, amount_paid = 0, notes } = req.body;

    if (!customer_name || !items || !total) {
      return res.status(400).json({ message: 'customer_name, items, and total are required' });
    }

    const totalNum = parseFloat(total);
    const paidNum = parseFloat(amount_paid);
    const balance = Math.max(0, totalNum - paidNum);
    const status = balance <= 0 ? 'cleared' : paidNum > 0 ? 'partial' : 'outstanding';

    const { rows } = await db.query(
      `INSERT INTO credit_sales (shop_id, customer_name, customer_phone, items, total, amount_paid, balance, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [shopId, customer_name.trim(), customer_phone?.trim() || null,
       typeof items === 'string' ? items : JSON.stringify(items),
       totalNum, paidNum, balance, status, notes || null]
    );
    const sale = rows[0];

    if (paidNum > 0) {
      await db.query(
        `INSERT INTO credit_payments (credit_sale_id, amount, payment_method, notes) VALUES ($1,$2,'cash','Initial payment at time of sale')`,
        [sale.id, paidNum]
      );
    }

    res.status(201).json({ message: 'Credit sale created', credit_sale: sale });
  } catch (error) {
    console.error('Credit sale error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Record a payment on a credit sale
router.post('/:id/payment', authenticateToken, async (req, res) => {
  try {
    const shopId = req.user.shop_id;
    const creditSaleId = req.params.id;
    const { amount, payment_method = 'cash', payment_reference, notes } = req.body;

    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ message: 'Valid payment amount required' });

    const { rows: saleRows } = await db.query(
      'SELECT * FROM credit_sales WHERE id = $1 AND shop_id = $2',
      [creditSaleId, shopId]
    );
    if (saleRows.length === 0) return res.status(404).json({ message: 'Credit sale not found' });
    const sale = saleRows[0];

    const paymentAmount = parseFloat(amount);
    const newAmountPaid = parseFloat(sale.amount_paid) + paymentAmount;
    const newBalance = Math.max(0, parseFloat(sale.total) - newAmountPaid);
    const newStatus = newBalance <= 0 ? 'cleared' : 'partial';

    await db.query(
      `INSERT INTO credit_payments (credit_sale_id, amount, payment_method, payment_reference, notes)
       VALUES ($1,$2,$3,$4,$5)`,
      [creditSaleId, paymentAmount, payment_method, payment_reference || null, notes || null]
    );

    await db.query(
      'UPDATE credit_sales SET amount_paid = $1, balance = $2, status = $3, updated_at = NOW() WHERE id = $4',
      [newAmountPaid, newBalance, newStatus, creditSaleId]
    );

    res.json({ message: 'Payment recorded', balance: newBalance, status: newStatus });
  } catch (error) {
    console.error('Credit payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a credit sale
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM credit_sales WHERE id = $1 AND shop_id = $2 RETURNING id',
      [req.params.id, req.user.shop_id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Credit sale not found' });
    res.json({ message: 'Credit sale deleted' });
  } catch (error) {
    console.error('Credit delete error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
