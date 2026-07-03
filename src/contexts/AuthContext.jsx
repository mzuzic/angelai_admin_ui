import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './auth-context.js'
import { getMe, login as loginRequest } from '../services/api.js'

const TOKEN_KEY = 'angelai_admin_access_token'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => window.localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function hydrate() {
      if (!token) {
        if (active) {
          setUser(null)
          setLoading(false)
        }
        return
      }

      try {
        const me = await getMe(token)
        if (active) {
          setUser(me)
        }
      } catch {
        window.localStorage.removeItem(TOKEN_KEY)
        if (active) {
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
    window.localStorage.setItem(TOKEN_KEY, result.access_token)
    setToken(result.access_token)
    const me = await getMe(result.access_token)
    setUser(me)
    return me
  }

  function logout() {
    window.localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
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
