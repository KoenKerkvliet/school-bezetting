import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'
import * as authService from '../services/authService'
import * as userService from '../services/userService'

const AuthContext = createContext(null)

// Helper: fetch user data with 3s timeout (never throws)
async function fetchUserData(userId) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)
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

// Helper: find organization (for users without a users table record)
async function findOrganization() {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single()
    return error ? null : data?.id
  } catch {
    return null
  }
}

// Helper: auto-create user record if missing (best-effort, never throws)
async function ensureUserRecord(userId, email, orgId) {
  try {
    const { error } = await supabase
      .from('users')
      .upsert([{
        id: userId,
        email: email,
        organization_id: orgId,
        role: 'Super Admin',
      }], { onConflict: 'id' })
    if (error) console.warn('[Auth] Could not create user record:', error.message)
  } catch (err) {
    console.warn('[Auth] ensureUserRecord failed:', err.message)
  }
}

// Helper: upgrade sole Admin to Super Admin (one-time migration)
async function upgradeToSuperAdminIfSoleAdmin(userId, orgId) {
  try {
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
    if (count === 1) {
      await supabase
        .from('users')
        .update({ role: 'Super Admin' })
        .eq('id', userId)
        .eq('organization_id', orgId)
      return 'Super Admin'
    }
  } catch (err) {
    console.warn('[Auth] upgradeToSuperAdmin check failed:', err.message)
  }
  return null
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [role, setRole] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [organizationId, setOrganizationId] = useState(null)
  const [orgSettings, setOrgSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  // Apply user data (role, org, permissions) — called async after login
  const applyUserData = useCallback(async (ud, authUser) => {
    if (ud) {
      // User record found — use it
      let effectiveRole = ud.role

      // One-time migration: upgrade sole Admin to Super Admin
      if (ud.role === 'Admin') {
        const upgraded = await upgradeToSuperAdminIfSoleAdmin(ud.id, ud.organization_id)
        if (upgraded) {
          effectiveRole = upgraded
          ud.role = upgraded
          console.log('[Auth] Upgraded sole Admin to Super Admin')
        }
      }

      setUserData(ud)
      setRole(effectiveRole)
      setOrganizationId(ud.organization_id)
      setPermissions(userService.getRolePermissions(effectiveRole))
      console.log('[Auth] User data loaded, orgId:', ud.organization_id)
    } else if (authUser) {
      // No user record — find org and auto-create record
      console.log('[Auth] No user record found, looking up organization...')
      const orgId = await findOrganization()
      if (orgId) {
        setOrganizationId(orgId)
        setRole('Admin')
        setPermissions(userService.getRolePermissions('Admin'))
        console.log('[Auth] Using org fallback:', orgId)

        // Try to create the missing user record for next time
        await ensureUserRecord(authUser.id, authUser.email, orgId)
      } else {
        console.warn('[Auth] No organization found in database')
      }
    }
  }, [])

  // Load org settings when orgId changes
  useEffect(() => {
    if (!organizationId) return
    supabase.from('organizations').select('settings').eq('id', organizationId).single()
      .then(({ data }) => {
        if (data?.settings) setOrgSettings(data.settings)
      })
      .catch(() => {})
  }, [organizationId])

  // Update a single org setting (persists to Supabase)
  const updateOrgSetting = useCallback(async (key, value) => {
    const newSettings = { ...orgSettings, [key]: value }
    setOrgSettings(newSettings)
    try {
      await supabase.from('organizations').update({ settings: newSettings, updated_at: new Date() }).eq('id', organizationId)
    } catch (err) {
      console.error('Error updating org settings:', err)
    }
  }, [orgSettings, organizationId])

  function clearAuth() {
    setUser(null)
    setUserData(null)
    setIsAuthenticated(false)
    setIsEmailVerified(false)
    setRole(null)
    setPermissions([])
    setOrganizationId(null)
    setOrgSettings({})
  }

  // Auth listener — keeps loading=true until both auth AND user data are ready
  // This prevents a flash of content between the auth spinner and app-data spinner
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[Auth] Event:', event, session ? 'has session' : 'no session')

        // Detect password recovery flow (from invite or reset email)
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true)
        }

        if (session?.user) {
          // Immediately mark as authenticated
          setUser(session.user)
          setIsAuthenticated(true)
          setIsEmailVerified(!!session.user.email_confirmed_at)
          setError(null)

          // Fetch user data (role, org, permissions) — loading stays true until done
          fetchUserData(session.user.id)
            .then(ud => applyUserData(ud, session.user))
            .finally(() => setLoading(false))
        } else {
          clearAuth()
          // No session — stop loading immediately
          if (event === 'INITIAL_SESSION') {
            setLoading(false)
          }
        }
      }
    )

    // Safety timeout: if INITIAL_SESSION never fires, stop loading after 4s
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 4000)

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [applyUserData])

  // Sign in with real timeout using Promise.race
  const signIn = async (email, password) => {
    setError(null)
    setLoading(true)  // Show loading screen while user data loads after sign-in

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 10000)
    )

    try {
      const { data, error: signInError } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeoutPromise,
      ])

      if (signInError) throw new Error(signInError.message)
      return data
    } catch (err) {
      if (err.message === 'Timeout') {
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
    orgSettings,
    updateOrgSetting,
    loading,
    error,
    signIn,
    signUp,
    logout,
    updateProfile,
    resetPassword,
    hasPermission,
    isPasswordRecovery,
    clearPasswordRecovery: () => setIsPasswordRecovery(false),
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
