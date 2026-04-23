import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../utils/axiosConfig';
import './AuthForm.css';

const CustomerRegister: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/customers/register', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password
      });
      localStorage.setItem('customerToken', res.data.token);
      localStorage.setItem('customer', JSON.stringify(res.data.customer));
      toast.success('Account created successfully!');
      navigate('/customer/orders');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h2>👤 {t('registerAsCustomer')}</h2>
        <form onSubmit={handleSubmit}>
          {(['name', 'email', 'phone'] as const).map(field => (
            <div className="form-group" key={field}>
              <label className="form-label">{field.charAt(0).toUpperCase() + field.slice(1)}{field === 'phone' ? ' (optional)' : ''}</label>
              <input
                type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                className="form-input"
                value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                required={field !== 'phone'}
              />
            </div>
          ))}
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input type="password" className="form-input" value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? t('loading') : t('registerAsCustomer')}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/customer/login">{t('loginAsCustomer')}</Link>
        </p>
      </div>
    </div>
  );
};

export default CustomerRegister;
