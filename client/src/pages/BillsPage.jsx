import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

function fmtBDT(n) { return `৳ ${Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}`; }

export default function BillsPage() {
  const [bills, setBills] = useState([]);
  const { user }          = useAuth();

  async function load() {
    const { data } = await api.get('/bills');
    setBills(data.data.bills);
  }

  useEffect(() => { load().catch(() => {}); }, []);

  async function markPaid(id) {
    await api.patch(`/bills/${id}/payment`, { paymentStatus: 'PAID' });
    await load();
  }

  const totalDue = bills.filter(b => b.paymentStatus === 'PENDING')
    .reduce((s, b) => s + (b.laborCharge || 0) + (b.tax || 0) + (b.partsCost || 0), 0);

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>🧾 Bills</h1>
          <p>আপনার সকল বিল এবং পেমেন্ট</p>
        </div>
        {totalDue > 0 && (
          <div style={{
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 12, padding: '0.6rem 1rem', textAlign: 'right',
          }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--warning)', fontWeight: 700, textTransform: 'uppercase' }}>বকেয়া মোট</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24' }}>{fmtBDT(totalDue)}</div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">📃 বিলের তালিকা ({bills.length})</div>
        {bills.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧾</div>
            <p>কোনো বিল পাওয়া যায়নি।</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Repair ID</th>
                <th>Labor</th>
                <th>Parts</th>
                <th>Tax</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bills.map(b => {
                const total = (b.laborCharge || 0) + (b.partsCost || 0) + (b.tax || 0);
                const isPaid = b.paymentStatus === 'PAID';
                return (
                  <tr key={b._id}>
                    <td>
                      <Link to={`/bills/${b._id}`} style={{ color: 'var(--primary-light)', fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>
                        #{(b.repairRequestId?._id || b.repairRequestId || '').toString().slice(-8).toUpperCase()}
                      </Link>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{fmtBDT(b.laborCharge)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{fmtBDT(b.partsCost)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{fmtBDT(b.tax)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text)' }}>{fmtBDT(total)}</td>
                    <td>
                      <span className={`badge ${isPaid ? 'badge-success' : 'badge-warning'}`}>
                        {isPaid ? '✅ PAID' : '⏳ PENDING'}
                      </span>
                    </td>
                    <td>
                      {(user?.role === 'CUSTOMER' || user?.role === 'ADMIN') && !isPaid && (
                        <button className="ghost" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }} onClick={() => markPaid(b._id)}>
                          Mark Paid
                        </button>
                      )}
                    </td>
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
