import { useEffect, useState } from 'react';
import api from '../api/client.js';

function fmtTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-BD', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

export default function NotificationsPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get('/notifications').then(r => setItems(r.data.data.notifications));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>🔔 Notifications</h1>
        <p>আপনার সকল বিজ্ঞপ্তি</p>
      </div>

      <div className="card">
        <div className="card-title">📬 বিজ্ঞপ্তি ({items.length})</div>
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔕</div>
            <p>কোনো বিজ্ঞপ্তি নেই।</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {items.map(n => (
              <div key={n._id} style={{
                display: 'flex', gap: '1rem', alignItems: 'flex-start',
                padding: '0.85rem 1rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                transition: 'border-color 0.18s',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'rgba(79,70,229,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', flexShrink: 0,
                }}>🔔</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.5 }}>{n.messageContent}</div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🕐 {fmtTime(n.timeStamp)}</span>
                    {n.target && <span className="badge badge-purple" style={{ fontSize: '0.68rem' }}>{n.target}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
