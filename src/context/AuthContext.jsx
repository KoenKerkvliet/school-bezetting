import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import * as authService from '../services/authService'
import * as userService from '../services/userService'

const AuthContext = createContext(null)

// Helper: fetch user data with 5s timeout (never throws)
async function fetchUserData(userId) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
      .abortSignal(controller.signal)
    clearTimeout(timer)
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
      clearAuth()
    }
  }

  function clearAuth() {
    setUser(null)
    setUserData(null)
    setIsAuthenticated(false)
    setIsEmailVerified(false)
    setRole(null)
    setPermissions([])
    setOrganizationId(null)
  }

  // Single listener approach — uses INITIAL_SESSION event (Supabase v2.39+)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Event:', event, session ? 'has session' : 'no session')

        if (session?.user) {
          const ud = await fetchUserData(session.user.id)
          applySession(session, ud)
        } else {
          clearAuth()
        }

        // Stop showing loading spinner after initial check
        if (event === 'INITIAL_SESSION') {
          setLoading(false)
        }
      }
    )

    // Safety timeout in case INITIAL_SESSION never fires
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 3000)

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  // Sign in with 10s timeout
  const signIn = async (email, password) => {
    setError(null)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      clearTimeout(timer)
      if (signInError) throw new Error(signInError.message)
      return data
    } catch (err) {
      clearTimeout(timer)
      if (err.name === 'AbortError') {
        throw new Error('Verbinding met server duurt te lang. Probeer het opnieuw.')
      }
      throw err
    }
  }

  const signUp = async (email, password, firstName, lastName, orgId, role = 'Viewer') => {
    setError(null)
    await authService.signUp(email, password, firstName, lastName, orgId, role)
  }

  const logout = async () => {
    setError(null)
    try {
      await supabase.auth.signOut()
    } catch {
      // Force clear even if API fails
    }
    clearAuth()
  }

  const updateProfile = async (updates) => {
    setError(null)
    await authService.updateProfile(user.id, updates)
    setUserData(prev => ({ ...prev, ...updates }))
  }

  const resetPassword = async (email) => {
    setError(null)
    await authService.resetPassword(email)
  }

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
