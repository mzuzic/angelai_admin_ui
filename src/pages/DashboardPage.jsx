import { useEffect, useState } from 'react'
import { healthcheck } from '../services/api.js'

export default function DashboardPage() {
  const [status, setStatus] = useState('Checking API connection...')

  useEffect(() => {
    let active = true

    healthcheck()
      .then((data) => {
        if (active) {
          setStatus(`API status: ${data.status}`)
        }
      })
      .catch(() => {
        if (active) {
          setStatus('API status: unavailable')
        }
      })

    return () => {
      active = false
    }
  }, [])

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
          ADMIN OVERVIEW
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
          Separate admin frame, same AngelHQ shell
        </h1>
        <p style={{ maxWidth: 760, color: 'var(--text-dim)', lineHeight: 1.6, fontSize: 14 }}>
          The layout, colors, spacing, and top-level chrome now follow the existing
          AngelHQ UI. This app stays explicitly marked as the admin surface so it can
          live separately while still feeling native to the product.
        </p>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {[
          { label: 'API Status', value: status, color: 'var(--green)' },
          { label: 'Deployment Target', value: 'Container on VPS', color: 'var(--accent)' },
          { label: 'UI Strategy', value: 'Separate admin_ui app', color: 'var(--gold)' },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '20px 24px',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-dim)',
                letterSpacing: '0.06em',
                fontWeight: 500,
                marginBottom: 8,
              }}
            >
              {card.label.toUpperCase()}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: card.color,
                fontFamily: 'var(--font-mono)',
                lineHeight: 1.35,
              }}
            >
              {card.value}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
