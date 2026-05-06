import { useEffect, useState } from 'react';
import api from '../api/client.js';

const ROLE_COLORS = {
  ADMIN:             'badge-danger',
  CUSTOMER:          'badge-info',
  LEAD_TECHNICIAN:   'badge-purple',
  JUNIOR_TECHNICIAN: 'badge-gray',
  DELIVERY_MAN:      'badge-warning',
};

const ROLES = ['ADMIN','CUSTOMER','LEAD_TECHNICIAN','JUNIOR_TECHNICIAN','DELIVERY_MAN'];

export default function AdminUsersPage() {
  const [users, setUsers]   = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]     = useState({ name: '', email: '', password: '', role: 'JUNIOR_TECHNICIAN' });

  async function load() {
    const { data } = await api.get('/admin/users');
    setUsers(data.data.users);
  }

  useEffect(() => { load().catch(() => {}); }, []);

  async function onCreate(e) {
    e.preventDefault();
    await api.post('/admin/users', form);
    setForm({ name: '', email: '', password: '', role: 'JUNIOR_TECHNICIAN' });
    setShowForm(false);
    await load();
  }

  const roleCount = ROLES.reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length;
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>👥 User Management</h1>
          <p>সকল ব্যবহারকারী পরিচালনা করুন</p>
        </div>
        <button className="primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕' : '+ নতুন ব্যবহারকারী'}
        </button>
      </div>

      {/* Role stats */}
      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        {[
          { role: 'ADMIN',             icon: '🛡️', label: 'Admins' },
          { role: 'CUSTOMER',          icon: '👤', label: 'Customers' },
          { role: 'LEAD_TECHNICIAN',   icon: '🔧', label: 'Lead Techs' },
          { role: 'JUNIOR_TECHNICIAN', icon: '👨‍🔧', label: 'Junior Techs' },
          { role: 'DELIVERY_MAN',      icon: '🚚', label: 'Delivery' },
        ].map(({ role, icon, label }) => (
          <div key={role} className="stat-card">
            <div className="stat-icon">{icon}</div>
            <div className="stat-value">{roleCount[role] || 0}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Create user form */}
      {showForm && (
        <div className="card" style={{ borderTop: '3px solid var(--primary)', marginBottom: '1.5rem' }}>
          <div className="card-title">➕ নতুন ব্যবহারকারী তৈরি করুন</div>
          <form onSubmit={onCreate}>
            <div className="form-grid">
              <div>
                <label>নাম</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required style={{ maxWidth: '100%' }} />
              </div>
              <div>
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required style={{ maxWidth: '100%' }} />
              </div>
              <div>
                <label>Password</label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required style={{ maxWidth: '100%' }} />
              </div>
              <div>
                <label>Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ maxWidth: '100%' }}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <button className="primary" type="submit" style={{ marginTop: '0.5rem' }}>✅ তৈরি করুন</button>
          </form>
        </div>
      )}

      {/* Users table */}
      <div className="card">
        <div className="card-title">📋 সকল ব্যবহারকারী ({users.length})</div>
        <table>
          <thead>
            <tr><th>নাম</th><th>Email</th><th>Role</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id}>
                <td style={{ fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: 'var(--gradient)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {u.name?.slice(0,2).toUpperCase()}
                    </div>
                    {u.name}
                  </div>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{u.email}</td>
                <td><span className={`badge ${ROLE_COLORS[u.role] || 'badge-gray'}`}>{u.role}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
