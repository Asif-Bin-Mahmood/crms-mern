import { useEffect, useState } from 'react';
import api from '../api/client.js';

const DEVICE_ICONS = { LAPTOP: '💻', MOBILE: '📱', PC: '🖥️' };
const deviceTypes = ['LAPTOP', 'MOBILE', 'PC'];

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [form, setForm]       = useState({ dType: 'LAPTOP', manufacturer: '', model: '', serialNo: '' });
  const [err, setErr]         = useState('');
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const { data } = await api.get('/devices');
    setDevices(data.data.devices);
  }

  useEffect(() => { load().catch(() => {}); }, []);

  async function onCreate(e) {
    e.preventDefault();
    setErr('');
    try {
      await api.post('/devices', form);
      setForm({ ...form, manufacturer: '', model: '', serialNo: '' });
      setShowForm(false);
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.message || ex.message);
    }
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>💻 Devices</h1>
          <p>আপনার সকল ডিভাইস পরিচালনা করুন</p>
        </div>
        <button className="primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ বন্ধ করুন' : '+ নতুন ডিভাইস'}
        </button>
      </div>

      {/* Add Device form */}
      {showForm && (
        <div className="card" style={{ borderTop: '3px solid var(--primary)', marginBottom: '1.5rem' }}>
          <div className="card-title">➕ নতুন ডিভাইস যোগ করুন</div>
          <form onSubmit={onCreate}>
            <div className="form-grid">
              <div>
                <label>ধরন</label>
                <select value={form.dType} onChange={e => setForm({ ...form, dType: e.target.value })} style={{ maxWidth: '100%' }}>
                  {deviceTypes.map(t => <option key={t} value={t}>{DEVICE_ICONS[t]} {t}</option>)}
                </select>
              </div>
              <div>
                <label>Manufacturer</label>
                <input value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} placeholder="যেমন: Dell, Apple" required style={{ maxWidth: '100%' }} />
              </div>
              <div>
                <label>Model</label>
                <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="যেমন: XPS 15" required style={{ maxWidth: '100%' }} />
              </div>
              <div>
                <label>Serial Number</label>
                <input value={form.serialNo} onChange={e => setForm({ ...form, serialNo: e.target.value })} placeholder="SN-XXXX" required style={{ maxWidth: '100%' }} />
              </div>
            </div>
            {err && <p className="error">⚠️ {err}</p>}
            <button className="primary" type="submit" style={{ marginTop: '0.5rem' }}>💾 সংরক্ষণ করুন</button>
          </form>
        </div>
      )}

      {/* Device list */}
      <div className="card">
        <div className="card-title">📋 আপনার ডিভাইসগুলো ({devices.length})</div>
        {devices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💻</div>
            <p>কোনো ডিভাইস পাওয়া যায়নি। নতুন ডিভাইস যোগ করুন।</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.85rem' }}>
            {devices.map(d => (
              <div key={d._id} style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 12, padding: '1rem',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(79,70,229,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>{DEVICE_ICONS[d.dType] || '📱'}</div>
                <div style={{ fontWeight: 700, color: 'var(--text)' }}>{d.manufacturer} {d.model}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>#{d.serialNo}</div>
                <span className="badge badge-info" style={{ marginTop: 8 }}>{d.dType}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
