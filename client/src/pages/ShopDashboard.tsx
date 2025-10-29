import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ProductForm from '../components/ProductForm';
import ProductList from '../components/ProductList';
import OrdersList from '../components/OrdersList';
import ChangePasswordModal from '../components/ChangePasswordModal';
import NotificationBanner from '../components/NotificationBanner';
import notificationService from '../services/notificationService';
import './ShopDashboard.css';

interface Shop {
  id: number;
  shop_number: string;
  shop_name: string;
  contact: string;
  email: string;
  status: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  sizes: string;
}

interface Order {
  id: number;
  customer_name: string;
  customer_contact: string;
  product_name: string;
  size: string;
  status: string;
  notes: string;
  created_at: string;
}

const ShopDashboard: React.FC = () => {
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const shopData = localStorage.getItem('shop');
    
    if (!token || !shopData) {
      navigate('/shop/login');
      return;
    }

    setShop(JSON.parse(shopData));
    loadData();
    
    // Enable notifications for shop owners
    notificationService.enableNotifications().then(enabled => {
      if (enabled) {
        console.log('Push notifications enabled for shop');
      }
    });
  }, [navigate]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [productsRes, ordersRes, shopRes] = await Promise.all([
        axios.get('/api/products/my-products', { headers }),
        axios.get('/api/orders/my-orders', { headers }),
        axios.get('/api/shops/profile', { headers })
      ]);

      setProducts(productsRes.data);
      setFilteredProducts(productsRes.data);
      setOrders(ordersRes.data);
      
      // Update shop data with current status
      if (shopRes.data) {
        setShop(prev => prev ? { ...prev, status: shopRes.data.status } : null);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (query: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(
        `/api/products/my-products/search?query=${encodeURIComponent(query)}`,
        { headers }
      );
      
      setFilteredProducts(response.data);
    } catch (error) {
      console.error('Error searching products:', error);
      // Fallback to local filtering
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setFilteredProducts(products);
    } else {
      searchProducts(query);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('shop');
    navigate('/shop/login');
  };

  const handleProductSaved = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    loadData();
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadData();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/orders/${orderId}/status`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadData();
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  if (loading) {
    return (
      <div className="shop-dashboard">
        <div className="container">
          <div className="loading">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-dashboard">
      <div className="container">
        <div className="dashboard-header">
          <div className="shop-info">
            <h1>Welcome, {shop?.shop_name}</h1>
            <p>Shop {shop?.shop_number} • {shop?.contact}</p>
          </div>
          <div className="header-actions">
            <button 
              onClick={() => setShowChangePassword(true)} 
              className="btn btn-outline"
            >
              Change Password
            </button>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>

        <NotificationBanner />

        {shop?.status === 'closed' && (
          <div className="closure-notice">
            <div className="closure-content">
              <div className="closure-icon">⚠️</div>
              <div className="closure-text">
                <h3>Shop Temporarily Closed</h3>
                <p>Your shop has been temporarily closed by the admin. Please clear your arrears with the admin to reopen your shop.</p>
                <p className="admin-contact">
                  <strong>Admin Contact:</strong> 0113690898
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="dashboard-tabs">
          <button 
            className={`tab ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            Products ({products.length})
          </button>
          <button 
            className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Orders ({orders.length})
          </button>
        </div>

        {activeTab === 'products' && (
          <div className="products-section">
            <div className="section-header">
              <h2>My Products</h2>
              <button 
                onClick={() => setShowProductForm(true)}
                className="btn btn-primary"
              >
                Add Product
              </button>
            </div>

            <div className="search-section">
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search your products..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="search-input"
                />
                <div className="search-icon">🔍</div>
              </div>
              {searchQuery && (
                <p className="search-results">
                  Showing {filteredProducts.length} of {products.length} products
                </p>
              )}
            </div>

            {showProductForm && (
              <ProductForm
                product={editingProduct}
                onSave={handleProductSaved}
                onCancel={() => {
                  setShowProductForm(false);
                  setEditingProduct(null);
                }}
              />
            )}

            <ProductList
              products={filteredProducts}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
            />
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="orders-section">
            <div className="section-header">
              <h2>Customer Orders</h2>
            </div>

            <OrdersList
              orders={orders}
              onUpdateStatus={handleUpdateOrderStatus}
            />
          </div>
        )}
      </div>

      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          userType="shop"
        />
      )}
    </div>
  );
};

export default ShopDashboard;
