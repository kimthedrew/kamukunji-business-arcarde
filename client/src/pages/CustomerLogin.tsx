import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../utils/axiosConfig';
import './AuthForm.css';

const CustomerLogin: React.FC = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/customers/login', form);
      localStorage.setItem('customerToken', res.data.token);
      localStorage.setItem('customer', JSON.stringify(res.data.customer));
      toast.success(`Welcome back, ${res.data.customer.name}!`);
      navigate('/customer/orders');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h2>👤 {t('loginAsCustomer')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? t('loading') : t('loginAsCustomer')}
          </button>
        </form>
        <p className="auth-footer">
          Don't have an account? <Link to="/customer/register">{t('registerAsCustomer')}</Link>
        </p>
      </div>
    </div>
  );
};

export default CustomerLogin;
