import React, { useState, useEffect } from 'react';
import api from '../utils/axiosConfig';
import './Shops.css';

const Shops = () => {
  const [shops, setShops] = useState([]);
  const [filteredShops, setFilteredShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredShops(shops);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = shops.filter(shop => 
        shop.shop_name.toLowerCase().includes(query) ||
        shop.shop_number.toLowerCase().includes(query) ||
        shop.contact.includes(query) ||
        (shop.email && shop.email.toLowerCase().includes(query))
      );
      setFilteredShops(filtered);
    }
  }, [searchQuery, shops]);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const response = await api.get('/shops');
      setShops(response.data);
      setFilteredShops(response.data);
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

      <div className="shops-search">
        <input
          type="text"
          placeholder="Search shops by name, number, contact, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="shops-search-input"
        />
        {searchQuery && (
          <p className="shops-search-results">
            Found {filteredShops.length} of {shops.length} shops
          </p>
        )}
      </div>

      <div className="shops-grid">
        {filteredShops.map(shop => (
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

      {!loading && filteredShops.length === 0 && searchQuery && (
        <div className="no-shops">
          <p>No shops found matching your search.</p>
        </div>
      )}

      {!loading && shops.length === 0 && (
        <div className="no-shops">
          <p>No shops available at the moment.</p>
        </div>
      )}
    </div>
  );
};

export default Shops;


