import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../utils/axiosConfig';
import Skeleton from './Skeleton';
import './ShopReviews.css';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_name: string;
  created_at: string;
}

interface ShopReviewsProps {
  shopId: string | number;
  avgRating?: number;
  reviewCount?: number;
}

const StarRating: React.FC<{ value: number; onChange?: (v: number) => void; size?: string }> = ({ value, onChange, size = '1.4rem' }) => (
  <span className="star-rating" style={{ fontSize: size }}>
    {[1, 2, 3, 4, 5].map(i => (
      <span
        key={i}
        className={i <= value ? 'star filled' : 'star'}
        onClick={() => onChange?.(i)}
        style={{ cursor: onChange ? 'pointer' : 'default' }}
      >
        {i <= value ? '★' : '☆'}
      </span>
    ))}
  </span>
);

const ShopReviews: React.FC<ShopReviewsProps> = ({ shopId, avgRating = 0, reviewCount = 0 }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({ rating: 0, comment: '', reviewer_name: '' });
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();

  useEffect(() => { loadReviews(1); }, [shopId]);

  const loadReviews = async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/reviews/shop/${shopId}?page=${p}&limit=5`);
      setReviews(res.data.reviews);
      setTotal(res.data.total);
      setPage(p);
    } catch { /* non-critical */ }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rating) { toast.error('Please select a rating'); return; }
    setSubmitting(true);
    try {
      await api.post(`/reviews/shop/${shopId}`, form);
      toast.success('Review submitted!');
      setShowForm(false);
      setForm({ rating: 0, comment: '', reviewer_name: '' });
      loadReviews(1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / 5);

  return (
    <div className="shop-reviews">
      <div className="reviews-header">
        <div className="reviews-summary">
          <h3>{t('reviews')} ({total})</h3>
          {avgRating > 0 && (
            <div className="avg-rating">
              <StarRating value={Math.round(avgRating)} size="1.2rem" />
              <span className="avg-num">{avgRating.toFixed(1)}</span>
            </div>
          )}
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => setShowForm(s => !s)}>
          {showForm ? t('cancel') : t('writeReview')}
        </button>
      </div>

      {showForm && (
        <form className="review-form card" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('yourRating')}</label>
            <StarRating value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} size="2rem" />
          </div>
          <div className="form-group">
            <label className="form-label">{t('yourName')}</label>
            <input
              className="form-input"
              placeholder="Anonymous"
              value={form.reviewer_name}
              onChange={e => setForm(f => ({ ...f, reviewer_name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('yourComment')}</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={form.comment}
              onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              {submitting ? t('loading') : t('submitReview')}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>{t('cancel')}</button>
          </div>
        </form>
      )}

      <div className="reviews-list">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="review-item">
              <Skeleton variant="text" width="30%" />
              <Skeleton variant="text" count={2} />
            </div>
          ))
        ) : reviews.length === 0 ? (
          <p className="no-reviews text-muted">{t('noReviews')}</p>
        ) : (
          reviews.map(r => (
            <div key={r.id} className="review-item">
              <div className="review-top">
                <strong className="reviewer-name">{r.reviewer_name}</strong>
                <StarRating value={r.rating} size="1rem" />
                <span className="review-date text-muted">{new Date(r.created_at).toLocaleDateString('en-KE')}</span>
              </div>
              {r.comment && <p className="review-comment">{r.comment}</p>}
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="reviews-pagination">
          <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => loadReviews(page - 1)}>← Prev</button>
          <span className="text-muted">{page}/{totalPages}</span>
          <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => loadReviews(page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
};

export default ShopReviews;
