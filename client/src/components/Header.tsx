import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

const Header: React.FC = () => {
  const location = useLocation();

  const isShopDashboard = location.pathname.startsWith('/shop/dashboard');
  const isAdminDashboard = location.pathname.startsWith('/admin/dashboard');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('shop');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    window.location.href = '/';
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo">
            <h1>Kamukunji Business Arcade</h1>
          </Link>
          
          <nav className="nav">
            {isShopDashboard ? (
              // Shop owner logged in - show shop navigation
              <>
                <Link to="/shop/dashboard" className="nav-link">Dashboard</Link>
                <Link to="/" className="nav-link">Back to Store</Link>
                <button onClick={handleLogout} className="nav-link logout-btn">Logout</button>
              </>
            ) : isAdminDashboard ? (
              // Admin logged in - show admin navigation
              <>
                <Link to="/admin/dashboard" className="nav-link">Dashboard</Link>
                <Link to="/" className="nav-link">Back to Store</Link>
                <button onClick={handleLogout} className="nav-link logout-btn">Logout</button>
              </>
            ) : (
              // Public navigation - show login links
              <>
                <Link to="/" className="nav-link">Home</Link>
                <Link to="/search" className="nav-link">Search Shoes</Link>
                <Link to="/shops" className="nav-link">Shops</Link>
                <Link to="/shop/register" className="nav-link">Shop Register</Link>
                <Link to="/shop/login" className="nav-link shop-link">Shop Login</Link>
                <Link to="/admin/login" className="nav-link admin-link">Admin</Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
