import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/axiosConfig';
import ProductCard from '../components/ProductCard';
import OrderModal from '../components/OrderModal';
import './Search.css';

interface Product {
  id: number;
  shop_id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  shop_number: string;
  shop_name: string;
  contact: string;
  sizes: string;
}

const Search: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  
  const [filters, setFilters] = useState({
    query: searchParams.get('q') || '',
    category: '',
    minPrice: '',
    maxPrice: ''
  });

  const searchProducts = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      if (filters.query) params.append('query', filters.query);
      if (filters.category) params.append('category', filters.category);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      
      const response = await api.get(`/products/search?${params}`);
      setProducts(response.data);
    } catch (err) {
      setError('Failed to search products. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchProducts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOrder = (product: Product) => {
    setSelectedProduct(product);
    setShowOrderModal(true);
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="search-page">
      <div className="container">
        <div className="search-header">
          <h1>Search Shoes</h1>
          <p>Find the perfect pair across all shops in Kamukunji Business Arcade</p>
        </div>

        <div className="search-filters">
          <div className="filter-group">
            <input
              type="text"
              placeholder="Search for shoes..."
              value={filters.query}
              onChange={(e) => handleFilterChange('query', e.target.value)}
              className="form-input"
            />
          </div>
          
          <div className="filter-group">
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="form-input"
            >
              <option value="">All Categories</option>
              <option value="shoes">Shoes</option>
              <option value="official">Official Shoes</option>
              <option value="casual">Casual</option>
              <option value="sneakers">Sneakers</option>
              <option value="boots">Boots</option>
              <option value="sandals">Sandals</option>
              <option value="others">Others</option>
            </select>
          </div>
          
          <div className="filter-group">
            <input
              type="number"
              placeholder="Min Price"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              className="form-input"
            />
          </div>
          
          <div className="filter-group">
            <input
              type="number"
              placeholder="Max Price"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              className="form-input"
            />
          </div>
          
          <button onClick={searchProducts} className="btn btn-primary">
            Search
          </button>
        </div>

        {loading && (
          <div className="text-center p-8">
            <div className="loading-spinner"></div>
            <p>Searching for shoes...</p>
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="text-center p-8">
            <h3>No shoes found</h3>
            <p>Try adjusting your search criteria or browse all products.</p>
          </div>
        )}

        {!loading && products.length > 0 && (
          <div className="search-results">
            <div className="results-header">
              <h3>Found {products.length} shoes</h3>
            </div>
            
            <div className="grid grid-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOrder={() => handleOrder(product)}
                />
              ))}
            </div>
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

export default Search;
