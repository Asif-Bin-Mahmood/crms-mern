import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const PRIORITY_BADGE = {
  LOW:    { cls: 'badge-gray',    label: 'Low' },
  MEDIUM: { cls: 'badge-info',    label: 'Medium' },
  HIGH:   { cls: 'badge-warning', label: 'High' },
  URGENT: { cls: 'badge-danger',  label: 'Urgent' },
};

const STATUS_BADGE = (s) => {
  if (!s) return 'badge-gray';
  if (s === 'COMPLETED') return 'badge-success';
  if (s === 'CANCELLED') return 'badge-danger';
  if (s.includes('PENDING') || s.includes('WAITING')) return 'badge-warning';
  return 'badge-info';
};

export default function RepairsPage() {
  const [repairs, setRepairs]         = useState([]);
  const [devices, setDevices]         = useState([]);
  const [deviceId, setDeviceId]       = useState('');
  const [issueDescription, setIssue]  = useState('');
  const [priority, setPriority]       = useState('MEDIUM');
  const [customerAddress, setAddress] = useState('');
  const [customerPhone, setPhone]     = useState('');
  const [showForm, setShowForm]       = useState(false);
  const { user }                      = useAuth();
  const canCreate                     = user?.role === 'CUSTOMER';

  async function load() {
    const requests = [api.get('/repairs')];
    if (canCreate) requests.push(api.get('/devices'));
    const [r, d] = await Promise.all(requests);
    setRepairs(r.data.data.repairs);
    if (canCreate) {
      const devs = d.data.data.devices;
      setDevices(devs);
      if (!devs.some(x => x._id === deviceId)) setDeviceId(devs[0]?._id || '');
      try {
        const me = await api.get('/auth/me');
        const p  = me.data.data.user?.customerProfile;
        if (p) {
          const addr = [p.houseNo, p.streetNo, p.city].filter(Boolean).join(', ');
          if (addr) setAddress(addr);
          if (p.phnNum) setPhone(p.phnNum);
        }
      } catch { /* silent */ }
    }
  }

  useEffect(() => { load().catch(() => {}); }, [canCreate]);

  async function onCreate(e) {
    e.preventDefault();
    if (!deviceId) { window.alert('Please add a device first.'); return; }
    if (!customerAddress || !customerPhone) { window.alert('Please provide address and phone.'); return; }
    await api.post('/repairs', { deviceId, issueDescription, priority, customerAddress, customerPhone });
    setIssue('');
    setShowForm(false);
    await load();
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>🔧 Repair Requests</h1>
          <p>আপনার সকল মেরামতের অনুরোধ</p>
        </div>
        {canCreate && (
          <button className="primary" onClick={() => setShowForm(v => !v)}>
            {showForm ? '✕ বন্ধ করুন' : '+ নতুন অনুরোধ'}
          </button>
        )}
      </div>

      {/* New request form */}
      {canCreate && showForm && (
        <div className="card" style={{ borderTop: '3px solid var(--secondary)', marginBottom: '1.5rem' }}>
          <div className="card-title">🛠️ নতুন মেরামত অনুরোধ</div>
          {devices.length === 0 && <p className="error">⚠️ কোনো ডিভাইস নেই। আগে ডিভাইস যোগ করুন।</p>}
          <form onSubmit={onCreate}>
            <div className="form-grid">
              <div>
                <label>ডিভাইস</label>
                <select value={deviceId} onChange={e => setDeviceId(e.target.value)} disabled={!devices.length} style={{ maxWidth: '100%' }}>
                  {devices.map(d => <option key={d._id} value={d._id}>{d.manufacturer} {d.model} ({d.serialNo})</option>)}
                </select>
              </div>
              <div>
                <label>Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} disabled={!devices.length} style={{ maxWidth: '100%' }}>
                  {['LOW','MEDIUM','HIGH','URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="full">
                <label>সমস্যার বিবরণ</label>
                <textarea value={issueDescription} onChange={e => setIssue(e.target.value)} required rows={3} disabled={!devices.length} placeholder="যেমন: ডিসপ্লে কাজ করছে না, ব্যাটারি চার্জ হচ্ছে না..." style={{ maxWidth: '100%' }} />
              </div>
              <div>
                <label>ঠিকানা (পিকআপের জন্য)</label>
                <input value={customerAddress} onChange={e => setAddress(e.target.value)} placeholder="বাড়ি, রাস্তা, শহর" required disabled={!devices.length} style={{ maxWidth: '100%' }} />
              </div>
              <div>
                <label>ফোন নম্বর</label>
                <input value={customerPhone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" required disabled={!devices.length} style={{ maxWidth: '100%' }} />
              </div>
            </div>
            <button className="primary" type="submit" disabled={!devices.length} style={{ marginTop: '0.5rem' }}>
              📨 অনুরোধ জমা দিন
            </button>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-title">📋 সকল অনুরোধ ({repairs.length})</div>
        {repairs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔧</div>
            <p>কোনো মেরামত অনুরোধ নেই।</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Priority</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {repairs.map(x => (
                <tr key={x._id}>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{x._id.slice(-8).toUpperCase()}</td>
                  <td><span className={`badge ${STATUS_BADGE(x.currentStatus)}`}>{x.currentStatus}</span></td>
                  <td><span className={`badge ${PRIORITY_BADGE[x.priority]?.cls || 'badge-gray'}`}>{PRIORITY_BADGE[x.priority]?.label || x.priority}</span></td>
                  <td><Link to={`/repairs/${x._id}`} style={{ color: 'var(--primary-light)', fontWeight: 600, fontSize: '0.85rem' }}>খুলুন →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}