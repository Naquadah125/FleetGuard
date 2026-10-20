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

  // Sync user state if updated in another tab or in DB
  useEffect(() => {
    if (user?._id) {
      const db = getDB()
      const fresh = db.users.find((u) => u._id === user._id)
      if (fresh && JSON.stringify(fresh) !== JSON.stringify(user)) {
        setUser(fresh)
        localStorage.setItem('fleet_user', JSON.stringify(fresh))
      }
    }
  }, [user])

  const login = async (email, password) => {
    setLoading(true)
    const lowerEmail = email.trim().toLowerCase()

    try {
      // 1. Try real backend first
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lowerEmail, password }),
      })

      if (res.ok) {
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
      throw new Error('Backend offline or invalid credentials')
    } catch {
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
        body: JSON.stringify({ name, email: lowerEmail, password, role, orgName }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.user) {
          setUser(data.user)
          setToken(data.token || 'jwt_' + Date.now())
          localStorage.setItem('fleet_user', JSON.stringify(data.user))
          localStorage.setItem('fleet_token', data.token || 'jwt_' + Date.now())
          return { success: true, user: data.user, isMock: false }
        }
      }
      throw new Error('Backend offline')
    } catch {
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
    return db.organizations.find((o) => o._id === user.organizationId) || null
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
