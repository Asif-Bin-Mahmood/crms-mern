import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

export default function PaymentFail() {
  const [searchParams] = useSearchParams();
  const reason         = searchParams.get('reason');
  const isCancelled    = reason === 'cancel';
  const [show, setShow] = useState(false);

  useEffect(() => { const t = setTimeout(() => setShow(true), 100); return () => clearTimeout(t); }, []);

  const accent = isCancelled ? '#f59e0b' : '#ef4444';
  const glow   = isCancelled ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{
        maxWidth: 440, width: '100%',
        background: 'var(--bg-surface)',
        border: `1px solid ${accent}40`,
        borderRadius: 24, padding: '3rem 2.5rem', textAlign: 'center',
        boxShadow: `0 0 60px ${glow}`,
        transform: show ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
        opacity: show ? 1 : 0,
        transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: isCancelled
            ? 'linear-gradient(135deg, #d97706, #f59e0b)'
            : 'linear-gradient(135deg, #dc2626, #ef4444)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem', fontSize: 36,
          boxShadow: `0 4px 24px ${glow}`,
        }}>{isCancelled ? '✕' : '✗'}</div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 900, background: 'var(--gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>দুরন্তFix</span>
        </div>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 0.5rem' }}>
          {isCancelled ? 'পেমেন্ট বাতিল হয়েছে' : 'পেমেন্ট ব্যর্থ হয়েছে'}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, margin: '0 0 0.5rem' }}>
          {isCancelled
            ? 'আপনি পেমেন্ট বাতিল করেছেন। আপনার বিলটি এখনও বাকি আছে।'
            : 'আপনার পেমেন্ট সম্পন্ন হয়নি। আবার চেষ্টা করুন।'}
        </p>
        <p style={{ color: 'var(--text-faint)', fontSize: '0.82rem', margin: '0 0 2rem' }}>
          আপনার অ্যাকাউন্ট থেকে কোনো টাকা কাটা হয়নি।
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link to="/dashboard" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
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
            আবার চেষ্টা করুন
          </Link>
        </div>
      </div>
    </div>
  );
}
