import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ShopLogin.css';

const ShopLogin: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:8000/api/auth/login', formData);
      
      // Store token and shop info
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('shop', JSON.stringify(response.data.shop));
      
      // Redirect to dashboard
      navigate('/shop/dashboard');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  return (
    <div className="shop-login">
      <div className="container">
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <h1>Shop Login</h1>
              <p>Access your shop dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {error && (
                <div className="alert alert-error">
                  {error}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary login-btn"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="login-footer">
              <p>Don't have a shop account?</p>
              <button 
                onClick={() => navigate('/shop/register')}
                className="btn btn-outline"
              >
                Register Your Shop
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopLogin;

