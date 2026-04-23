import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';
import './i18n'; // init i18n
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import MobileNav from './components/MobileNav';
import Home from './pages/Home';
import Search from './pages/Search';
import Shops from './pages/Shops';
import ShopProducts from './pages/ShopProducts';
import ShopLogin from './pages/ShopLogin';
import ShopRegister from './pages/ShopRegister';
import ShopDashboard from './pages/ShopDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import CustomerLogin from './pages/CustomerLogin';
import CustomerRegister from './pages/CustomerRegister';
import CustomerOrders from './pages/CustomerOrders';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <ErrorBoundary>
          <div className="App">
            <Header />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/shops" element={<Shops />} />
              <Route path="/shops/:shopId" element={<ShopProducts />} />
              <Route path="/shop/login" element={<ShopLogin />} />
              <Route path="/shop/register" element={<ShopRegister />} />
              <Route path="/shop/dashboard" element={<ShopDashboard />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/customer/login" element={<CustomerLogin />} />
              <Route path="/customer/register" element={<CustomerRegister />} />
              <Route path="/customer/orders" element={<CustomerOrders />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <MobileNav />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3500,
                style: { fontSize: '0.9rem', maxWidth: 360 },
                success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
                error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } }
              }}
            />
          </div>
        </ErrorBoundary>
      </Router>
    </ThemeProvider>
  );
}

export default App;
