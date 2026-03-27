import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axiosConfig';
import ProductForm from '../components/ProductForm';
import ProductList from '../components/ProductList';
import OrdersList from '../components/OrdersList';
import POSScreen from '../components/POSScreen';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ShopInfoModal from '../components/ShopInfoModal';
import NotificationBanner from '../components/NotificationBanner';
import AnalyticsScreen from '../components/AnalyticsScreen';
import CreditTracker from '../components/CreditTracker';
import StaffManager from '../components/StaffManager';
import notificationService from '../services/notificationService';
import './ShopDashboard.css';

interface Shop {
  id: number;
  shop_number: string;
  shop_name: string;
  contact: string;
  email: string;
  status: string;
  till_number?: string;
  payment_provider?: string;
  payment_notes?: string;
  pos_enabled?: boolean;
  credit_enabled?: boolean;
  banner_url?: string;
  business_hours?: string;
  is_featured?: boolean;
  plan?: string;
  subscription_status?: string;
  subscription_end_date?: string;
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
  payment_reference?: string;
  payment_status?: string;
}

const PLAN_PRODUCT_LIMITS: Record<string, number> = { free: 20, basic: 100, premium: Infinity };

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
  const [showShopInfo, setShowShopInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const navigate = useNavigate();

  const plan = shop?.plan || 'free';
  const isBasicOrPremium = plan === 'basic' || plan === 'premium';
  const productLimit = PLAN_PRODUCT_LIMITS[plan] ?? 20;
  const atProductLimit = isFinite(productLimit) && products.length >= productLimit;

  useEffect(() => {
    const token = localStorage.getItem('token');
    const shopData = localStorage.getItem('shop');
    if (!token || !shopData) {
      navigate('/shop/login');
      return;
    }
    setShop(JSON.parse(shopData));
    loadData();
    notificationService.enableNotifications().then(enabled => {
      if (enabled) console.log('Push notifications enabled for shop');
    });
  }, [navigate]);

  const loadData = async () => {
    try {
      const [productsRes, ordersRes, shopRes] = await Promise.all([
        api.get('/products/my-products'),
        api.get('/orders/my-orders'),
        api.get('/shops/profile')
      ]);
      setProducts(productsRes.data);
      setFilteredProducts(productsRes.data);
      setOrders(ordersRes.data);
      if (shopRes.data) setShop(shopRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (query: string) => {
    try {
      const res = await api.get(`/products/my-products/search?query=${encodeURIComponent(query)}`);
      setFilteredProducts(res.data);
    } catch {
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim() === '') setFilteredProducts(products);
    else searchProducts(query);
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

  const handleDeleteProduct = async (productId: number) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${productId}`);
      loadData();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      loadData();
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const handleConfirmPayment = async (orderId: number, decision: 'confirmed' | 'rejected') => {
    try {
      await api.put(`/orders/${orderId}/payment`, { payment_status: decision });
      loadData();
    } catch (error) {
      console.error('Failed to update payment status:', error);
    }
  };

  const handleShareCatalog = async () => {
    setCatalogLoading(true);
    try {
      const res = await api.get('/shops/catalog');
      const { shop: s, products: prods } = res.data;

      const lines = [
        `*${s.shop_name} — Product Catalog*`,
        `Shop ${s.shop_number} | ${s.contact}`,
        s.business_hours ? `Hours: ${s.business_hours}` : '',
        '',
        ...prods.map((p: any) => {
          const sizes = p.product_sizes?.filter((ps: any) => ps.in_stock).map((ps: any) => ps.size).join(', ');
          return `• *${p.name}* — KSh ${Number(p.price).toLocaleString()}${sizes ? `\n  Sizes: ${sizes}` : ''}`;
        }),
        '',
        s.till_number ? `Payment: ${s.payment_provider || 'M-Pesa'} Till No. ${s.till_number}` : '',
        '_Reply to order_'
      ].filter(Boolean).join('\n');

      const encoded = encodeURIComponent(lines);
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    } catch {
      alert('Failed to load catalog. Please try again.');
    } finally {
      setCatalogLoading(false);
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
            <h1>
              {shop?.is_featured && <span style={{ color: '#f59e0b' }}>★ </span>}
              {shop?.shop_name}
            </h1>
            <p>
              Shop {shop?.shop_number} • {shop?.contact}
              {plan !== 'free' && <span className="plan-chip">{plan}</span>}
            </p>
          </div>
          <div className="header-actions">
            <button onClick={handleShareCatalog} className="btn btn-outline" disabled={catalogLoading}>
              {catalogLoading ? 'Loading...' : '📲 Share Catalog'}
            </button>
            <button onClick={() => setShowShopInfo(true)} className="btn btn-outline">Update Shop Info</button>
            <button onClick={() => setShowChangePassword(true)} className="btn btn-outline">Change Password</button>
            <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
          </div>
        </div>

        <NotificationBanner />

        {/* Subscription expiry warning */}
        {shop?.subscription_status === 'expired' && (
          <div className="closure-notice" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
            <div className="closure-content">
              <div className="closure-icon">⚠️</div>
              <div className="closure-text">
                <h3>Subscription Expired</h3>
                <p>Your subscription has expired. Some features may be locked. Contact admin to renew.</p>
                <p className="admin-contact"><strong>Admin Contact:</strong> 0113690898</p>
              </div>
            </div>
          </div>
        )}

        {shop?.status === 'closed' && (
          <div className="closure-notice">
            <div className="closure-content">
              <div className="closure-icon">⚠️</div>
              <div className="closure-text">
                <h3>Shop Temporarily Closed</h3>
                <p>Your shop has been temporarily closed by the admin. Please clear your arrears with the admin to reopen your shop.</p>
                <p className="admin-contact"><strong>Admin Contact:</strong> 0113690898</p>
              </div>
            </div>
          </div>
        )}

        <div className="dashboard-tabs">
          <button className={`tab ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
            Products ({products.length})
          </button>
          <button className={`tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            Orders ({orders.length})
          </button>
          {shop?.pos_enabled && (
            <button className={`tab tab-pos ${activeTab === 'pos' ? 'active' : ''}`} onClick={() => setActiveTab('pos')}>
              POS
            </button>
          )}
          {isBasicOrPremium && (
            <button className={`tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
              Analytics
            </button>
          )}
          {(isBasicOrPremium && shop?.credit_enabled) && (
            <button className={`tab ${activeTab === 'credit' ? 'active' : ''}`} onClick={() => setActiveTab('credit')}>
              Credit
            </button>
          )}
          {isBasicOrPremium && (
            <button className={`tab ${activeTab === 'staff' ? 'active' : ''}`} onClick={() => setActiveTab('staff')}>
              Staff
            </button>
          )}
        </div>

        {/* Products tab */}
        {activeTab === 'products' && (
          <div className="products-section">
            <div className="section-header">
              <h2>My Products</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {atProductLimit && (
                  <span className="plan-limit-badge">
                    {plan} limit: {productLimit} products
                  </span>
                )}
                <button
                  onClick={() => setShowProductForm(true)}
                  className="btn btn-primary"
                  disabled={atProductLimit}
                  title={atProductLimit ? `Upgrade to add more products (${plan} limit: ${productLimit})` : ''}
                >
                  Add Product
                </button>
              </div>
            </div>

            {atProductLimit && (
              <div className="plan-limit-notice">
                You've reached the {productLimit}-product limit on your <strong>{plan}</strong> plan.
                Contact admin to upgrade and add more products.
              </div>
            )}

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
                <p className="search-results">Showing {filteredProducts.length} of {products.length} products</p>
              )}
            </div>

            {showProductForm && (
              <ProductForm
                product={editingProduct}
                onSave={handleProductSaved}
                onCancel={() => { setShowProductForm(false); setEditingProduct(null); }}
              />
            )}

            <ProductList
              products={filteredProducts}
              onEdit={(product) => { setEditingProduct(product); setShowProductForm(true); }}
              onDelete={handleDeleteProduct}
            />
          </div>
        )}

        {/* Orders tab */}
        {activeTab === 'orders' && (
          <div className="orders-section">
            <div className="section-header">
              <h2>Customer Orders</h2>
            </div>
            <OrdersList
              orders={orders}
              onUpdateStatus={handleUpdateOrderStatus}
              onConfirmPayment={handleConfirmPayment}
            />
          </div>
        )}

        {/* POS tab */}
        {activeTab === 'pos' && shop?.pos_enabled && (
          <div className="pos-section">
            <div className="section-header">
              <h2>Point of Sale</h2>
            </div>
            <POSScreen products={products} shop={shop} onSaleComplete={loadData} />
          </div>
        )}

        {/* Analytics tab */}
        {activeTab === 'analytics' && isBasicOrPremium && (
          <div className="analytics-section">
            <div className="section-header">
              <h2>Sales Analytics</h2>
            </div>
            <AnalyticsScreen />
          </div>
        )}

        {/* Credit tracker tab */}
        {activeTab === 'credit' && isBasicOrPremium && shop?.credit_enabled && (
          <div className="credit-section">
            <div className="section-header">
              <h2>Credit / Debt Tracker</h2>
            </div>
            <CreditTracker />
          </div>
        )}

        {/* Staff tab */}
        {activeTab === 'staff' && isBasicOrPremium && (
          <div className="staff-section">
            <div className="section-header">
              <h2>Staff Accounts</h2>
            </div>
            <StaffManager plan={plan} />
          </div>
        )}
      </div>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} userType="shop" />
      )}

      {showShopInfo && shop && (
        <ShopInfoModal shop={shop} onClose={() => setShowShopInfo(false)} onUpdate={loadData} />
      )}
    </div>
  );
};

export default ShopDashboard;
