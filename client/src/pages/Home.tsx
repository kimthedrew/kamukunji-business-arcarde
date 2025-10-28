import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Home.css';

const Home: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/shops');
      setShops(response.data.slice(0, 3)); // Show only first 3 shops
    } catch (error) {
      console.error('Error fetching shops:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="home">
      <section className="hero">
        <div className="container">
          <h1>Find Your Perfect Shoes</h1>
          <p>Search across all shops in Kamukunji Business Arcade</p>
          
          <form onSubmit={handleSearch} className="search-bar">
            <input
              type="text"
              placeholder="Search for shoes, brands, sizes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="btn btn-primary search-btn">
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2 className="text-center mb-8">Why Choose Our Platform?</h2>
          <div className="grid grid-3">
            <div className="card text-center">
              <div className="feature-icon">🔍</div>
              <h3>Easy Search</h3>
              <p>Find shoes across all shops in the arcade without walking from shop to shop.</p>
            </div>
            <div className="card text-center">
              <div className="feature-icon">📱</div>
              <h3>Real-time Stock</h3>
              <p>See which sizes are available in real-time before visiting the shop.</p>
            </div>
            <div className="card text-center">
              <div className="feature-icon">🛒</div>
              <h3>Easy Ordering</h3>
              <p>Place orders directly with shop owners and pick up at your convenience.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="shops-preview">
        <div className="container">
          <h2 className="text-center mb-8">Our Partner Shops</h2>
          <p className="text-center mb-8">Browse products from our trusted shop partners</p>
          
          {loading ? (
            <div className="text-center">Loading shops...</div>
          ) : (
            <div className="shops-grid">
              {shops.map((shop: any) => (
                <div key={shop.id} className="shop-card">
                  <h3>{shop.shop_name}</h3>
                  <p className="shop-number">Shop #{shop.shop_number}</p>
                  <p className="shop-contact">📞 {shop.contact}</p>
                  <button 
                    onClick={() => navigate(`/shops/${shop.id}`)}
                    className="btn btn-outline"
                  >
                    View Products
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="text-center mt-8">
            <button 
              onClick={() => navigate('/shops')}
              className="btn btn-primary"
            >
              View All Shops
            </button>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container text-center">
          <h2>Ready to Find Your Shoes?</h2>
          <p className="mb-6">Start searching for the perfect pair today!</p>
          <button 
            onClick={() => navigate('/search')}
            className="btn btn-primary btn-lg"
          >
            Browse All Shoes
          </button>
        </div>
      </section>
    </div>
  );
};

export default Home;

