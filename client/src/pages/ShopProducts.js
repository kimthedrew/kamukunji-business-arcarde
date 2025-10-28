import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import './ShopProducts.css';

const ShopProducts = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (shopId) {
      fetchShopProducts();
    }
  }, [shopId]);

  const fetchShopProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/api/shops/${shopId}/products`);
      setShop(response.data.shop);
      setProducts(response.data.products);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch shop products');
      console.error('Error fetching shop products:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="shop-products-container">
        <div className="loading">Loading shop products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shop-products-container">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/shops')} className="back-btn">
            Back to Shops
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-products-container">
      <div className="shop-header">
        <button onClick={() => navigate('/shops')} className="back-btn">
          ← Back to Shops
        </button>
        
        <div className="shop-info">
          <h1>{shop.shop_name}</h1>
          <p className="shop-number">Shop #{shop.shop_number}</p>
          <p className="shop-contact">📞 {shop.contact}</p>
        </div>
      </div>

      <div className="products-section">
        <h2>Products ({products.length})</h2>
        
        {products.length > 0 ? (
          <div className="products-grid">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="no-products">
            <p>This shop doesn't have any products yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopProducts;


