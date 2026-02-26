import React, { createContext, useContext, useState, useEffect } from 'react'
import * as authService from '../services/authService'
import * as userService from '../services/userService'

const AuthContext = createContext(null)

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

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true)
        const unsubscribe = authService.onAuthStateChange(async (authState) => {
          if (authState.isAuthenticated && authState.user) {
            setUser(authState.user)
            setIsEmailVerified(authState.isEmailVerified)

            // Get user data from users table
            if (authState.userData) {
              setUserData(authState.userData)
              setRole(authState.userData.role)
              setOrganizationId(authState.userData.organization_id)

              // Set permissions based on role
              const userPermissions = userService.getRolePermissions(authState.userData.role)
              setPermissions(userPermissions)
            }

            setIsAuthenticated(true)
            setError(null)
          } else {
            setUser(null)
            setUserData(null)
            setIsAuthenticated(false)
            setIsEmailVerified(false)
            setRole(null)
            setPermissions([])
            setOrganizationId(null)
          }
          setLoading(false)
        })

        // Cleanup on unmount
        return () => {
          if (unsubscribe) unsubscribe()
        }
      } catch (err) {
        console.error('Auth check error:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    checkAuth()
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
