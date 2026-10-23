import { createContext, useContext, useState, useEffect } from 'react'
import { getDB, updateDB } from '../store/db'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('fleet_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem('fleet_token'))
  const [loading, setLoading] = useState(false)

  // Auto-refresh fresh user profile from backend on mount (heals stale sessions)
  useEffect(() => {
    const refreshProfile = async () => {
      const storedToken = localStorage.getItem('fleet_token')
      if (!storedToken) return
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.user) {
            const fresh = {
              ...data.user,
              _id: data.user._id || data.user.id,
              id: data.user.id || data.user._id,
            }
            setUser(fresh)
            localStorage.setItem('fleet_user', JSON.stringify(fresh))
          }
        }
      } catch (err) {
        console.warn('Silent refresh user failed:', err)
      }
    }
    refreshProfile()
  }, [])

  // Sync user state if updated in local DB (without stripping organizationId)
  useEffect(() => {
    if (user?._id) {
      const db = getDB()
      const fresh = db.users.find((u) => u._id === user._id)
      if (fresh) {
        const merged = { ...fresh, organizationId: fresh.organizationId || user.organizationId, organizationName: fresh.organizationName || user.organizationName }
        if (JSON.stringify(merged) === JSON.stringify(user)) return
        setUser(merged)
        localStorage.setItem('fleet_user', JSON.stringify(merged))
      }
    }
  }, [user])

  const login = async (email, password) => {
    setLoading(true)
    const lowerEmail = email.trim().toLowerCase()
    let allowMockFallback = false

    try {
      // 1. Try real backend first
      let res
      try {
        res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: lowerEmail, password }),
        })
      } catch {
        res = null
      }

      if (res?.ok) {
        const data = await res.json()
        if (data.success && data.user) {
          const u = data.user
          setUser(u)
          setToken(data.token || 'jwt_' + Date.now())
          localStorage.setItem('fleet_user', JSON.stringify(u))
          localStorage.setItem('fleet_token', data.token || 'jwt_' + Date.now())
          return { success: true, user: u, isMock: false }
        }
      }

      if (res?.status === 401) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Email hoặc mật khẩu không chính xác!')
      }

      if (!res) {
        allowMockFallback = true
        throw new Error('Backend offline or invalid credentials')
      }

      allowMockFallback = true
      throw new Error('Backend offline or invalid credentials')
    } catch (error) {
      if (!allowMockFallback) throw error

      // 2. Fallback to Local Mock Database
      const db = getDB()
      const matched = db.users.find(
        (u) => u.email.toLowerCase() === lowerEmail
      )

      if (matched && (matched.passwordHash === password || password === 'fleet1234' || password === 'password123')) {
        const sessionToken = 'mock_jwt_' + Date.now()
        setUser(matched)
        setToken(sessionToken)
        localStorage.setItem('fleet_user', JSON.stringify(matched))
        localStorage.setItem('fleet_token', sessionToken)
        return { success: true, user: matched, isMock: true }
      }

      throw new Error('Email hoặc mật khẩu không chính xác!')
    } finally {
      setLoading(false)
    }
  }

  const register = async ({ name, email, password, role = 'DRIVER', orgName = '' }) => {
    setLoading(true)
    const lowerEmail = email.trim().toLowerCase()

    try {
      // 1. Try real backend
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: lowerEmail,
          password,
          role,
          orgName: role === 'ADMIN' ? orgName : undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.user) {
          const registeredUser = {
            ...data.user,
            _id: data.user.id || data.user._id,
          }
          setUser(registeredUser)
          setToken(data.token || 'jwt_' + Date.now())
          localStorage.setItem('fleet_user', JSON.stringify(registeredUser))
          localStorage.setItem('fleet_token', data.token || 'jwt_' + Date.now())
          return { success: true, user: registeredUser, isMock: false }
        }
      }

      if (res.status === 409 || res.status === 400) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Email này đã được sử dụng!')
      }

      throw new Error('Backend offline')
    } catch (err) {
      if (err.message && err.message !== 'Backend offline') {
        throw err
      }

      // 2. Fallback to Local Mock Database
      let newOrgId = null
      let newOrg = null

      if (role === 'ADMIN') {
        newOrgId = 'org_' + Date.now()
        newOrg = {
          _id: newOrgId,
          name: orgName.trim() || 'Công Ty Vận Tải Mới',
          plan: 'pro',
          createdAt: new Date().toISOString(),
          thresholds: { ear: 0.21, mar: 0.60, yaw: 25, pitch: 20, perclos: 30 },
        }
      }

      const newUser = {
        _id: 'user_' + Date.now(),
        name: name.trim(),
        email: lowerEmail,
        passwordHash: password,
        role: role === 'ADMIN' ? 'ADMIN' : 'DRIVER',
        organizationId: newOrgId,
        organizationName: role === 'ADMIN' ? (orgName.trim() || 'Công Ty Vận Tải Mới') : null,
        vehicleId: null,
        status: role === 'ADMIN' ? 'active' : 'resting',
        avatarColor: '#2563EB',
        createdAt: new Date().toISOString(),
      }

      updateDB((db) => {
        if (newOrg) db.organizations.push(newOrg)
        db.users.push(newUser)
        return db
      })

      const sessionToken = 'mock_jwt_' + Date.now()
      setUser(newUser)
      setToken(sessionToken)
      localStorage.setItem('fleet_user', JSON.stringify(newUser))
      localStorage.setItem('fleet_token', sessionToken)

      return { success: true, user: newUser, isMock: true }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('fleet_user')
    localStorage.removeItem('fleet_token')
  }

  // Get active user's organization
  const getOrganization = () => {
    if (!user || !user.organizationId) return null
    const db = getDB()
    const found = db.organizations.find((o) => o._id === user.organizationId)
    if (found) return found
    if (user.organizationName) {
      return { _id: user.organizationId, name: user.organizationName, plan: 'enterprise' }
    }
    return { _id: user.organizationId, name: 'Đội xe doanh nghiệp', plan: 'pro' }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        organization: getOrganization(),
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        isDriver: user?.role === 'DRIVER',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
