import { useEffect, useState } from 'react'

import {
  createAdminUser,
  deactivateAdminUser,
  listAdminUsers,
  setAdminUserPassword,
  updateAdminUser,
} from '../services/api.js'
import { useAuth } from '../contexts/auth-context.js'

export default function AdminUsersPage() {
  const { token, user } = useAuth()
  const [adminUsers, setAdminUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  })

  async function loadAdminUsers() {
    setError('')
    try {
      const rows = await listAdminUsers(token)
      setAdminUsers(rows)
    } catch (err) {
      setError(err.message || 'Failed to load admin users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function hydrate() {
      try {
        const rows = await listAdminUsers(token)
        if (active) {
          setAdminUsers(rows)
          setError('')
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to load admin users')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    hydrate()

    return () => {
      active = false
    }
  }, [token])

  async function handleRefresh() {
    setLoading(true)
    await loadAdminUsers()
  }

  async function handleCreate(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const created = await createAdminUser(token, form)
      setAdminUsers((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))
      setForm({ name: '', email: '', password: '' })
    } catch (err) {
      setError(err.message || 'Failed to create admin user')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(adminUser) {
    try {
      const updated = await updateAdminUser(token, adminUser.id, {
        is_active: !adminUser.is_active,
      })
      setAdminUsers((current) => current.map((row) => (row.id === updated.id ? updated : row)))
    } catch (err) {
      setError(err.message || 'Failed to update admin user')
    }
  }

  async function handleDeactivate(adminUser) {
    try {
      await deactivateAdminUser(token, adminUser.id)
      setAdminUsers((current) =>
        current.map((row) =>
          row.id === adminUser.id ? { ...row, is_active: false } : row,
        ),
      )
    } catch (err) {
      setError(err.message || 'Failed to deactivate admin user')
    }
  }

  async function handlePasswordReset(adminUser) {
    const newPassword = window.prompt(`Set a new password for ${adminUser.email}`)
    if (!newPassword) {
      return
    }
    try {
      await setAdminUserPassword(token, adminUser.id, newPassword)
    } catch (err) {
      setError(err.message || 'Failed to reset password')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '24px 28px',
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            letterSpacing: '0.14em',
            fontWeight: 600,
            marginBottom: 14,
          }}
        >
          ADMIN USERS
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
          Separate admin identities
        </h1>
        <p style={{ maxWidth: 760, color: 'var(--text-dim)', lineHeight: 1.6, fontSize: 14 }}>
          These users are stored in the dedicated <code>admin_users</code> table and
          authenticate independently from the main app users table.
        </p>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 420px) 1fr',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <form
          onSubmit={handleCreate}
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '20px 24px',
            display: 'grid',
            gap: 14,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Create Admin User</div>

          {[
            ['Name', 'name', 'text'],
            ['Email', 'email', 'email'],
            ['Password', 'password', 'password'],
          ].map(([label, key, type]) => (
            <label key={key} style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em', fontWeight: 500 }}>
                {label.toUpperCase()}
              </span>
              <input
                type={type}
                value={form[key]}
                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
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
                }}
              />
            </label>
          ))}

          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              padding: '12px',
              background: saving ? '#a85a25' : 'var(--accent)',
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
            {saving ? 'CREATING...' : 'CREATE ADMIN USER'}
          </button>
        </form>

        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '20px 24px',
            display: 'grid',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Current Admin Users</div>
            <button
              type="button"
              onClick={handleRefresh}
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'transparent',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
              }}
            >
              REFRESH
            </button>
          </div>

          {error && (
            <div
              style={{
                background: '#FFF0F0',
                border: '1px solid #FFCACA',
                borderRadius: 4,
                padding: '10px 12px',
                fontSize: 12,
                color: '#DC3545',
              }}
            >
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading admin users...</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {adminUsers.map((adminUser) => (
                <div
                  key={adminUser.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '16px 18px',
                    background: adminUser.is_active ? 'var(--card)' : '#FCFAF8',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                        {adminUser.name}
                        {adminUser.id === user?.id ? ' (You)' : ''}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                        {adminUser.email}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-dim)' }}>
                        Status: {adminUser.is_active ? 'Active' : 'Inactive'}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-dim)' }}>
                        Last login: {adminUser.last_login_at || 'Never'}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
                      <button
                        type="button"
                        onClick={() => handlePasswordReset(adminUser)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          background: 'transparent',
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          cursor: 'pointer',
                        }}
                      >
                        RESET PASSWORD
                      </button>
                      {adminUser.is_active ? (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(adminUser)}
                          disabled={adminUser.id === user?.id}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 6,
                            border: '1px solid #F2C7C7',
                            background: '#FFF5F5',
                            color: '#C24B4B',
                            fontSize: 11,
                            fontFamily: 'var(--font-mono)',
                            cursor: adminUser.id === user?.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          DEACTIVATE
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleActive(adminUser)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 6,
                            border: '1px solid #CFE8DB',
                            background: '#F3FBF6',
                            color: '#217A54',
                            fontSize: 11,
                            fontFamily: 'var(--font-mono)',
                            cursor: 'pointer',
                          }}
                        >
                          REACTIVATE
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
