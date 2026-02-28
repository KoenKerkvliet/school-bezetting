import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import LoginPage from './LoginPage'
import EmailVerificationPage from './EmailVerificationPage'

/**
 * Protected route wrapper
 * Only shows content if user is authenticated and email is verified
 * Has a built-in failsafe: after 6 seconds, stops showing spinner regardless
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isEmailVerified, loading } = useAuth()
  const [forceReady, setForceReady] = useState(false)

  // Failsafe: never show spinner longer than 6 seconds
  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => setForceReady(true), 6000)
    return () => clearTimeout(timer)
  }, [loading])

  if (loading && !forceReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Bezig met laden...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  if (!isEmailVerified) {
    return <EmailVerificationPage />
  }

  return children
}
