import React, { useState } from 'react';
import axios from 'axios';
import './OrderModal.css';

interface Product {
  id: number;
  shop_id: number;
  name: string;
  price: number;
  shop_number: string;
  shop_name: string;
  contact: string;
  sizes: string;
}

interface OrderModalProps {
  product: Product;
  onClose: () => void;
}

const OrderModal: React.FC<OrderModalProps> = ({ product, onClose }) => {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_contact: '',
    size: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const parseSizes = (sizesString: string) => {
    if (!sizesString) return [];
    return sizesString.split(',').map(sizeInfo => {
      const [size, inStock] = sizeInfo.split(':');
      return { size, inStock: inStock === '1' };
    }).filter(s => s.inStock);
  };

  const availableSizes = parseSizes(product.sizes);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await axios.post('/api/orders', {
        shop_id: product.shop_id,
        customer_name: formData.customer_name,
        customer_contact: formData.customer_contact,
        product_id: product.id,
        size: formData.size,
        notes: formData.notes
      });

      setMessage('Order placed successfully! The shop owner will contact you soon.');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      setMessage('Failed to place order. Please try again.');
      console.error('Order error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Place Order</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="product-info">
          <h3>{product.name}</h3>
          <p><strong>Shop {product.shop_number}</strong> - {product.shop_name}</p>
          <p>Price: KSh {product.price.toLocaleString()}</p>
          <p>Contact: {product.contact}</p>
        </div>

        <form onSubmit={handleSubmit} className="order-form">
          <div className="form-group">
            <label className="form-label">Your Name *</label>
            <input
              type="text"
              name="customer_name"
              value={formData.customer_name}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Your Contact *</label>
            <input
              type="tel"
              name="customer_contact"
              value={formData.customer_contact}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Size *</label>
            <select
              name="size"
              value={formData.size}
              onChange={handleChange}
              className="form-input"
              required
            >
              <option value="">Select size</option>
              {availableSizes.map((sizeInfo, index) => (
                <option key={index} value={sizeInfo.size}>
                  {sizeInfo.size}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="form-textarea"
              placeholder="Any special requests or notes..."
            />
          </div>

          {message && (
            <div className={`alert ${message.includes('successfully') ? 'alert-success' : 'alert-error'}`}>
              {message}
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderModal;

