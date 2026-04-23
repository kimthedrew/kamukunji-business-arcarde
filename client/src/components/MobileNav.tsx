import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './MobileNav.css';

const MobileNav: React.FC = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/shop/dashboard') || location.pathname.startsWith('/admin/dashboard');

  // Hide on dashboard — dashboard has its own tabs
  if (isDashboard) return null;

  const links = [
    { to: '/',       icon: '🏠', label: 'Home' },
    { to: '/search', icon: '🔍', label: 'Search' },
    { to: '/shops',  icon: '🏪', label: 'Shops' },
    { to: '/customer/orders', icon: '📋', label: 'Orders' },
  ];

  return (
    <nav className="mobile-nav">
      {links.map(link => (
        <Link
          key={link.to}
          to={link.to}
          className={`mobile-nav-item ${location.pathname === link.to ? 'active' : ''}`}
        >
          <span className="mobile-nav-icon">{link.icon}</span>
          <span className="mobile-nav-label">{link.label}</span>
        </Link>
      ))}
    </nav>
  );
};

export default MobileNav;
