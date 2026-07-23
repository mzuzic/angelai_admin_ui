const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8015'

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = {}
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
  })

  if (!response.ok) {
    let detail = 'Request failed'
    try {
      const payload = await response.json()
      detail = payload.detail || detail
    } catch {
      // Keep fallback detail.
    }
    throw new Error(detail)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export async function healthcheck() {
  return request('/api/health')
}

export async function login(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export async function getMe(token) {
  return request('/api/auth/me', { token })
}

export async function listAdminUsers(token) {
  return request('/api/admin-users', { token })
}

export async function createAdminUser(token, payload) {
  return request('/api/admin-users', {
    method: 'POST',
    token,
    body: payload,
  })
}

export async function updateAdminUser(token, adminUserId, payload) {
  return request(`/api/admin-users/${adminUserId}`, {
    method: 'PUT',
    token,
    body: payload,
  })
}

export async function deactivateAdminUser(token, adminUserId) {
  return request(`/api/admin-users/${adminUserId}`, {
    method: 'DELETE',
    token,
  })
}

export async function setAdminUserPassword(token, adminUserId, newPassword) {
  return request(`/api/admin-users/${adminUserId}/set-password`, {
    method: 'POST',
    token,
    body: { new_password: newPassword },
  })
}

export async function listOrganizations(token) {
  return request('/api/organizations', { token })
}

export async function createOrganization(token, payload) {
  return request('/api/organizations', {
    method: 'POST',
    token,
    body: payload,
  })
}

export async function getOrganizationDetail(token, organizationId) {
  return request(`/api/organizations/${organizationId}`, { token })
}

export async function getOrganizationUserTokenUsage(token, organizationId, userId) {
  return request(`/api/organizations/${organizationId}/users/${userId}/token-usage`, { token })
}
