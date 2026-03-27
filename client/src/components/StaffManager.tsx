import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/axiosConfig';
import './StaffManager.css';

interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: 'attendant' | 'manager';
  is_active: boolean;
  created_at: string;
}

interface StaffManagerProps {
  plan: string;
}

const PLAN_LIMITS: Record<string, number> = { free: 0, basic: 1, premium: 3 };

const StaffManager: React.FC<StaffManagerProps> = ({ plan }) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    password: '',
    role: 'attendant'
  });

  const limit = PLAN_LIMITS[plan] ?? 0;
  const activeCount = staff.filter(s => s.is_active).length;

  const loadStaff = useCallback(async () => {
    try {
      const res = await api.get('/staff');
      setStaff(res.data);
    } catch {
      console.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/staff', newStaff);
      setNewStaff({ name: '', email: '', password: '', role: 'attendant' });
      setShowAddForm(false);
      loadStaff();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create staff account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (member: StaffMember) => {
    try {
      await api.put(`/staff/${member.id}`, { is_active: !member.is_active });
      loadStaff();
    } catch {
      alert('Failed to update staff status');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Remove this staff member?')) return;
    try {
      await api.delete(`/staff/${id}`);
      loadStaff();
    } catch {
      alert('Failed to remove staff member');
    }
  };

  if (loading) return <div className="staff-loading">Loading staff...</div>;

  return (
    <div className="staff-manager">
      {/* Plan info banner */}
      <div className="staff-plan-banner">
        <div>
          <p className="spb-title">Staff Accounts</p>
          <p className="spb-desc">
            Your <strong>{plan}</strong> plan allows <strong>{limit}</strong> staff account{limit !== 1 ? 's' : ''}.{' '}
            Using {activeCount} of {limit}.
          </p>
        </div>
        {activeCount < limit && (
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            + Add Staff
          </button>
        )}
      </div>

      {staff.length === 0 ? (
        <div className="staff-empty">
          <p>No staff accounts yet.</p>
          <p className="staff-empty-hint">
            Staff can log in at the same shop login page with their own email and password.
            They'll have access to POS and Orders only.
          </p>
        </div>
      ) : (
        <div className="staff-list">
          {staff.map(member => (
            <div key={member.id} className={`staff-card ${!member.is_active ? 'inactive' : ''}`}>
              <div className="staff-avatar">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div className="staff-info">
                <p className="staff-name">{member.name}</p>
                <p className="staff-email">{member.email}</p>
                <p className="staff-meta">
                  <span className={`role-badge ${member.role}`}>{member.role}</span>
                  {!member.is_active && <span className="inactive-badge">Inactive</span>}
                </p>
              </div>
              <div className="staff-actions">
                <button
                  className={`btn btn-sm ${member.is_active ? 'btn-outline' : 'btn-success'}`}
                  onClick={() => handleToggleActive(member)}
                >
                  {member.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(member.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Staff login info box */}
      <div className="staff-login-info">
        <p className="sli-title">Staff Login</p>
        <p className="sli-desc">
          Staff members log in at the same shop login page using their email and password you set here.
          They can access the <strong>POS</strong> and <strong>Orders</strong> tabs only.
        </p>
      </div>

      {/* Add Staff Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Staff Member</h2>
              <button className="close-btn" onClick={() => setShowAddForm(false)}>×</button>
            </div>
            <form onSubmit={handleAddStaff} className="staff-form">
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input type="text" className="form-input" value={newStaff.name}
                  onChange={e => setNewStaff(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., John Kamau" required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input type="email" className="form-input" value={newStaff.email}
                  onChange={e => setNewStaff(p => ({ ...p, email: e.target.value }))}
                  placeholder="staff@email.com" required />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input type="password" className="form-input" value={newStaff.password}
                  onChange={e => setNewStaff(p => ({ ...p, password: e.target.value }))}
                  placeholder="Set a password for this staff member" required minLength={6} />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-input" value={newStaff.role}
                  onChange={e => setNewStaff(p => ({ ...p, role: e.target.value }))}>
                  <option value="attendant">Attendant (POS + Orders)</option>
                  <option value="manager">Manager (POS + Orders)</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManager;
