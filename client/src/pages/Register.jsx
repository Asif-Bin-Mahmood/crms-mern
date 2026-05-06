import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('CUSTOMER');
  const [err, setErr]           = useState('');
  const [loading, setLoading]   = useState(false);
  const { login }               = useAuth();
  const nav                     = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const { data: body } = await api.post('/auth/register', { name, email, password, role });
      login(body.data.token, body.data.user);
      nav(body.data.user.role === 'DELIVERY_MAN' ? '/delivery' : '/');
    } catch (ex) {
      setErr(ex.response?.data?.message || ex.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      {/* Left brand panel */}
      <div className="auth-brand">
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, background: 'var(--gradient)',
            borderRadius: 20, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 34, margin: '0 auto 1.5rem',
            boxShadow: 'var(--glow)',
          }}>⚡</div>

          <h1 style={{
            fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-1px',
            background: 'var(--gradient)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            marginBottom: '0.5rem',
          }}>দুরন্তFix</h1>

          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: 280, lineHeight: 1.7 }}>
            নতুন অ্যাকাউন্ট তৈরি করুন এবং <br />আমাদের সেবা উপভোগ করুন।
          </p>

          <div style={{
            marginTop: '2rem',
            background: 'rgba(79,70,229,0.1)',
            border: '1px solid rgba(79,70,229,0.2)',
            borderRadius: 12, padding: '1rem 1.5rem',
            color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'left',
          }}>
            <div style={{ marginBottom: 8, fontWeight: 600, color: 'var(--primary-light)' }}>✨ সুবিধাসমূহ</div>
            {['📱 রিয়েল-টাইম ট্র্যাকিং','💳 নিরাপদ পেমেন্ট','🔧 বিশেষজ্ঞ টেকনিশিয়ান'].map(t => (
              <div key={t} style={{ marginTop: 4 }}>{t}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="auth-form-side">
        <div className="auth-form-box">
          <h2>অ্যাকাউন্ট তৈরি করুন</h2>
          <p className="subtitle">আজই যোগ দিন দুরন্তFix-এ</p>

          <form onSubmit={onSubmit}>
            <label>পূর্ণ নাম</label>
            <input
              id="reg-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="আপনার নাম"
              required
              style={{ maxWidth: '100%' }}
            />

            <label>ইমেইল</label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{ maxWidth: '100%' }}
            />

            <label>পাসওয়ার্ড</label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ maxWidth: '100%' }}
            />

            <label>ভূমিকা</label>
            <select
              id="reg-role"
              value={role}
              onChange={e => setRole(e.target.value)}
              style={{ maxWidth: '100%' }}
            >
              <option value="CUSTOMER">Customer — গ্রাহক</option>
              <option value="DELIVERY_MAN">Delivery Man — ডেলিভারি ম্যান</option>
            </select>

            {err && <p className="error">⚠️ {err}</p>}

            <button
              id="reg-submit"
              className="primary w-full"
              type="submit"
              disabled={loading}
              style={{ padding: '0.75rem', fontSize: '0.95rem', justifyContent: 'center', marginTop: '0.5rem' }}
            >
              {loading ? '⏳ তৈরি হচ্ছে...' : '✅ অ্যাকাউন্ট তৈরি করুন'}
            </button>
          </form>

          <div className="divider" />

          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
            <Link to="/login" style={{ color: 'var(--primary-light)', fontWeight: 600 }}>
              লগইন করুন
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}