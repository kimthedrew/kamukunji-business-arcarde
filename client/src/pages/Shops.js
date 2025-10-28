import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Shops.css';

const Shops = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/shops');
      setShops(response.data);
    } catch (err) {
      setError('Failed to fetch shops');
      console.error('Error fetching shops:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="shops-container">
        <div className="loading">Loading shops...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shops-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="shops-container">
      <div className="shops-header">
        <h1>Our Shops</h1>
        <p>Browse products from our partner shops</p>
      </div>

      <div className="shops-grid">
        {shops.map(shop => (
          <div key={shop.id} className="shop-card">
            <div className="shop-info">
              <h3>{shop.shop_name}</h3>
              <p className="shop-number">Shop #{shop.shop_number}</p>
              <p className="shop-contact">📞 {shop.contact}</p>
              <p className="shop-email">✉️ {shop.email}</p>
            </div>
            <div className="shop-actions">
              <button 
                className="view-products-btn"
                onClick={() => window.location.href = `/shops/${shop.id}`}
              >
                View Products
              </button>
            </div>
          </div>
        ))}
      </div>

      {shops.length === 0 && (
        <div className="no-shops">
          <p>No shops available at the moment.</p>
        </div>
      )}
    </div>
  );
};

export default Shops;


