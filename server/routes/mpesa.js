const express = require('express');
const axios = require('axios');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ── Daraja API helpers ────────────────────────────────────────────────────────

async function getDarajaToken() {
  const consumerKey    = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  if (!consumerKey || !consumerSecret) throw new Error('M-Pesa credentials not configured');

  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const { data } = await axios.get(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    { headers: { Authorization: `Basic ${credentials}` } }
  );
  return data.access_token;
}

function getMpesaTimestamp() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
    String(d.getSeconds()).padStart(2, '0')
  ].join('');
}

// ── Initiate STK Push ─────────────────────────────────────────────────────────
// POST /api/mpesa/stkpush
// Body: { phone, amount, account_reference, description }
router.post('/stkpush', authenticateToken, async (req, res) => {
  try {
    const shopId = req.user.shop_id;

    // Check feature is enabled for this shop
    const { rows: shopRows } = await db.query(
      'SELECT mpesa_stk_enabled, shop_name FROM shops WHERE id = $1',
      [shopId]
    );
    if (!shopRows.length || !shopRows[0].mpesa_stk_enabled) {
      return res.status(403).json({ message: 'M-Pesa STK Push is not enabled for this shop' });
    }

    const { phone, amount, account_reference, description } = req.body;
    if (!phone || !amount) return res.status(400).json({ message: 'phone and amount are required' });

    // Normalise phone: 0712345678 → 254712345678
    const normPhone = String(phone).replace(/^0/, '254').replace(/^\+/, '');

    const shortcode  = process.env.MPESA_SHORTCODE;
    const passkey    = process.env.MPESA_PASSKEY;
    const callbackUrl = process.env.MPESA_CALLBACK_URL || `${process.env.SERVER_URL || 'https://yourdomain.com'}/api/mpesa/callback`;

    const timestamp  = getMpesaTimestamp();
    const password   = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    const token = await getDarajaToken();

    const baseUrl = process.env.MPESA_ENV === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

    const { data } = await axios.post(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerBuyGoodsOnline',
        Amount: Math.ceil(Number(amount)),
        PartyA: normPhone,
        PartyB: shortcode,
        PhoneNumber: normPhone,
        CallBackURL: callbackUrl,
        AccountReference: account_reference || shopRows[0].shop_name,
        TransactionDesc: description || 'KBA Payment'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Persist pending transaction
    await db.query(
      `INSERT INTO mpesa_transactions (shop_id, checkout_request_id, phone, amount, status)
       VALUES ($1, $2, $3, $4, 'pending')
       ON CONFLICT (checkout_request_id) DO NOTHING`,
      [shopId, data.CheckoutRequestID, normPhone, amount]
    );

    res.json({
      message: 'STK Push sent successfully',
      checkout_request_id: data.CheckoutRequestID,
      customer_message: data.CustomerMessage
    });
  } catch (error) {
    const msg = error.response?.data?.errorMessage || error.message;
    console.error('STK Push error:', msg);
    res.status(500).json({ message: `STK Push failed: ${msg}` });
  }
});

// ── M-Pesa Callback (called by Safaricom) ────────────────────────────────────
// POST /api/mpesa/callback
router.post('/callback', async (req, res) => {
  try {
    const body = req.body?.Body?.stkCallback;
    if (!body) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = body;

    const status = ResultCode === 0 ? 'completed' : 'failed';
    let mpesaRef = null;
    let amount = null;

    if (ResultCode === 0 && CallbackMetadata?.Item) {
      const items = CallbackMetadata.Item;
      mpesaRef = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
      amount   = items.find(i => i.Name === 'Amount')?.Value;
    }

    await db.query(
      `UPDATE mpesa_transactions
       SET status = $1, mpesa_reference = $2, amount = COALESCE($3, amount), completed_at = NOW()
       WHERE checkout_request_id = $4`,
      [status, mpesaRef || null, amount || null, CheckoutRequestID]
    );

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    console.error('M-Pesa callback error:', error);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' }); // Always return 0 to Safaricom
  }
});

// ── Query transaction status ─────────────────────────────────────────────────
// GET /api/mpesa/status/:checkoutRequestId
router.get('/status/:checkoutRequestId', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM mpesa_transactions WHERE checkout_request_id = $1 AND shop_id = $2',
      [req.params.checkoutRequestId, req.user.shop_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Transaction not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Transaction status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Transaction history for shop ─────────────────────────────────────────────
// GET /api/mpesa/transactions
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const { rows } = await db.query(
      `SELECT * FROM mpesa_transactions WHERE shop_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.shop_id, limit, offset]
    );
    const { rows: countRows } = await db.query(
      'SELECT COUNT(*) FROM mpesa_transactions WHERE shop_id = $1',
      [req.user.shop_id]
    );
    res.json({ transactions: rows, total: parseInt(countRows[0].count), page: Number(page) });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
