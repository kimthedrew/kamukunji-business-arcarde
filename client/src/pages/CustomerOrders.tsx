import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../utils/axiosConfig';
import Skeleton, { TableRowSkeleton } from '../components/Skeleton';
import './CustomerOrders.css';

interface CustomerOrder {
  id: string;
  product_name: string;
  image_url: string;
  price: number;
  size: string;
  status: string;
  payment_status: string;
  shop_name: string;
  shop_number: string;
  shop_contact: string;
  sale_amount: number;
  created_at: string;
}

const CustomerOrders: React.FC = () => {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [customer, setCustomer] = useState<any>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const LIMIT = 10;

  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    const cust = localStorage.getItem('customer');
    if (!token || !cust) { navigate('/customer/login'); return; }
    setCustomer(JSON.parse(cust));
    loadOrders(1);
  }, [navigate]);

  const loadOrders = async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/customers/orders?page=${p}&limit=${LIMIT}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('customerToken')}` }
      });
      setOrders(res.data.orders);
      setTotal(res.data.total);
      setPage(p);
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/customer/login');
      } else {
        toast.error('Failed to load orders');
      }
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (s: string) => ({
    completed: '#16a34a', pending: '#d97706', cancelled: '#dc2626', voided: '#6b7280'
  }[s] || '#6b7280');

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="customer-orders-page">
      <div className="container">
        <div className="page-header">
          <h1>📋 {t('myOrders')}</h1>
          {customer && <p className="text-muted">Welcome, {customer.name}</p>}
        </div>

        {loading ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="order-card card">
                <Skeleton variant="title" />
                <Skeleton variant="text" count={3} />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state card">
            <div style={{ fontSize: '3rem' }}>📦</div>
            <h3>No orders yet</h3>
            <p>Your order history will appear here once you place orders.</p>
            <button className="btn btn-primary" onClick={() => navigate('/search')}>Browse Shoes</button>
          </div>
        ) : (
          <>
            <div className="orders-list">
              {orders.map(order => (
                <div key={order.id} className="order-card card">
                  <div className="order-card-body">
                    {order.image_url && (
                      <img src={order.image_url} alt={order.product_name} className="order-image" />
                    )}
                    <div className="order-details">
                      <div className="order-product-name">{order.product_name}</div>
                      <div className="order-meta">
                        <span>Size: <strong>{order.size || 'N/A'}</strong></span>
                        <span>KSh {Number(order.sale_amount || order.price).toLocaleString()}</span>
                      </div>
                      <div className="order-meta">
                        <span>Shop: {order.shop_name} #{order.shop_number}</span>
                        <span>📞 {order.shop_contact}</span>
                      </div>
                      <div className="order-footer">
                        <span className="order-status" style={{ color: statusColor(order.status) }}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                        <span className="order-date">{new Date(order.created_at).toLocaleDateString('en-KE')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => loadOrders(page - 1)}>← Prev</button>
                <span className="page-info">{page} / {totalPages}</span>
                <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => loadOrders(page + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerOrders;
