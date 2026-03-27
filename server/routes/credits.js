const express = require('express');
const supabase = require('../database-adapter');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all credit sales for shop
router.get('/', authenticateToken, async (req, res) => {
  try {
    const shopId = req.user.shop_id;
    const { status } = req.query;

    let query = supabase
      .from('credit_sales')
      .select('*, credit_payments(id, amount, payment_method, payment_reference, created_at)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) {
      console.error('Credits fetch error:', error);
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Credits error:', error);
    res.status(500).json({ message: 'Server error' });
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

    const { data, error } = await supabase
      .from('credit_sales')
      .insert({
        shop_id: shopId,
        customer_name: customer_name.trim(),
        customer_phone: customer_phone?.trim() || null,
        items: typeof items === 'string' ? items : JSON.stringify(items),
        total: totalNum,
        amount_paid: paidNum,
        balance,
        status,
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      console.error('Credit sale create error:', error);
      return res.status(500).json({ message: 'Failed to create credit sale' });
    }

    // Record initial payment if any
    if (paidNum > 0) {
      await supabase.from('credit_payments').insert({
        credit_sale_id: data.id,
        amount: paidNum,
        payment_method: 'cash',
        notes: 'Initial payment at time of sale'
      });
    }

    res.status(201).json({ message: 'Credit sale created', credit_sale: data });
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

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Valid payment amount required' });
    }

    const { data: sale, error: fetchError } = await supabase
      .from('credit_sales')
      .select('*')
      .eq('id', creditSaleId)
      .eq('shop_id', shopId)
      .single();

    if (fetchError || !sale) {
      return res.status(404).json({ message: 'Credit sale not found' });
    }

    const paymentAmount = parseFloat(amount);
    const newAmountPaid = parseFloat(sale.amount_paid) + paymentAmount;
    const newBalance = Math.max(0, parseFloat(sale.total) - newAmountPaid);
    const newStatus = newBalance <= 0 ? 'cleared' : 'partial';

    // Record payment
    await supabase.from('credit_payments').insert({
      credit_sale_id: creditSaleId,
      amount: paymentAmount,
      payment_method,
      payment_reference: payment_reference || null,
      notes: notes || null
    });

    // Update credit sale
    const { error: updateError } = await supabase
      .from('credit_sales')
      .update({
        amount_paid: newAmountPaid,
        balance: newBalance,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', creditSaleId);

    if (updateError) {
      console.error('Credit sale update error:', updateError);
      return res.status(500).json({ message: 'Failed to update credit sale' });
    }

    res.json({ message: 'Payment recorded', balance: newBalance, status: newStatus });
  } catch (error) {
    console.error('Credit payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a credit sale
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const shopId = req.user.shop_id;
    const creditSaleId = req.params.id;

    const { data, error } = await supabase
      .from('credit_sales')
      .delete()
      .eq('id', creditSaleId)
      .eq('shop_id', shopId)
      .select();

    if (error) return res.status(500).json({ message: 'Database error' });
    if (!data || data.length === 0) return res.status(404).json({ message: 'Credit sale not found' });

    res.json({ message: 'Credit sale deleted' });
  } catch (error) {
    console.error('Credit delete error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
