import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const DELIVERY_LABELS = {
  PENDING_PICKUP:            '⏳ Waiting for Pickup',
  GOING_TO_CUSTOMER:         '🚗 Going to You',
  PICKED_UP:                 '📦 Device Picked Up',
  AT_WAREHOUSE:              '🏭 At Warehouse',
  PENDING_TECH_DELIVERY:     '⏳ Waiting for Tech Delivery',
  GOING_TO_TECHNICIAN:       '🔧 Going to Technician',
  AT_TECHNICIAN:             '👨‍🔧 With Technician',
  PENDING_RETURN:            '⏳ Waiting for Return Pickup',
  GOING_TO_WAREHOUSE_RETURN: '🚗 Returning to Warehouse',
  AT_WAREHOUSE_FINAL:        '🏭 Final Check at Warehouse',
  PENDING_CUSTOMER_DELIVERY: '⏳ Waiting for Delivery',
  OUT_FOR_DELIVERY:          '🚚 Out for Delivery',
  DELIVERED:                 '🎉 Delivered!',
  CANCELLED:                 '❌ Cancelled',
};

const STATUS_ORDER = Object.keys(DELIVERY_LABELS);

export default function RepairDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [repair, setRepair] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [bids, setBids] = useState([]);
  const [users, setUsers] = useState([]);
  const [techId, setTechId] = useState('');
  const [status, setStatus] = useState('IN_PROGRESS');
  const [laborCharge, setLabor] = useState(0);
  const [tax, setTax] = useState(0);
  const [partId, setPartId] = useState('');
  const [qty, setQty] = useState(1);
  const [parts, setParts] = useState([]);
  const [partUsages, setPartUsages] = useState([]);
  const [deliveryJob, setDeliveryJob] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidDays, setBidDays] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [myBid, setMyBid] = useState(null);
  const [saving, setSaving] = useState(false);

  const isCompleted = repair?.currentStatus === 'COMPLETED';
  const isTech = ['LEAD_TECHNICIAN', 'JUNIOR_TECHNICIAN'].includes(user?.role);
  const canMarkInProgress = deliveryJob?.status === 'AT_TECHNICIAN';

  async function load() {
    const { data } = await api.get(`/repairs/${id}`);
    const r = data.data.repair;
    setRepair(r);
    setPartUsages(data.data.partUsages || []);
    setStatus(r.currentStatus);
    const a = await api.get(`/repairs/${id}/assignments`);
    setAssignments(a.data.data.assignments || []);
  }

  async function loadBids() {
    if (!['CUSTOMER', 'ADMIN'].includes(user?.role)) return;
    try {
      const { data } = await api.get(`/repairs/${id}/bids`);
      setBids(data.data.bids || []);
    } catch { setBids([]); }
  }

  async function loadMyBid() {
    if (!isTech) return;
    try {
      // technician er নিজের bid খোঁজো
      const { data } = await api.get(`/repairs/${id}/bids`).catch(() => ({ data: { data: { bids: [] } } }));
      // admin/customer route — technician নিজেরটা খুঁজবে assignments থেকে
    } catch { /* silent */ }
  }

  async function loadDelivery() {
    try {
      const { data } = await api.get(`/delivery/by-repair/${id}`);
      setDeliveryJob(data.data.job);
    } catch { setDeliveryJob(null); }
  }

  useEffect(() => {
    load().catch(() => {});
    loadDelivery().catch(() => {});
    loadBids().catch(() => {});
    if (user?.role === 'ADMIN') {
      api.get('/admin/users').then((r) => {
        const techs = r.data.data.users.filter((u) =>
          ['LEAD_TECHNICIAN', 'JUNIOR_TECHNICIAN'].includes(u.role)
        );
        setUsers(techs);
        if (techs[0]) setTechId(techs[0]._id);
      });
    }
    api.get('/spare-parts').then((r) => {
      setParts(r.data.data.spareParts || []);
      if (r.data.data.spareParts[0]) setPartId(r.data.data.spareParts[0]._id);
    }).catch(() => {});
  }, [id, user?.role]);

  // ── Submit Bid (Technician) ──
  async function submitBid(e) {
    e.preventDefault();
    try {
      setSaving(true);
      await api.post(`/repairs/${id}/bids`, {
        estimatedAmount: Number(bidAmount),
        estimatedDays:   Number(bidDays),
        message:         bidMessage,
      });
      window.alert('Bid submitted successfully!');
      setBidAmount(''); setBidDays(''); setBidMessage('');
    } catch (ex) {
      window.alert(ex.response?.data?.message || ex.message);
    } finally { setSaving(false); }
  }

  // ── Accept Bid (Customer) ──
  async function acceptBid(bidId) {
    if (!window.confirm('Accept this bid? The technician will be assigned and a delivery man will be notified for pickup.')) return;
    try {
      await api.patch(`/repairs/bids/${bidId}/accept`);
      window.alert('Bid accepted! A delivery man will pick up your device.');
      await load(); await loadBids(); await loadDelivery();
    } catch (ex) {
      window.alert(ex.response?.data?.message || ex.message);
    }
  }

  // ── Reject Bid (Customer) ──
  async function rejectBid(bidId) {
    try {
      await api.patch(`/repairs/bids/${bidId}/reject`);
      await loadBids();
    } catch (ex) {
      window.alert(ex.response?.data?.message || ex.message);
    }
  }

  // ── Update Status ──
  async function updateStatus(e) {
    e.preventDefault();
    if (isCompleted) { window.alert('Already completed.'); return; }
    if (saving) return;
    try {
      setSaving(true);
      await api.patch(`/repairs/${id}/status`, {
        currentStatus: status,
        laborCharge: Number(laborCharge),
        tax: Number(tax),
      });
      await load(); await loadDelivery();
      window.alert(`Status updated to ${status}.`);
    } catch (ex) {
      window.alert(ex.response?.data?.message || ex.message);
    } finally { setSaving(false); }
  }

  // ── Assign Technician (Admin) ──
  async function assign(e) {
    e.preventDefault();
    try {
      const selectedTech = users.find((u) => u._id === techId);
      const roleInRepair = selectedTech?.role === 'JUNIOR_TECHNICIAN' ? 'JUNIOR' : 'LEAD';
      await api.post(`/repairs/${id}/assign`, { technicianId: techId, roleInRepair });
      await load();
      window.alert('Technician assigned.');
    } catch (ex) {
      window.alert(ex.response?.data?.message || ex.message);
    }
  }

  // ── Attach Part ──
  async function attachPart(e) {
    e.preventDefault();
    if (isCompleted || !partId || Number(qty) < 1) return;
    try {
      setSaving(true);
      await api.post(`/repairs/${id}/parts`, { sparePartId: partId, quantityUsed: Number(qty) });
      await load();
      window.alert('Part usage saved.');
    } catch (ex) {
      window.alert(ex.response?.data?.message || ex.message);
    } finally { setSaving(false); }
  }

  if (!repair) return <p style={{ padding: '2rem' }}>Loading…</p>;

  return (
    <div>
      <h1>Repair #{repair._id.slice(-8).toUpperCase()}</h1>

      {/* ── Basic Info ── */}
      <div className="card">
        <p><strong>Status:</strong> <span style={{ color: repair.currentStatus === 'COMPLETED' ? '#16a34a' : repair.currentStatus === 'CANCELLED' ? '#dc2626' : '#2563eb', fontWeight: 'bold' }}>{repair.currentStatus}</span></p>
        <p><strong>Issue:</strong> {repair.issueDescription}</p>
        <p><strong>Device:</strong> {repair.deviceId?.manufacturer} {repair.deviceId?.model}</p>
        <p><strong>Priority:</strong> {repair.priority}</p>
        {repair.customerAddress && <p><strong>Pickup Address:</strong> {repair.customerAddress}</p>}
      </div>

      {/* ══ BIDS SECTION ══════════════════════════════════════════════════ */}

      {/* Technician: Bid দেওয়ার form */}
      {isTech && repair.currentStatus === 'PENDING' && (
        <div className="card">
          <h2>💰 Submit Your Bid</h2>
          <form onSubmit={submitBid}>
            <label>Estimated Amount (৳)</label>
            <input type="number" min={0} value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} required placeholder="e.g. 1500" />
            <label>Estimated Days</label>
            <input type="number" min={1} value={bidDays} onChange={(e) => setBidDays(e.target.value)} required placeholder="e.g. 3" />
            <label>Message (optional)</label>
            <textarea value={bidMessage} onChange={(e) => setBidMessage(e.target.value)} rows={2} placeholder="Describe your approach..." />
            <button className="primary" type="submit" disabled={saving}>
              {saving ? 'Submitting...' : 'Submit Bid'}
            </button>
          </form>
        </div>
      )}

      {/* Customer/Admin: Bids দেখা */}
      {['CUSTOMER', 'ADMIN'].includes(user?.role) && bids.length > 0 && (
        <div className="card">
          <h2>💼 Technician Bids ({bids.length})</h2>
          {bids.map((bid) => (
            <div key={bid._id} style={{
              border: `2px solid ${bid.status === 'ACCEPTED' ? '#16a34a' : bid.status === 'REJECTED' ? '#dc2626' : '#e5e7eb'}`,
              borderRadius: 8, padding: '1rem', marginBottom: '0.75rem',
              background: bid.status === 'ACCEPTED' ? '#f0fdf4' : bid.status === 'REJECTED' ? '#fef2f2' : '#fff',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{bid.technicianId?.name}</strong>
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>({bid.technicianId?.role?.replace('_', ' ')})</span>
                </div>
                <span style={{
                  padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 'bold',
                  background: bid.status === 'ACCEPTED' ? '#dcfce7' : bid.status === 'REJECTED' ? '#fee2e2' : '#fef9c3',
                  color: bid.status === 'ACCEPTED' ? '#166534' : bid.status === 'REJECTED' ? '#991b1b' : '#854d0e',
                }}>
                  {bid.status}
                </span>
              </div>
              <p style={{ margin: '0.5rem 0' }}>
                <strong>৳{bid.estimatedAmount}</strong> · {bid.estimatedDays} day(s)
              </p>
              {bid.message && <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>{bid.message}</p>}
              {user?.role === 'CUSTOMER' && bid.status === 'PENDING' && repair.currentStatus === 'PENDING' && (
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                  <button className="primary" onClick={() => acceptBid(bid._id)}>✅ Accept</button>
                  <button onClick={() => rejectBid(bid._id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '0.4rem 1rem', borderRadius: 6, cursor: 'pointer' }}>❌ Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Customer: No bids yet */}
      {user?.role === 'CUSTOMER' && repair.currentStatus === 'PENDING' && bids.length === 0 && (
        <div className="card">
          <p style={{ color: '#6b7280' }}>⏳ Waiting for technicians to place bids on your repair...</p>
        </div>
      )}

      {/* ══ DELIVERY TRACKER ══════════════════════════════════════════════ */}
      {deliveryJob && (
        <div className="card">
          <h2>📦 Delivery Tracking</h2>
          <p><strong>Current:</strong> <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{DELIVERY_LABELS[deliveryJob.status]}</span></p>
          {deliveryJob.deliveryManId && (
            <p style={{ fontSize: 14, color: '#6b7280' }}>
              🚗 Delivery Man: <strong>{deliveryJob.deliveryManId.name}</strong>
            </p>
          )}
          <div style={{ marginTop: '1rem', borderLeft: '3px solid #e5e7eb', paddingLeft: '1rem' }}>
            {STATUS_ORDER.map((key) => {
              const done = deliveryJob.statusHistory?.some(h => h.status === key);
              const current = deliveryJob.status === key;
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0', opacity: done ? 1 : 0.3 }}>
                  <span style={{
                    width: 13, height: 13, borderRadius: '50%', flexShrink: 0,
                    background: current ? '#2563eb' : done ? '#16a34a' : '#d1d5db',
                    border: current ? '3px solid #93c5fd' : 'none',
                  }} />
                  <span style={{ fontWeight: current ? 'bold' : 'normal', color: current ? '#2563eb' : 'inherit', fontSize: 14 }}>
                    {DELIVERY_LABELS[key]}
                  </span>
                  {done && !current && <span style={{ color: '#16a34a', fontSize: 11 }}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ STATUS UPDATE (Admin/Technician) ══════════════════════════════ */}
      {(user?.role === 'ADMIN' || isTech) && (
        <div className="card">
          <h2>Update Status</h2>
          {isCompleted && <p className="success">Completed — locked.</p>}
          {isTech && !canMarkInProgress && repair.currentStatus === 'PENDING' && (
            <p style={{ color: '#f59e0b', fontWeight: 'bold' }}>
              ⚠️ You can mark IN_PROGRESS only after the device arrives at your location.
            </p>
          )}
          <form onSubmit={updateStatus}>
            <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={isCompleted}>
              {['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <label>Labor Charge</label>
            <input type="number" value={laborCharge} onChange={(e) => setLabor(e.target.value)} disabled={isCompleted} />
            <label>Tax</label>
            <input type="number" value={tax} onChange={(e) => setTax(e.target.value)} disabled={isCompleted} />
            <button className="primary" type="submit" disabled={saving || isCompleted}>
              {saving ? 'Saving...' : 'Save Status'}
            </button>
          </form>
        </div>
      )}

      {/* ══ SPARE PARTS ═══════════════════════════════════════════════════ */}
      <div className="card">
        <h2>Spare Part Usages</h2>
        {partUsages.length === 0 ? <p>No parts attached.</p> : (
          <table>
            <thead><tr><th>Part</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr></thead>
            <tbody>
              {partUsages.map((u) => (
                <tr key={u._id}>
                  <td>{u.sparePartId?.partName || 'Unknown'}</td>
                  <td>{u.quantityUsed}</td>
                  <td>{u.sparePartId?.unitCost ?? '-'}</td>
                  <td>{u.totalCostUsed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ══ ADMIN: ASSIGN TECHNICIAN ═══════════════════════════════════════ */}
      {user?.role === 'ADMIN' && (
        <div className="card">
          <h2>Assign Technician (Manual)</h2>
          <form onSubmit={assign}>
            <select value={techId} onChange={(e) => setTechId(e.target.value)}>
              {users.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
            </select>
            <button className="primary" type="submit">Assign</button>
          </form>
        </div>
      )}

      {/* ══ ASSIGNMENTS ═══════════════════════════════════════════════════ */}
      <div className="card">
        <h2>Assignments</h2>
        {assignments.length === 0 ? <p>None yet.</p> : (
          <ul>{assignments.map((a) => <li key={a._id}>{a.technicianId?.name} — {a.roleInRepair}</li>)}</ul>
        )}
      </div>

      {/* ══ ATTACH SPARE PART ══════════════════════════════════════════════ */}
      {(user?.role === 'ADMIN' || isTech) && (
        <div className="card">
          <h2>Attach Spare Part</h2>
          {isCompleted && <p className="success">Completed — locked.</p>}
          <form onSubmit={attachPart}>
            <select value={partId} onChange={(e) => setPartId(e.target.value)} disabled={isCompleted}>
              {parts.map((p) => <option key={p._id} value={p._id}>{p.partName} (stock {p.stockLevel})</option>)}
            </select>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} disabled={isCompleted} />
            <button className="primary" type="submit" disabled={saving || isCompleted}>
              {saving ? 'Saving...' : 'Add Usage'}
            </button>
          </form>
        </div>
      )}

      {/* ══ CUSTOMER CANCEL ════════════════════════════════════════════════ */}
      {user?.role === 'CUSTOMER' && repair.currentStatus === 'PENDING' && (
        <div className="card">
          <h2>Cancel Request</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            await api.patch(`/repairs/${id}/status`, { currentStatus: 'CANCELLED' });
            await load();
            window.alert('Cancelled.');
          }}>
            <button type="submit">Cancel Repair</button>
          </form>
        </div>
      )}
    </div>
  );
}