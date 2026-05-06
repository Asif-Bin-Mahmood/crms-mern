import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';
import DemoPaymentModal from '../components/DemoPaymentModal.jsx';

function StatusBadge({ status, type = 'repair' }) {
  const colors = type === 'repair' ? {
    COMPLETED: { bg: '#dcfce7', text: '#166534' },
    IN_PROGRESS: { bg: '#dbeafe', text: '#1e40af' },
    PENDING: { bg: '#fef9c3', text: '#854d0e' },
    CANCELLED: { bg: '#fee2e2', text: '#991b1b' },
  } : {
    PAID: { bg: '#dcfce7', text: '#166534' },
    PENDING: { bg: '#fef9c3', text: '#854d0e' },
    FAILED: { bg: '#fee2e2', text: '#991b1b' },
    REFUNDED: { bg: '#f3e8ff', text: '#6b21a8' },
  };
  const c = colors[status] || { bg: '#f1f5f9', text: '#475569' };
  return (
    <span style={{
      display: 'inline-block', background: c.bg, color: c.text,
      padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
    }}>{status?.replace(/_/g, ' ')}</span>
  );
}

function PriorityBadge({ priority }) {
  const colors = {
    URGENT: { bg: '#fee2e2', text: '#991b1b' },
    HIGH: { bg: '#ffedd5', text: '#9a3412' },
    MEDIUM: { bg: '#fef9c3', text: '#854d0e' },
    LOW: { bg: '#f0fdf4', text: '#166534' },
  };
  const c = colors[priority] || { bg: '#f1f5f9', text: '#475569' };
  return (
    <span style={{
      display: 'inline-block', background: c.bg, color: c.text,
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
    }}>{priority}</span>
  );
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [repairs, setRepairs] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(true); // assume demo until checked
  // Modal state
  const [activeBill, setActiveBill] = useState(null); // bill object to pay
  // Per-bill paid receipts cached for PDF re-download
  const [paidReceipts, setPaidReceipts] = useState({}); // billId -> receipt

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [repairsRes, billsRes, modeRes] = await Promise.all([
        api.get('/repairs'),
        api.get('/bills'),
        api.get('/payment/demo/status'),
      ]);
      setRepairs(repairsRes.data?.data?.repairs || []);
      setBills(billsRes.data?.data?.bills || []);
      setIsDemo(modeRes.data?.data?.isDemo === true);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  // Called by modal on successful payment — mark bill PAID locally & cache receipt
  function handlePaymentSuccess(billId, receipt) {
    setBills(prev => prev.map(b => b._id === billId ? { ...b, paymentStatus: 'PAID' } : b));
    if (receipt) setPaidReceipts(prev => ({ ...prev, [billId]: receipt }));
    setActiveBill(null);
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: 32 }}>⟳</div>
          <p style={{ margin: 0 }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Modal */}
      {activeBill && (
        <DemoPaymentModal
          bill={activeBill}
          onClose={() => setActiveBill(null)}
          onSuccess={(billId, receipt) => handlePaymentSuccess(billId, receipt)}
        />
      )}

      {/* Header banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #3730a3 100%)',
        borderRadius: 16, padding: '28px 36px', marginBottom: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 4px 24px rgba(30,64,175,0.25)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>
              Customer Dashboard
            </h1>
            {isDemo && (
              <span style={{ background: '#fbbf24', color: '#78350f', fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, letterSpacing: 0.5 }}>
                DEMO MODE
              </span>
            )}
          </div>
          <p style={{ margin: 0, color: '#bfdbfe', fontSize: 14 }}>
            Welcome back, {user?.name || 'Customer'} · View repairs, bills &amp; pay securely
          </p>
        </div>
        <button onClick={fetchData} style={{
          background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
          color: '#fff', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
        }}>⟳ Refresh</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Repairs', value: repairs.length, icon: '🔧', color: '#3b82f6' },
          { label: 'Active Repairs', value: repairs.filter(r => ['PENDING', 'IN_PROGRESS'].includes(r.currentStatus)).length, icon: '⚙️', color: '#f59e0b' },
          { label: 'Total Bills', value: bills.length, icon: '📄', color: '#8b5cf6' },
          { label: 'Pending Payments', value: bills.filter(b => b.paymentStatus === 'PENDING').length, icon: '💳', color: '#ef4444' },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ borderTop: `4px solid ${stat.color}`, padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 28 }}>{stat.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '14px 20px', marginBottom: 24, color: '#dc2626' }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* ── Active Repairs ── */}
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>🔧 Active Repairs</h2>
            <Link to="/repairs" style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>View All →</Link>
          </div>

          {repairs.length === 0 ? (
            <div style={{ padding: '36px 22px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🔩</div>
              <p style={{ margin: 0, fontWeight: 600 }}>No repair requests yet.</p>
              <Link to="/repairs" style={{ display: 'inline-block', marginTop: 12, padding: '8px 16px', background: '#3b82f6', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                + New Repair Request
              </Link>
            </div>
          ) : (
            <div>
              {repairs.map((repair, idx) => (
                <div key={repair._id} style={{ padding: '16px 22px', borderBottom: idx < repairs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b', flex: 1, marginRight: 10 }}>
                      {repair.issueDescription}
                    </h3>
                    <StatusBadge status={repair.currentStatus} type="repair" />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {repair.deviceId && (
                      <span style={{ fontSize: 12, color: '#64748b', background: '#f8fafc', padding: '2px 8px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                        📱 {repair.deviceId.manufacturer} {repair.deviceId.model} ({repair.deviceId.dType})
                      </span>
                    )}
                    <PriorityBadge priority={repair.priority} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {repair.estimatedCompletionDate && (
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        📅 Est. {new Date(repair.estimatedCompletionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    <Link to={`/repairs/${repair._id}`} style={{ fontSize: 12, color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
                      Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Bills & Payments ── */}
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>💳 Bills &amp; Payments</h2>
            <Link to="/bills" style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>View All →</Link>
          </div>

          {bills.length === 0 ? (
            <div style={{ padding: '36px 22px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🧾</div>
              <p style={{ margin: 0, fontWeight: 600 }}>No bills found.</p>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>Bills appear when repairs are completed.</p>
            </div>
          ) : (
            <div>
              {bills.map((bill, idx) => {
                const total = Number(bill.laborCharge) + Number(bill.partsCost) + Number(bill.tax);
                const isPending = bill.paymentStatus === 'PENDING';
                const isPaid = bill.paymentStatus === 'PAID';
                const cachedReceipt = paidReceipts[bill._id];
                return (
                  <div key={bill._id} style={{
                    padding: '16px 22px',
                    borderBottom: idx < bills.length - 1 ? '1px solid #f1f5f9' : 'none',
                    background: isPending ? 'linear-gradient(135deg,#fffbeb 0%,#fff 100%)' : '#fff',
                  }}>
                    {/* Bill header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Invoice #{bill._id.toString().slice(-8).toUpperCase()}
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: 13, color: '#374151' }}>
                          {bill.repairRequestId?.issueDescription?.substring(0, 38) || 'Repair Service'}...
                        </p>
                      </div>
                      <StatusBadge status={bill.paymentStatus} type="payment" />
                    </div>

                    {/* Breakdown */}
                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#475569' }}>
                      {[
                        ['Labour', bill.laborCharge],
                        ['Parts', bill.partsCost],
                        ['Tax', bill.tax],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span>{k}</span><span>৳ {Number(v).toFixed(2)}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 6, fontWeight: 800, color: '#1e293b', fontSize: 14 }}>
                        <span>Total</span><span>৳ {total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>
                      📅 {new Date(bill.dateGenerated || bill.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Link to={`/bills/${bill._id}`} style={{
                        fontSize: 12, color: '#3b82f6', textDecoration: 'none', fontWeight: 600,
                        padding: '6px 12px', border: '1px solid #bfdbfe', borderRadius: 6, background: '#eff6ff',
                      }}>View Invoice</Link>

                      {isPending && isDemo && (
                        <button
                          id={`demo-pay-btn-${bill._id}`}
                          onClick={() => setActiveBill(bill)}
                          style={{
                            flex: 1, padding: '8px 12px', cursor: 'pointer',
                            background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                            color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
                            fontSize: 13, boxShadow: '0 2px 8px rgba(245,158,11,0.35)',
                          }}
                        >
                          🧪 Pay (Demo Mode)
                        </button>
                      )}

                      {isPending && !isDemo && (
                        <button
                          onClick={async () => {
                            const res = await api.post('/payment/init', { billId: bill._id });
                            const url = res.data?.data?.gatewayUrl;
                            if (url) window.location.href = url;
                          }}
                          style={{
                            flex: 1, padding: '8px 12px', cursor: 'pointer',
                            background: 'linear-gradient(135deg,#0ea5e9,#2563eb)',
                            color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13,
                          }}
                        >🔒 Pay via SSLCommerz</button>
                      )}

                      {isPaid && (
                        <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>✓ Paid</span>
                      )}

                      {/* Re-download receipt if we have cached data from this session */}
                      {isPaid && cachedReceipt && (
                        <button
                          onClick={() => {
                            const { jsPDF } = window.jspdf || {};
                            import('../components/DemoPaymentModal.jsx').then(() => {
                              // trigger download via dynamic import — use the receipt stored
                              const event = new CustomEvent('crms-download-receipt', { detail: cachedReceipt });
                              window.dispatchEvent(event);
                            });
                          }}
                          style={{
                            fontSize: 12, padding: '6px 12px', border: '1px solid #bbf7d0',
                            background: '#f0fdf4', color: '#16a34a', borderRadius: 6,
                            cursor: 'pointer', fontWeight: 600,
                          }}
                        >⬇ Receipt</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Info bar */}
      <div style={{ marginTop: 28, padding: '16px 22px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13, color: '#475569' }}>
        {isDemo
          ? <><strong>🧪 Demo Mode Active:</strong> Click <em>"Pay (Demo Mode)"</em> on any pending bill → Fill test card/mobile details → Enter any OTP → Get instant success + downloadable PDF receipt.</>
          : <><strong>💡 How to pay:</strong> Click <em>"Pay via SSLCommerz"</em> on any pending bill → Complete real payment at gateway → Return here and refresh.</>
        }
      </div>
    </div>
  );
}
