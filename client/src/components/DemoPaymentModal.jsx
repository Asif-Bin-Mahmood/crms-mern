import { useState } from 'react';
import { getAuthToken } from '../api/client.js';

const METHODS = [
  { id: 'CARD', label: '💳 Credit / Debit Card' },
  { id: 'MOBILE_BANKING', label: '📱 Mobile Banking (bKash / Nagad)' },
];

function fmtCard(v) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function fmtExpiry(v) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
}

// ── Receipt download — uses server-side pdfkit endpoint ──────────────────────
async function handleDownloadReceipt(transactionId, setReceiptLoading, setReceiptError) {
  setReceiptLoading(true);
  setReceiptError('');
  try {
    const token = getAuthToken();
    const response = await fetch(`/api/payment/demo/receipt/${transactionId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Server returned ${response.status}`);
    }

    // Get binary PDF blob and trigger browser download
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CRMS-Demo-Receipt-${transactionId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[handleDownloadReceipt]', err);
    setReceiptError('Download failed: ' + err.message);
  } finally {
    setReceiptLoading(false);
  }
}

// ── Main modal component ──────────────────────────────────────────────────────
export default function DemoPaymentModal({ bill, onClose, onSuccess }) {
  const total = Number(bill.laborCharge) + Number(bill.partsCost) + Number(bill.tax);
  const invoiceNo = `INV-${bill._id.toString().slice(-8).toUpperCase()}`;

  const [step, setStep]       = useState('method'); // method | form | otp | processing | success | failed
  const [method, setMethod]   = useState('CARD');
  const [card, setCard]       = useState('');
  const [expiry, setExpiry]   = useState('');
  const [cvv, setCvv]         = useState('');
  const [mobile, setMobile]   = useState('');
  const [otp, setOtp]         = useState('');
  const [errors, setErrors]   = useState({});
  const [txData, setTxData]   = useState(null);   // receipt data from API
  const [apiError, setApiError]       = useState('');
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError]     = useState('');

  function validate() {
    const e = {};
    if (method === 'CARD') {
      if (card.replace(/\s/g, '').length < 16) e.card   = 'Enter a 16-digit card number';
      if (!/^\d{2}\/\d{2}$/.test(expiry))      e.expiry = 'Use MM/YY format';
      if (cvv.length < 3)                       e.cvv    = 'CVV must be 3-4 digits';
    } else {
      if (!/^01[3-9]\d{8}$/.test(mobile))      e.mobile = 'Enter valid BD mobile (01XXXXXXXXX)';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submitPayment() {
    if (otp.length < 4) { setErrors({ otp: 'Enter any 4+ digits as demo OTP' }); return; }
    setErrors({});
    setStep('processing');
    setApiError('');
    try {
      const token = getAuthToken();
      const res = await fetch('/api/payment/demo/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          billId: bill._id,
          paymentMethod: method,
          cardNumber:   method === 'CARD'           ? card   : undefined,
          mobileNumber: method === 'MOBILE_BANKING' ? mobile : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message || 'Payment failed');
      setTxData(body.data);
      setStep('success');
      onSuccess(bill._id, body.data);
    } catch (err) {
      setApiError(err.message);
      setStep('failed');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480,
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)', overflow: 'hidden' }}>

        {/* ── Header ── */}
        <div style={{ background: 'linear-gradient(135deg,#1e40af,#3730a3)', padding: '20px 24px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🔒</span>
            <div>
              <h2 style={{ margin: 0, color: '#fff', fontSize: 17, fontWeight: 800 }}>Secure Payment</h2>
              <p style={{ margin: 0, color: '#bfdbfe', fontSize: 12 }}>Computer Repair Management System</p>
            </div>
          </div>
          <span style={{ position: 'absolute', top: 14, right: 50, background: '#fbbf24',
            color: '#78350f', fontSize: 9, fontWeight: 800, padding: '3px 10px',
            borderRadius: 20, letterSpacing: 0.5 }}>DEMO MODE</span>
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 14,
            background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
            width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 14 }}>✕</button>
          <div style={{ marginTop: 14, background: 'rgba(255,255,255,0.12)', borderRadius: 10,
            padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#bfdbfe', fontSize: 12 }}>{invoiceNo}</span>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>৳ {total.toFixed(2)}</span>
          </div>
        </div>

        <div style={{ padding: 24 }}>

          {/* ── STEP: method ── */}
          {step === 'method' && (
            <div>
              <p style={labelStyle}>Select Payment Method</p>
              {METHODS.map(m => (
                <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12,
                  border: `2px solid ${method === m.id ? '#2563eb' : '#e2e8f0'}`,
                  borderRadius: 10, padding: '12px 16px', cursor: 'pointer', marginBottom: 10,
                  background: method === m.id ? '#eff6ff' : '#fff' }}>
                  <input type="radio" name="method" value={m.id} checked={method === m.id}
                    onChange={() => setMethod(m.id)}
                    style={{ accentColor: '#2563eb', width: 16, height: 16 }} />
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{m.label}</span>
                </label>
              ))}
              <Btn color="#2563eb" onClick={() => setStep('form')}>Continue →</Btn>
            </div>
          )}

          {/* ── STEP: form ── */}
          {step === 'form' && (
            <div>
              <BackBtn onClick={() => setStep('method')} />
              {method === 'CARD' ? (<>
                <p style={labelStyle}>Card Details</p>
                <Field label="Card Number" hint="Test: 4242 4242 4242 4242" error={errors.card}>
                  <input value={card} onChange={e => setCard(fmtCard(e.target.value))}
                    placeholder="1234 5678 9012 3456" maxLength={19} style={inp(errors.card)} />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Expiry (MM/YY)" error={errors.expiry}>
                    <input value={expiry} onChange={e => setExpiry(fmtExpiry(e.target.value))}
                      placeholder="12/26" maxLength={5} style={inp(errors.expiry)} />
                  </Field>
                  <Field label="CVV" error={errors.cvv}>
                    <input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g,'').slice(0,4))}
                      placeholder="123" type="password" style={inp(errors.cvv)} />
                  </Field>
                </div>
              </>) : (<>
                <p style={labelStyle}>Mobile Banking</p>
                <Field label="Mobile Number" hint="01XXXXXXXXX" error={errors.mobile}>
                  <input value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g,'').slice(0,11))}
                    placeholder="01700000000" style={inp(errors.mobile)} />
                </Field>
              </>)}
              <DemoNote />
              <Btn color="#2563eb" onClick={() => validate() && setStep('otp')}>Send OTP →</Btn>
            </div>
          )}

          {/* ── STEP: otp ── */}
          {step === 'otp' && (
            <div>
              <BackBtn onClick={() => setStep('form')} />
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>📲</div>
                <p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>Enter Demo OTP</p>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
                  Type any 4+ digits — no real SMS is sent.
                </p>
              </div>
              <Field label="OTP" error={errors.otp}>
                <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                  placeholder="e.g. 1234"
                  style={{ ...inp(errors.otp), textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: 700 }}
                  autoFocus />
              </Field>
              <DemoNote />
              <Btn color="#16a34a" onClick={submitPayment}>
                Confirm &amp; Pay ৳{total.toFixed(2)}
              </Btn>
            </div>
          )}

          {/* ── STEP: processing ── */}
          {step === 'processing' && (
            <div style={{ textAlign: 'center', padding: '36px 0' }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>⏳</div>
              <p style={{ fontWeight: 700, color: '#1e293b', margin: 0, fontSize: 15 }}>Processing Payment...</p>
              <p style={{ fontSize: 13, color: '#64748b', margin: '8px 0 0' }}>Please wait</p>
            </div>
          )}

          {/* ── STEP: success ── */}
          {step === 'success' && txData && (
            <div style={{ textAlign: 'center' }}>
              {/* Green tick */}
              <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
                background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, boxShadow: '0 4px 20px rgba(34,197,94,0.4)' }}>✓</div>

              <h3 style={{ margin: '0 0 4px', color: '#1e293b', fontSize: 18, fontWeight: 800 }}>
                Payment Successful!
              </h3>
              <p style={{ margin: '0 0 18px', fontSize: 13, color: '#64748b' }}>
                Tx ID: <strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>{txData.transactionId}</strong>
              </p>

              {/* Mini summary */}
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px',
                textAlign: 'left', marginBottom: 20, fontSize: 12 }}>
                {[
                  ['Invoice',  txData.invoiceNumber],
                  ['Amount',   'BDT ' + Number(txData.amount).toFixed(2)],
                  ['Method',   txData.paymentMethod],
                  txData.maskedCard   && ['Card',   txData.maskedCard],
                  txData.mobileNumber && ['Mobile', txData.mobileNumber],
                  ['Date',     new Date(txData.paidAt).toLocaleString('en-GB')],
                ].filter(Boolean).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between',
                    padding: '5px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b' }}>{k}</span>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{v}</span>
                  </div>
                ))}
              </div>

              {receiptError && (
                <p style={{ color: '#dc2626', fontSize: 12, marginBottom: 10 }}>{receiptError}</p>
              )}

              {/* ── NEW RECEIPT BUTTON ── */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  id="download-receipt-btn"
                  onClick={() => handleDownloadReceipt(txData.transactionId, setReceiptLoading, setReceiptError)}
                  disabled={receiptLoading}
                  style={{
                    flex: 1, padding: '12px 8px', border: 'none', borderRadius: 10,
                    background: receiptLoading
                      ? '#94a3b8'
                      : 'linear-gradient(135deg,#0ea5e9,#2563eb)',
                    color: '#fff', fontWeight: 700, fontSize: 13, cursor: receiptLoading ? 'not-allowed' : 'pointer',
                    boxShadow: receiptLoading ? 'none' : '0 3px 12px rgba(14,165,233,0.4)',
                  }}
                >
                  {receiptLoading ? '⏳ Downloading...' : '⬇ Download PDF Receipt'}
                </button>
                <button
                  onClick={onClose}
                  style={{ flex: 1, padding: '12px 8px', border: 'none', borderRadius: 10,
                    background: 'linear-gradient(135deg,#2563eb,#4f46e5)', color: '#fff',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  Done ✓
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: failed ── */}
          {step === 'failed' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
                background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, color: '#fff', boxShadow: '0 4px 20px rgba(239,68,68,0.4)' }}>!</div>
              <h3 style={{ margin: '0 0 8px', color: '#1e293b' }}>Payment Failed</h3>
              {apiError && <p style={{ margin: '0 0 18px', color: '#dc2626', fontSize: 13 }}>{apiError}</p>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setStep('method'); setApiError(''); }}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid #e2e8f0',
                    background: '#fff', color: '#374151', fontWeight: 700, cursor: 'pointer' }}>
                  Try Again
                </button>
                <button onClick={onClose}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none',
                    background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  Close
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function Btn({ color, onClick, children }) {
  return (
    <button onClick={onClick} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none',
      background: color, color: '#fff', fontWeight: 700, fontSize: 14,
      cursor: 'pointer', marginTop: 14 }}>
      {children}
    </button>
  );
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', color: '#3b82f6',
      cursor: 'pointer', fontWeight: 600, fontSize: 13, padding: 0, marginBottom: 14 }}>
      ← Back
    </button>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>
        {label}{hint && <span style={{ color: '#94a3b8', fontWeight: 400 }}> — {hint}</span>}
      </label>
      {children}
      {error && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#dc2626' }}>{error}</p>}
    </div>
  );
}

function DemoNote() {
  return (
    <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8,
      padding: '8px 12px', fontSize: 11, color: '#854d0e', marginBottom: 6 }}>
      🧪 <strong>Demo Mode:</strong> any valid-format input accepted. No real bank validation.
    </div>
  );
}

const labelStyle = { margin: '0 0 14px', fontWeight: 700, color: '#1e293b', fontSize: 14 };

function inp(hasError) {
  return {
    width: '100%', padding: '10px 12px', marginBottom: 0,
    border: '1.5px solid ' + (hasError ? '#ef4444' : '#e2e8f0'),
    borderRadius: 8, fontSize: 14, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  };
}
