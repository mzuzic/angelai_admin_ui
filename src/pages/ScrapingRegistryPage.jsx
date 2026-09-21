import { useEffect, useMemo, useRef, useState } from 'react'
import { createRegistrySource, createScrapeTarget, deleteScrapeTarget, disableScrapeTargets, exportScrapeRegistry, exportScrapeRegistryRegions, importScrapeRegistry, importScrapeRegistryRegions, listPublicRegistryStores, listRegistrySources, listScrapePlatforms, listScrapeRegistryOverview, listScrapeTargets, refreshRegistrySource, softDeleteScrapeTargets, updateRegistrySource, updateScrapeTarget } from '../services/api.js'
import ConfirmModal from '../components/ConfirmModal.jsx'

const EMPTY_TARGET = { name: '', state: 'new-jersey', region: '', city: '', address: '', license: '', website: '', platform: '', scrape_status: 'pending', is_active: true, settings: {}, tier: '', roster_rank: '', roster_status: '', roster_notes: '', roster_reviewed_at: '' }
const EMPTY_SOURCE = { name: 'NJ-CRC permitted businesses', state: 'new-jersey', url: 'https://www.nj.gov/cannabis/businesses/permitted/index.shtml', parser_key: 'nj_crc_permitted_businesses', is_active: true }
const INTERNAL_SETTINGS_KEYS = new Set(['phone', 'delivery', 'medicinal', 'recreational', 'microbusiness', 'expanded_atc', 'seeded_by', 'source_url', 'registry_source', 'registry_permit_url', 'registry_business_type', 'registry_expiration', 'registry_updated_at', 'ccc_license', 'ccc_license_source', 'ccc_license_mapping', 'registry_match_confidence', 'registry_delisted', 'registry_delisted_at'])
const SCRAPER_STATUS_OPTIONS = [
  ['new', 'New'], ['delisted', 'Delisted'], ['missing', 'No website'], ['undetected', 'No platform'], ['unsupported', 'No supported data source'],
  ['needs-setup', 'Needs configuration'], ['configured-active', 'Configured - Active'], ['configured-disabled', 'Configured - Disabled'],
]

function stateLabel(state) { return state.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
function fieldLabel(key) { return key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
function formatDate(value) {
  if (!value) return 'No data update'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'No data update' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function scraperStatus(row, supportedPlatforms) {
  if (row.settings?.registry_delisted) return { key: 'delisted', label: 'Delisted' }
  if (row.scrape_status === 'new') return { key: 'new', label: 'New' }
  if (row.platform && supportedPlatforms.has(row.platform) && row.settings?.store_id) {
    return row.is_active
      ? { key: 'configured-active', label: 'Configured - Active' }
      : { key: 'configured-disabled', label: 'Configured - Disabled' }
  }
  if (row.platform && supportedPlatforms.has(row.platform)) return { key: 'needs-setup', label: 'Needs configuration' }
  if (row.platform) return { key: 'unsupported', label: 'No supported data source' }
  if (row.website) return { key: 'undetected', label: 'No platform' }
  return { key: 'missing', label: 'No website' }
}

function StatusCell({ row, supportedPlatforms }) {
  const status = scraperStatus(row, supportedPlatforms)
  return <td className="registry-status-cell"><span className={`registry-status registry-status--${status.key}`}>{status.label}</span></td>
}

export default function ScrapingRegistryPage() {
  const [overview, setOverview] = useState([])
  const [sources, setSources] = useState([])
  const [platforms, setPlatforms] = useState([])
  const [targets, setTargets] = useState([])
  const [publicRecords, setPublicRecords] = useState([])
  const [state, setState] = useState('new-jersey')
  const [query, setQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [target, setTarget] = useState(null)
  const [settings, setSettings] = useState({})
  const [sourceUrl, setSourceUrl] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [selectedTargetIds, setSelectedTargetIds] = useState([])
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [regionsImporting, setRegionsImporting] = useState(false)
  const importInputRef = useRef(null)
  const importRegionsInputRef = useRef(null)

  const load = async () => {
    try {
      const [nextOverview, nextSources, nextPlatforms, nextTargets, nextPublicRecords] = await Promise.all([
        listScrapeRegistryOverview(), listRegistrySources(), listScrapePlatforms(), listScrapeTargets(state), listPublicRegistryStores(state),
      ])
      setOverview(nextOverview); setSources(nextSources); setPlatforms(nextPlatforms); setTargets(nextTargets); setPublicRecords(nextPublicRecords); setSelectedTargetIds((current) => current.filter((id) => nextTargets.some((row) => row.id === id))); setError('')
    } catch (requestError) { setError(requestError.message) }
  }

  useEffect(() => { load() }, [state])
  const source = sources.find((row) => row.state === state)
  const sourceParserMessage = source?.parser_message || 'No data connector configured for this source.'
  useEffect(() => { setSourceUrl(source?.url || '') }, [source?.id, source?.url])

  const supportedPlatforms = useMemo(() => new Set(platforms.map((item) => item.key)), [platforms])
  const filtered = useMemo(() => targets.filter((row) => (
    `${row.name} ${row.city || ''} ${row.region || ''} ${row.website || ''} ${row.platform || ''}`.toLowerCase().includes(query.toLowerCase())
    && (!platformFilter || (row.platform || 'Not configured') === platformFilter)
    && (!statusFilter || scraperStatus(row, supportedPlatforms).key === statusFilter)
  )), [targets, query, platformFilter, statusFilter, supportedPlatforms])
  const platformConfig = platforms.find((item) => item.key === target?.platform)
  const isLegacyPlatform = Boolean(target?.platform && !platformConfig)
  const platformSettingKeys = platformConfig?.settings || []
  const additionalScraperKeys = Object.keys(settings).filter((key) => !platformSettingKeys.includes(key) && !INTERNAL_SETTINGS_KEYS.has(key))

  const openTarget = (row) => { setTarget(row); setSettings(row.settings || {}); setError('') }
  const updateSetting = (key, value) => setSettings((current) => ({ ...current, [key]: value }))

  const saveTarget = async (event) => {
    event.preventDefault()
    try {
      const roster_rank = target.roster_rank === '' || target.roster_rank === null || target.roster_rank === undefined
        ? null : Number(target.roster_rank)
      const payload = { ...target, settings, roster_rank }
      if (target.id) await updateScrapeTarget(target.id, payload)
      else await createScrapeTarget(payload)
      setTarget(null); setNotice('Store data settings saved.'); setError(''); load()
    } catch (requestError) { setError(requestError.message) }
  }

  const refresh = async () => {
    try {
      setRefreshing(true); setError('')
      const row = source
        ? await updateRegistrySource(source.id, { ...source, url: sourceUrl })
        : await createRegistrySource({ ...EMPTY_SOURCE, state, url: sourceUrl })
      if (!row.parser_configured) throw new Error(row.parser_message || 'No parser configured for this source.')
      const result = await refreshRegistrySource(row.id)
      setNotice(result.matched === undefined
        ? `Registry refreshed: ${result.added} added, ${result.updated} updated.`
        : `Registry refreshed: ${result.added} added, ${result.updated} updated, ${result.matched} linked.`)
      load()
    } catch (requestError) { setError(requestError.message) } finally { setRefreshing(false) }
  }

  const deleteTarget = async () => {
    try {
      await deleteScrapeTarget(deleting.id)
      setDeleting(null); setTarget(null); setNotice('Store data settings deleted and disabled.'); setError(''); load()
    } catch (requestError) { setError(requestError.message) }
  }

  const toggleTarget = (targetId) => setSelectedTargetIds((current) => current.includes(targetId)
    ? current.filter((id) => id !== targetId)
    : [...current, targetId])
  const toggleVisibleTargets = () => setSelectedTargetIds((current) => {
    const visibleIds = filtered.map((row) => row.id)
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => current.includes(id))
    return allVisibleSelected ? current.filter((id) => !visibleIds.includes(id)) : [...new Set([...current, ...visibleIds])]
  })
  const disableSelected = async () => {
    try {
      const result = await disableScrapeTargets(selectedTargetIds)
      setSelectedTargetIds([]); setNotice(`${result.disabled} store data source${result.disabled === 1 ? '' : 's'} disabled.`); setError(''); load()
    } catch (requestError) { setError(requestError.message) }
  }
  const deleteSelected = async () => {
    try {
      const result = await softDeleteScrapeTargets(selectedTargetIds)
      setBulkDeleting(false); setSelectedTargetIds([]); setNotice(`${result.deleted} store data source${result.deleted === 1 ? '' : 's'} deleted and disabled.`); setError(''); load()
    } catch (requestError) { setError(requestError.message) }
  }

  const exportTargets = async () => {
    try {
      const payload = await exportScrapeRegistry(state, filtered.map((row) => row.id))
      const href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = href; link.download = `${state}-scrape-registry.json`; link.click()
      URL.revokeObjectURL(href)
      setNotice('Registry export downloaded.'); setError('')
    } catch (requestError) { setError(requestError.message) }
  }

  const importTargets = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const payload = JSON.parse(await file.text())
      if (payload.state !== state || !Array.isArray(payload.targets)) throw new Error('Choose a registry export for the selected state.')
      const result = await importScrapeRegistry({ state, targets: payload.targets })
      setNotice(`Registry imported: ${result.created} added, ${result.updated} updated.`); setError('')
      load()
    } catch (requestError) { setError(requestError.message || 'Registry import failed.') }
  }

  const exportRegions = async () => {
    try {
      const { blob, filename } = await exportScrapeRegistryRegions(state)
      const href = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = href; link.download = filename || `${state}-regions.xlsx`; link.click()
      URL.revokeObjectURL(href)
      setNotice('Region export downloaded.'); setError('')
    } catch (requestError) { setError(requestError.message) }
  }

  const importRegions = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setRegionsImporting(true)
      const result = await importScrapeRegistryRegions(state, file)
      setNotice(`Regions imported: ${result.updated} updated, ${result.skipped} skipped.`); setError('')
      load()
    } catch (requestError) { setError(requestError.message || 'Region import failed.') } finally { setRegionsImporting(false) }
  }

  const activeState = overview.find((item) => item.state === state)
  const publicMatched = publicRecords.filter((row) => row.scrape_target_id).length
  const allVisibleSelected = filtered.length > 0 && filtered.every((row) => selectedTargetIds.includes(row.id))

  return <div className="registry-page">
    <header className="registry-page__header"><div><div className="registry-page__eyebrow">OOS Operations</div><h1>Data registry</h1><p>Manage stores, data-source configuration, and the official registry source for each state.</p></div>{activeState && <div className="registry-page__count"><strong>{activeState.total}</strong><span>registered stores</span></div>}</header>
    {notice && <div className="registry-alert registry-alert--success">{notice}</div>}{error && <div className="registry-alert registry-alert--error">{error}</div>}
    <section className="registry-state-bar" aria-label="State selector"><span className="registry-state-bar__label">State</span><div className="registry-state-bar__controls">{overview.map((item) => <button key={item.state} className={`registry-state-button${state === item.state ? ' is-active' : ''}`} onClick={() => setState(item.state)}>{stateLabel(item.state)} <span>{item.configured_active}/{item.total}</span></button>)}</div></section>
    <section className="registry-source"><div className="registry-section-heading"><div><h2>Official data source</h2><p>Refresh updates the official retailer list and links verified store data sources.</p></div></div><div className="registry-source__controls"><input className="registry-input" aria-label="Official data source URL" placeholder="https://..." value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} /><button className="registry-button registry-button--primary" onClick={refresh} disabled={!source || !sourceUrl.trim() || !source.parser_configured || refreshing}>{refreshing ? 'Refreshing...' : 'Refresh data'}</button></div>{!source?.parser_configured && <div className="registry-alert registry-alert--error">{sourceParserMessage}</div>}{source?.last_refresh_error && <div className="registry-alert registry-alert--error">Source needs review: {source.last_refresh_error}</div>}</section>
    {publicRecords.length > 0 && <section className="registry-table-panel"><div className="registry-table-panel__toolbar"><div><h2>Official registry</h2><p>{publicRecords.length} official records; {publicMatched} linked to store data sources</p></div></div><div className="registry-table-scroll"><table className="registry-table"><thead><tr>{['Legal name', 'City', 'Address', 'Registry ID', 'Type', 'Store data source'].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{publicRecords.map((row) => <tr key={row.id}><td className="registry-table__store">{row.legal_name}</td><td>{row.city || '—'}</td><td>{row.address || '—'}</td><td>{row.registry_id}</td><td>{row.business_type || '—'}</td><td>{row.scrape_target_id ? 'Matched' : 'Needs review'}</td></tr>)}</tbody></table></div></section>}
    <section className="registry-table-panel"><div className="registry-table-panel__toolbar"><div><h2>{stateLabel(state)} stores</h2><p>{filtered.length} of {targets.length} records</p></div><div className="registry-table-panel__actions"><select className="registry-input registry-filter" aria-label="Filter by platform" value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)}><option value="">All platforms</option><option value="Not configured">Not configured</option>{platforms.map((platform) => <option key={platform.key} value={platform.key}>{platform.key}</option>)}</select><select className="registry-input registry-filter" aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option>{SCRAPER_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input className="registry-input registry-input--search" placeholder="Search stores..." value={query} onChange={(event) => setQuery(event.target.value)} />{selectedTargetIds.length > 0 && <><button className="registry-button" onClick={disableSelected}>Disable selected ({selectedTargetIds.length})</button><button className="registry-button registry-button--danger" onClick={() => setBulkDeleting(true)}>Delete selected ({selectedTargetIds.length})</button></>}<button className="registry-button" onClick={exportTargets} disabled={!filtered.length}>Export data for agent</button><button className="registry-button" onClick={() => importInputRef.current?.click()}>Import data changes</button><input ref={importInputRef} className="registry-file-input" type="file" accept="application/json" onChange={importTargets} /><button className="registry-button" onClick={exportRegions} disabled={!filtered.length}>Export regions</button><button className="registry-button" onClick={() => importRegionsInputRef.current?.click()} disabled={regionsImporting}>{regionsImporting ? 'Importing...' : 'Import regions'}</button><input ref={importRegionsInputRef} className="registry-file-input" type="file" accept=".xlsx" onChange={importRegions} /><button className="registry-button registry-button--primary" onClick={() => openTarget({ ...EMPTY_TARGET, state })}>Add store</button></div></div><div className="registry-table-scroll"><table className="registry-table"><colgroup><col style={{ width: '36px' }} /><col style={{ width: '19%' }} /><col style={{ width: '11%' }} /><col style={{ width: '10%' }} /><col style={{ width: '8%' }} /><col style={{ width: '12%' }} /><col style={{ width: '10%' }} /><col style={{ width: '15%' }} /><col style={{ width: '15%' }} /></colgroup><thead><tr><th><input type="checkbox" aria-label="Select visible stores" checked={allVisibleSelected} onChange={toggleVisibleTargets} /></th>{['Store', 'City', 'Region', 'Website', 'Platform', 'Status', 'Last updated', ''].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td><input type="checkbox" aria-label={`Select ${row.name}`} checked={selectedTargetIds.includes(row.id)} onChange={() => toggleTarget(row.id)} /></td><td className="registry-table__store">{row.name}</td><td>{row.city || '—'}</td><td>{row.region || '—'}</td><td>{row.website ? <a href={row.website} target="_blank" rel="noreferrer">Open site</a> : '—'}</td><td>{row.platform || '—'}</td><StatusCell row={row} supportedPlatforms={supportedPlatforms} /><td>{formatDate(row.last_scraped_at)}</td><td><div className="registry-row-actions"><button className="registry-button registry-button--quiet" onClick={() => openTarget(row)}>Edit</button><button className="registry-button registry-button--quiet registry-button--danger" onClick={() => setDeleting(row)}>Delete</button></div></td></tr>)}</tbody></table></div>{!filtered.length && <div className="registry-table-empty">No stores match this search.</div>}</section>
    {target && <div className="registry-editor-backdrop"><form onSubmit={saveTarget} className="registry-editor"><div className="registry-editor__heading"><div><h2>{target.id ? 'Edit store data' : 'Add store data'}</h2><p>Store details are saved to the OOS registry. Platform settings control data updates.</p></div><button type="button" className="registry-close" onClick={() => setTarget(null)} aria-label="Close editor">×</button></div><div className="registry-fields">{[['Name', 'name'], ['City', 'city'], ['Region', 'region'], ['Address', 'address'], ['License', 'license'], ['Website', 'website']].map(([label, key]) => <label key={key}>{label}<input className="registry-input" value={target[key] || ''} onChange={(event) => setTarget({ ...target, [key]: event.target.value })} /></label>)}<label>Platform<select className="registry-input" value={target.platform || ''} onChange={(event) => setTarget({ ...target, platform: event.target.value })}><option value="">Not configured</option>{isLegacyPlatform && <option value={target.platform}>{target.platform} (not supported)</option>}{platforms.map((platform) => <option key={platform.key} value={platform.key}>{platform.key}</option>)}</select></label></div><section className="registry-settings"><div className="registry-settings__heading"><div><h3>OOS ranking roster</h3><p>Set roster status to put this store on the NJ ranking roster; leave it blank to keep it out of ranking, pricing, and insights.</p></div></div><div className="registry-fields" style={{ marginTop: 14 }}>{[['Tier', 'tier'], ['Roster status', 'roster_status'], ['Reviewed', 'roster_reviewed_at']].map(([label, key]) => <label key={key}>{label}<input className="registry-input" value={target[key] || ''} onChange={(event) => setTarget({ ...target, [key]: event.target.value })} /></label>)}<label>Roster rank<input type="number" className="registry-input" value={target.roster_rank ?? ''} onChange={(event) => setTarget({ ...target, roster_rank: event.target.value })} /></label><label className="registry-field--wide">Roster notes<textarea className="registry-input registry-input--textarea" value={target.roster_notes || ''} onChange={(event) => setTarget({ ...target, roster_notes: event.target.value })} /></label></div></section><section className="registry-settings"><div className="registry-settings__heading"><div><h3>Data source settings</h3><p>{platformConfig ? settings.store_id ? 'This store has a configured data source.' : 'A data source is available. Add the Store ID to configure this store.' : 'Fields vary by the selected platform. Store ID is required; remaining fields are optional overrides.'}</p></div></div>{platformConfig ? <div className="registry-settings__grid">{platformSettingKeys.map((key) => <SettingField key={key} settingKey={key} value={settings[key]} required={key === 'store_id'} onChange={updateSetting} />)}{additionalScraperKeys.map((key) => <SettingField key={key} settingKey={key} value={settings[key]} onChange={updateSetting} />)}</div> : <p className="registry-settings__empty">{isLegacyPlatform ? 'No supported data source is available for this platform. Choose a supported platform after verification.' : target.website ? 'A website is recorded, but no platform has been identified.' : 'No website is recorded, so a platform cannot be verified.'}</p>}</section><label className="registry-toggle"><input type="checkbox" checked={target.is_active} onChange={(event) => setTarget({ ...target, is_active: event.target.checked })} />Active store data source</label><div className="registry-editor__actions"><button className="registry-button registry-button--primary" type="submit">Save store data</button>{target.id && <button className="registry-button registry-button--danger" type="button" onClick={() => setDeleting(target)}>Delete</button>}<button className="registry-button" type="button" onClick={() => setTarget(null)}>Cancel</button></div></form></div>}
    {deleting && <ConfirmModal title={`Delete "${deleting.name}"?`} message="This disables the store and removes it from the active OOS registry. Its record is retained for audit purposes." confirmLabel="Delete store" danger onConfirm={deleteTarget} onCancel={() => setDeleting(null)} />}
    {bulkDeleting && <ConfirmModal title={`Delete ${selectedTargetIds.length} stores?`} message="This disables the selected stores and removes them from the active OOS registry. Their records are retained for audit purposes." confirmLabel="Delete stores" danger onConfirm={deleteSelected} onCancel={() => setBulkDeleting(false)} />}
  </div>
}

function SettingField({ settingKey, value, required, onChange }) {
  const isBoolean = typeof value === 'boolean'
  return <label className={`registry-setting-field${required ? ' is-required' : ''}`}>{fieldLabel(settingKey)}{isBoolean ? <span className="registry-setting-toggle"><input type="checkbox" checked={value} onChange={(event) => onChange(settingKey, event.target.checked)} />{value ? 'Yes' : 'No'}</span> : <input className="registry-input" value={value ?? ''} onChange={(event) => onChange(settingKey, event.target.value)} />}{required && <span className="registry-setting-field__required">Required</span>}</label>
}
