import React, { useState } from 'react';
import './ShopList.css';

interface Shop {
  id: number;
  shop_number: string;
  shop_name: string;
  contact: string;
  email: string;
  status: string;
  created_at: string;
  plan?: string;
  subscription_status?: string;
  monthly_fee?: number;
  subscription_end_date?: string;
  pos_enabled?: boolean;
  credit_enabled?: boolean;
  is_featured?: boolean;
  mpesa_stk_enabled?: boolean;
  avg_rating?: number;
  review_count?: number;
}

interface ShopListProps {
  shops: Shop[];
  onStatusUpdate: (shopId: number, status: string) => void;
  onSubscriptionUpdate: (shopId: number, plan: string, monthlyFee: number, endDate: string) => void;
  onFeaturesUpdate: (shopId: number, features: { pos_enabled?: boolean; credit_enabled?: boolean; is_featured?: boolean }) => void;
}

const ShopList: React.FC<ShopListProps> = ({ shops, onStatusUpdate, onSubscriptionUpdate, onFeaturesUpdate }) => {
  const [editingShop, setEditingShop] = useState<number | null>(null);
  const [subscriptionData, setSubscriptionData] = useState({
    plan: 'free',
    monthly_fee: 0,
    end_date: ''
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'status-active';
      case 'pending': return 'status-pending';
      case 'suspended': return 'status-suspended';
      case 'closed': return 'status-closed';
      default: return 'status-pending';
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });

  const handleSubscriptionEdit = (shop: Shop) => {
    setEditingShop(shop.id);
    setSubscriptionData({
      plan: shop.plan || 'free',
      monthly_fee: shop.monthly_fee || 0,
      end_date: shop.subscription_end_date ? shop.subscription_end_date.split('T')[0] : ''
    });
  };

  const handleSubscriptionSave = (shopId: number) => {
    onSubscriptionUpdate(shopId, subscriptionData.plan, subscriptionData.monthly_fee, subscriptionData.end_date);
    setEditingShop(null);
  };

  if (shops.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🏪</div>
        <h3>No shops registered yet</h3>
        <p>Shops will appear here once they register</p>
      </div>
    );
  }

  return (
    <div className="shop-list">
      <div className="shops-grid">
        {shops.map((shop) => (
          <div key={shop.id} className="shop-card">
            <div className="shop-header">
              <div className="shop-info">
                <h3 className="shop-name">
                  {shop.is_featured && <span className="featured-star" title="Featured">★ </span>}
                  {shop.shop_name}
                </h3>
                <p className="shop-number">Shop {shop.shop_number}</p>
                {shop.avg_rating !== undefined && shop.avg_rating > 0 && (
                  <p className="shop-rating-info" style={{ fontSize: '0.8rem', color: '#f59e0b' }}>
                    {'★'.repeat(Math.round(shop.avg_rating))} {shop.avg_rating} ({shop.review_count} reviews)
                  </p>
                )}
              </div>
              <div className={`status-badge ${getStatusColor(shop.status)}`}>
                {shop.status.charAt(0).toUpperCase() + shop.status.slice(1)}
              </div>
            </div>

            <div className="shop-details">
              <div className="detail-row">
                <span className="label">Contact:</span>
                <span className="value">{shop.contact}</span>
              </div>
              <div className="detail-row">
                <span className="label">Email:</span>
                <span className="value">{shop.email}</span>
              </div>
              <div className="detail-row">
                <span className="label">Registered:</span>
                <span className="value">{formatDate(shop.created_at)}</span>
              </div>
              <div className="detail-row">
                <span className="label">Plan:</span>
                <span className="value plan-badge">{shop.plan || 'free'}</span>
              </div>
              {shop.subscription_end_date && (
                <div className="detail-row">
                  <span className="label">Expires:</span>
                  <span className={`value ${shop.subscription_status === 'expired' ? 'text-danger' : ''}`}>
                    {formatDate(shop.subscription_end_date)}
                    {shop.subscription_status === 'expired' && ' (Expired)'}
                  </span>
                </div>
              )}
              {shop.monthly_fee !== undefined && shop.monthly_fee > 0 && (
                <div className="detail-row">
                  <span className="label">Monthly Fee:</span>
                  <span className="value">KSh {shop.monthly_fee.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="shop-actions">
              {/* Status */}
              <div className="status-controls">
                <label className="status-label">Status:</label>
                <select
                  value={shop.status}
                  onChange={(e) => onStatusUpdate(shop.id, e.target.value)}
                  className="status-select"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {/* Feature toggles */}
              <div className="features-controls">
                {[
                  { key: 'pos_enabled',       label: 'POS',           value: shop.pos_enabled },
                  { key: 'credit_enabled',     label: 'Credit Tracker',value: shop.credit_enabled },
                  { key: 'is_featured',        label: '⭐ Featured',   value: shop.is_featured },
                  { key: 'mpesa_stk_enabled',  label: '💳 M-Pesa STK', value: shop.mpesa_stk_enabled },
                ].map(({ key, label, value }) => (
                  <div className="feature-row" key={key}>
                    <span className="feature-label">{label}</span>
                    <button
                      onClick={() => onFeaturesUpdate(shop.id, { [key]: !value } as any)}
                      className={`feature-toggle-btn ${value ? 'enabled' : ''}`}
                    >
                      {value ? 'ON' : 'OFF'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Subscription editor */}
              <div className="subscription-controls">
                {editingShop === shop.id ? (
                  <div className="subscription-edit">
                    <div className="edit-row">
                      <label>Plan:</label>
                      <select
                        value={subscriptionData.plan}
                        onChange={(e) => setSubscriptionData(prev => ({ ...prev, plan: e.target.value }))}
                        className="form-input"
                      >
                        <option value="free">Free</option>
                        <option value="basic">Basic</option>
                        <option value="premium">Premium</option>
                      </select>
                    </div>
                    <div className="edit-row">
                      <label>Monthly Fee (KSh):</label>
                      <input
                        type="number"
                        value={subscriptionData.monthly_fee}
                        onChange={(e) => setSubscriptionData(prev => ({ ...prev, monthly_fee: parseInt(e.target.value) || 0 }))}
                        className="form-input"
                        min="0"
                      />
                    </div>
                    <div className="edit-row">
                      <label>Expiry Date (optional):</label>
                      <input
                        type="date"
                        value={subscriptionData.end_date}
                        onChange={(e) => setSubscriptionData(prev => ({ ...prev, end_date: e.target.value }))}
                        className="form-input"
                      />
                    </div>
                    <div className="edit-actions">
                      <button onClick={() => handleSubscriptionSave(shop.id)} className="btn btn-success btn-sm">Save</button>
                      <button onClick={() => setEditingShop(null)} className="btn btn-secondary btn-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => handleSubscriptionEdit(shop)} className="btn btn-outline btn-sm">
                    Edit Subscription
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShopList;
