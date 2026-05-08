import { useEffect, useState } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useNavigate } from 'react-router-dom';

/* ── Constants ─────────────────────────────────────── */
const STATUS_LABELS = {
  PENDING_PICKUP:            '⏳ Waiting for Pickup',
  GOING_TO_CUSTOMER:         '🚗 Going to Customer',
  PICKED_UP:                 '📦 Device Picked Up',
  AT_WAREHOUSE:              '🏭 At Warehouse',
  PENDING_TECH_DELIVERY:     '⏳ Waiting for Tech Delivery',
  GOING_TO_TECHNICIAN:       '🔧 Going to Technician',
  AT_TECHNICIAN:             '👨‍🔧 With Technician',
  PENDING_RETURN:            '⏳ Waiting for Return Pickup',
  GOING_TO_WAREHOUSE_RETURN: '🚗 Returning to Warehouse',
  AT_WAREHOUSE_FINAL:        '🏭 Final Check',
  PENDING_CUSTOMER_DELIVERY: '⏳ Waiting for Delivery',
  OUT_FOR_DELIVERY:          '🚚 Out for Delivery',
  DELIVERED:                 '🎉 Delivered',
  CANCELLED:                 '❌ Cancelled',
};

const LEG_LABELS = {
  PENDING_PICKUP:            'Leg 1 — Pick up from Customer',
  GOING_TO_CUSTOMER:         'Leg 1 — Pick up from Customer',
  PICKED_UP:                 'Leg 1 — Pick up from Customer',
  AT_WAREHOUSE:              'Leg 1 — Pick up from Customer',
  PENDING_TECH_DELIVERY:     'Leg 2 — Deliver to Technician',
  GOING_TO_TECHNICIAN:       'Leg 2 — Deliver to Technician',
  AT_TECHNICIAN:             'Leg 2 — Deliver to Technician',
  PENDING_RETURN:            'Leg 3 — Return to Warehouse',
  GOING_TO_WAREHOUSE_RETURN: 'Leg 3 — Return to Warehouse',
  AT_WAREHOUSE_FINAL:        'Leg 3 — Return to Warehouse',
  PENDING_CUSTOMER_DELIVERY: 'Leg 4 — Deliver to Customer',
  OUT_FOR_DELIVERY:          'Leg 4 — Deliver to Customer',
  DELIVERED:                 'Leg 4 — Complete',
};

const NEXT_STATUS = {
  GOING_TO_CUSTOMER:         'PICKED_UP',
  PICKED_UP:                 'AT_WAREHOUSE',
  GOING_TO_TECHNICIAN:       'AT_TECHNICIAN',
  GOING_TO_WAREHOUSE_RETURN: 'AT_WAREHOUSE_FINAL',
  OUT_FOR_DELIVERY:          'DELIVERED',
};

const NEXT_LABEL = {
  PICKED_UP:          'Arrived at Warehouse',
  AT_TECHNICIAN:      'Device Handed to Technician',
  AT_WAREHOUSE_FINAL: 'Arrived at Warehouse (Final)',
  DELIVERED:          'Device Delivered to Customer',
};

const METHOD_ICONS = { CARD: '💳', MOBILE_BANKING: '📱', DEMO: '🧪' };

function fmtBDT(n) { return `৳ ${Number(n||0).toLocaleString('en-BD',{minimumFractionDigits:2})}`; }
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-BD',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

/* ── Main Component ────────────────────────────────── */
export default function DeliveryManPage() {
  const { user, logout }  = useAuth();
  const { theme, toggle } = useTheme();
  const nav               = useNavigate();
  const isLight           = theme === 'light';
  const [activeTab, setActiveTab]     = useState('available');
  const [myJobs, setMyJobs]           = useState([]);
  const [availableJobs, setAvail]     = useState([]);
  const [payHistory, setPayHistory]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [payLoading, setPayLoading]   = useState(false);
  const [search, setSearch]           = useState('');
  const [confirmJobId, setConfirmJobId]     = useState(null); // for accept job confirm
  const [confirmNextId, setConfirmNextId]   = useState(null); // for mark next confirm

  async function fetchJobs() {
    try {
      const [mine, avail] = await Promise.all([api.get('/delivery/my-jobs'), api.get('/delivery/available')]);
      setMyJobs(mine.data.data.jobs || []);
      setAvail(avail.data.data.jobs || []);
    } catch (ex) { console.error(ex.message); }
    finally { setLoading(false); }
  }

  async function fetchPay() {
    setPayLoading(true);
    try {
      const r = await api.get('/delivery/payment-history');
      setPayHistory(r.data.data.history || []);
    } catch (ex) { console.error(ex.message); }
    finally { setPayLoading(false); }
  }

  useEffect(() => { fetchJobs(); const t = setInterval(fetchJobs, 30000); return () => clearInterval(t); }, []);
  useEffect(() => { if (activeTab === 'payment-history' && payHistory.length === 0) fetchPay(); }, [activeTab]);

  async function acceptJob(id) {
    try {
      await api.post(`/delivery/${id}/accept`);
      setConfirmJobId(null);
      await fetchJobs();
      window.alert('Job accepted!');
    } catch (ex) {
      setConfirmJobId(null);
      window.alert(ex.response?.data?.message || ex.message);
    }
  }

  async function markNext(id, nextStatus) {
    try {
      await api.patch(`/delivery/${id}/status`, { status: nextStatus });
      setConfirmNextId(null);
      await fetchJobs();
    } catch (ex) {
      setConfirmNextId(null);
      window.alert(ex.response?.data?.message || ex.message);
    }
  }

  const filtered = payHistory.filter(p => {
    const q = search.toLowerCase();
    return p.customerName.toLowerCase().includes(q) || p.customerEmail.toLowerCase().includes(q) ||
           p.issue.toLowerCase().includes(q) || p.transactionId.toLowerCase().includes(q);
  });

  if (loading) return <div className="spinner-page"><div className="spinner" /></div>;

  const tabs = [
    { id: 'available',       icon: '📋', label: 'Available Jobs',         badge: availableJobs.length, badgeCls: 'badge-warning' },
    { id: 'my-jobs',         icon: '🔧', label: 'My Active Jobs',          badge: myJobs.length,        badgeCls: 'badge-info' },
    { id: 'payment-history', icon: '💰', label: 'Customer Payment History', badge: null },
  ];

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', boxShadow: 'var(--glow)' }}>⚡</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, background: 'var(--gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>দুরন্তFix</h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>🚚 Delivery Dashboard — <strong style={{ color: 'var(--text)' }}>{user?.name}</strong></p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="theme-toggle"
            onClick={toggle}
            title="Toggle dark/light mode"
            style={{ width: 'auto', marginBottom: 0, padding: '0.45rem 0.85rem' }}
          >
            <span>{isLight ? '🌙' : '☀️'}</span>
            <span style={{ fontSize: '0.8rem' }}>{isLight ? 'Dark' : 'Light'}</span>
            <span className={`toggle-pill ${isLight ? '' : 'on'}`} />
          </button>
          <button className="ghost" onClick={() => { logout(); nav('/login'); }}>🚪 Logout</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.icon} {t.label}
            {t.badge !== null && <span className={`tab-badge ${activeTab === t.id ? t.badgeCls : ''}`}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── Available Jobs ── */}
      {activeTab === 'available' && (
        availableJobs.length === 0
          ? <div className="empty-state card"><div className="empty-icon">📭</div><p>No jobs available right now. Check back soon!</p></div>
          : availableJobs.map(job => (
            <div key={job._id} className="card" style={{ borderLeft: '3px solid var(--warning)', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem' }}>Job <span style={{ fontFamily: 'monospace' }}>#{job._id.slice(-6).toUpperCase()}</span></span>
                <span className="badge badge-warning">{LEG_LABELS[job.status]}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.2rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                <span>👤 {job.customerId?.name}</span>
                <span>📞 {job.customerPhone}</span>
                <span style={{ gridColumn: '1/-1' }}>📍 {job.customerAddress}</span>
                <span style={{ gridColumn: '1/-1' }}>🛠️ {job.repairRequestId?.issueDescription}</span>
              </div>
              {confirmJobId === job._id ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: 13 }}>Accept this job?</span>
                  <button className="success" style={{ padding: '0.35rem 1rem' }} onClick={() => acceptJob(job._id)}>✅ Yes</button>
                  <button className="ghost" style={{ padding: '0.35rem 0.75rem' }} onClick={() => setConfirmJobId(null)}>Cancel</button>
                </div>
              ) : (
                <button className="success" style={{ width: '100%', justifyContent: 'center', padding: '0.6rem' }} onClick={() => setConfirmJobId(job._id)}>
                  ✅ Accept This Job
                </button>
              )}
            </div>
          ))
      )}

      {/* ── My Active Jobs ── */}
      {activeTab === 'my-jobs' && (
        myJobs.length === 0
          ? <div className="empty-state card"><div className="empty-icon">📋</div><p>No active jobs.</p></div>
          : myJobs.map(job => (
            <div key={job._id} className="card" style={{ borderLeft: '3px solid var(--primary)', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem' }}>Job <span style={{ fontFamily: 'monospace' }}>#{job._id.slice(-6).toUpperCase()}</span></span>
                <span className="badge badge-info">{LEG_LABELS[job.status]}</span>
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                <div>👤 {job.customerId?.name} · 📞 {job.customerPhone}</div>
                <div>📍 {job.customerAddress}</div>
                <div>🛠️ {job.repairRequestId?.issueDescription}</div>
              </div>
              <div style={{ margin: '0.25rem 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Status:</span>
                <span className="badge badge-purple">{STATUS_LABELS[job.status]}</span>
              </div>

              {/* Progress track */}
              <div className="progress-track">
                {Object.entries(STATUS_LABELS).map(([key, label]) => {
                  const done = job.statusHistory?.some(h => h.status === key);
                  const cur  = job.status === key;
                  return (
                    <div key={key} className="progress-step" style={{ opacity: done ? 1 : 0.22 }}>
                      <span className={`step-dot ${cur ? 'current' : done ? 'done' : ''}`} />
                      <span style={{ fontSize: 12, fontWeight: cur ? 700 : 400, color: cur ? 'var(--primary-light)' : 'var(--text-muted)' }}>
                        {label}
                      </span>
                      {done && !cur && <span style={{ color: 'var(--success)', fontSize: 10 }}>✓</span>}
                    </div>
                  );
                })}
              </div>

              {NEXT_STATUS[job.status] && (
                confirmNextId === job._id ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem' }}>
                    <span style={{ fontSize: 13 }}>Mark as: {NEXT_LABEL[NEXT_STATUS[job.status]] || NEXT_STATUS[job.status]}?</span>
                    <button className="primary" style={{ padding: '0.35rem 1rem' }} onClick={() => markNext(job._id, NEXT_STATUS[job.status])}>✅ Yes</button>
                    <button className="ghost" style={{ padding: '0.35rem 0.75rem' }} onClick={() => setConfirmNextId(null)}>Cancel</button>
                  </div>
                ) : (
                  <button className="primary" style={{ width: '100%', justifyContent: 'center', padding: '0.6rem', marginTop: '0.75rem' }}
                    onClick={() => setConfirmNextId(job._id)}>
                    ✅ {NEXT_LABEL[NEXT_STATUS[job.status]] || STATUS_LABELS[NEXT_STATUS[job.status]]}
                  </button>
                )
              )}
              {job.status === 'DELIVERED' && (
                <div style={{ textAlign: 'center', marginTop: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>🎉 Job Complete!</div>
              )}
            </div>
          ))
      )}

      {/* ── Payment History ── */}
      {activeTab === 'payment-history' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem' }}>💰 Customer Payment History</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>Verify which orders have been paid before delivery.</div>
            </div>
            <button className="ghost" style={{ fontSize: '0.82rem' }} onClick={fetchPay}>🔄 Refresh</button>
          </div>

          <input
            type="text"
            placeholder="🔍  Search by customer, issue or transaction ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '100%', marginBottom: '1rem' }}
          />

          {payLoading ? (
            <div className="card text-center" style={{ color: 'var(--text-muted)' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state card"><div className="empty-icon">💸</div><p>{search ? 'No payments match your search.' : 'No payment records found yet.'}</p></div>
          ) : (
            <>
              {/* Stats */}
              <div className="stats-grid" style={{ marginBottom: '1rem' }}>
                <div className="stat-card"><div className="stat-icon">🧾</div><div className="stat-value">{filtered.length}</div><div className="stat-label">Total Payments</div></div>
                <div className="stat-card"><div className="stat-icon">💵</div><div className="stat-value" style={{ fontSize: '1.2rem' }}>{fmtBDT(filtered.reduce((s,p)=>s+p.amount,0))}</div><div className="stat-label">Total Collected</div></div>
                <div className="stat-card"><div className="stat-icon">👥</div><div className="stat-value">{new Set(filtered.map(p=>p.customerEmail)).size}</div><div className="stat-label">Unique Customers</div></div>
              </div>

              {filtered.map(p => (
                <div key={p.paymentId} className="card" style={{ borderLeft: '3px solid var(--success)', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', alignItems: 'start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 2 }}>👤 {p.customerName}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{p.customerEmail}</div>
                      <div style={{ fontSize: '0.82rem', marginTop: 4 }}>🛠️ {p.issue}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Txn: <code style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 4, fontSize: '0.72rem' }}>{p.transactionId}</code>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 2 }}>🕐 {fmtDate(p.paidAt)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--success)' }}>{fmtBDT(p.amount)}</div>
                      <span className="badge badge-success" style={{ marginTop: 4, display: 'inline-block' }}>✅ PAID</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{METHOD_ICONS[p.paymentMethod]} {p.paymentMethod?.replace('_',' ')}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)', display: 'flex', gap: '1.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>Labor: <strong style={{ color: 'var(--text)' }}>{fmtBDT(p.laborCharge)}</strong></span>
                    <span>Parts: <strong style={{ color: 'var(--text)' }}>{fmtBDT(p.partsCost)}</strong></span>
                    <span>Tax: <strong style={{ color: 'var(--text)' }}>{fmtBDT(p.tax)}</strong></span>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}