import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/axiosConfig';
import ProductCard from '../components/ProductCard';
import OrderModal from '../components/OrderModal';
import './ShopProducts.css';

const ShopProducts = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const fetchShopProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/shops/${shopId}/products`);
      setShop(response.data.shop);
      setProducts(response.data.products);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch shop products');
      console.error('Error fetching shop products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shopId) {
      fetchShopProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

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

  const buildWhatsAppContact = () => {
    const phone = shop.contact.replace(/\D/g, '');
    const e164 = phone.startsWith('0') ? '254' + phone.slice(1) : phone;
    const msg = encodeURIComponent(`Hi, I'm interested in your products at ${shop.shop_name} (Shop ${shop.shop_number}).`);
    return `https://wa.me/${e164}?text=${msg}`;
  };

  return (
    <div className="shop-products-container">
      <div className="shop-header">
        <button onClick={() => navigate('/shops')} className="back-btn">
          ← Back to Shops
        </button>

        {shop.banner_url && (
          <div className="shop-banner">
            <img src={shop.banner_url} alt={`${shop.shop_name} banner`} className="shop-banner-img" />
          </div>
        )}

        <div className="shop-info">
          <h1>
            {shop.is_featured && <span className="featured-star" title="Featured Shop">★ </span>}
            {shop.shop_name}
          </h1>
          <p className="shop-number">Shop #{shop.shop_number}</p>
          <p className="shop-contact">📞 {shop.contact}</p>
          {shop.business_hours && (
            <p className="shop-hours">🕒 {shop.business_hours}</p>
          )}
          {(shop.till_number || shop.payment_provider) && (
            <p className="shop-payment">
              💳 {shop.payment_provider || 'M-Pesa'} Till: {shop.till_number}
            </p>
          )}
          <div className="shop-contact-actions">
            <a
              href={buildWhatsAppContact()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp"
            >
              💬 WhatsApp Shop
            </a>
          </div>
        </div>
      </div>

      <div className="products-section">
        <h2>Products ({products.length})</h2>
        
        {products.length > 0 ? (
          <div className="products-grid">
            {products.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onOrder={() => {
                  setSelectedProduct(product);
                  setShowOrderModal(true);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="no-products">
            <p>This shop doesn't have any products yet.</p>
          </div>
        )}
      </div>
      {showOrderModal && selectedProduct && (
        <OrderModal 
          product={selectedProduct} 
          onClose={() => setShowOrderModal(false)} 
        />
      )}
    </div>
  );
};

export default ShopProducts;


