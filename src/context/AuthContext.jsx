import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import * as userService from '../services/userService'

const AuthContext = createContext(null)

// Helper: fetch user data from users table
async function fetchUserData(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    return error ? null : data
  } catch {
    return null
  }
}

// Helper: apply auth state to setters
function applyAuthState(session, userData, setters) {
  if (session?.user) {
    setters.setUser(session.user)
    setters.setIsAuthenticated(true)
    setters.setIsEmailVerified(!!session.user.email_confirmed_at)
    setters.setError(null)

    if (userData) {
      setters.setUserData(userData)
      setters.setRole(userData.role)
      setters.setOrganizationId(userData.organization_id)
      const perms = userService.getRolePermissions(userData.role)
      setters.setPermissions(perms)
    }
  } else {
    setters.setUser(null)
    setters.setUserData(null)
    setters.setIsAuthenticated(false)
    setters.setIsEmailVerified(false)
    setters.setRole(null)
    setters.setPermissions([])
    setters.setOrganizationId(null)
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

  const setters = { setUser, setUserData, setIsAuthenticated, setIsEmailVerified, setRole, setPermissions, setOrganizationId, setError }

  // Check auth state on mount
  useEffect(() => {
    // Step 1: Check current session immediately
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const ud = await fetchUserData(session.user.id)
        applyAuthState(session, ud, setters)
      } else {
        applyAuthState(null, null, setters)
      }
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    // Step 2: Listen for future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const ud = await fetchUserData(session.user.id)
          applyAuthState(session, ud, setters)
        } else {
          applyAuthState(null, null, setters)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Sign in
  const signIn = async (email, password) => {
    try {
      setLoading(true)
      setError(null)
      await authService.signIn(email, password)
      // Auth state change listener will handle updating state
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Sign up (for new users)
  const signUp = async (email, password, firstName, lastName, organizationId, role = 'Viewer') => {
    try {
      setLoading(true)
      setError(null)
      await authService.signUp(email, password, firstName, lastName, organizationId, role)
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Log out
  const logout = async () => {
    try {
      setLoading(true)
      setError(null)
      await authService.logout()
      setUser(null)
      setUserData(null)
      setIsAuthenticated(false)
      setRole(null)
      setPermissions([])
      setOrganizationId(null)
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Update profile
  const updateProfile = async (updates) => {
    try {
      setLoading(true)
      setError(null)
      await authService.updateProfile(user.id, updates)
      setUserData({ ...userData, ...updates })
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Reset password
  const resetPassword = async (email) => {
    try {
      setLoading(true)
      setError(null)
      await authService.resetPassword(email)
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Check permission
  const hasPermission = (action) => {
    return permissions.includes(action)
  }

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
