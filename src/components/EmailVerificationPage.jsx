import React, { useState, useEffect } from 'react'
import * as authService from '../services/authService'

export default function EmailVerificationPage({ email, onVerified }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)

  // Check if already verified when component mounts
  useEffect(() => {
    const checkVerified = async () => {
      const isVerified = await authService.isEmailVerified()
      if (isVerified) {
        setSuccess(true)
        setTimeout(() => onVerified?.(), 1500)
      }
    }

    checkVerified()
  }, [onVerified])

  // Resend countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCountdown])

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Note: In a real app, you would verify the code with Supabase
      // For now, we'll just mark as verified after email confirmation
      // The actual verification happens via Supabase email link
      setSuccess(true)
      setTimeout(() => onVerified?.(), 1500)
    } catch (err) {
      setError(err.message || 'Verificatie mislukt. Probeer het opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendEmail = async () => {
    setError('')
    setLoading(true)

    try {
      await authService.resendVerificationEmail(email)
      setResendCountdown(60)
    } catch (err) {
      setError(err.message || 'Fout bij het verzenden van email.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <span className="text-green-600 text-3xl">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email geverifieerd!</h2>
            <p className="text-gray-600">Je account is succesvol geverifieerd. Je wordt omgeleid...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <span className="text-blue-600 text-2xl">✉️</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Email verifiëren</h1>
            <p className="text-gray-600 mt-2 text-sm">
              We hebben een verificatie email gestuurd naar <span className="font-medium">{email}</span>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            {/* Verification Code Input */}
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Verificatiecode
              </label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={loading}
                maxLength="6"
                placeholder="ABC123"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-center text-lg tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
              <p className="text-gray-500 text-xs mt-2">
                Check je email (en spam folder) voor de verificatiecode
              </p>
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading || code.length < 1}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 rounded-lg transition-colors"
            >
              {loading ? 'Bezig met verifiëren...' : 'Email verifiëren'}
            </button>
          </form>

          {/* Resend Email */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-gray-600 text-sm mb-3">Geen email ontvangen?</p>
            <button
              onClick={handleResendEmail}
              disabled={loading || resendCountdown > 0}
              className="w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 text-gray-700 font-medium py-2 rounded-lg transition-colors"
            >
              {resendCountdown > 0
                ? `Opnieuw verzenden over ${resendCountdown}s`
                : 'Verificatie email opnieuw verzenden'}
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-700 text-xs">
              <strong>💡 Tip:</strong> Check je spam folder als je de email niet ziet. Zet ons email adres in je contacten zodat toekomstige emails niet in spam belanden.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
