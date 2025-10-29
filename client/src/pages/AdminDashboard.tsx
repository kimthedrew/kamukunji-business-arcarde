import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
}

interface Stats {
  totalShops: number;
  activeShops: number;
  totalProducts: number;
  totalOrders: number;
}

const AdminDashboard: React.FC = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [filteredShops, setFilteredShops] = useState<Shop[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
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

  // Filter shops based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredShops(shops);
    } else {
      const filtered = shops.filter(shop =>
        shop.shop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.shop_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredShops(filtered);
    }
  }, [searchQuery, shops]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const loadData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const headers = { Authorization: `Bearer ${token}` };

      console.log('Loading admin data with token:', token ? 'present' : 'missing');

      const [shopsRes, statsRes] = await Promise.all([
        axios.get('/api/admin/shops', { headers }),
        axios.get('/api/admin/stats', { headers })
      ]);

      console.log('Shops response:', shopsRes.data);
      console.log('Stats response:', statsRes.data);

      setShops(shopsRes.data);
      setFilteredShops(shopsRes.data);
      setStats(statsRes.data);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin');
        navigate('/admin/login');
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
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/admin/shops/${shopId}/status`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadData();
    } catch (error) {
      console.error('Failed to update shop status:', error);
    }
  };

  const handleSubscriptionUpdate = async (shopId: number, plan: string, monthlyFee: number) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/admin/shops/${shopId}/subscription`, 
        { plan, monthly_fee: monthlyFee, status: 'active' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadData();
    } catch (error) {
      console.error('Failed to update subscription:', error);
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

        <div className="dashboard-tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab ${activeTab === 'shops' ? 'active' : ''}`}
            onClick={() => setActiveTab('shops')}
          >
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
            </div>
          </div>
        )}

        {activeTab === 'shops' && (
          <div className="shops-section">
            <div className="section-header">
              <h2>Shop Management</h2>
              <p>Manage shop registrations and subscriptions</p>
            </div>

            <div className="search-section">
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search shops by name, number, contact, or email..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="search-input"
                />
                <div className="search-icon">🔍</div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="clear-search-btn"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="search-results">
                  Showing {filteredShops.length} of {shops.length} shops
                </p>
              )}
            </div>

            <ShopList
              shops={filteredShops}
              onStatusUpdate={handleShopStatusUpdate}
              onSubscriptionUpdate={handleSubscriptionUpdate}
            />
          </div>
        )}
      </div>

      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          userType="admin"
        />
      )}
    </div>
  );
};

export default AdminDashboard;
