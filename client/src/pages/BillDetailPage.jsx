import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

// ── Print styles injected once ────────────────────────────────────────────────
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #invoice-printable, #invoice-printable * { visibility: visible !important; }
  #invoice-printable {
    position: fixed !important; inset: 0 !important;
    width: 100% !important; padding: 32px !important;
    background: #fff !important; z-index: 99999 !important;
  }
  .no-print { display: none !important; }
}
`;

function StatusPill({ status }) {
  const map = {
    PAID:     { bg: '#dcfce7', color: '#166534' },
    PENDING:  { bg: '#fef9c3', color: '#854d0e' },
    FAILED:   { bg: '#fee2e2', color: '#991b1b' },
    REFUNDED: { bg: '#f3e8ff', color: '#6b21a8' },
  };
  const s = map[status] || { bg: '#f1f5f9', color: '#475569' };
  return (
    <span style={{ display: 'inline-block', background: s.bg, color: s.color,
      padding: '3px 14px', borderRadius: 999, fontWeight: 700, fontSize: 13 }}>
      {status}
    </span>
  );
}

export default function BillDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [bill, setBill] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  async function load() {
    const { data } = await api.get(`/bills/${id}`);
    setBill(data.data.bill);
  }

  useEffect(() => { load().catch(() => {}); }, [id]);

  async function updatePaymentStatus(paymentStatus) {
    try {
      setSaving(true);
      await api.patch(`/bills/${id}/payment`, { paymentStatus });
      await load();
      setNotice(`Status updated to ${paymentStatus}.`);
    } catch (ex) {
      setNotice(ex.response?.data?.message || ex.message);
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (!bill) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
        <div style={{ fontSize: 36 }}>⏳</div>
        <p>Loading invoice...</p>
      </div>
    );
  }

  const total     = Number(bill.totalAmount ?? (Number(bill.laborCharge) + Number(bill.partsCost) + Number(bill.tax)));
  const invoiceNo = `INV-${bill._id.toString().slice(-8).toUpperCase()}`;
  const genDate   = new Date(bill.dateGenerated || bill.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const tx = bill.paymentTransaction; // may be null

  return (
    <>
      {/* Inject print CSS once */}
      <style>{PRINT_CSS}</style>

      {/* ── Action bar (hidden when printing) ── */}
      <div className="no-print" style={{ maxWidth: 720, margin: '0 auto 20px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={handlePrint}
          style={{
            padding: '10px 22px', border: 'none', borderRadius: 9,
            background: 'linear-gradient(135deg,#2563eb,#4f46e5)',
            color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(37,99,235,0.3)',
          }}
        >
          🖨️ Print Invoice
        </button>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>
          Use your browser's "Save as PDF" option in the print dialog to download as PDF.
        </span>
      </div>

      {/* ── Invoice card (this gets printed) ── */}
      <div id="invoice-printable" style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg,#1e40af,#3730a3)',
            padding: '28px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          }}>
            <div>
              <h1 style={{ margin: 0, color: '#fff', fontSize: 24, fontWeight: 800 }}>TAX INVOICE</h1>
              <p style={{ margin: '4px 0 0', color: '#bfdbfe', fontSize: 13 }}>
                Computer Repair Management System
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, color: '#bfdbfe', fontSize: 12, fontWeight: 600 }}>Invoice No.</p>
              <p style={{ margin: '2px 0 0', color: '#fff', fontWeight: 800, fontSize: 18, fontFamily: 'monospace' }}>
                {invoiceNo}
              </p>
              <p style={{ margin: '6px 0 0', color: '#bfdbfe', fontSize: 12 }}>Date: {genDate}</p>
            </div>
          </div>

          {/* Status banner */}
          <div style={{
            padding: '12px 36px',
            background: bill.paymentStatus === 'PAID' ? '#dcfce7' : bill.paymentStatus === 'PENDING' ? '#fef9c3' : '#fee2e2',
            display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #e2e8f0',
          }}>
            <span style={{ fontSize: 18 }}>
              {bill.paymentStatus === 'PAID' ? '✅' : bill.paymentStatus === 'PENDING' ? '⏳' : '❌'}
            </span>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Payment Status:</span>
            <StatusPill status={bill.paymentStatus} />
          </div>

          <div style={{ padding: '28px 36px' }}>

            {/* Customer & Repair info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
              <div>
                <p style={secLabel}>Billed To</p>
                <p style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: 15 }}>
                  {bill.customerId?.name || 'Customer'}
                </p>
                {bill.customerId?.email && (
                  <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: 13 }}>{bill.customerId.email}</p>
                )}
              </div>
              <div>
                <p style={secLabel}>Repair Reference</p>
                <p style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: 13, fontFamily: 'monospace' }}>
                  {bill.repairRequestId?._id?.toString().slice(-12).toUpperCase() || String(bill.repairRequestId).slice(-12).toUpperCase()}
                </p>
                {bill.repairRequestId?.issueDescription && (
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>
                    {bill.repairRequestId.issueDescription.substring(0, 80)}
                  </p>
                )}
              </div>
            </div>

            {/* Line items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Description', 'Amount (BDT)'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Amount (BDT)' ? 'right' : 'left',
                      fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase',
                      letterSpacing: 0.5, borderBottom: '2px solid #e2e8f0' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Labour / Service Charge', Number(bill.laborCharge)],
                  ['Spare Parts Cost',         Number(bill.partsCost)],
                  ['Tax',                      Number(bill.tax)],
                ].map(([desc, amt], i) => (
                  <tr key={desc} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '11px 14px', fontSize: 14, color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>{desc}</td>
                    <td style={{ padding: '11px 14px', fontSize: 14, color: '#1e293b', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>
                      {amt.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#1e40af' }}>
                  <td style={{ padding: '13px 14px', fontWeight: 800, color: '#fff', fontSize: 15 }}>Total Amount Due</td>
                  <td style={{ padding: '13px 14px', fontWeight: 800, color: '#fff', fontSize: 18, textAlign: 'right' }}>
                    ৳ {total.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Payment method (shown when a PaymentTransaction exists) */}
            {tx && (
              <div style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
                padding: '16px 20px', marginBottom: 20,
              }}>
                <p style={{ margin: '0 0 10px', fontWeight: 700, color: '#166534', fontSize: 13 }}>
                  ✅ Payment Details
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', fontSize: 13 }}>
                  {[
                    ['Transaction ID', tx.transactionId],
                    ['Payment Method', tx.paymentMethod?.replace('_', ' ')],
                    tx.metadata?.maskedCard   && ['Card Number',   tx.metadata.maskedCard],
                    tx.metadata?.mobileNumber && ['Mobile Number', tx.metadata.mobileNumber],
                    ['Paid On', new Date(tx.paidAt).toLocaleString('en-GB')],
                    ['Mode', tx.isDemo ? 'Demo Simulator' : 'SSLCommerz Gateway'],
                  ].filter(Boolean).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#6b7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>{k}</span>
                      <span style={{ color: '#111827', fontWeight: 700, fontFamily: k === 'Transaction ID' ? 'monospace' : 'inherit' }}>{v}</span>
                    </div>
                  ))}
                </div>
                {tx.isDemo && (
                  <p style={{ margin: '10px 0 0', fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>
                    * DEMO PAYMENT — NOT A REAL FINANCIAL TRANSACTION
                  </p>
                )}
              </div>
            )}

            {/* Notice */}
            {notice && (
              <p className="no-print" style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                background: notice.includes('updated') ? '#dcfce7' : '#fee2e2',
                color: notice.includes('updated') ? '#166534' : '#dc2626',
                fontSize: 13, fontWeight: 600,
              }}>{notice}</p>
            )}

            {/* Admin / customer actions */}
            <div className="no-print">
              {(user?.role === 'CUSTOMER' || user?.role === 'ADMIN') && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {bill.paymentStatus === 'PENDING' && (<>
                    <button disabled={saving} onClick={() => updatePaymentStatus('PAID')}
                      style={actionBtn('#16a34a')}>Mark as Paid</button>
                    <button disabled={saving} onClick={() => updatePaymentStatus('FAILED')}
                      style={actionBtn('#dc2626')}>Mark as Failed</button>
                  </>)}
                  {bill.paymentStatus === 'FAILED' && (
                    <button disabled={saving} onClick={() => updatePaymentStatus('PAID')}
                      style={actionBtn('#16a34a')}>Retry — Mark Paid</button>
                  )}
                  {bill.paymentStatus === 'PAID' && user?.role === 'ADMIN' && (
                    <button disabled={saving} onClick={() => updatePaymentStatus('REFUNDED')}
                      style={actionBtn('#7c3aed')}>Mark as Refunded</button>
                  )}
                </div>
              )}
            </div>

            {/* Footer (print only) */}
            <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
                Computer Repair Management System · Generated {new Date().toLocaleString('en-GB')}
              </p>
              {tx?.isDemo && (
                <p style={{ margin: '4px 0 0', fontSize: 10, color: '#d1d5db', fontStyle: 'italic' }}>
                  DEMO PAYMENT — NOT A REAL TRANSACTION
                </p>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

const secLabel = { margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 };

function actionBtn(bg) {
  return {
    padding: '9px 18px', border: 'none', borderRadius: 8,
    background: bg, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
  };
}
