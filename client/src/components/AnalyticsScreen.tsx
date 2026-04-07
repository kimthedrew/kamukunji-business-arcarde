import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/axiosConfig';
import './AnalyticsScreen.css';

interface RevenuePoint { label: string; revenue: number; sales: number; }
interface RevenueSummary {
  period: string;
  total_revenue: number;
  total_sales: number;
  average_order_value: number;
  revenue_by_period: RevenuePoint[];
}
interface BestSeller {
  product_id: number;
  name: string;
  image_url?: string;
  category?: string;
  units_sold: number;
  revenue: number;
}
interface LowStockItem {
  id: number;
  name: string;
  image_url?: string;
  low_stock_sizes: { size: string; quantity: number }[];
}

type Period = 'day' | 'week' | 'month';
type Tab = 'revenue' | 'bestsellers' | 'lowstock';

const AnalyticsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('revenue');
  const [period, setPeriod] = useState<Period>('week');
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [bestsellers, setBestsellers] = useState<BestSeller[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadRevenue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/analytics/revenue?period=${period}`);
      setRevenue(res.data);
    } catch {
      setError('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  const loadBestsellers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/analytics/bestsellers?period=${period}`);
      setBestsellers(res.data);
    } catch {
      setError('Failed to load bestsellers');
    } finally {
      setLoading(false);
    }
  }, [period]);

  const loadLowStock = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/analytics/lowstock?threshold=5');
      setLowStock(res.data);
    } catch {
      setError('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'revenue') loadRevenue();
    else if (activeTab === 'bestsellers') loadBestsellers();
    else loadLowStock();
  }, [activeTab, period, loadRevenue, loadBestsellers, loadLowStock]);

  const maxRevenue = revenue?.revenue_by_period?.reduce((m, p) => Math.max(m, p.revenue), 1) || 1;

  return (
    <div className="analytics-screen">
      <div className="analytics-tabs">
        <button className={`atab ${activeTab === 'revenue' ? 'active' : ''}`} onClick={() => setActiveTab('revenue')}>Revenue</button>
        <button className={`atab ${activeTab === 'bestsellers' ? 'active' : ''}`} onClick={() => setActiveTab('bestsellers')}>Best Sellers</button>
        <button className={`atab ${activeTab === 'lowstock' ? 'active' : ''}`} onClick={() => setActiveTab('lowstock')}>Low Stock</button>
      </div>

      {(activeTab === 'revenue' || activeTab === 'bestsellers') && (
        <div className="period-selector">
          {(['day', 'week', 'month'] as Period[]).map(p => (
            <button
              key={p}
              className={`period-btn ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === 'day' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      )}

      {loading && <div className="analytics-loading">Loading...</div>}
      {error && <div className="analytics-error">{error}</div>}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && !loading && revenue && (
        <div className="revenue-view">
          <div className="revenue-summary-cards">
            <div className="rev-card">
              <p className="rev-card-label">Total Revenue</p>
              <p className="rev-card-value">KSh {revenue.total_revenue.toLocaleString()}</p>
            </div>
            <div className="rev-card">
              <p className="rev-card-label">Total Sales</p>
              <p className="rev-card-value">{revenue.total_sales}</p>
            </div>
            <div className="rev-card">
              <p className="rev-card-label">Avg. Order Value</p>
              <p className="rev-card-value">KSh {revenue.average_order_value.toLocaleString()}</p>
            </div>
          </div>

          {revenue.revenue_by_period.length > 0 ? (
            <div className="revenue-chart">
              <h3 className="chart-title">Revenue by {period === 'day' ? 'Hour' : 'Day'}</h3>
              <div className="bar-chart">
                {revenue.revenue_by_period.map(point => (
                  <div key={point.label} className="bar-group">
                    <div className="bar-wrap">
                      <div
                        className="bar"
                        style={{ height: `${Math.max(4, (point.revenue / maxRevenue) * 160)}px` }}
                        title={`KSh ${point.revenue.toLocaleString()} — ${point.sales} sale${point.sales !== 1 ? 's' : ''}`}
                      />
                    </div>
                    <p className="bar-label">{point.label}</p>
                    <p className="bar-value">KSh {point.revenue.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="analytics-empty">No POS sales recorded for this period.</div>
          )}
        </div>
      )}

      {/* Best Sellers Tab */}
      {activeTab === 'bestsellers' && !loading && (
        <div className="bestsellers-view">
          {bestsellers.length === 0 ? (
            <div className="analytics-empty">No sales data for this period.</div>
          ) : (
            <div className="bs-list">
              {bestsellers.map((item, i) => (
                <div key={item.product_id} className="bs-row">
                  <div className="bs-rank">#{i + 1}</div>
                  {item.image_url && (
                    <img src={item.image_url} alt={item.name} className="bs-img" />
                  )}
                  <div className="bs-info">
                    <p className="bs-name">{item.name}</p>
                    <p className="bs-meta">{item.category}</p>
                  </div>
                  <div className="bs-stats">
                    <p className="bs-units">{item.units_sold} sold</p>
                    <p className="bs-revenue">KSh {Math.round(item.revenue).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Low Stock Tab */}
      {activeTab === 'lowstock' && !loading && (
        <div className="lowstock-view">
          {lowStock.length === 0 ? (
            <div className="analytics-empty">All products are well-stocked.</div>
          ) : (
            <>
              <div className="lowstock-header">
                <p className="lowstock-note">Sizes with 5 or fewer units remaining</p>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    '*Restock Reminder*\n\nThe following items need restocking:\n\n' +
                    lowStock.map(item =>
                      `• ${item.name}\n  ${item.low_stock_sizes.map(s =>
                        `Size ${s.size}: ${s.quantity === 0 ? 'OUT OF STOCK' : `${s.quantity} left`}`
                      ).join(', ')}`
                    ).join('\n')
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-wa-restock"
                >
                  📲 WhatsApp Restock Reminder
                </a>
              </div>
              <div className="ls-list">
                {lowStock.map(item => (
                  <div key={item.id} className="ls-row">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name} className="ls-img" />
                    )}
                    <div className="ls-info">
                      <p className="ls-name">{item.name}</p>
                      <div className="ls-sizes">
                        {item.low_stock_sizes.map(s => (
                          <span
                            key={s.size}
                            className={`ls-size-badge ${s.quantity === 0 ? 'out' : s.quantity <= 2 ? 'critical' : 'low'}`}
                          >
                            Size {s.size}: {s.quantity === 0 ? 'Out' : `${s.quantity} left`}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyticsScreen;
