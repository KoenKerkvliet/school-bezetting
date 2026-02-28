import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import UserManagementPage from './UserManagementPage'
import SchoolManagementPage from './SchoolManagementPage'
import * as organizationService from '../services/organizationService'

export default function AdminDashboard({ onBack, onNavigateToUserDetail }) {
  const { role, organizationId, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Only admins can access
  if (role !== 'Admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 font-medium">Je hebt geen toegang tot het admin panel.</p>
      </div>
    )
  }

  useEffect(() => {
    const loadOrganization = async () => {
      try {
        setLoading(true)
        const org = await organizationService.getOrganizationWithStats(organizationId)
        setOrganization(org)
        setError('')
      } catch (err) {
        setError(err.message)
        console.error('Error loading organization:', err)
      } finally {
        setLoading(false)
      }
    }

    if (organizationId) {
      loadOrganization()
    }
  }, [organizationId])

  const handleLogout = async () => {
    try {
      await logout()
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        {organization && <p className="text-gray-600 mt-1">{organization.name}</p>}
      </div>

      <div className="max-w-7xl">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overzicht
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'users'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Gebruikers beheren
          </button>
          <button
            onClick={() => setActiveTab('schools')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'schools'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Scholen beheren
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-600 mt-4">Laden...</p>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats Cards */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Gebruikers</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {organization?.stats?.users || 0}
                      </p>
                    </div>
                    <div className="text-4xl text-blue-600">👥</div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Medewerkers</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {organization?.stats?.staff || 0}
                      </p>
                    </div>
                    <div className="text-4xl text-green-600">👨‍🏫</div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Groepen</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {organization?.stats?.groups || 0}
                      </p>
                    </div>
                    <div className="text-4xl text-purple-600">📚</div>
                  </div>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-bold text-blue-900 mb-2">Welkom in het Admin Panel</h3>
              <p className="text-blue-800 text-sm">
                Hier kun je gebruikers beheren, rollen toewijzen en je organisatie instellingen aanpassen.
                Ga naar het tabblad "Gebruikers beheren" om nieuwe accounts aan te maken.
              </p>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && <UserManagementPage onNavigateToUserDetail={onNavigateToUserDetail} />}

        {/* Schools Tab */}
        {activeTab === 'schools' && <SchoolManagementPage />}
      </div>
    </div>
  )
}
