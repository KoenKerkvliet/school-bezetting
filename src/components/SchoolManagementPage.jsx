import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import * as organizationService from '../services/organizationService'

export default function SchoolManagementPage() {
  const { organizationId } = useAuth()
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingSchoolId, setEditingSchoolId] = useState(null)
  const [editName, setEditName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  })

  // Load schools
  useEffect(() => {
    loadSchools()
  }, [])

  const loadSchools = async () => {
    try {
      setLoading(true)
      const schoolList = await organizationService.listOrganizationsWithStats()
      setSchools(schoolList)
      setError('')
    } catch (err) {
      setError(err.message)
      console.error('Error loading schools:', err)
    } finally {
      setLoading(false)
    }
  }

  // Auto-generate slug from name
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleNameChange = (name) => {
    setFormData({
      name,
      slug: generateSlug(name),
    })
  }

  // Create new school
  const handleCreateSchool = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Vul een schoolnaam in')
      return
    }

    try {
      setLoading(true)
      await organizationService.createOrganization(
        formData.name.trim(),
        formData.slug || generateSlug(formData.name),
        {}
      )

      setFormData({ name: '', slug: '' })
      setShowCreateForm(false)
      await loadSchools()
    } catch (err) {
      setError(err.message || 'Fout bij het aanmaken van school')
    } finally {
      setLoading(false)
    }
  }

  // Start editing
  const startEditing = (school) => {
    setEditingSchoolId(school.id)
    setEditName(school.name)
  }

  // Save edit
  const handleSaveEdit = async (schoolId) => {
    if (!editName.trim()) return

    try {
      setError('')
      await organizationService.updateOrganization(schoolId, {
        name: editName.trim(),
        slug: generateSlug(editName.trim()),
      })
      setEditingSchoolId(null)
      await loadSchools()
    } catch (err) {
      setError(err.message)
    }
  }

  // Delete school
  const handleDeleteSchool = async (schoolId) => {
    try {
      setError('')
      await organizationService.deleteOrganization(schoolId)
      setConfirmDeleteId(null)
      await loadSchools()
    } catch (err) {
      setError(err.message || 'Fout bij het verwijderen van school')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Scholen</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          {showCreateForm ? 'Annuleren' : '+ Nieuwe school'}
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
        <form onSubmit={handleCreateSchool} className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schoolnaam *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="Bijv. De Schatgraver"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug (automatisch)
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-gray-500"
                placeholder="de-schatgraver"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false)
                setFormData({ name: '', slug: '' })
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Bezig...' : 'School aanmaken'}
            </button>
          </div>
        </form>
      )}

      {/* Schools List */}
      {loading && !showCreateForm ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-4">Scholen laden...</p>
        </div>
      ) : schools.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Geen scholen gevonden. Maak een nieuwe school aan.
        </div>
      ) : (
        <div className="space-y-3">
          {schools.map((school) => (
            <div
              key={school.id}
              className={`bg-white rounded-lg shadow p-5 border-l-4 ${
                school.id === organizationId
                  ? 'border-l-blue-500'
                  : 'border-l-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {editingSchoolId === school.id ? (
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="text-lg font-semibold px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(school.id)
                          if (e.key === 'Escape') setEditingSchoolId(null)
                        }}
                      />
                      <button
                        onClick={() => handleSaveEdit(school.id)}
                        className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
                      >
                        Opslaan
                      </button>
                      <button
                        onClick={() => setEditingSchoolId(null)}
                        className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition-colors"
                      >
                        Annuleren
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {school.name}
                      </h3>
                      {school.id === organizationId && (
                        <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-700">
                          Huidige school
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>👥 {school.stats?.users || 0} gebruikers</span>
                    <span>👨‍🏫 {school.stats?.staff || 0} medewerkers</span>
                    <span>📚 {school.stats?.groups || 0} groepen</span>
                  </div>

                  {school.slug && (
                    <p className="text-xs text-gray-400 mt-1">/{school.slug}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  {editingSchoolId !== school.id && (
                    <>
                      <button
                        onClick={() => startEditing(school)}
                        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium transition-colors"
                      >
                        Bewerken
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(school.id)}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded font-medium transition-colors"
                        disabled={school.id === organizationId}
                        title={school.id === organizationId ? 'Je kunt je eigen school niet verwijderen' : 'Verwijderen'}
                      >
                        Verwijderen
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Delete confirmation */}
              {confirmDeleteId === school.id && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded flex items-center justify-between">
                  <p className="text-sm text-red-700 font-medium">
                    Weet je zeker dat je "{school.name}" wilt verwijderen? Alle data van deze school gaat verloren.
                  </p>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors"
                    >
                      Annuleren
                    </button>
                    <button
                      onClick={() => handleDeleteSchool(school.id)}
                      className="px-3 py-1 text-sm rounded bg-red-600 hover:bg-red-700 text-white transition-colors font-medium"
                    >
                      Verwijderen
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-blue-800 text-sm">
          <strong>💡 Info:</strong> Elke school heeft zijn eigen medewerkers, groepen en planning.
          Gebruikers die aan een school gekoppeld zijn, zien alleen de data van die school.
          Je eigen school is gemarkeerd met een blauw label.
        </p>
      </div>
    </div>
  )
}
