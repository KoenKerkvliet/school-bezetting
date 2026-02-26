import React from 'react'
import { useAuth } from '../context/AuthContext'
import LoginPage from './LoginPage'
import EmailVerificationPage from './EmailVerificationPage'

/**
 * Protected route wrapper
 * Only shows content if user is authenticated and email is verified
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isEmailVerified, loading } = useAuth()

  if (loading) {
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
