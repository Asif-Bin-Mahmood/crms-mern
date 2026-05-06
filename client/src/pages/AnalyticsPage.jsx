import { useEffect, useState } from 'react';
import api from '../api/client.js';

export default function AnalyticsPage() {
  const [dash, setDash]         = useState(null);
  const [vol, setVol]           = useState([]);
  const [daysToShow, setDays]   = useState(10);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/dashboard'),
      api.get('/analytics/repairs/volume'),
    ]).then(([d, v]) => {
      setDash(d.data.data.summary);
      setVol(v.data.data.repairVolumeLast30Days);
    });
  }, []);

  if (!dash) return (
    <div className="spinner-page"><div className="spinner" /></div>
  );

  const statusRows     = Array.isArray(dash.repairsByStatus)              ? dash.repairsByStatus              : [];
  const techRows       = Array.isArray(dash.topTechniciansByAssignments)  ? dash.topTechniciansByAssignments  : [];
  const maxCount       = Math.max(1, ...vol.map(x => x.count || 0));
  const visibleVolume  = vol.slice(Math.max(0, vol.length - Number(daysToShow)));

  const STATUS_COLORS = {
    COMPLETED: '#10b981', CANCELLED: '#ef4444',
    PENDING: '#f59e0b', IN_PROGRESS: '#0ea5e9',
  };

  return (
    <div>
      <div className="page-header">
        <h1>📈 Analytics</h1>
        <p>সিস্টেমের সামগ্রিক পরিসংখ্যান</p>
      </div>

      {/* Summary stats */}
      <div className="stats-grid">
        {[
          { icon: '👥', label: 'Total Users',       value: dash.totalUsers       ?? 0 },
          { icon: '👤', label: 'Customers',          value: dash.totalCustomers   ?? 0 },
          { icon: '🔧', label: 'Technicians',        value: dash.totalTechnicians ?? 0 },
          { icon: '🔩', label: 'Low Stock Parts',    value: dash.lowStockPartsCount ?? 0, warn: true },
          { icon: '🧾', label: 'Pending Bills',      value: dash.pendingBillsCount  ?? 0, warn: true },
        ].map(s => (
          <div key={s.label} className="stat-card" style={s.warn && s.value > 0 ? { borderColor: 'rgba(245,158,11,0.3)' } : {}}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value" style={s.warn && s.value > 0 ? { color: '#fbbf24' } : {}}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Repairs by status */}
      <div className="card">
        <div className="card-title">📊 Repairs by Status</div>
        {statusRows.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📊</div><p>কোনো ডেটা নেই।</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {statusRows.map(row => {
              const maxR = Math.max(1, ...statusRows.map(r => r.count));
              const pct  = Math.round((row.count / maxR) * 100);
              const col  = STATUS_COLORS[row._id] || '#818cf8';
              return (
                <div key={row._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 160, fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>{row._id}</div>
                  <div style={{ flex: 1, height: 10, background: 'var(--bg-elevated)', borderRadius: 20, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 20, transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ width: 30, fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>{row.count}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top technicians */}
      <div className="card">
        <div className="card-title">🏆 Top Technicians by Assignments</div>
        {techRows.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🏆</div><p>কোনো ডেটা নেই।</p></div>
        ) : (
          <table>
            <thead><tr><th>Technician ID</th><th>Assignments</th></tr></thead>
            <tbody>
              {techRows.map((row, i) => (
                <tr key={row._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  '} #{String(row._id).slice(-8)}
                  </td>
                  <td><span className="badge badge-purple">{row.count}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Volume chart */}
      <div className="card">
        <div className="card-title flex items-center justify-between">
          <span>📅 Repairs per Day (Last 30 Days)</span>
          <select
            value={daysToShow}
            onChange={e => setDays(Number(e.target.value))}
            style={{ maxWidth: 120, marginBottom: 0 }}
          >
            {[7,10,15,30].map(n => <option key={n} value={n}>{n} days</option>)}
          </select>
        </div>
        {visibleVolume.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📅</div><p>কোনো ডেটা নেই।</p></div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: 120, paddingTop: '0.5rem' }}>
            {visibleVolume.map(row => {
              const pct = Math.max(8, Math.round((row.count / maxCount) * 100));
              return (
                <div key={row._id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{row.count}</div>
                  <div style={{
                    width: '100%', height: `${pct}%`, minHeight: 6,
                    background: 'var(--gradient)', borderRadius: '4px 4px 0 0',
                    transition: 'height 0.4s ease',
                  }} title={`${row._id}: ${row.count}`} />
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-faint)', transform: 'rotate(-45deg)', transformOrigin: 'top left', marginTop: 4, whiteSpace: 'nowrap' }}>
                    {String(row._id).slice(5)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
