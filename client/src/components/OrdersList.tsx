import React from 'react';
import './OrdersList.css';

interface Order {
  id: number;
  customer_name: string;
  customer_contact: string;
  product_name: string;
  size: string;
  status: string;
  notes: string;
  created_at: string;
}

interface OrdersListProps {
  orders: Order[];
  onUpdateStatus: (orderId: number, status: string) => void;
}

const OrdersList: React.FC<OrdersListProps> = ({ orders, onUpdateStatus }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'status-pending';
      case 'confirmed':
        return 'status-confirmed';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (orders.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <h3>No orders yet</h3>
        <p>Orders from customers will appear here</p>
      </div>
    );
  }

  return (
    <div className="orders-list">
      <div className="orders-grid">
        {orders.map((order) => (
          <div key={order.id} className="order-card">
            <div className="order-header">
              <div className="order-info">
                <h3 className="customer-name">{order.customer_name}</h3>
                <p className="order-date">{formatDate(order.created_at)}</p>
              </div>
              <div className={`status-badge ${getStatusColor(order.status)}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </div>
            </div>

            <div className="order-details">
              <div className="detail-row">
                <span className="label">Product:</span>
                <span className="value">{order.product_name}</span>
              </div>
              <div className="detail-row">
                <span className="label">Size:</span>
                <span className="value">{order.size}</span>
              </div>
              <div className="detail-row">
                <span className="label">Contact:</span>
                <span className="value">{order.customer_contact}</span>
              </div>
              {order.notes && (
                <div className="detail-row">
                  <span className="label">Notes:</span>
                  <span className="value">{order.notes}</span>
                </div>
              )}
            </div>

            <div className="order-actions">
              <select
                value={order.status}
                onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                className="status-select"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrdersList;
