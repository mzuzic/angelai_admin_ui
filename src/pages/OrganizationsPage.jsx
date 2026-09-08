import { useEffect, useState } from 'react'

import {
  createOrganization,
  deleteOrganization,
  getOrganizationDetail,
  getOrganizationMonthlyUserBreakdown,
  listAIModels,
  updateOrganizationFeatures,
  updateOrganization,
  getOrganizationUserTokenUsage,
  listOrganizations,
  listScrapeDataStates,
} from '../services/api.js'
import ConfirmModal from '../components/ConfirmModal.jsx'
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

const OOS_SUPPORTED_STATES = ['illinois', 'massachusetts', 'michigan', 'minnesota', 'new-jersey', 'ohio']

function fmtMonthLabel(value) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  })
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

function MonthlyUserBreakdownModal({ monthLabel, data, error, loading, onClose }) {
  const statBlock = (label, value, accent = '#1A1A1A') => (
    <div
      style={{
        background: '#F7F6F4',
        border: '1px solid #E5E4E1',
        borderRadius: 6,
        padding: '14px 16px',
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
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: accent,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {value}
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
          width: 'min(920px, 94vw)',
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
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>Monthly User Cost Distribution</div>
            <div style={{ fontSize: 11, color: '#767676', marginTop: 2 }}>{monthLabel}</div>
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
            <div style={{ display: 'grid', gap: 16 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: 12,
                }}
              >
                {statBlock('INPUT TOKENS', fmtNumber(data.totals.input_tokens))}
                {statBlock('OUTPUT TOKENS', fmtNumber(data.totals.output_tokens))}
                {statBlock('API CALLS', fmtNumber(data.totals.api_calls))}
                {statBlock('TOOL CALLS', fmtNumber(data.totals.tool_calls))}
                {statBlock('TOTAL COST', fmtCost(data.totals.cost_usd), '#CC6B2E')}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E5E4E1' }}>
                      {['Name', 'Email', 'Role', 'Status', 'Tokens', 'API calls', 'Tool calls', 'Cost'].map((header) => (
                        <th
                          key={header}
                          style={{
                            textAlign: header === 'Name' || header === 'Email' || header === 'Role' || header === 'Status' ? 'left' : 'right',
                            padding: '8px 10px',
                            fontSize: 10,
                            color: '#767676',
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {header.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((row) => (
                      <tr key={row.user_id} style={{ borderBottom: '1px solid #F3F2EF' }}>
                        <td style={{ padding: '10px', fontSize: 12, color: '#1A1A1A', fontWeight: 600 }}>
                          {row.name}
                        </td>
                        <td style={{ padding: '10px', fontSize: 12, color: '#767676' }}>{row.email}</td>
                        <td style={{ padding: '10px', fontSize: 12, color: '#1A1A1A' }}>{row.role}</td>
                        <td style={{ padding: '10px', fontSize: 12, color: row.status === 'active' ? 'var(--green)' : '#767676' }}>
                          {row.status}
                        </td>
                        <td style={{ padding: '10px', fontSize: 12, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {fmtNumber(totalTokens(row.usage))}
                        </td>
                        <td style={{ padding: '10px', fontSize: 12, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {fmtNumber(row.usage.api_calls)}
                        </td>
                        <td style={{ padding: '10px', fontSize: 12, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {fmtNumber(row.usage.tool_calls)}
                        </td>
                        <td
                          style={{
                            padding: '10px',
                            fontSize: 12,
                            color: '#CC6B2E',
                            textAlign: 'right',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 600,
                          }}
                        >
                          {fmtCost(row.usage.cost_usd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
  const [monthBreakdown, setMonthBreakdown] = useState(null)
  const [monthBreakdownData, setMonthBreakdownData] = useState(null)
  const [monthBreakdownError, setMonthBreakdownError] = useState('')
  const [monthBreakdownLoading, setMonthBreakdownLoading] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', admin_email: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createNotice, setCreateNotice] = useState('')
  const [editForm, setEditForm] = useState(null)
  const [editError, setEditError] = useState('')
  const [editNotice, setEditNotice] = useState('')
  const [savingOrg, setSavingOrg] = useState(false)
  const [deletingOrg, setDeletingOrg] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [aiModels, setAiModels] = useState([])
  const [scrapeDataStates, setScrapeDataStates] = useState([])
  const [scrapeDataStatesError, setScrapeDataStatesError] = useState('')
  const [editTab, setEditTab] = useState('profile')
  const MODULES = [
    ['operations', 'Operations', 'Order pipeline, Metrc, credit, Route Planner — off by default'],
    ['marketing', 'Marketing', 'Marketing emails + Market Insights'],
    ['customer_service', 'Customer Service', 'Follow-up dashboards'],
    ['scripts', 'Scripts', 'Rep call-script assignments'],
    ['quickbooks', 'QuickBooks', 'Built-in QuickBooks receivables dashboard'],
  ]
  const [featureSaving, setFeatureSaving] = useState('')
  const [featureError, setFeatureError] = useState('')
  const oosStateOptions = scrapeDataStates.filter((row) => OOS_SUPPORTED_STATES.includes(row.value))

  async function toggleFeature(name, value) {
    setFeatureSaving(name)
    setFeatureError('')
    try {
      const res = await updateOrganizationFeatures(selectedOrgId, { [name]: value })
      setDetail((d) => (d ? { ...d, features: res.features } : d))
    } catch (err) {
      setFeatureError(err.message || 'Failed to update module access')
    } finally {
      setFeatureSaving('')
    }
  }

  async function loadOrganizations(preferredOrgId) {
    setLoading(true)
    try {
      const rows = await listOrganizations()
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
      const data = await getOrganizationDetail(orgId)
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
    listAIModels().then(setAiModels).catch(() => {})
  }, [token])

  useEffect(() => {
    listScrapeDataStates()
      .then((payload) => {
        setScrapeDataStates(Array.isArray(payload?.states) ? payload.states : [])
        setScrapeDataStatesError('')
      })
      .catch((err) => {
        setScrapeDataStates([])
        setScrapeDataStatesError(err.message || 'Failed to load shared scrape states')
      })
  }, [token])

  useEffect(() => {
    loadDetail(selectedOrgId)
  }, [selectedOrgId, token])

  useEffect(() => {
    if (!detail) {
      setEditForm(null)
      return
    }
    setEditForm({
      name: detail.name || '',
      slug: detail.slug || '',
      client_code: detail.client_code || '',
      package: detail.package || 'foundation',
      address_line1: detail.address_line1 || '',
      address_line2: detail.address_line2 || '',
      country: detail.country || '',
      state_province: detail.state_province || '',
      city: detail.city || '',
      postal_code: detail.postal_code || '',
      allowed_ai_models: detail.allowed_ai_models || [],
      notification_recipients: (detail.notification_recipients || []).join('\n'),
      scrape_states: Array.isArray(detail.settings?.leafly_states) ? detail.settings.leafly_states : [],
      oos_states: Array.isArray(detail.settings?.oos_states)
        ? detail.settings.oos_states.filter((value) => OOS_SUPPORTED_STATES.includes(value))
        : [],
      settings: JSON.stringify(detail.settings || {}, null, 2),
    })
  }, [detail])

  function updateSettingsDraft(updater) {
    setEditForm((current) => {
      let settings = {}
      try {
        settings = JSON.parse(current.settings || '{}')
      } catch {
        settings = detail?.settings || {}
      }
      const nextSettings = updater({ ...settings })
      return {
        ...current,
        scrape_states: Array.isArray(nextSettings.leafly_states) ? nextSettings.leafly_states : [],
        oos_states: Array.isArray(nextSettings.oos_states)
          ? nextSettings.oos_states.filter((value) => OOS_SUPPORTED_STATES.includes(value))
          : [],
        settings: JSON.stringify(nextSettings, null, 2),
      }
    })
  }

  function toggleOosState(state, checked) {
    updateSettingsDraft((settings) => {
      const current = Array.isArray(settings.oos_states) ? settings.oos_states : []
      const next = checked
        ? [...current, state]
        : current.filter((value) => value !== state)
      settings.oos_states = oosStateOptions
        .map((row) => row.value)
        .filter((value) => next.includes(value))
      return settings
    })
  }

  function toggleScrapeState(state, checked) {
    updateSettingsDraft((settings) => {
      const current = Array.isArray(settings.leafly_states) ? settings.leafly_states : []
      const next = checked
        ? [...current, state]
        : current.filter((value) => value !== state)
      settings.leafly_states = scrapeDataStates
        .map((row) => row.value)
        .filter((value) => next.includes(value))
      return settings
    })
  }

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
      const data = await getOrganizationUserTokenUsage(selectedOrgId, user.user_id)
      setUsageData(data)
    } catch (err) {
      setUsageError(err.message || 'Failed to load user token usage')
    } finally {
      setUsageLoading(false)
    }
  }

  async function openMonthBreakdown(row) {
    if (!selectedOrgId) {
      return
    }
    setMonthBreakdown(row)
    setMonthBreakdownLoading(true)
    setMonthBreakdownData(null)
    setMonthBreakdownError('')
    try {
      const data = await getOrganizationMonthlyUserBreakdown(selectedOrgId, row.month_start)
      setMonthBreakdownData(data)
    } catch (err) {
      setMonthBreakdownError(err.message || 'Failed to load monthly user breakdown')
    } finally {
      setMonthBreakdownLoading(false)
    }
  }

  async function handleCreateOrganization(event) {
    event.preventDefault()
    setCreating(true)
    setCreateError('')
    setCreateNotice('')
    try {
      const created = await createOrganization({
        name: createForm.name.trim(),
        admin_email: createForm.admin_email.trim(),
      })
      setCreateForm({ name: '', admin_email: '' })
      setCreateNotice(`Created ${created.name} — ${created.admin.email} enrolled as admin.`)
      await loadOrganizations(created.id)
    } catch (err) {
      setCreateError(err.message || 'Failed to create organization')
    } finally {
      setCreating(false)
    }
  }

  async function handleSaveOrganization(event) {
    event.preventDefault()
    if (!selectedOrgId || !editForm) {
      return
    }

    setSavingOrg(true)
    setEditError('')
    setEditNotice('')

    let parsedSettings
    try {
      parsedSettings = JSON.parse(editForm.settings || '{}')
    } catch {
      setEditError('Settings must be valid JSON.')
      setSavingOrg(false)
      return
    }
    const availableScrapeStates = scrapeDataStates.map((row) => row.value)
    parsedSettings.leafly_states = Array.isArray(editForm.scrape_states)
      ? editForm.scrape_states.filter((value) => availableScrapeStates.includes(value))
      : []
    parsedSettings.oos_states = Array.isArray(editForm.oos_states)
      ? editForm.oos_states.filter((value) => OOS_SUPPORTED_STATES.includes(value))
      : []
    const oosEnabled = parsedSettings.oos_states.length > 0

    try {
      const updated = await updateOrganization(selectedOrgId, {
        name: editForm.name.trim(),
        slug: editForm.slug.trim(),
        client_code: editForm.client_code.trim() || null,
        package: editForm.package,
        address_line1: editForm.address_line1.trim() || null,
        address_line2: editForm.address_line2.trim() || null,
        country: editForm.country.trim().toUpperCase() || null,
        state_province: editForm.state_province.trim() || null,
        city: editForm.city.trim() || null,
        postal_code: editForm.postal_code.trim() || null,
        allowed_ai_models: editForm.allowed_ai_models,
        notification_recipients: editForm.notification_recipients
          .split('\n')
          .map((value) => value.trim())
          .filter(Boolean),
        settings: parsedSettings,
      })
      const nextFeatures = oosEnabled === !!detail.features?.out_of_stock
        ? null
        : await updateOrganizationFeatures(selectedOrgId, { out_of_stock: oosEnabled })
      setDetail(nextFeatures ? { ...updated, features: nextFeatures.features } : updated)
      setOrganizations((current) =>
        current.map((row) =>
          row.id === updated.id
            ? {
                ...row,
                name: updated.name,
                slug: updated.slug,
                client_code: updated.client_code,
                package: updated.package,
              }
            : row,
        ),
      )
      setEditNotice('Organization updated.')
    } catch (err) {
      setEditError(err.message || 'Failed to update organization')
    } finally {
      setSavingOrg(false)
    }
  }

  async function handleDeleteOrganization() {
    if (!selectedOrgId || !detail) {
      return
    }

    setDeletingOrg(true)
    setEditError('')
    setEditNotice('')
    try {
      await deleteOrganization(selectedOrgId)
      const remaining = organizations.filter((row) => row.id !== selectedOrgId)
      setOrganizations(remaining)
      const nextOrgId = remaining[0]?.id || null
      setSelectedOrgId(nextOrgId)
      setDetail(null)
      setEditForm(null)
      setConfirmDeleteOpen(false)
      setEditNotice('Organization deleted.')
      if (nextOrgId) {
        await loadDetail(nextOrgId)
      }
    } catch (err) {
      setEditError(err.message || 'Failed to delete organization')
    } finally {
      setDeletingOrg(false)
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
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Add Organization</div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          The first admin must already have an AngelHQ account — they are enrolled as an active
          admin immediately (no invite email is sent).
        </p>
        <form
          onSubmit={handleCreateOrganization}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(200px, 1fr) minmax(220px, 1fr) auto',
            gap: 12,
            alignItems: 'end',
          }}
        >
          {[
            ['Organization name', 'name', 'text', 'Acme Inc.'],
            ['First admin email', 'admin_email', 'email', 'admin@company.com'],
          ].map(([label, key, type, placeholder]) => (
            <label key={key} style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em', fontWeight: 500 }}>
                {label.toUpperCase()}
              </span>
              <input
                type={type}
                value={createForm[key]}
                onChange={(event) => setCreateForm((current) => ({ ...current, [key]: event.target.value }))}
                placeholder={placeholder}
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
                  boxSizing: 'border-box',
                }}
              />
            </label>
          ))}
          <button
            type="submit"
            disabled={creating}
            style={{
              padding: '11px 18px',
              background: creating ? '#a85a25' : 'var(--accent)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.1em',
              cursor: creating ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'nowrap',
            }}
          >
            {creating ? 'CREATING...' : 'ADD ORGANIZATION'}
          </button>
        </form>
        {createError && (
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
            {createError}
          </div>
        )}
        {createNotice && (
          <div
            style={{
              background: '#F0FFF4',
              border: '1px solid #B7E4C7',
              borderRadius: 4,
              padding: '10px 12px',
              fontSize: 12,
              color: '#137333',
            }}
          >
            {createNotice}
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
                          {organization.package ? ` · ${organization.package}` : ''}
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
                  {detail.package ? ` · ${detail.package}` : ''}
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSaveOrganization}
              style={{
                display: 'grid',
                gap: 14,
                padding: '18px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: '#FCFBF9',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Edit organization</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Editable org-table fields. TOS and timestamps stay read-only.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    disabled={savingOrg || deletingOrg || !editForm}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 6,
                      border: 'none',
                      background: savingOrg ? '#a85a25' : 'var(--accent)',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      cursor: savingOrg ? 'wait' : 'pointer',
                    }}
                  >
                    {savingOrg ? 'SAVING...' : 'SAVE ORGANIZATION'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteOpen(true)}
                    disabled={savingOrg || deletingOrg}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 6,
                      border: '1px solid #F2C7C7',
                      background: '#FFF5F5',
                      color: '#C24B4B',
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      cursor: deletingOrg ? 'wait' : 'pointer',
                    }}
                  >
                    {deletingOrg ? 'DELETING...' : 'DELETE ORGANIZATION'}
                  </button>
                </div>
              </div>

              {editError ? (
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
                  {editError}
                </div>
              ) : null}
              {editNotice ? (
                <div
                  style={{
                    background: '#F0FFF4',
                    border: '1px solid #B7E4C7',
                    borderRadius: 4,
                    padding: '10px 12px',
                    fontSize: 12,
                    color: '#137333',
                  }}
                >
                  {editNotice}
                </div>
              ) : null}

              {editForm ? (
                <>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      ['profile', 'Profile'],
                      ['scrape_data', 'Data Access'],
                      ['ai_models', 'AI Models'],
                      ['cost', 'Cost'],
                      ['advanced', 'Advanced'],
                    ].map(([key, label]) => {
                      const active = editTab === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setEditTab(key)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 999,
                            border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                            background: active ? '#FFF7F0' : 'transparent',
                            color: active ? 'var(--accent)' : 'var(--text-muted)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {label.toUpperCase()}
                        </button>
                      )
                    })}
                  </div>

                  {editTab === 'profile' ? (
                    <div style={{ display: 'grid', gap: 18 }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: 12,
                        }}
                      >
                        {[
                          ['Organization name', 'name'],
                          ['Slug', 'slug'],
                          ['Client code', 'client_code'],
                          ['Address line 1', 'address_line1'],
                          ['Address line 2', 'address_line2'],
                          ['Country', 'country'],
                          ['State / province', 'state_province'],
                          ['City', 'city'],
                          ['Postal code', 'postal_code'],
                        ].map(([label, key]) => (
                          <label key={key} style={{ display: 'grid', gap: 6 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em', fontWeight: 500 }}>
                              {label.toUpperCase()}
                            </span>
                            <input
                              type="text"
                              value={editForm[key]}
                              onChange={(event) =>
                                setEditForm((current) => ({ ...current, [key]: event.target.value }))
                              }
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: 'var(--input-bg)',
                                border: '1px solid var(--border)',
                                borderRadius: 4,
                                color: 'var(--text)',
                                fontSize: 13,
                                fontFamily: 'var(--font-mono)',
                                boxSizing: 'border-box',
                              }}
                            />
                          </label>
                        ))}
                        <label style={{ display: 'grid', gap: 6 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em', fontWeight: 500 }}>
                            PACKAGE
                          </span>
                          <select
                            value={editForm.package}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, package: event.target.value }))
                            }
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              background: 'var(--input-bg)',
                              border: '1px solid var(--border)',
                              borderRadius: 4,
                              color: 'var(--text)',
                              fontSize: 13,
                              fontFamily: 'var(--font-mono)',
                              boxSizing: 'border-box',
                            }}
                          >
                            <option value="foundation">foundation</option>
                            <option value="pro">pro</option>
                          </select>
                        </label>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: 14,
                        }}
                      >
                        <TokenStatCard label="Active users" value={fmtNumber(detail.active_user_count)} />
                        <TokenStatCard label="Current month total tokens" value={fmtNumber(totalTokens(detail.current_month))} />
                        <TokenStatCard label="Current month API calls" value={fmtNumber(detail.current_month?.api_calls)} />
                        <TokenStatCard
                          label="Current month cost"
                          value={fmtCost(detail.current_month?.cost_usd)}
                          accent="var(--accent)"
                        />
                      </div>

                      <div style={{ display: 'grid', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Modules</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                            Per-organization access. Org admins cannot change these — grants happen here only.
                          </div>
                        </div>

                        {featureError ? (
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
                            {featureError}
                          </div>
                        ) : null}

                        <div style={{ display: 'grid', gap: 8 }}>
                          {MODULES.map(([key, title, description]) => {
                            const enabled = !!detail.features?.[key]
                            const busy = featureSaving === key
                            return (
                              <div
                                key={key}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 12,
                                  padding: '12px 16px',
                                  border: '1px solid var(--border)',
                                  borderRadius: 8,
                                  background: 'var(--card)',
                                }}
                              >
                                <div>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
                                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                    {description}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleFeature(key, !enabled)}
                                  disabled={busy}
                                  style={{
                                    minWidth: 84,
                                    padding: '9px 14px',
                                    borderRadius: 999,
                                    border: enabled ? '1px solid var(--accent)' : '1px solid var(--border)',
                                    background: enabled ? 'var(--accent)' : 'transparent',
                                    color: enabled ? '#FFFFFF' : 'var(--text-muted)',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    fontFamily: 'var(--font-mono)',
                                    cursor: busy ? 'wait' : 'pointer',
                                  }}
                                >
                                  {busy ? '...' : enabled ? 'Enabled' : 'Disabled'}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {editTab === 'scrape_data' ? (
                    <div style={{ display: 'grid', gap: 24 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Shared scrape data states</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                          Controls which shared scraped-market datasets this organization can read.
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                          gap: 8,
                        }}
                      >
                        {scrapeDataStates.map(({ value, label }) => {
                          const checked = editForm.scrape_states.includes(value)
                          return (
                            <label
                              key={value}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '10px 12px',
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                background: checked ? '#FFF7F0' : 'var(--card)',
                                color: 'var(--text)',
                                fontSize: 13,
                                cursor: 'pointer',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => toggleScrapeState(value, event.target.checked)}
                              />
                              <span>{label}</span>
                            </label>
                          )
                        })}
                      </div>

                      {scrapeDataStatesError ? (
                        <div style={{ fontSize: 12, color: '#B42318' }}>{scrapeDataStatesError}</div>
                      ) : null}

                      {!scrapeDataStates.length && !scrapeDataStatesError ? (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          No AngelHQ shared scrape states are configured.
                        </div>
                      ) : null}

                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        settings.leafly_states: {editForm.scrape_states.length ? editForm.scrape_states.join(', ') : 'none'}
                      </div>

                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, display: 'grid', gap: 12 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            gap: 12,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Out-of-stock access</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                              Select states to enable OOS data for those states only. No selected states disables OOS for the org.
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                            gap: 8,
                          }}
                        >
                          {oosStateOptions.map(({ value, label }) => {
                            const checked = editForm.oos_states.includes(value)
                            return (
                              <label
                                key={`oos-${value}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  padding: '10px 12px',
                                  border: '1px solid var(--border)',
                                  borderRadius: 8,
                                  background: checked ? '#FFF7F0' : 'var(--card)',
                                  color: 'var(--text)',
                                  fontSize: 13,
                                  cursor: 'pointer',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) => toggleOosState(value, event.target.checked)}
                                />
                                <span>{label}</span>
                              </label>
                            )
                          })}
                        </div>

                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          settings.oos_states: {editForm.oos_states.length ? editForm.oos_states.join(', ') : 'none'}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {editTab === 'ai_models' ? (
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Select which catalog models this organization can use in workflow settings.
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {aiModels.filter((row) => row.is_active).map((model) => {
                          const checked = editForm.allowed_ai_models.includes(model.model_id)
                          return (
                            <label
                              key={model.id}
                              style={{
                                display: 'flex',
                                alignItems: 'start',
                                gap: 10,
                                padding: '10px 12px',
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                background: 'var(--card)',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) =>
                                  setEditForm((current) => ({
                                    ...current,
                                    allowed_ai_models: event.target.checked
                                      ? [...current.allowed_ai_models, model.model_id]
                                      : current.allowed_ai_models.filter((value) => value !== model.model_id),
                                  }))
                                }
                              />
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                                  {model.display_name}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                  {model.model_id} · {model.provider} · in ${Number(model.input_price).toFixed(4)} / out ${Number(model.output_price).toFixed(4)}
                                </div>
                                {model.description ? (
                                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                                    {model.description}
                                  </div>
                                ) : null}
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}

                  {editTab === 'cost' ? (
                    <div style={{ display: 'grid', gap: 12 }}>
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
                                    <button
                                      type="button"
                                      onClick={() => openMonthBreakdown(row)}
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        padding: 0,
                                        margin: 0,
                                        color: 'var(--text)',
                                        fontSize: 13,
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        textUnderlineOffset: '3px',
                                      }}
                                    >
                                      {fmtMonthLabel(row.month_start)}
                                    </button>
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
                    </div>
                  ) : null}

                  {editTab === 'advanced' ? (
                  <>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em', fontWeight: 500 }}>
                      NOTIFICATION RECIPIENTS
                    </span>
                    <textarea
                      value={editForm.notification_recipients}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          notification_recipients: event.target.value,
                        }))
                      }
                      rows={4}
                      placeholder="one@email.com&#10;two@email.com"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'var(--input-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        color: 'var(--text)',
                        fontSize: 13,
                        fontFamily: 'var(--font-mono)',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                      }}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em', fontWeight: 500 }}>
                      SETTINGS JSON
                    </span>
                    <textarea
                      value={editForm.settings}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        setEditForm((current) => {
                          let scrapeStates = current.scrape_states
                          let oosStates = current.oos_states
                          try {
                            const parsed = JSON.parse(nextValue || '{}')
                            scrapeStates = Array.isArray(parsed.leafly_states) ? parsed.leafly_states : []
                            oosStates = Array.isArray(parsed.oos_states) ? parsed.oos_states : []
                          } catch {
                            // Keep the last valid checkbox state while JSON is being edited.
                          }
                          return { ...current, settings: nextValue, scrape_states: scrapeStates, oos_states: oosStates }
                        })
                      }}
                      rows={12}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'var(--input-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        color: 'var(--text)',
                        fontSize: 13,
                        fontFamily: 'var(--font-mono)',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                      }}
                    />
                  </label>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: 12,
                    }}
                  >
                    {[
                      ['Created at', detail.created_at || ''],
                      ['Updated at', detail.updated_at || ''],
                      ['TOS version', detail.tos_version || ''],
                      ['TOS accepted at', detail.tos_accepted_at || ''],
                      ['TOS accepted by', detail.tos_accepted_by || ''],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        style={{
                          padding: '10px 12px',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          background: 'var(--card)',
                        }}
                      >
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em', fontWeight: 500 }}>
                          {label.toUpperCase()}
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)', wordBreak: 'break-word' }}>
                          {value || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                  </>
                  ) : null}
                </>
              ) : null}
            </form>

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

      {monthBreakdown && (
        <MonthlyUserBreakdownModal
          monthLabel={fmtMonthLabel(monthBreakdown.month_start)}
          data={monthBreakdownData}
          error={monthBreakdownError}
          loading={monthBreakdownLoading}
          onClose={() => {
            setMonthBreakdown(null)
            setMonthBreakdownData(null)
            setMonthBreakdownError('')
            setMonthBreakdownLoading(false)
          }}
        />
      )}

      {confirmDeleteOpen && detail ? (
        <ConfirmModal
          title={`Delete "${detail.name}"?`}
          message="This removes the organization and cascades related data. This cannot be undone."
          confirmLabel={deletingOrg ? 'Deleting...' : 'Delete'}
          danger
          onConfirm={handleDeleteOrganization}
          onCancel={() => {
            if (!deletingOrg) {
              setConfirmDeleteOpen(false)
            }
          }}
        />
      ) : null}
    </div>
  )
}
