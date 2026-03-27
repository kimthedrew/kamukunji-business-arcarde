import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/axiosConfig';
import './CreditTracker.css';

interface CreditPayment {
  id: number;
  amount: number;
  payment_method: string;
  payment_reference?: string;
  created_at: string;
}

interface CreditSale {
  id: number;
  customer_name: string;
  customer_phone?: string;
  items: string;
  total: number;
  amount_paid: number;
  balance: number;
  status: 'outstanding' | 'partial' | 'cleared';
  notes?: string;
  created_at: string;
  credit_payments?: CreditPayment[];
}

const CreditTracker: React.FC = () => {
  const [sales, setSales] = useState<CreditSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'outstanding' | 'partial' | 'cleared'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [paymentModal, setPaymentModal] = useState<CreditSale | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [newSale, setNewSale] = useState({
    customer_name: '',
    customer_phone: '',
    description: '',
    total: '',
    amount_paid: '',
    notes: ''
  });

  const loadSales = useCallback(async () => {
    try {
      const res = await api.get('/credits');
      setSales(res.data);
    } catch {
      console.error('Failed to load credit sales');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSales(); }, [loadSales]);

  const filteredSales = filter === 'all' ? sales : sales.filter(s => s.status === filter);

  const totalOutstanding = sales
    .filter(s => s.status !== 'cleared')
    .reduce((sum, s) => sum + s.balance, 0);

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const items = [{ description: newSale.description, amount: parseFloat(newSale.total) }];
      await api.post('/credits', {
        customer_name: newSale.customer_name,
        customer_phone: newSale.customer_phone || undefined,
        items,
        total: parseFloat(newSale.total),
        amount_paid: parseFloat(newSale.amount_paid) || 0,
        notes: newSale.notes || undefined
      });
      setNewSale({ customer_name: '', customer_phone: '', description: '', total: '', amount_paid: '', notes: '' });
      setShowAddForm(false);
      loadSales();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create credit sale');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal) return;
    setSubmitting(true);
    try {
      await api.post(`/credits/${paymentModal.id}/payment`, {
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        payment_reference: paymentRef || undefined
      });
      setPaymentModal(null);
      setPaymentAmount('');
      setPaymentMethod('cash');
      setPaymentRef('');
      loadSales();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this credit record?')) return;
    try {
      await api.delete(`/credits/${id}`);
      loadSales();
    } catch {
      alert('Failed to delete');
    }
  };

  const buildWhatsAppReminder = (sale: CreditSale) => {
    const lines = [
      `Hello ${sale.customer_name},`,
      '',
      `This is a payment reminder from our shop.`,
      `Outstanding balance: *KSh ${sale.balance.toLocaleString()}*`,
      `Total credit: KSh ${sale.total.toLocaleString()}`,
      `Already paid: KSh ${sale.amount_paid.toLocaleString()}`,
      '',
      'Please settle at your earliest convenience. Thank you!'
    ].join('\n');
    return encodeURIComponent(lines);
  };

  const statusLabel = (s: CreditSale['status']) => ({
    outstanding: 'Outstanding',
    partial: 'Partial',
    cleared: 'Cleared'
  }[s]);

  if (loading) return <div className="credit-loading">Loading credit records...</div>;

  return (
    <div className="credit-tracker">
      {/* Summary bar */}
      <div className="credit-summary">
        <div className="credit-summary-item">
          <p className="cs-label">Total Outstanding</p>
          <p className="cs-value danger">KSh {totalOutstanding.toLocaleString()}</p>
        </div>
        <div className="credit-summary-item">
          <p className="cs-label">Open Records</p>
          <p className="cs-value">{sales.filter(s => s.status !== 'cleared').length}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
          + New Credit Sale
        </button>
      </div>

      {/* Filter */}
      <div className="credit-filters">
        {(['all', 'outstanding', 'partial', 'cleared'] as const).map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Credit sale list */}
      {filteredSales.length === 0 ? (
        <div className="credit-empty">No credit records found.</div>
      ) : (
        <div className="credit-list">
          {filteredSales.map(sale => (
            <div key={sale.id} className={`credit-card status-${sale.status}`}>
              <div className="credit-card-header" onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}>
                <div className="credit-customer">
                  <p className="credit-name">{sale.customer_name}</p>
                  {sale.customer_phone && (
                    <p className="credit-phone">{sale.customer_phone}</p>
                  )}
                </div>
                <div className="credit-amounts">
                  <p className="credit-balance">KSh {sale.balance.toLocaleString()}</p>
                  <span className={`credit-status-badge ${sale.status}`}>{statusLabel(sale.status)}</span>
                </div>
              </div>

              {expandedId === sale.id && (
                <div className="credit-card-body">
                  <div className="credit-detail-row">
                    <span>Total:</span><span>KSh {sale.total.toLocaleString()}</span>
                  </div>
                  <div className="credit-detail-row">
                    <span>Paid:</span><span>KSh {sale.amount_paid.toLocaleString()}</span>
                  </div>
                  <div className="credit-detail-row">
                    <span>Balance:</span><strong>KSh {sale.balance.toLocaleString()}</strong>
                  </div>
                  {sale.notes && (
                    <div className="credit-notes">{sale.notes}</div>
                  )}

                  {sale.credit_payments && sale.credit_payments.length > 0 && (
                    <div className="payment-history">
                      <p className="ph-title">Payment History</p>
                      {sale.credit_payments.map(p => (
                        <div key={p.id} className="ph-row">
                          <span>{new Date(p.created_at).toLocaleDateString('en-KE')}</span>
                          <span>{p.payment_method}</span>
                          <span>KSh {p.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="credit-actions">
                    {sale.status !== 'cleared' && (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => { setPaymentModal(sale); setPaymentAmount(String(sale.balance)); }}
                        >
                          Record Payment
                        </button>
                        {sale.customer_phone && (
                          <a
                            href={`https://wa.me/${sale.customer_phone.replace(/\D/g, '')}?text=${buildWhatsAppReminder(sale)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline btn-sm"
                          >
                            WhatsApp Reminder
                          </a>
                        )}
                      </>
                    )}
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(sale.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Credit Sale Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Credit Sale</h2>
              <button className="close-btn" onClick={() => setShowAddForm(false)}>×</button>
            </div>
            <form onSubmit={handleAddSale} className="credit-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Customer Name *</label>
                  <input type="text" className="form-input" value={newSale.customer_name}
                    onChange={e => setNewSale(p => ({ ...p, customer_name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone (for WhatsApp)</label>
                  <input type="tel" className="form-input" value={newSale.customer_phone}
                    onChange={e => setNewSale(p => ({ ...p, customer_phone: e.target.value }))}
                    placeholder="e.g., 0712345678" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description / Items *</label>
                <input type="text" className="form-input" value={newSale.description}
                  onChange={e => setNewSale(p => ({ ...p, description: e.target.value }))}
                  placeholder="e.g., 2 pairs Nike Air Max size 42" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Total Amount (KSh) *</label>
                  <input type="number" className="form-input" value={newSale.total}
                    onChange={e => setNewSale(p => ({ ...p, total: e.target.value }))}
                    min="1" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Initial Payment (KSh)</label>
                  <input type="number" className="form-input" value={newSale.amount_paid}
                    onChange={e => setNewSale(p => ({ ...p, amount_paid: e.target.value }))}
                    min="0" placeholder="0" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <input type="text" className="form-input" value={newSale.notes}
                  onChange={e => setNewSale(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Any notes about this credit" />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Record Credit Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentModal && (
        <div className="modal-overlay" onClick={() => setPaymentModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Record Payment — {paymentModal.customer_name}</h2>
              <button className="close-btn" onClick={() => setPaymentModal(null)}>×</button>
            </div>
            <form onSubmit={handleRecordPayment} className="credit-form">
              <p className="payment-balance-info">
                Balance: <strong>KSh {paymentModal.balance.toLocaleString()}</strong>
              </p>
              <div className="form-group">
                <label className="form-label">Amount Received (KSh) *</label>
                <input type="number" className="form-input" value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)} min="1" required />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <div className="pay-method-row">
                  {['cash', 'mpesa', 'bank_transfer'].map(m => (
                    <button key={m} type="button"
                      className={`payment-btn ${paymentMethod === m ? 'active' : ''}`}
                      onClick={() => setPaymentMethod(m)}>
                      {m === 'cash' ? 'Cash' : m === 'mpesa' ? 'M-Pesa' : 'Bank'}
                    </button>
                  ))}
                </div>
              </div>
              {paymentMethod !== 'cash' && (
                <div className="form-group">
                  <label className="form-label">Reference / Transaction ID</label>
                  <input type="text" className="form-input" value={paymentRef}
                    onChange={e => setPaymentRef(e.target.value)} placeholder="Optional" />
                </div>
              )}
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setPaymentModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditTracker;
