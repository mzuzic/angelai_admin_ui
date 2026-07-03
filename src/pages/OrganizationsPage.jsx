import { useEffect, useState } from 'react'

import {
  getOrganizationDetail,
  getOrganizationUserTokenUsage,
  listOrganizations,
} from '../services/api.js'
import { useAuth } from '../contexts/auth-context.js'

function fmtNumber(value) {
  return (Number(value) || 0).toLocaleString()
}

function fmtCost(value) {
  const amount = Number(value) || 0
  if (amount === 0) return '$0.00'
  if (amount < 0.01) return '<$0.01'
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function totalTokens(stats) {
  return (stats?.input_tokens || 0) + (stats?.output_tokens || 0)
}

function TokenStatCard({ label, value, accent = 'var(--text)' }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '18px 20px',
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          letterSpacing: '0.12em',
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: accent,
          fontFamily: 'var(--font-mono)',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function TokenUsageModal({ user, data, error, loading, onClose }) {
  const statBlock = (label, stats) => (
    <div
      style={{
        background: '#F7F6F4',
        border: '1px solid #E5E4E1',
        borderRadius: 6,
        padding: '14px 16px',
        flex: 1,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: '#767676',
          letterSpacing: '0.08em',
          marginBottom: 10,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {label}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
        {[
          ['Input tokens', stats.input_tokens],
          ['Output tokens', stats.output_tokens],
          ['API calls', stats.api_calls],
          ['Tool calls', stats.tool_calls],
        ].map(([key, value]) => (
          <div key={key}>
            <div style={{ fontSize: 10, color: '#999', marginBottom: 2 }}>{key}</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#1A1A1A',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {fmtNumber(value)}
            </div>
          </div>
        ))}
        <div
          style={{
            gridColumn: '1 / -1',
            borderTop: '1px solid #E5E4E1',
            paddingTop: 8,
            marginTop: 2,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 10, color: '#999', marginBottom: 2 }}>Total tokens</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#CC6B2E',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {fmtNumber(totalTokens(stats))}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#999', marginBottom: 2 }}>Est. cost</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#CC6B2E',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {fmtCost(stats.cost_usd)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.35)', zIndex: 999 }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#FFFFFF',
          border: '1px solid #E5E4E1',
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          zIndex: 1000,
          width: 'min(640px, 92vw)',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E5E4E1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>Token Usage</div>
            <div style={{ fontSize: 11, color: '#767676', marginTop: 2 }}>
              {user?.name} · {user?.email}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#767676',
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: 20 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#767676', fontSize: 13 }}>Loading...</div>
          ) : error ? (
            <div style={{ color: '#DC3545', fontSize: 13, padding: 8 }}>{error}</div>
          ) : data ? (
            <>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                {statBlock('THIS MONTH', data.this_month)}
                {statBlock('ALL TIME', data.all_time)}
              </div>
              {data.by_model?.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#767676',
                      letterSpacing: '0.08em',
                      marginBottom: 8,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    BY MODEL
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #E5E4E1' }}>
                          {['Model', 'Input', 'Output', 'Calls', 'Cost'].map((header) => (
                            <th
                              key={header}
                              style={{
                                textAlign: header === 'Model' ? 'left' : 'right',
                                padding: '6px 10px',
                                fontSize: 10,
                                color: '#767676',
                                fontWeight: 600,
                                letterSpacing: '0.06em',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.by_model.map((row) => (
                          <tr key={row.model} style={{ borderBottom: '1px solid #F3F2EF' }}>
                            <td
                              style={{
                                padding: '8px 10px',
                                fontSize: 12,
                                color: '#1A1A1A',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              {row.model}
                            </td>
                            <td
                              style={{
                                padding: '8px 10px',
                                fontSize: 12,
                                color: '#444',
                                textAlign: 'right',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              {fmtNumber(row.input_tokens)}
                            </td>
                            <td
                              style={{
                                padding: '8px 10px',
                                fontSize: 12,
                                color: '#444',
                                textAlign: 'right',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              {fmtNumber(row.output_tokens)}
                            </td>
                            <td
                              style={{
                                padding: '8px 10px',
                                fontSize: 12,
                                color: '#444',
                                textAlign: 'right',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              {fmtNumber(row.api_calls)}
                            </td>
                            <td
                              style={{
                                padding: '8px 10px',
                                fontSize: 12,
                                color: '#CC6B2E',
                                textAlign: 'right',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 600,
                              }}
                            >
                              {fmtCost(row.cost_usd)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}

export default function OrganizationsPage() {
  const { token } = useAuth()
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [usageUser, setUsageUser] = useState(null)
  const [usageData, setUsageData] = useState(null)
  const [usageError, setUsageError] = useState('')
  const [usageLoading, setUsageLoading] = useState(false)

  async function loadOrganizations(preferredOrgId) {
    setLoading(true)
    try {
      const rows = await listOrganizations(token)
      setOrganizations(rows)
      setError('')
      if (!rows.length) {
        setSelectedOrgId(null)
        setDetail(null)
        return
      }
      const nextOrgId =
        preferredOrgId && rows.some((row) => row.id === preferredOrgId) ? preferredOrgId : rows[0].id
      setSelectedOrgId(nextOrgId)
    } catch (err) {
      setError(err.message || 'Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

  async function loadDetail(orgId) {
    if (!orgId) {
      setDetail(null)
      return
    }
    setDetailLoading(true)
    try {
      const data = await getOrganizationDetail(token, orgId)
      setDetail(data)
      setDetailError('')
    } catch (err) {
      setDetail(null)
      setDetailError(err.message || 'Failed to load organization detail')
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    loadOrganizations()
  }, [token])

  useEffect(() => {
    loadDetail(selectedOrgId)
  }, [selectedOrgId, token])

  async function handleRefresh() {
    await loadOrganizations(selectedOrgId)
    if (selectedOrgId) {
      await loadDetail(selectedOrgId)
    }
  }

  async function openUsage(user) {
    if (!selectedOrgId) {
      return
    }
    setUsageUser(user)
    setUsageLoading(true)
    setUsageData(null)
    setUsageError('')
    try {
      const data = await getOrganizationUserTokenUsage(token, selectedOrgId, user.user_id)
      setUsageData(data)
    } catch (err) {
      setUsageError(err.message || 'Failed to load user token usage')
    } finally {
      setUsageLoading(false)
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
          ORGANIZATIONS
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
          Organization token usage
        </h1>
        <p style={{ maxWidth: 780, color: 'var(--text-dim)', lineHeight: 1.6, fontSize: 14 }}>
          Review current-month spend across organizations, store monthly token usage costs in the
          admin DB view, and drill into each user&apos;s usage without leaving the admin app.
        </p>
      </section>

      <section
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
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Organizations</div>
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
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading organizations...</div>
        ) : !organizations.length ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No organizations found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Organization', 'Members', 'Current month tokens', 'Current month cost'].map((header) => (
                    <th
                      key={header}
                      style={{
                        textAlign: header === 'Organization' ? 'left' : 'right',
                        padding: '10px 12px',
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                      }}
                    >
                      {header.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {organizations.map((organization) => {
                  const isActive = organization.id === selectedOrgId
                  return (
                    <tr
                      key={organization.id}
                      onClick={() => setSelectedOrgId(organization.id)}
                      style={{
                        borderBottom: '1px solid #F1EFEA',
                        cursor: 'pointer',
                        background: isActive ? '#FFF7F0' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                          {organization.name}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                          {organization.slug}
                          {organization.client_code ? ` · ${organization.client_code}` : ''}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: '14px 12px',
                          textAlign: 'right',
                          fontSize: 13,
                          color: 'var(--text)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {fmtNumber(organization.active_user_count)}
                      </td>
                      <td
                        style={{
                          padding: '14px 12px',
                          textAlign: 'right',
                          fontSize: 13,
                          color: 'var(--text)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {fmtNumber(totalTokens(organization.current_month))}
                      </td>
                      <td
                        style={{
                          padding: '14px 12px',
                          textAlign: 'right',
                          fontSize: 13,
                          color: 'var(--accent)',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {fmtCost(organization.current_month.cost_usd)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '20px 24px',
          display: 'grid',
          gap: 18,
        }}
      >
        {detailError && (
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
            {detailError}
          </div>
        )}

        {detailLoading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading organization detail...</div>
        ) : detail ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', fontWeight: 600 }}>
                  SELECTED ORGANIZATION
                </div>
                <div style={{ marginTop: 10, fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>
                  {detail.name}
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                  {detail.slug}
                  {detail.client_code ? ` · ${detail.client_code}` : ''}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 14,
              }}
            >
              <TokenStatCard label="Active users" value={fmtNumber(detail.active_user_count)} />
              <TokenStatCard
                label="Current month total tokens"
                value={fmtNumber(totalTokens(detail.current_month))}
              />
              <TokenStatCard
                label="Current month API calls"
                value={fmtNumber(detail.current_month.api_calls)}
              />
              <TokenStatCard
                label="Current month cost"
                value={fmtCost(detail.current_month.cost_usd)}
                accent="var(--accent)"
              />
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Monthly stored costs</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Month', 'Input', 'Output', 'API calls', 'Tool calls', 'Cost'].map((header) => (
                        <th
                          key={header}
                          style={{
                            textAlign: header === 'Month' ? 'left' : 'right',
                            padding: '10px 12px',
                            fontSize: 11,
                            color: 'var(--text-muted)',
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                          }}
                        >
                          {header.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.monthly_history.map((row) => (
                      <tr key={row.month_start} style={{ borderBottom: '1px solid #F1EFEA' }}>
                        <td style={{ padding: '12px', fontSize: 13, color: 'var(--text)' }}>
                          {new Date(row.month_start).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                          })}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                          {fmtNumber(row.input_tokens)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                          {fmtNumber(row.output_tokens)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                          {fmtNumber(row.api_calls)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                          {fmtNumber(row.tool_calls)}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            textAlign: 'right',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'var(--accent)',
                          }}
                        >
                          {fmtCost(row.cost_usd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Users in organization</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Name', 'Email', 'Role', 'Status', 'This month tokens', 'This month cost', ''].map((header) => (
                        <th
                          key={header || 'action'}
                          style={{
                            textAlign:
                              header === 'Name' || header === 'Email' || header === 'Role' || header === 'Status'
                                ? 'left'
                                : 'right',
                            padding: '10px 12px',
                            fontSize: 11,
                            color: 'var(--text-muted)',
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                          }}
                        >
                          {header ? header.toUpperCase() : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.users.map((user) => (
                      <tr key={user.user_id} style={{ borderBottom: '1px solid #F1EFEA' }}>
                        <td style={{ padding: '12px', fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                          {user.name}
                        </td>
                        <td style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)' }}>{user.email}</td>
                        <td style={{ padding: '12px', fontSize: 12, color: 'var(--text)' }}>{user.role}</td>
                        <td style={{ padding: '12px', fontSize: 12, color: user.status === 'active' ? 'var(--green)' : 'var(--text-muted)' }}>
                          {user.status}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                          {fmtNumber(totalTokens(user.this_month))}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            textAlign: 'right',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'var(--accent)',
                          }}
                        >
                          {fmtCost(user.this_month.cost_usd)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => openUsage(user)}
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
                            TOKEN USAGE
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Select an organization to load usage.</div>
        )}
      </section>

      {usageUser && (
        <TokenUsageModal
          user={usageUser}
          data={usageData}
          error={usageError}
          loading={usageLoading}
          onClose={() => {
            setUsageUser(null)
            setUsageData(null)
            setUsageError('')
            setUsageLoading(false)
          }}
        />
      )}
    </div>
  )
}
