import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/axiosConfig';
import { ProductCardSkeleton } from '../components/Skeleton';
import './Home.css';

const Home: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => { fetchShops(); }, []);

  const fetchShops = async () => {
    try {
      const response = await api.get('/shops');
      const data = Array.isArray(response.data) ? response.data : [];
      // Show featured shops first, then cap at 3
      const sorted = [...data].sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
      setShops(sorted.slice(0, 3));
    } catch (error) {
      console.error('Error fetching shops:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="home">
      <section className="hero">
        <div className="container">
          <h1>{t('heroTitle')}</h1>
          <p>{t('heroSubtitle')}</p>
          <form onSubmit={handleSearch} className="search-bar">
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="btn btn-primary search-btn">
              {t('searchBtn')}
            </button>
          </form>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2 className="text-center mb-8">{t('whyChoose')}</h2>
          <div className="grid grid-3">
            <div className="card text-center">
              <div className="feature-icon">🔍</div>
              <h3>{t('easySearch')}</h3>
              <p>{t('easySearchDesc')}</p>
            </div>
            <div className="card text-center">
              <div className="feature-icon">📱</div>
              <h3>{t('realTimeStock')}</h3>
              <p>{t('realTimeStockDesc')}</p>
            </div>
            <div className="card text-center">
              <div className="feature-icon">🛒</div>
              <h3>{t('easyOrdering')}</h3>
              <p>{t('easyOrderingDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="shops-preview">
        <div className="container">
          <h2 className="text-center mb-8">{t('ourPartnerShops')}</h2>
          <p className="text-center mb-8">{t('partnerShopsDesc')}</p>

          {loading ? (
            <div className="grid grid-3">
              <ProductCardSkeleton />
              <ProductCardSkeleton />
              <ProductCardSkeleton />
            </div>
          ) : (
            <div className="shops-grid">
              {shops.map((shop: any) => (
                <div key={shop.id} className="shop-card">
                  {shop.is_featured && <div className="featured-badge">⭐ Featured</div>}
                  {shop.avg_rating > 0 && (
                    <div className="shop-rating">
                      {'★'.repeat(Math.round(shop.avg_rating))}{'☆'.repeat(5 - Math.round(shop.avg_rating))}
                      <span className="rating-num"> {shop.avg_rating}</span>
                    </div>
                  )}
                  <h3>{shop.shop_name}</h3>
                  <p className="shop-number">Shop #{shop.shop_number}</p>
                  <p className="shop-contact">📞 {shop.contact}</p>
                  <button onClick={() => navigate(`/shops/${shop.id}`)} className="btn btn-outline">
                    {t('viewProducts')}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-8">
            <button onClick={() => navigate('/shops')} className="btn btn-primary">
              {t('viewAllShops')}
            </button>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container text-center">
          <h2>{t('readyToFind')}</h2>
          <p className="mb-6">{t('startSearching')}</p>
          <button onClick={() => navigate('/search')} className="btn btn-primary btn-lg">
            {t('browseAllShoes')}
          </button>
        </div>
      </section>
    </div>
  );
};

export default Home;
