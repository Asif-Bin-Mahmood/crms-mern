import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function PaymentSuccess() {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 100); return () => clearTimeout(t); }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{
        maxWidth: 440, width: '100%',
        background: 'var(--bg-surface)',
        border: '1px solid rgba(16,185,129,0.3)',
        borderRadius: 24, padding: '3rem 2.5rem', textAlign: 'center',
        boxShadow: '0 0 60px rgba(16,185,129,0.1)',
        transform: show ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
        opacity: show ? 1 : 0,
        transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #059669, #10b981)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem', fontSize: 36,
          boxShadow: '0 4px 24px rgba(16,185,129,0.4)',
        }}>✓</div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 900, background: 'var(--gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>দুরন্তFix</span>
        </div>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 0.5rem' }}>
          পেমেন্ট সফল হয়েছে!
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, margin: '0 0 0.5rem' }}>
          আপনার পেমেন্ট SSLCommerz-এর মাধ্যমে নিরাপদে সম্পন্ন হয়েছে।
        </p>
        <p style={{ color: 'var(--text-faint)', fontSize: '0.82rem', margin: '0 0 2rem' }}>
          বিলের স্ট্যাটাস <strong style={{ color: 'var(--success)' }}>PAID</strong> এ আপডেট হয়েছে।
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link to="/dashboard" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '0.75rem 1.5rem', background: 'var(--gradient)',
            color: '#fff', borderRadius: 12, fontWeight: 700, fontSize: '0.95rem',
            textDecoration: 'none', boxShadow: 'var(--glow)',
          }}>
            ← ড্যাশবোর্ডে ফিরুন
          </Link>
          <Link to="/bills" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0.65rem 1.5rem', background: 'var(--bg-elevated)',
            border: '1px solid var(--border)', color: 'var(--text-muted)',
            borderRadius: 12, fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none',
          }}>
            সকল বিল দেখুন
          </Link>
        </div>
      </div>
    </div>
  );
}
