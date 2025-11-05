import React, { useState, useEffect } from 'react';
import api from '../utils/axiosConfig';
import './ShopInfoModal.css';

interface ShopInfoModalProps {
  shop: {
    id: number;
    shop_number: string;
    shop_name: string;
    contact: string;
    email: string;
    till_number?: string;
    payment_provider?: string;
    payment_notes?: string;
  } | null;
  onClose: () => void;
  onUpdate: () => void;
}

const ShopInfoModal: React.FC<ShopInfoModalProps> = ({ shop, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    shop_name: '',
    contact: '',
    email: '',
    till_number: '',
    payment_provider: '',
    payment_notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (shop) {
      setFormData({
        shop_name: shop.shop_name || '',
        contact: shop.contact || '',
        email: shop.email || '',
        till_number: shop.till_number || '',
        payment_provider: shop.payment_provider || '',
        payment_notes: shop.payment_notes || ''
      });
    }
  }, [shop]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.put('/shops/profile', formData);
      setSuccess('Shop information updated successfully!');
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 1500);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update shop information');
    } finally {
      setLoading(false);
    }
  };

  if (!shop) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Update Shop Information</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="shop-info-form">
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              {success}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Shop Number</label>
            <input
              type="text"
              value={shop.shop_number}
              className="form-input"
              disabled
              style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
            />
            <p className="form-hint">Shop number cannot be changed</p>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Shop Name *</label>
              <input
                type="text"
                name="shop_name"
                value={formData.shop_name}
                onChange={handleChange}
                className="form-input"
                placeholder="Your shop name"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Number *</label>
              <input
                type="tel"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., 0712345678"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Till Number (Optional)</label>
              <input
                type="text"
                name="till_number"
                value={formData.till_number}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., 123456"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Provider (Optional)</label>
              <input
                type="text"
                name="payment_provider"
                value={formData.payment_provider}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., M-Pesa, Airtel Money"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Notes (Optional)</label>
            <input
              type="text"
              name="payment_notes"
              value={formData.payment_notes}
              onChange={handleChange}
              className="form-input"
              placeholder="Any instructions for customers"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Information'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShopInfoModal;

