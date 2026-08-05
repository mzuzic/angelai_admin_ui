import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './auth-context.js'
import {
  clearAccessToken,
  configureAuth,
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  refreshSession,
} from '../services/api.js'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    configureAuth({
      getAccessToken: () => token,
      onAccessToken: setToken,
      onUnauthorized: () => {
        setToken(null)
        setUser(null)
      },
    })
  }, [])

  useEffect(() => {
    let active = true

    async function hydrate() {
      try {
        await refreshSession()
        const me = await getMe()
        if (active) {
          setUser(me)
        }
      } catch {
        if (active) {
          clearAccessToken()
          setToken(null)
          setUser(null)
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

  async function login(email, password) {
    const result = await loginRequest(email, password)
    setToken(result.access_token)
    const me = await getMe()
    setUser(me)
    return me
  }

  async function logout() {
    try {
      await logoutRequest()
    } finally {
      clearAccessToken()
      setToken(null)
      setUser(null)
    }
  }

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
    }),
    [loading, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
