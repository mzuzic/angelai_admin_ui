import { brand } from '../core/brand.js'
import { useAuth } from '../contexts/auth-context.js'
import AngelLogo from './AngelLogo.jsx'
import { useLocation, useNavigate } from 'react-router-dom'

export default function AppShell({ children }) {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const navItems = [
    { label: 'Overview', path: '/' },
    { label: 'Organizations', path: '/organizations' },
    { label: 'Admin Users', path: '/admin-users' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      <aside
        style={{
          width: 280,
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border)',
          padding: '22px 0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '0 22px 22px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AngelLogo size={20} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              {brand.product}
            </span>
          </div>
          <div
            style={{
              marginTop: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 999,
              background: 'rgba(204, 107, 46, 0.08)',
              color: 'var(--accent)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}
          >
            {brand.kicker}
          </div>
          <p style={{ margin: '14px 0 0', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5 }}>
            Separate admin surface with the same AngelHQ frame and a dedicated
            deployment target.
          </p>
        </div>

        <div style={{ padding: '18px 14px 0' }}>
          <div className="nav-section-header">HOME</div>
          {navItems.map((item) => (
            <div
              key={item.path}
              className={`nav-item${location.pathname === item.path ? ' active' : ''}`}
              onClick={() => navigate(item.path)}
              style={{ cursor: 'pointer' }}
            >
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            padding: '16px 28px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--card)',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AngelLogo size={18} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                {brand.product}
              </span>
            </div>
            <div
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid rgba(204, 107, 46, 0.16)',
                background: '#FFF7F0',
                color: 'var(--accent)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
              }}
            >
              ADMIN APP
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.email}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              style={{
                padding: '9px 12px',
                background: 'transparent',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.06em',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
            >
              SIGN OUT
            </button>
          </div>
        </header>

        <main style={{ padding: '28px', flex: 1 }}>{children}</main>
      </div>
    </div>
  )
}
