import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ShopRegister.css';

const ShopRegister: React.FC = () => {
  const [formData, setFormData] = useState({
    shop_number: '',
    shop_name: '',
    contact: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    setSuccess('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...registrationData } = formData;
      await axios.post('http://localhost:5000/api/auth/register', registrationData);
      
      setSuccess('Shop registered successfully! You can now login.');
      setTimeout(() => {
        navigate('/shop/login');
      }, 2000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  return (
    <div className="shop-register">
      <div className="container">
        <div className="register-container">
          <div className="register-card">
            <div className="register-header">
              <h1>Register Your Shop</h1>
              <p>Join Kamukunji Business Arcade marketplace</p>
            </div>

            <form onSubmit={handleSubmit} className="register-form">
              {error && (
                <div className="alert alert-error">
                  {error}
                </div>
              )}

              {success && (
                <div className="alert alert-success">
                  {success}
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Shop Number *</label>
                  <input
                    type="text"
                    name="shop_number"
                    value={formData.shop_number}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g., A-15, B-23"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Shop Name *</label>
                  <input
                    type="text"
                    name="shop_name"
                    value={formData.shop_name}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Your shop name"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Contact Number *</label>
                <input
                  type="tel"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., 0712345678"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="At least 6 characters"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary register-btn"
                disabled={loading}
              >
                {loading ? 'Registering...' : 'Register Shop'}
              </button>
            </form>

            <div className="register-footer">
              <p>Already have a shop account?</p>
              <button 
                onClick={() => navigate('/shop/login')}
                className="btn btn-outline"
              >
                Login Instead
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopRegister;

