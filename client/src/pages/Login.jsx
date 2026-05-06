import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr]           = useState('');
  const [loading, setLoading]   = useState(false);
  const { login }               = useAuth();
  const nav                     = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const { data: body } = await api.post('/auth/login', { email, password });
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
            আপনার বিশ্বস্ত কম্পিউটার মেরামত সেবা।<br />
            দ্রুত · নির্ভরযোগ্য · সাশ্রয়ী
          </p>

          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '2.5rem' }}>
            {[['⚡','দ্রুত সেবা'],['🛡️','নিরাপদ'],['💰','সাশ্রয়ী']].map(([icon, txt]) => (
              <div key={txt} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{icon}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{txt}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="auth-form-side">
        <div className="auth-form-box">
          <h2>স্বাগতম!</h2>
          <p className="subtitle">আপনার অ্যাকাউন্টে লগইন করুন</p>

          <form onSubmit={onSubmit}>
            <label>ইমেইল</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{ maxWidth: '100%' }}
            />

            <label>পাসওয়ার্ড</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ maxWidth: '100%' }}
            />

            {err && <p className="error">⚠️ {err}</p>}

            <button
              id="login-submit"
              className="primary w-full"
              type="submit"
              disabled={loading}
              style={{ padding: '0.75rem', fontSize: '0.95rem', justifyContent: 'center', marginTop: '0.5rem' }}
            >
              {loading ? '⏳ লগইন হচ্ছে...' : '🚀 লগইন করুন'}
            </button>
          </form>

          <div className="divider" />

          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            অ্যাকাউন্ট নেই?{' '}
            <Link to="/register" style={{ color: 'var(--primary-light)', fontWeight: 600 }}>
              রেজিস্টার করুন
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}