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
    detail = payload.detail || detail
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

async function request(path, { method = 'GET', body, auth = true, retryOn401 = true, tokenOverride } = {}) {
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
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })

  if (response.status === 401 && auth && retryOn401 && path !== '/api/auth/refresh') {
    const nextToken = await refreshAccessToken()
    return request(path, {
      method,
      body,
      auth,
      retryOn401: false,
      tokenOverride: nextToken,
    })
  }

  if (!response.ok) {
    throw await parseError(response)
  }

  if (response.status === 204) {
    return null
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
