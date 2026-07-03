import { useAuth } from '../contexts/auth-context.js'
import AngelLogo from '../components/AngelLogo.jsx'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        fontFamily: 'var(--font)',
        background: 'var(--bg)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '40px 36px',
          width: 380,
          maxWidth: '100%',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ marginBottom: 16 }}>
            <AngelLogo size={42} />
          </div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: 'var(--text)',
              fontFamily: 'var(--font)',
              margin: 0,
            }}
          >
            AngelHQ.ai
          </h1>
          <div
            style={{
              display: 'inline-flex',
              marginTop: 10,
              padding: '5px 10px',
              borderRadius: 999,
              background: '#FFF7F0',
              border: '1px solid rgba(204, 107, 46, 0.16)',
              color: 'var(--accent)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}
          >
            ADMIN APP
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
            Sign in to the separate admin surface
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: 11,
                color: 'var(--text-dim)',
                letterSpacing: '0.06em',
                fontWeight: 500,
                display: 'block',
                marginBottom: 6,
              }}
            >
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@company.com"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text)',
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                fontSize: 11,
                color: 'var(--text-dim)',
                letterSpacing: '0.06em',
                fontWeight: 500,
                display: 'block',
                marginBottom: 6,
              }}
            >
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text)',
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div
              style={{
                background: '#FFF0F0',
                border: '1px solid #FFCACA',
                borderRadius: 4,
                padding: '10px 12px',
                marginBottom: 16,
                fontSize: 12,
                color: '#DC3545',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#a85a25' : 'var(--accent)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>

          <div
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--accent)',
              marginTop: 16,
            }}
          >
            Admin-only workspace
          </div>
        </form>
      </div>
    </div>
  )
}
