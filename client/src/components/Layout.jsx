import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const NAV = [
  { to: '/',             icon: '🏠', label: 'Home',         roles: null },
  { to: '/dashboard',    icon: '📊', label: 'Dashboard',    roles: ['CUSTOMER'] },
  { to: '/devices',      icon: '💻', label: 'Devices',      roles: null },
  { to: '/repairs',      icon: '🔧', label: 'Repairs',      roles: null },
  { to: '/bills',        icon: '🧾', label: 'Bills',        roles: null },
  { to: '/notifications',icon: '🔔', label: 'Notifications',roles: null },
  { to: '/assignments',  icon: '📋', label: 'Assignments',  roles: ['LEAD_TECHNICIAN','JUNIOR_TECHNICIAN'] },
  { to: '/spare-parts',  icon: '🔩', label: 'Spare Parts',  roles: ['ADMIN','LEAD_TECHNICIAN','JUNIOR_TECHNICIAN'] },
  { to: '/admin/users',  icon: '👥', label: 'Users',        roles: ['ADMIN'] },
  { to: '/admin/analytics',icon:'📈',label: 'Analytics',    roles: ['ADMIN'] },
];

const ROLE_LABELS = {
  ADMIN:             'Admin',
  CUSTOMER:          'Customer',
  LEAD_TECHNICIAN:   'Lead Tech',
  JUNIOR_TECHNICIAN: 'Junior Tech',
  DELIVERY_MAN:      'Delivery Man',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const loc = useLocation();
  const nav = useNavigate();
  const isLight = theme === 'light';

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const visibleLinks = NAV.filter(({ roles }) =>
    !roles || roles.includes(user?.role)
  );

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <Link to="/" className="sidebar-logo">
          <div className="sidebar-logo-icon">⚡</div>
          <span className="sidebar-logo-text">দুরন্তFix</span>
        </Link>

        <nav className="sidebar-nav">
          {visibleLinks.map(({ to, icon, label }) => {
            const isActive = to === '/'
              ? loc.pathname === '/'
              : loc.pathname.startsWith(to);
            return (
              <Link key={to} to={to} className={isActive ? 'active' : ''}>
                <span className="nav-icon">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{ROLE_LABELS[user?.role] || user?.role}</div>
            </div>
          </div>

          {/* ── Theme toggle ── */}
          <button className="theme-toggle" onClick={toggle} title="Toggle dark/light mode">
            <span>{isLight ? '🌙' : '☀️'}</span>
            <span style={{ flex: 1, textAlign: 'left' }}>{isLight ? 'Dark Mode' : 'Light Mode'}</span>
            <span className={`toggle-pill ${isLight ? '' : 'on'}`} />
          </button>

          <button
            className="ghost w-full"
            style={{ justifyContent: 'center', padding: '0.5rem' }}
            onClick={() => { logout(); nav('/login'); }}
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
