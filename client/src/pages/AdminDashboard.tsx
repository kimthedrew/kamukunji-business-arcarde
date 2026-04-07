import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axiosConfig';
import ShopList from '../components/ShopList';
import ChangePasswordModal from '../components/ChangePasswordModal';
import './AdminDashboard.css';

interface Shop {
  id: number;
  shop_number: string;
  shop_name: string;
  contact: string;
  email: string;
  status: string;
  created_at: string;
  plan?: string;
  subscription_status?: string;
  monthly_fee?: number;
  subscription_end_date?: string;
  pos_enabled?: boolean;
  credit_enabled?: boolean;
  is_featured?: boolean;
}

interface Stats {
  totalShops: number;
  activeShops: number;
  totalProducts: number;
  totalOrders: number;
  featuredShops?: number;
  monthlyRevenue?: number;
  planBreakdown?: { free: number; basic: number; premium: number };
}

const AdminDashboard: React.FC = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [filteredShops, setFilteredShops] = useState<Shop[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }
    loadData();
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredShops(shops);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredShops(shops.filter(shop =>
        shop.shop_name.toLowerCase().includes(q) ||
        shop.shop_number.toLowerCase().includes(q) ||
        shop.contact.toLowerCase().includes(q) ||
        shop.email.toLowerCase().includes(q)
      ));
    }
  }, [searchQuery, shops]);

  const loadData = async () => {
    try {
      const [shopsRes, statsRes] = await Promise.all([
        api.get('/admin/shops'),
        api.get('/admin/stats')
      ]);
      const shopData = Array.isArray(shopsRes.data) ? shopsRes.data : [];
      setShops(shopData);
      setFilteredShops(shopData);
      setStats(statsRes.data);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin');
        navigate('/admin/login');
      } else {
        setFetchError(error.response?.data?.message || error.message || 'Failed to load shops from server.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    navigate('/admin/login');
  };

  const handleShopStatusUpdate = async (shopId: number, status: string) => {
    try {
      await api.put(`/admin/shops/${shopId}/status`, { status });
      loadData();
    } catch (error) {
      console.error('Failed to update shop status:', error);
    }
  };

  const handleSubscriptionUpdate = async (shopId: number, plan: string, monthlyFee: number, endDate: string) => {
    try {
      await api.put(`/admin/shops/${shopId}/subscription`, {
        plan,
        monthly_fee: monthlyFee,
        status: 'active',
        end_date: endDate || null
      });
      loadData();
    } catch (error) {
      console.error('Failed to update subscription:', error);
    }
  };

  const handleFeaturesUpdate = async (shopId: number, features: { pos_enabled?: boolean; credit_enabled?: boolean; is_featured?: boolean }) => {
    try {
      await api.put(`/admin/shops/${shopId}/features`, features);
      loadData();
    } catch (error) {
      console.error('Failed to update features:', error);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="container">
          <div className="loading">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="container">
        <div className="dashboard-header">
          <div className="admin-info">
            <h1>Admin Dashboard</h1>
            <p>Manage Kamukunji Business Arcade</p>
          </div>
          <div className="header-actions">
            <button onClick={() => setShowChangePassword(true)} className="btn btn-outline">
              Change Password
            </button>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>

        <div className="dashboard-tabs">
          <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            Overview
          </button>
          <button className={`tab ${activeTab === 'shops' ? 'active' : ''}`} onClick={() => setActiveTab('shops')}>
            Shops ({shops.length})
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">🏪</div>
                <div className="stat-content">
                  <h3>{stats?.totalShops || 0}</h3>
                  <p>Total Shops</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-content">
                  <h3>{stats?.activeShops || 0}</h3>
                  <p>Active Shops</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👟</div>
                <div className="stat-content">
                  <h3>{stats?.totalProducts || 0}</h3>
                  <p>Total Products</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📋</div>
                <div className="stat-content">
                  <h3>{stats?.totalOrders || 0}</h3>
                  <p>Total Orders</p>
                </div>
              </div>
              {stats?.featuredShops !== undefined && (
                <div className="stat-card">
                  <div className="stat-icon">⭐</div>
                  <div className="stat-content">
                    <h3>{stats.featuredShops}</h3>
                    <p>Featured Shops</p>
                  </div>
                </div>
              )}
              {stats?.monthlyRevenue !== undefined && (
                <div className="stat-card">
                  <div className="stat-icon">💰</div>
                  <div className="stat-content">
                    <h3>KSh {stats.monthlyRevenue.toLocaleString()}</h3>
                    <p>Monthly Revenue</p>
                  </div>
                </div>
              )}
              {stats?.planBreakdown && (
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-content">
                    <h3>
                      <span style={{ color: '#6b7280' }}>{stats.planBreakdown.free}F</span>
                      {' · '}
                      <span style={{ color: '#3b82f6' }}>{stats.planBreakdown.basic}B</span>
                      {' · '}
                      <span style={{ color: '#7c3aed' }}>{stats.planBreakdown.premium}P</span>
                    </h3>
                    <p>Plan Breakdown</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'shops' && (
          <div className="shops-section">
            <div className="section-header">
              <h2>Shop Management</h2>
              <p>Manage shop registrations, subscriptions, and features</p>
            </div>

            <div className="search-section">
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search shops by name, number, contact, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <div className="search-icon">🔍</div>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="clear-search-btn" title="Clear search">✕</button>
                )}
              </div>
              {searchQuery && (
                <p className="search-results">Showing {filteredShops.length} of {shops.length} shops</p>
              )}
            </div>

            {fetchError && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                Could not load shops: {fetchError}
              </div>
            )}
            <ShopList
              shops={filteredShops}
              onStatusUpdate={handleShopStatusUpdate}
              onSubscriptionUpdate={handleSubscriptionUpdate}
              onFeaturesUpdate={handleFeaturesUpdate}
            />
          </div>
        )}
      </div>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} userType="admin" />
      )}
    </div>
  );
};

export default AdminDashboard;
