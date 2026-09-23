const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8015'

let accessToken = null
let refreshPromise = null
let unauthorizedHandler = null
let accessTokenHandler = null

function setAccessToken(nextToken) {
  accessToken = nextToken
  if (accessTokenHandler) {
    accessTokenHandler(nextToken)
  }
}

export function configureAuth({
  getAccessToken,
  onAccessToken,
  onUnauthorized,
} = {}) {
  accessToken = typeof getAccessToken === 'function' ? getAccessToken() : null
  accessTokenHandler = onAccessToken || null
  unauthorizedHandler = onUnauthorized || null
}

async function parseError(response) {
  let detail = 'Request failed'
  try {
    const payload = await response.json()
    if (Array.isArray(payload.detail)) {
      detail = payload.detail
        .map((item) => `${Array.isArray(item.loc) ? item.loc.slice(1).join('.') : 'request'}: ${item.msg || 'Invalid value'}`)
        .join('; ')
    } else {
      detail = payload.detail || detail
    }
  } catch {
    // Keep fallback detail.
  }
  return new Error(detail)
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw await parseError(response)
      }

      const payload = await response.json()
      setAccessToken(payload.access_token)
      return payload.access_token
    })()
      .catch((error) => {
        setAccessToken(null)
        if (unauthorizedHandler) {
          unauthorizedHandler()
        }
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

async function request(path, { method = 'GET', body, formData, auth = true, retryOn401 = true, tokenOverride, responseType = 'json' } = {}) {
  const headers = {}
  const token = auth ? (tokenOverride ?? accessToken) : null
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    credentials: 'include',
  })

  if (response.status === 401 && auth && retryOn401 && path !== '/api/auth/refresh') {
    try {
      const nextToken = await refreshAccessToken()
      return request(path, {
        method,
        body,
        formData,
        auth,
        retryOn401: false,
        tokenOverride: nextToken,
        responseType,
      })
    } catch (error) {
      throw error
    }
  }

  if (!response.ok) {
    throw await parseError(response)
  }

  if (response.status === 204) {
    return null
  }

  if (responseType === 'blob') {
    const disposition = response.headers.get('Content-Disposition') || ''
    const filenameMatch = disposition.match(/filename="?([^";]+)"?/)
    return { blob: await response.blob(), filename: filenameMatch ? filenameMatch[1] : null }
  }

  return response.json()
}

export function clearAccessToken() {
  setAccessToken(null)
}

export function setStoredAccessToken(token) {
  setAccessToken(token)
}

export async function healthcheck() {
  return request('/api/health', { auth: false })
}

export async function login(email, password) {
  const payload = await request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
    retryOn401: false,
  })
  setAccessToken(payload.access_token)
  return payload
}

export async function refreshSession() {
  return refreshAccessToken()
}

export async function logout() {
  try {
    await request('/api/auth/logout', {
      method: 'POST',
      auth: false,
      retryOn401: false,
    })
  } finally {
    setAccessToken(null)
  }
}

export async function getMe() {
  return request('/api/auth/me')
}

export async function listAdminUsers() {
  return request('/api/admin-users')
}

export async function createAdminUser(payload) {
  return request('/api/admin-users', {
    method: 'POST',
    body: payload,
  })
}

export async function updateAdminUser(adminUserId, payload) {
  return request(`/api/admin-users/${adminUserId}`, {
    method: 'PUT',
    body: payload,
  })
}

export async function deactivateAdminUser(adminUserId) {
  return request(`/api/admin-users/${adminUserId}`, {
    method: 'DELETE',
  })
}

export async function setAdminUserPassword(adminUserId, newPassword) {
  return request(`/api/admin-users/${adminUserId}/set-password`, {
    method: 'POST',
    body: { new_password: newPassword },
  })
}

export async function listOrganizations() {
  return request('/api/organizations')
}

export async function listScrapeDataStates() {
  return request('/api/organizations/scrape-data-states')
}

export async function createOrganization(payload) {
  return request('/api/organizations', {
    method: 'POST',
    body: payload,
  })
}

export async function getOrganizationDetail(organizationId) {
  return request(`/api/organizations/${organizationId}`)
}

export async function updateOrganization(organizationId, payload) {
  return request(`/api/organizations/${organizationId}`, {
    method: 'PUT',
    body: payload,
  })
}

export async function deleteOrganization(organizationId) {
  return request(`/api/organizations/${organizationId}`, {
    method: 'DELETE',
  })
}

export async function updateOrganizationFeatures(organizationId, changes) {
  return request(`/api/organizations/${organizationId}/features`, {
    method: 'PUT',
    body: changes,
  })
}

export async function getOrganizationUserTokenUsage(organizationId, userId) {
  return request(`/api/organizations/${organizationId}/users/${userId}/token-usage`)
}

export async function getOrganizationMonthlyUserBreakdown(organizationId, monthStart) {
  return request(`/api/organizations/${organizationId}/monthly-history/${monthStart}/users`)
}

export async function listAIModels() {
  return request('/api/ai-models')
}

export async function listAvailableAIModels() {
  return request('/api/ai-models/available')
}

export async function createAIModel(payload) {
  return request('/api/ai-models', {
    method: 'POST',
    body: payload,
  })
}

export async function updateAIModel(aiModelId, payload) {
  return request(`/api/ai-models/${aiModelId}`, {
    method: 'PUT',
    body: payload,
  })
}

export async function deleteAIModel(aiModelId) {
  return request(`/api/ai-models/${aiModelId}`, {
    method: 'DELETE',
  })
}

export const listScrapeRegistryOverview = () => request('/api/scraping-registry/overview')
export const listScrapeTargets = (state = '') => request(`/api/scraping-registry/targets${state ? `?state=${encodeURIComponent(state)}` : ''}`)
export const listPublicRegistryStores = (state) => request(`/api/scraping-registry/public-records?state=${encodeURIComponent(state)}`)
export const listScrapePlatforms = () => request('/api/scraping-registry/platforms')
export const listRegistrySources = () => request('/api/scraping-registry/sources')
export const createRegistrySource = (body) => request('/api/scraping-registry/sources', { method: 'POST', body })
export const updateRegistrySource = (id, body) => request(`/api/scraping-registry/sources/${id}`, { method: 'PUT', body })
export const deleteRegistrySource = (id) => request(`/api/scraping-registry/sources/${id}`, { method: 'DELETE' })
export const refreshRegistrySource = (id) => request(`/api/scraping-registry/sources/${id}/refresh`, { method: 'POST' })
export const getRegistryRefreshStatus = (taskId) => request(`/api/scraping-registry/sources/refresh-status/${taskId}`)
export const exportScrapeRegistry = (state, targetIds) => request('/api/scraping-registry/export', {
  method: 'POST', body: { state, target_ids: targetIds },
})
export const importScrapeRegistry = (body) => request('/api/scraping-registry/import', { method: 'POST', body })
export const createScrapeTarget = (body) => request('/api/scraping-registry/targets', { method: 'POST', body })
export const updateScrapeTarget = (id, body) => request(`/api/scraping-registry/targets/${id}`, { method: 'PUT', body })
export const deleteScrapeTarget = (id) => request(`/api/scraping-registry/targets/${id}`, { method: 'DELETE' })
export const disableScrapeTargets = (targetIds) => request('/api/scraping-registry/targets/bulk-disable', { method: 'POST', body: { target_ids: targetIds } })
export const softDeleteScrapeTargets = (targetIds) => request('/api/scraping-registry/targets/bulk-delete', { method: 'POST', body: { target_ids: targetIds } })
export const exportScrapeRegistryRegions = (state) => request(`/api/scraping-registry/regions/export?state=${encodeURIComponent(state)}`, { responseType: 'blob' })
export const importScrapeRegistryRegions = (state, file) => {
  const formData = new FormData()
  formData.append('state', state)
  formData.append('file', file)
  return request('/api/scraping-registry/regions/import', { method: 'POST', formData })
}
