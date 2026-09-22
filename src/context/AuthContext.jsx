import { createContext, useContext, useEffect, useState } from 'react'
import { auth, getToken, setToken, clearToken } from '../api/client'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    async function boot() {
      if (!getToken()) { setReady(true); return }
      try {
        const me = await auth.me()
        if (alive) setUser(me)
      } catch {
        clearToken()
      } finally {
        if (alive) setReady(true)
      }
    }
    boot()
    return () => { alive = false }
  }, [])

  async function login(email, password) {
    const { token, user } = await auth.login(email, password)
    setToken(token)
    setUser(user)
    return user
  }

  function logout() {
    clearToken()
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, ready, login, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}
