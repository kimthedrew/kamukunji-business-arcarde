import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import './Header.css';

const Header: React.FC = () => {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const isShopDashboard  = location.pathname.startsWith('/shop/dashboard');
  const isAdminDashboard = location.pathname.startsWith('/admin/dashboard');
  const isCustomerLoggedIn = !!localStorage.getItem('customerToken');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('shop');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customer');
    window.location.href = '/';
  };

  const toggleLang = () => {
    const next = i18n.language === 'en' ? 'sw' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('kba_lang', next);
  };

  const controls = (
    <div className="header-controls">
      <button
        className="icon-btn"
        onClick={toggleTheme}
        title={theme === 'dark' ? t('lightMode') : t('darkMode')}
        aria-label="Toggle dark mode"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <button
        className="icon-btn lang-btn"
        onClick={toggleLang}
        title={t('language')}
        aria-label="Toggle language"
      >
        {i18n.language === 'en' ? 'SW' : 'EN'}
      </button>
    </div>
  );

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo">
            <span className="logo-icon">👟</span>
            <span className="logo-text">KBA</span>
            <span className="logo-full">Kamukunji Business Arcade</span>
          </Link>

          {/* Hamburger (mobile) */}
          <button
            className="hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>

          <nav className={`nav ${menuOpen ? 'nav-open' : ''}`}>
            {isShopDashboard ? (
              <>
                <Link to="/shop/dashboard" className="nav-link" onClick={() => setMenuOpen(false)}>{t('dashboard')}</Link>
                <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}>{t('backToStore')}</Link>
                <button onClick={handleLogout} className="nav-link logout-btn">{t('logout')}</button>
              </>
            ) : isAdminDashboard ? (
              <>
                <Link to="/admin/dashboard" className="nav-link" onClick={() => setMenuOpen(false)}>{t('dashboard')}</Link>
                <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}>{t('backToStore')}</Link>
                <button onClick={handleLogout} className="nav-link logout-btn">{t('logout')}</button>
              </>
            ) : (
              <>
                <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}>{t('home')}</Link>
                <Link to="/search" className="nav-link" onClick={() => setMenuOpen(false)}>{t('search')}</Link>
                <Link to="/shops" className="nav-link" onClick={() => setMenuOpen(false)}>{t('shops')}</Link>
                {isCustomerLoggedIn ? (
                  <>
                    <Link to="/customer/orders" className="nav-link" onClick={() => setMenuOpen(false)}>{t('myOrders')}</Link>
                    <button onClick={handleLogout} className="nav-link logout-btn">{t('logout')}</button>
                  </>
                ) : (
                  <Link to="/customer/login" className="nav-link" onClick={() => setMenuOpen(false)}>{t('loginAsCustomer')}</Link>
                )}
                <Link to="/shop/login" className="nav-link shop-link" onClick={() => setMenuOpen(false)}>{t('shopLogin')}</Link>
                <Link to="/admin/login" className="nav-link admin-link" onClick={() => setMenuOpen(false)}>{t('admin')}</Link>
              </>
            )}
            {controls}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
