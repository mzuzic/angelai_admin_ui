import { useEffect, useState } from 'react'

import { createAIModel, deleteAIModel, listAIModels, updateAIModel } from '../services/api.js'
import ConfirmModal from '../components/ConfirmModal.jsx'
import { useAuth } from '../contexts/auth-context.js'

const EMPTY_FORM = {
  model_id: '',
  display_name: '',
  short_hint: '',
  description: '',
  provider: 'anthropic',
  input_price: '0',
  output_price: '0',
  is_active: true,
  sort_order: '0',
}

export default function AIModelsPage() {
  const { token } = useAuth()
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [createForm, setCreateForm] = useState(EMPTY_FORM)
  const [editForm, setEditForm] = useState(EMPTY_FORM)

  async function loadModels() {
    setLoading(true)
    try {
      const rows = await listAIModels(token)
      setModels(rows)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load AI models')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadModels()
  }, [token])

  function normalizePayload(form, includeModelId = false) {
    const payload = {
      display_name: form.display_name.trim(),
      short_hint: form.short_hint.trim() || null,
      description: form.description.trim() || null,
      provider: form.provider.trim().toLowerCase(),
      input_price: Number(form.input_price || 0),
      output_price: Number(form.output_price || 0),
      is_active: !!form.is_active,
      sort_order: Number(form.sort_order || 0),
    }
    if (includeModelId) {
      payload.model_id = form.model_id.trim()
    }
    return payload
  }

  function startEdit(model) {
    setEditingId(model.id)
    setEditForm({
      model_id: model.model_id,
      display_name: model.display_name,
      short_hint: model.short_hint || '',
      description: model.description || '',
      provider: model.provider,
      input_price: String(model.input_price),
      output_price: String(model.output_price),
      is_active: model.is_active,
      sort_order: String(model.sort_order),
    })
    setNotice('')
    setError('')
  }

  async function handleCreate(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await createAIModel(token, normalizePayload(createForm, true))
      setCreateForm(EMPTY_FORM)
      setNotice('AI model created.')
      await loadModels()
    } catch (err) {
      setError(err.message || 'Failed to create AI model')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit() {
    if (!editingId) {
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await updateAIModel(token, editingId, normalizePayload(editForm))
      setEditingId(null)
      setNotice('AI model updated.')
      await loadModels()
    } catch (err) {
      setError(err.message || 'Failed to update AI model')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteModel() {
    if (!deleting) {
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await deleteAIModel(token, deleting.id)
      setDeleting(null)
      if (editingId === deleting.id) {
        setEditingId(null)
      }
      setNotice('AI model deleted.')
      await loadModels()
    } catch (err) {
      setError(err.message || 'Failed to delete AI model')
    } finally {
      setSaving(false)
    }
  }

  const activeForm = editingId ? editForm : createForm
  const setActiveForm = editingId ? setEditForm : setCreateForm

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
          AI MODELS
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
          AI model catalog
        </h1>
        <p style={{ maxWidth: 780, color: 'var(--text-dim)', lineHeight: 1.6, fontSize: 14 }}>
          Manage the global list of selectable models and the prices used for current token-cost
          calculations. Organizations pick from this catalog.
        </p>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(340px, 420px) 1fr',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <form
          onSubmit={(event) => {
            if (editingId) {
              event.preventDefault()
              handleSaveEdit()
            } else {
              handleCreate(event)
            }
          }}
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '20px 24px',
            display: 'grid',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              {editingId ? 'Edit AI Model' : 'Create AI Model'}
            </div>
            {editingId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null)
                  setEditForm(EMPTY_FORM)
                }}
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
                CANCEL
              </button>
            ) : null}
          </div>

          {[
            ['Model ID', 'model_id', 'text', editingId],
            ['Display Name', 'display_name', 'text', false],
            ['Short Hint', 'short_hint', 'text', false],
            ['Input Price ($ / 1M)', 'input_price', 'number', false],
            ['Output Price ($ / 1M)', 'output_price', 'number', false],
            ['Sort Order', 'sort_order', 'number', false],
          ].map(([label, key, type, disabled]) => (
            <label key={key} style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em', fontWeight: 500 }}>
                {label.toUpperCase()}
              </span>
              <input
                type={type}
                step={type === 'number' ? '0.0001' : undefined}
                disabled={!!disabled}
                value={activeForm[key]}
                onChange={(event) => setActiveForm((current) => ({ ...current, [key]: event.target.value }))}
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
              DESCRIPTION
            </span>
            <textarea
              value={activeForm.description}
              onChange={(event) => setActiveForm((current) => ({ ...current, description: event.target.value }))}
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text)',
                fontSize: 13,
                fontFamily: 'var(--font)',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em', fontWeight: 500 }}>
              PROVIDER
            </span>
            <select
              value={activeForm.provider}
              onChange={(event) => setActiveForm((current) => ({ ...current, provider: event.target.value }))}
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
              <option value="anthropic">anthropic</option>
            </select>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)' }}>
            <input
              type="checkbox"
              checked={activeForm.is_active}
              onChange={(event) => setActiveForm((current) => ({ ...current, is_active: event.target.checked }))}
            />
            Active
          </label>

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
            {saving ? 'SAVING...' : editingId ? 'SAVE AI MODEL' : 'CREATE AI MODEL'}
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
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Current AI Models</div>
            <button
              type="button"
              onClick={loadModels}
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

          {error ? (
            <div style={{ background: '#FFF0F0', border: '1px solid #FFCACA', borderRadius: 4, padding: '10px 12px', fontSize: 12, color: '#DC3545' }}>
              {error}
            </div>
          ) : null}
          {notice ? (
            <div style={{ background: '#F0FFF4', border: '1px solid #B7E4C7', borderRadius: 4, padding: '10px 12px', fontSize: 12, color: '#137333' }}>
              {notice}
            </div>
          ) : null}

          {loading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading AI models...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Model', 'Provider', 'Input Price', 'Output Price', 'Status', ''].map((header) => (
                      <th
                        key={header || 'action'}
                        style={{
                          textAlign: header === 'Model' || header === 'Provider' || header === 'Status' ? 'left' : 'right',
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
                  {models.map((model) => (
                    <tr key={model.id} style={{ borderBottom: '1px solid #F1EFEA' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{model.display_name}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{model.model_id}</div>
                        {model.short_hint ? (
                          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                            {model.short_hint}
                          </div>
                        ) : null}
                        {model.description ? (
                          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                            {model.description}
                          </div>
                        ) : null}
                      </td>
                      <td style={{ padding: '12px', fontSize: 12, color: 'var(--text)' }}>{model.provider}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)' }}>${Number(model.input_price).toFixed(4)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)' }}>${Number(model.output_price).toFixed(4)}</td>
                      <td style={{ padding: '12px', fontSize: 12, color: model.is_active ? 'var(--green)' : 'var(--text-muted)' }}>
                        {model.is_active ? 'active' : 'inactive'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => startEdit(model)}
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
                            EDIT
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(model)}
                            style={{
                              padding: '8px 10px',
                              borderRadius: 6,
                              border: '1px solid #F2C7C7',
                              background: '#FFF5F5',
                              color: '#C24B4B',
                              fontSize: 11,
                              fontFamily: 'var(--font-mono)',
                              cursor: 'pointer',
                            }}
                          >
                            DELETE
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {deleting ? (
        <ConfirmModal
          title={`Delete "${deleting.display_name}"?`}
          message="This removes the model from the catalog and strips it from organization allow-lists. This cannot be undone."
          confirmLabel={saving ? 'Deleting...' : 'Delete'}
          danger
          onConfirm={handleDeleteModel}
          onCancel={() => {
            if (!saving) {
              setDeleting(null)
            }
          }}
        />
      ) : null}
    </div>
  )
}
