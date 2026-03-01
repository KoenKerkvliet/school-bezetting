import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import LoginPage from './LoginPage'
import EmailVerificationPage from './EmailVerificationPage'
import LoadingScreen from './LoadingScreen'

/**
 * Protected route wrapper
 * Shows branded loading screen until auth + user data are ready.
 * Then shows LoginPage, EmailVerificationPage, or app content.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isEmailVerified, loading } = useAuth()
  const [forceReady, setForceReady] = useState(false)

  // Failsafe: never show loading screen longer than 6 seconds
  useEffect(() => {
    if (!loading) { setForceReady(false); return }
    const timer = setTimeout(() => setForceReady(true), 6000)
    return () => clearTimeout(timer)
  }, [loading])

  if (loading && !forceReady) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  if (!isEmailVerified) {
    return <EmailVerificationPage />
  }

  return children
}
