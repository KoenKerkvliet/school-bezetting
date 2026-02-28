import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import * as authService from '../services/authService'
import * as userService from '../services/userService'

const AuthContext = createContext(null)

// Timeout wrapper — rejects after ms if promise hasn't resolved
function withTimeout(promise, ms, label = '') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label} (${ms}ms)`)), ms)
    ),
  ])
}

// Helper: fetch user data from users table (never throws, has timeout)
async function fetchUserData(userId) {
  try {
    const { data, error } = await withTimeout(
      supabase.from('users').select('*').eq('id', userId).single(),
      5000,
      'fetchUserData'
    )
    return error ? null : data
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [role, setRole] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [organizationId, setOrganizationId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Apply session + user data to state
  function applySession(session, ud) {
    if (session?.user) {
      setUser(session.user)
      setIsAuthenticated(true)
      setIsEmailVerified(!!session.user.email_confirmed_at)
      setError(null)
      if (ud) {
        setUserData(ud)
        setRole(ud.role)
        setOrganizationId(ud.organization_id)
        setPermissions(userService.getRolePermissions(ud.role))
      }
    } else {
      setUser(null)
      setUserData(null)
      setIsAuthenticated(false)
      setIsEmailVerified(false)
      setRole(null)
      setPermissions([])
      setOrganizationId(null)
    }
  }

  // Clear all auth state
  function clearAuth() {
    setUser(null)
    setUserData(null)
    setIsAuthenticated(false)
    setIsEmailVerified(false)
    setRole(null)
    setPermissions([])
    setOrganizationId(null)
  }

  // Initialize auth on mount
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          3000,
          'getSession'
        )
        if (cancelled) return
        if (session?.user) {
          const ud = await fetchUserData(session.user.id)
          if (!cancelled) applySession(session, ud)
        }
      } catch (err) {
        console.warn('[Auth] Init:', err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()

    // Listen for future auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const ud = await fetchUserData(session.user.id)
          applySession(session, ud)
        } else {
          clearAuth()
        }
      }
    )

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  // Sign in with 10s timeout
  const signIn = async (email, password) => {
    setError(null)
    await withTimeout(
      authService.signIn(email, password),
      10000,
      'signIn'
    )
  }

  // Sign up
  const signUp = async (email, password, firstName, lastName, orgId, role = 'Viewer') => {
    setError(null)
    await withTimeout(
      authService.signUp(email, password, firstName, lastName, orgId, role),
      15000,
      'signUp'
    )
  }

  // Log out
  const logout = async () => {
    setError(null)
    try {
      await withTimeout(authService.logout(), 5000, 'logout')
    } catch {
      // Force clear even if logout API call fails
    }
    clearAuth()
  }

  // Update profile
  const updateProfile = async (updates) => {
    setError(null)
    await authService.updateProfile(user.id, updates)
    setUserData(prev => ({ ...prev, ...updates }))
  }

  // Reset password
  const resetPassword = async (email) => {
    setError(null)
    await withTimeout(
      authService.resetPassword(email),
      10000,
      'resetPassword'
    )
  }

  // Check permission
  const hasPermission = (action) => permissions.includes(action)

  const value = {
    user,
    userData,
    isAuthenticated,
    isEmailVerified,
    role,
    permissions,
    organizationId,
    loading,
    error,
    signIn,
    signUp,
    logout,
    updateProfile,
    resetPassword,
    hasPermission,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
