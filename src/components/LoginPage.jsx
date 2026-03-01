import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { CheckCircle, Users, Calendar, BarChart3 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMessage, setResetMessage] = useState('')

  const { signIn, resetPassword } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      if (rememberMe) {
        localStorage.setItem('rememberEmail', email)
      } else {
        localStorage.removeItem('rememberEmail')
      }
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('Timeout')) {
        setError('Verbinding met server duurt te lang. Probeer het opnieuw.')
      } else if (msg.includes('Invalid login')) {
        setError('Onjuist email of wachtwoord.')
      } else {
        setError(msg || 'Login mislukt. Controleer je email en wachtwoord.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await resetPassword(resetEmail)
      setResetMessage(
        'Email verzonden! Controleer je inbox voor instructies om je wachtwoord opnieuw in te stellen.'
      )
      setResetEmail('')
      setTimeout(() => setShowForgotPassword(false), 3000)
    } catch (err) {
      setError(err.message || 'Fout bij het verzenden van reset email.')
    } finally {
      setLoading(false)
    }
  }

  // Load remembered email
  React.useEffect(() => {
    const remembered = localStorage.getItem('rememberEmail')
    if (remembered) {
      setEmail(remembered)
      setRememberMe(true)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left: Login form ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <img src="/favicon.svg" alt="School Bezetting" className="w-10 h-10 rounded-lg shadow" />
            <span className="text-xl font-bold text-gray-900">School Bezetting</span>
          </div>

          {/* Login Form */}
          {!showForgotPassword ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Welkom terug</h2>
              <p className="text-gray-500 text-sm mb-8">Log in om verder te gaan</p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition-shadow"
                    placeholder="jouw@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Wachtwoord
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition-shadow"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="remember"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={loading}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                      Email onthouden
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Wachtwoord vergeten?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
                >
                  {loading ? 'Bezig met inloggen...' : 'Inloggen'}
                </button>
              </form>

              <p className="mt-8 text-center text-xs text-gray-400">
                Geen account? Neem contact op met je beheerder.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Wachtwoord herstellen</h2>
              <p className="text-gray-500 text-sm mb-8">Voer je email in om een resetlink te ontvangen</p>

              {resetMessage && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 text-sm">{resetMessage}</p>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    id="resetEmail"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition-shadow"
                    placeholder="jouw@email.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
                >
                  {loading ? 'Bezig...' : 'Reset link versturen'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  ← Terug naar login
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Right: Hero panel ── */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />
        <div className="absolute top-1/2 right-10 w-40 h-40 bg-white/5 rounded-full" />

        <div className="relative z-10 flex flex-col justify-center px-16 py-12 max-w-xl">
          {/* Main heading */}
          <h1 className="text-4xl font-extrabold leading-tight mb-4">
            Altijd inzicht in de bezetting van je school
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed mb-10">
            Plan vervangers, beheer afwezigheden en houd overzicht over alle groepen — in één overzichtelijk systeem.
          </p>

          {/* Feature highlights */}
          <div className="space-y-4">
            <FeatureItem
              icon={CheckCircle}
              title="Weekoverzicht in één oogopslag"
              text="Zie direct welke groepen bemand zijn en waar actie nodig is."
            />
            <FeatureItem
              icon={Users}
              title="Vervangers snel inplannen"
              text="Wijs collega's toe aan groepen en volg afwezigheden realtime."
            />
            <FeatureItem
              icon={Calendar}
              title="Vakanties & vrije dagen"
              text="Plan schoolvakanties, feestdagen en studiedagen vooruit."
            />
            <FeatureItem
              icon={BarChart3}
              title="Statistieken & inzichten"
              text="Bekijk trends in afwezigheid en krijg grip op verzuim."
            />
          </div>

          {/* Bottom branding */}
          <div className="mt-12 pt-8 border-t border-white/20">
            <div className="flex items-center gap-3">
              <img src="/favicon.svg" alt="" className="w-8 h-8 rounded-lg opacity-80" />
              <div>
                <div className="text-sm font-semibold opacity-90">School Bezetting</div>
                <div className="text-xs text-blue-200">door Design Pixels</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureItem({ icon: Icon, title, text }) {
  return (
    <div className="flex gap-3">
      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-5 h-5 text-blue-200" />
      </div>
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-blue-200 text-sm leading-snug">{text}</div>
      </div>
    </div>
  )
}
