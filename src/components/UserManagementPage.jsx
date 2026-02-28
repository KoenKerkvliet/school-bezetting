import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import * as userService from '../services/userService'
import * as organizationService from '../services/organizationService'

export default function UserManagementPage() {
  const { organizationId } = useAuth()
  const [users, setUsers] = useState([])
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [editingSchoolUserId, setEditingSchoolUserId] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'Viewer',
    organizationId: '',
  })

  const roles = ['Admin', 'Editor', 'Viewer']

  // Load users and schools
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [userList, schoolList] = await Promise.all([
          userService.listAllUsers(),
          organizationService.listOrganizations(),
        ])
        setUsers(userList)
        setSchools(schoolList)
        setFormData((prev) => ({ ...prev, organizationId: organizationId || '' }))
        setError('')
      } catch (err) {
        // Fallback: if listAllUsers fails (RLS), try org-scoped
        try {
          const [userList, schoolList] = await Promise.all([
            userService.listOrgUsers(organizationId),
            organizationService.listOrganizations(),
          ])
          setUsers(userList)
          setSchools(schoolList)
          setFormData((prev) => ({ ...prev, organizationId: organizationId || '' }))
          setError('')
        } catch (fallbackErr) {
          setError(fallbackErr.message)
          console.error('Error loading data:', fallbackErr)
        }
      } finally {
        setLoading(false)
      }
    }

    if (organizationId) {
      loadData()
    }
  }, [organizationId])

  // Create school map for quick lookup
  const schoolMap = Object.fromEntries(schools.map((s) => [s.id, s]))

  const getSchoolName = (orgId) => {
    return schoolMap[orgId]?.name || 'Onbekend'
  }

  // Create new user
  const handleCreateUser = async (e) => {
    e.preventDefault()
    setError('')

    const targetOrgId = formData.organizationId || organizationId

    try {
      setLoading(true)
      const schoolName = getSchoolName(targetOrgId)
      const result = await userService.createUser(
        formData.email,
        formData.firstName,
        formData.lastName,
        formData.role,
        targetOrgId,
        schoolName
      )

      setUsers([result.user, ...users])
      setFormData({ email: '', firstName: '', lastName: '', role: 'Viewer', organizationId: organizationId })
      setShowCreateForm(false)

      // Show email status
      if (result.emailSent) {
        setError('')
      } else {
        setError(`Gebruiker aangemaakt, maar uitnodigingsmail niet verstuurd: ${result.emailError || 'Onbekende fout'}`)
      }
    } catch (err) {
      setError(err.message || 'Fout bij het aanmaken van gebruiker')
    } finally {
      setLoading(false)
    }
  }

  // Update user role
  const handleUpdateRole = async (userId, newRole) => {
    try {
      setError('')
      const updatedUser = await userService.updateUserRole(userId, newRole, organizationId)
      setUsers(users.map((u) => (u.id === userId ? updatedUser : u)))
      setEditingUserId(null)
    } catch (err) {
      setError(err.message)
    }
  }

  // Update user organization
  const handleUpdateOrganization = async (userId, newOrgId) => {
    try {
      setError('')
      const updatedUser = await userService.updateUserOrganization(userId, newOrgId, organizationId)
      setUsers(users.map((u) => (u.id === userId ? { ...u, organization_id: newOrgId } : u)))
      setEditingSchoolUserId(null)
    } catch (err) {
      setError(err.message)
    }
  }

  // Delete user
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Weet je zeker dat je deze gebruiker wilt verwijderen?')) {
      return
    }

    try {
      setError('')
      await userService.deleteUser(userId, organizationId)
      setUsers(users.filter((u) => u.id !== userId))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Create User Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gebruikers</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          {showCreateForm ? 'Annuleren' : '+ Nieuwe gebruiker'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateUser} className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email adres *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="gebruiker@school.nl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voornaam
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="Jan"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Achternaam
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="Jansen"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            {/* School selection */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">School *</label>
              <select
                value={formData.organizationId}
                onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}{school.id === organizationId ? ' (huidige school)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Bezig...' : 'Gebruiker aanmaken'}
            </button>
          </div>
        </form>
      )}

      {/* Users List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading && !showCreateForm ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 mt-4">Gebruikers laden...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Geen gebruikers gevonden</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Naam
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    School
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 text-sm">
                      {editingSchoolUserId === user.id ? (
                        <select
                          value={user.organization_id || ''}
                          onChange={(e) => handleUpdateOrganization(user.id, e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                          onBlur={() => setEditingSchoolUserId(null)}
                        >
                          {schools.map((school) => (
                            <option key={school.id} value={school.id}>
                              {school.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div
                          onClick={() => setEditingSchoolUserId(user.id)}
                          className="cursor-pointer inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-medium hover:bg-green-200"
                          title="Klik om school te wijzigen"
                        >
                          {getSchoolName(user.organization_id)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {editingUserId === user.id ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        >
                          {roles.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div
                          onClick={() => setEditingUserId(user.id)}
                          className="cursor-pointer inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium hover:bg-blue-200"
                        >
                          {user.role}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {user.email_verified_at ? (
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          ✓ Geverifieerd
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                          ⏳ In afwachting
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900 font-medium"
                      >
                        Verwijderen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-blue-800 text-sm">
          <strong>💡 Info:</strong> Wanneer je een nieuwe gebruiker aanmaakt, ontvangt deze een email met
          instructies om een wachtwoord in te stellen. Klik op de rol of school om deze aan te passen.
        </p>
      </div>
    </div>
  )
}
