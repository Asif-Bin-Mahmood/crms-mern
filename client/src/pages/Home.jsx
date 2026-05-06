import { useAuth } from '../context/AuthContext.jsx';
import { Link } from 'react-router-dom';

const QUICK_LINKS = [
  { to: '/devices',       icon: '💻', label: 'Devices',       color: '#4f46e5', roles: null },
  { to: '/repairs',       icon: '🔧', label: 'Repairs',       color: '#7c3aed', roles: null },
  { to: '/bills',         icon: '🧾', label: 'Bills',         color: '#0ea5e9', roles: null },
  { to: '/notifications', icon: '🔔', label: 'Notifications', color: '#f59e0b', roles: null },
  { to: '/dashboard',     icon: '📊', label: 'My Dashboard',  color: '#10b981', roles: ['CUSTOMER'] },
  { to: '/spare-parts',   icon: '🔩', label: 'Spare Parts',   color: '#ef4444', roles: ['ADMIN','LEAD_TECHNICIAN','JUNIOR_TECHNICIAN'] },
  { to: '/assignments',   icon: '📋', label: 'Assignments',   color: '#06b6d4', roles: ['LEAD_TECHNICIAN','JUNIOR_TECHNICIAN'] },
  { to: '/admin/users',   icon: '👥', label: 'Manage Users',  color: '#8b5cf6', roles: ['ADMIN'] },
  { to: '/admin/analytics',icon:'📈', label: 'Analytics',     color: '#ec4899', roles: ['ADMIN'] },
];

const ROLE_GREET = {
  ADMIN: 'সিস্টেম সব আপনার নিয়ন্ত্রণে 🛡️',
  CUSTOMER: 'আপনার ডিভাইসের মেরামত ট্র্যাক করুন 📱',
  LEAD_TECHNICIAN: 'আজকের কাজ শুরু করুন 🔧',
  JUNIOR_TECHNICIAN: 'আপনার অ্যাসাইনমেন্ট দেখুন 👨‍🔧',
  DELIVERY_MAN: 'ডেলিভারি শুরু করুন 🚚',
};

export default function Home() {
  const { user } = useAuth();

  const links = QUICK_LINKS.filter(l => !l.roles || l.roles.includes(user?.role));

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(124,58,237,0.1) 100%)',
        border: '1px solid rgba(79,70,229,0.2)',
        borderRadius: 20,
        padding: '2rem',
        marginBottom: '1.75rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -30, right: -30,
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,70,229,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>👋</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 4 }}>
            স্বাগতম, {user?.name}!
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            {ROLE_GREET[user?.role] || 'দুরন্তFix-এ আপনাকে স্বাগতম।'}
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginTop: '0.75rem', padding: '4px 12px',
            background: 'rgba(79,70,229,0.2)', borderRadius: 20,
            fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary-light)',
          }}>
            ⚡ {user?.role?.replace('_', ' ')}
          </div>
        </div>
      </div>

      {/* Quick links grid */}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.75rem' }}>
        Quick Access
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.85rem' }}>
        {links.map(({ to, icon, label, color }) => (
          <Link
            key={to}
            to={to}
            style={{ textDecoration: 'none' }}
          >
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '1.25rem 1rem',
              textAlign: 'center',
              transition: 'all 0.18s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.3)`;
              e.currentTarget.style.borderColor = color + '60';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: color + '20',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', margin: '0 auto 0.75rem',
              }}>{icon}</div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>{label}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
