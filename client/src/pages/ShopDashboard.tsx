import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
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
import CSVImporter from '../components/CSVImporter';
import Skeleton, { ProductCardSkeleton } from '../components/Skeleton';
import './ShopDashboard.css';

const decodeToken = (token: string) => {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return {}; }
};

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
  source?: string;
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [showCSVImporter, setShowCSVImporter] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [bulkSelected, setBulkSelected] = useState<number[]>([]);
  const [bulkChanges, setBulkChanges] = useState<{ price?: string; category?: string; in_stock?: boolean }>({});
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const { t } = useTranslation();

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
    const payload = decodeToken(token);
    if (payload.role === 'staff') {
      setIsStaff(true);
      setActiveTab('pos'); // staff lands on POS by default
    }
    setShop(JSON.parse(shopData));
    loadData();
    notificationService.enableNotifications().then(enabled => {
      if (enabled) console.log('Push notifications enabled for shop');
    });
  }, [navigate]);

  const loadData = async () => {
    try {
      const [productsRes, ordersRes, shopRes, lowStockRes] = await Promise.all([
        api.get('/products/my-products'),
        api.get('/orders/my-orders'),
        api.get('/shops/profile'),
        api.get('/products/low-stock?threshold=5')
      ]);
      const productData = Array.isArray(productsRes.data) ? productsRes.data : [];
      setProducts(productData);
      setFilteredProducts(productData);
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      if (shopRes.data) setShop(shopRes.data);
      if (Array.isArray(lowStockRes.data)) {
        setLowStockItems(lowStockRes.data);
        if (lowStockRes.data.length > 0) {
          toast(`⚠️ ${lowStockRes.data.length} item(s) are running low on stock`, { duration: 5000 });
        }
      }
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
      toast.success('Product deleted');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      toast.success('Order status updated');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update order');
    }
  };

  const handleConfirmPayment = async (orderId: number, decision: 'confirmed' | 'rejected') => {
    try {
      await api.put(`/orders/${orderId}/payment`, { payment_status: decision });
      toast.success(decision === 'confirmed' ? 'Payment confirmed' : 'Payment rejected');
      loadData();
    } catch (error: any) {
      toast.error('Failed to update payment status');
    }
  };

  const handleVoidSale = async (orderId: number | string) => {
    const reason = window.prompt('Reason for void/refund (optional):');
    if (reason === null) return; // cancelled
    try {
      await api.post(`/pos/void/${orderId}`, { reason });
      toast.success('Sale voided and inventory restored');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to void sale');
    }
  };

  const handleBulkEdit = async () => {
    if (!bulkSelected.length) { toast.error('Select at least one product'); return; }
    try {
      await api.put('/products/bulk-edit', { product_ids: bulkSelected, changes: bulkChanges });
      toast.success(`Updated ${bulkSelected.length} products`);
      setBulkSelected([]);
      setBulkChanges({});
      setShowBulkEdit(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Bulk edit failed');
    }
  };

  const handleSendLowStockSms = async () => {
    try {
      await api.post('/sms/low-stock-alert');
      toast.success('Low stock SMS sent to your phone');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'SMS failed');
    }
  };

  const handleCopyShopLink = () => {
    const url = `${window.location.origin}/shops/${shop?.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
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
          <div style={{ padding: '2rem 0' }}>
            <Skeleton variant="title" width="40%" />
            <Skeleton variant="text" width="60%" />
            <div className="grid grid-3" style={{ marginTop: '2rem' }}>
              <ProductCardSkeleton />
              <ProductCardSkeleton />
              <ProductCardSkeleton />
            </div>
          </div>
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
            {!isStaff && (
              <button onClick={handleCopyShopLink} className="btn btn-outline" title={`${window.location.origin}/shops/${shop?.id}`}>
                {copiedLink ? '✓ Link Copied!' : '🔗 Copy Shop Link'}
              </button>
            )}
            {!isStaff && (
              <button onClick={handleShareCatalog} className="btn btn-outline" disabled={catalogLoading}>
                {catalogLoading ? 'Loading...' : '📲 Share Catalog'}
              </button>
            )}
            {!isStaff && <button onClick={() => setShowShopInfo(true)} className="btn btn-outline">Update Shop Info</button>}
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
          {!isStaff && (
            <button className={`tab ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
              Products ({products.length})
            </button>
          )}
          {!isStaff && (
            <button className={`tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
              Orders ({orders.length})
            </button>
          )}
          {shop?.pos_enabled && (
            <button className={`tab tab-pos ${activeTab === 'pos' ? 'active' : ''}`} onClick={() => setActiveTab('pos')}>
              POS
            </button>
          )}
          {isBasicOrPremium && !isStaff && (
            <button className={`tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
              Analytics
            </button>
          )}
          {(isBasicOrPremium && shop?.credit_enabled && !isStaff) && (
            <button className={`tab ${activeTab === 'credit' ? 'active' : ''}`} onClick={() => setActiveTab('credit')}>
              Credit
            </button>
          )}
          {isBasicOrPremium && !isStaff && (
            <button className={`tab ${activeTab === 'staff' ? 'active' : ''}`} onClick={() => setActiveTab('staff')}>
              Staff
            </button>
          )}
          {shop?.pos_enabled && !isStaff && (
            <button className={`tab ${activeTab === 'refunds' ? 'active' : ''}`} onClick={() => setActiveTab('refunds')}>
              {t('refunds')}
            </button>
          )}
        </div>

        {/* Low stock alert banner */}
        {lowStockItems.length > 0 && activeTab === 'products' && (
          <div className="closure-notice" style={{ background: '#fef3c7', borderColor: '#fde68a' }}>
            <div className="closure-content">
              <div className="closure-icon">⚠️</div>
              <div className="closure-text">
                <h3>{t('lowStockAlert')}</h3>
                <p>{lowStockItems.map(i => `${i.name} (Size ${i.size}): ${i.quantity} left`).join(' · ')}</p>
                <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={handleSendLowStockSms}>
                  📱 {t('sendLowStockSms')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Products tab */}
        {activeTab === 'products' && (
          <div className="products-section">
            <div className="section-header">
              <h2>My Products</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {atProductLimit && (
                  <span className="plan-limit-badge">
                    {plan} limit: {productLimit} products
                  </span>
                )}
                <button
                  onClick={() => setShowBulkEdit(s => !s)}
                  className="btn btn-outline btn-sm"
                  disabled={!filteredProducts.length}
                >
                  {t('bulkEdit')} {bulkSelected.length > 0 && `(${bulkSelected.length})`}
                </button>
                <button
                  onClick={() => setShowCSVImporter(true)}
                  className="btn btn-outline"
                  disabled={atProductLimit}
                  title="Import products from CSV"
                >
                  {t('importCsv')}
                </button>
                <button
                  onClick={() => setShowProductForm(true)}
                  className="btn btn-primary"
                  disabled={atProductLimit}
                >
                  {t('addProduct')}
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

            {/* Bulk edit panel */}
            {showBulkEdit && (
              <div className="bulk-edit-panel card" style={{ marginBottom: 16 }}>
                <h4 style={{ marginBottom: 12 }}>Bulk Edit Selected Products</h4>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>New Price (KSh)</label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: 120 }}
                      placeholder="Leave blank to keep"
                      value={bulkChanges.price || ''}
                      onChange={e => setBulkChanges(c => ({ ...c, price: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Category</label>
                    <select
                      className="form-input"
                      style={{ width: 140 }}
                      value={bulkChanges.category || ''}
                      onChange={e => setBulkChanges(c => ({ ...c, category: e.target.value || undefined }))}
                    >
                      <option value="">Keep existing</option>
                      {['shoes', 'sandals', 'boots', 'sneakers', 'heels', 'loafers', 'other'].map(c => (
                        <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Stock Status</label>
                    <select
                      className="form-input"
                      style={{ width: 140 }}
                      value={bulkChanges.in_stock === undefined ? '' : String(bulkChanges.in_stock)}
                      onChange={e => setBulkChanges(c => ({ ...c, in_stock: e.target.value === '' ? undefined : e.target.value === 'true' }))}
                    >
                      <option value="">Keep existing</option>
                      <option value="true">Mark In Stock</option>
                      <option value="false">Mark Out of Stock</option>
                    </select>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={handleBulkEdit} disabled={!bulkSelected.length}>
                    Apply to {bulkSelected.length || '...'} products
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => { setBulkSelected([]); setShowBulkEdit(false); }}>
                    Cancel
                  </button>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 8 }}>
                  Select products below by clicking the checkbox icon, then apply changes.
                </p>
              </div>
            )}

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

        {/* Refunds tab */}
        {activeTab === 'refunds' && shop?.pos_enabled && (
          <div className="refunds-section">
            <div className="section-header">
              <h2>{t('refunds')} — Void POS Sales</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                Voiding a sale restores inventory and marks the order as voided.
              </p>
            </div>
            <div className="orders-list">
              {orders
                .filter(o => (o as any).source === 'pos' && o.status !== 'voided')
                .slice(0, 20)
                .map(order => (
                  <div key={order.id} className="order-card card" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{order.product_name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        {order.customer_name} · {order.size} · {new Date(order.created_at).toLocaleDateString('en-KE')}
                      </div>
                      <div style={{ fontSize: '0.85rem' }}>{order.payment_status}</div>
                    </div>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleVoidSale(order.id)}
                    >
                      Void / Refund
                    </button>
                  </div>
                ))}
              {orders.filter(o => (o as any).source === 'pos' && o.status !== 'voided').length === 0 && (
                <p className="text-muted">No POS sales to void.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} userType="shop" />
      )}

      {showShopInfo && shop && (
        <ShopInfoModal shop={shop} onClose={() => setShowShopInfo(false)} onUpdate={loadData} />
      )}

      {showCSVImporter && (
        <CSVImporter onImportComplete={loadData} onClose={() => setShowCSVImporter(false)} />
      )}
    </div>
  );
};

export default ShopDashboard;
