import { useEffect, useState } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function SparePartsPage() {
  const [parts, setParts] = useState([]);
  const [low, setLow]     = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { user }          = useAuth();
  const isAdmin           = user?.role === 'ADMIN';
  const [form, setForm]   = useState({ partName: '', stockLevel: 0, unitCost: 0, supplierName: '', reorderThreshold: 5 });

  async function load() {
    const { data } = await api.get('/spare-parts', { params: { lowStock: low } });
    setParts(data.data.spareParts);
  }

  useEffect(() => { load().catch(() => {}); }, [low]);

  async function onCreate(e) {
    e.preventDefault();
    await api.post('/spare-parts', form);
    setForm({ partName: '', stockLevel: 0, unitCost: 0, supplierName: '', reorderThreshold: 5 });
    setShowForm(false);
    await load();
  }

  const lowCount = parts.filter(p => p.stockLevel <= p.reorderThreshold).length;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>🔩 Spare Parts</h1>
          <p>স্পেয়ার পার্টস স্টক ব্যবস্থাপনা</p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            className={low ? 'danger' : 'ghost'}
            onClick={() => setLow(v => !v)}
            style={{ fontSize: '0.82rem' }}
          >
            {low ? '🔴 Low Stock Only' : '📦 All Parts'}
          </button>
          {isAdmin && (
            <button className="primary" onClick={() => setShowForm(v => !v)}>
              {showForm ? '✕' : '+ নতুন পার্ট'}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {lowCount > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 12, padding: '0.75rem 1.25rem', marginBottom: '1rem',
          color: '#fca5a5', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          ⚠️ <strong>{lowCount}টি পার্ট</strong> কম স্টকে আছে। রিঅর্ডার দিন।
        </div>
      )}

      {/* Add part form */}
      {isAdmin && showForm && (
        <div className="card" style={{ borderTop: '3px solid var(--danger)', marginBottom: '1.5rem' }}>
          <div className="card-title">➕ নতুন পার্ট যোগ করুন</div>
          <form onSubmit={onCreate}>
            <div className="form-grid">
              <div>
                <label>পার্টের নাম</label>
                <input value={form.partName} onChange={e => setForm({ ...form, partName: e.target.value })} required style={{ maxWidth: '100%' }} />
              </div>
              <div>
                <label>Supplier</label>
                <input value={form.supplierName} onChange={e => setForm({ ...form, supplierName: e.target.value })} required style={{ maxWidth: '100%' }} />
              </div>
              <div>
                <label>Stock Level</label>
                <input type="number" value={form.stockLevel} onChange={e => setForm({ ...form, stockLevel: +e.target.value })} style={{ maxWidth: '100%' }} />
              </div>
              <div>
                <label>Unit Cost (৳)</label>
                <input type="number" value={form.unitCost} onChange={e => setForm({ ...form, unitCost: +e.target.value })} required style={{ maxWidth: '100%' }} />
              </div>
              <div>
                <label>Reorder Threshold</label>
                <input type="number" value={form.reorderThreshold} onChange={e => setForm({ ...form, reorderThreshold: +e.target.value })} style={{ maxWidth: '100%' }} />
              </div>
            </div>
            <button className="primary" type="submit" style={{ marginTop: '0.5rem' }}>💾 সংরক্ষণ করুন</button>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-title">📦 পার্টস তালিকা ({parts.length})</div>
        {parts.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🔩</div><p>কোনো পার্ট পাওয়া যায়নি।</p></div>
        ) : (
          <table>
            <thead>
              <tr><th>নাম</th><th>Stock</th><th>Unit Cost</th><th>Supplier</th><th>Status</th></tr>
            </thead>
            <tbody>
              {parts.map(p => {
                const isLow = p.stockLevel <= p.reorderThreshold;
                return (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 600 }}>{p.partName}</td>
                    <td><span style={{ fontWeight: 700, color: isLow ? '#f87171' : 'var(--text)' }}>{p.stockLevel}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>৳ {p.unitCost}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.supplierName}</td>
                    <td><span className={`badge ${isLow ? 'badge-danger' : 'badge-success'}`}>{isLow ? '⚠️ Low' : '✅ OK'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
