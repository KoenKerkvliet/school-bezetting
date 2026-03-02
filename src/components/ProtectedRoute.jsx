import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import LoginPage from './LoginPage'
import EmailVerificationPage from './EmailVerificationPage'
import SetPasswordPage from './SetPasswordPage'
import LoadingScreen from './LoadingScreen'

/**
 * Protected route wrapper
 * Shows branded loading screen until auth + user data are ready.
 * Then shows SetPasswordPage, LoginPage, EmailVerificationPage, or app content.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isEmailVerified, isPasswordRecovery, loading } = useAuth()
  const [forceReady, setForceReady] = useState(false)

  // Detect /set-password or /reset-password URL (branded link from invite email)
  const isSetPasswordUrl = window.location.pathname === '/set-password' || window.location.pathname === '/reset-password'

  // Failsafe: never show loading screen longer than 6 seconds
  useEffect(() => {
    if (!loading) { setForceReady(false); return }
    const timer = setTimeout(() => setForceReady(true), 6000)
    return () => clearTimeout(timer)
  }, [loading])

  if (loading && !forceReady) {
    // If on /set-password URL with token, show SetPasswordPage instead of loading screen
    // so it can verify the token and establish a session
    if (isSetPasswordUrl && new URLSearchParams(window.location.search).has('token_hash')) {
      return <SetPasswordPage />
    }
    return <LoadingScreen />
  }

  // Password recovery flow (from invite or reset email, or URL-based)
  if (isPasswordRecovery || isSetPasswordUrl) {
    return <SetPasswordPage />
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  if (!isEmailVerified) {
    return <EmailVerificationPage />
  }

  return children
}
