import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  const navItems = [
    { to: '/', label: 'DAILY', icon: '📅', end: true },
    { to: '/goals', label: 'GOALS', icon: '🎯', end: false },
    { to: '/blind-box', label: 'BLIND BOX', icon: '🎲', end: false },
  ];

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Desktop nav */}
      <nav
        style={{
          backgroundColor: 'var(--bg2)',
          borderBottom: '1px solid var(--border)',
          padding: '0 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          height: '56px',
        }}
        className="hidden md:flex"
      >
        <span
          style={{
            fontFamily: '"Bebas Neue", cursive',
            fontSize: '1.5rem',
            letterSpacing: '0.1em',
            color: 'var(--amber)',
            marginRight: '1rem',
          }}
        >
          FORGE
        </span>

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={({ isActive }) => ({
              color: isActive ? 'var(--amber)' : 'var(--muted)',
              textDecoration: 'none',
              fontFamily: '"Bebas Neue", cursive',
              fontSize: '1rem',
              letterSpacing: '0.08em',
              borderBottom: isActive ? '2px solid var(--amber)' : '2px solid transparent',
              paddingBottom: '2px',
              transition: 'all 0.2s ease',
            })}
          >
            {item.icon} {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Page content */}
      <main style={{ flex: 1, paddingBottom: '80px' }}>
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'var(--bg2)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-around',
          padding: '0.5rem 0',
          zIndex: 50,
        }}
        className="md:hidden"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column' as const,
              alignItems: 'center',
              gap: '2px',
              color: isActive ? 'var(--amber)' : 'var(--muted)',
              textDecoration: 'none',
              fontSize: '0.65rem',
              fontFamily: '"Bebas Neue", cursive',
              letterSpacing: '0.06em',
              padding: '0.25rem 0.75rem',
              transition: 'color 0.2s ease',
            })}
          >
            <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
