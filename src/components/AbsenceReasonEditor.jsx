import React, { useState } from 'react'
import { UserX, Clock, Plus, X, RotateCcw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { DEFAULT_ABSENCE_REASONS, DEFAULT_TIME_ABSENCE_REASONS } from '../context/AppContext'

export default function AbsenceReasonEditor() {
  const { orgSettings, updateOrgSetting } = useAuth()

  const absenceReasons = orgSettings?.absenceReasons?.length > 0
    ? orgSettings.absenceReasons
    : DEFAULT_ABSENCE_REASONS

  const timeAbsenceReasons = orgSettings?.timeAbsenceReasons?.length > 0
    ? orgSettings.timeAbsenceReasons
    : DEFAULT_TIME_ABSENCE_REASONS

  const handleAddReason = (key, currentList, newReason) => {
    const trimmed = newReason.trim()
    if (!trimmed || currentList.includes(trimmed)) return false
    updateOrgSetting(key, [...currentList, trimmed])
    return true
  }

  const handleRemoveReason = (key, currentList, index) => {
    const updated = currentList.filter((_, i) => i !== index)
    updateOrgSetting(key, updated)
  }

  const handleReset = (key, defaults) => {
    updateOrgSetting(key, defaults)
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Afwezigheidsredenen</h2>
        <p className="text-sm text-gray-500 mt-1">
          Beheer de redenen die medewerkers kunnen kiezen bij het melden van afwezigheid.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReasonList
          icon={UserX}
          title="Hele dag afwezig"
          description="Redenen voor een volledige dag afwezigheid (dropdown)."
          reasons={absenceReasons}
          defaults={DEFAULT_ABSENCE_REASONS}
          settingKey="absenceReasons"
          onAdd={handleAddReason}
          onRemove={handleRemoveReason}
          onReset={handleReset}
          accentColor="blue"
        />
        <ReasonList
          icon={Clock}
          title="Tijdelijk afwezig"
          description="Suggesties voor tijdelijke afwezigheid (vrije invoer mogelijk)."
          reasons={timeAbsenceReasons}
          defaults={DEFAULT_TIME_ABSENCE_REASONS}
          settingKey="timeAbsenceReasons"
          onAdd={handleAddReason}
          onRemove={handleRemoveReason}
          onReset={handleReset}
          accentColor="orange"
        />
      </div>
    </div>
  )
}

function ReasonList({ icon: Icon, title, description, reasons, defaults, settingKey, onAdd, onRemove, onReset, accentColor }) {
  const [newReason, setNewReason] = useState('')
  const [error, setError] = useState('')

  const colorClasses = {
    blue: {
      iconBg: 'bg-blue-100 text-blue-600',
      badge: 'bg-blue-50 text-blue-800 border-blue-200',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
    orange: {
      iconBg: 'bg-orange-100 text-orange-600',
      badge: 'bg-orange-50 text-orange-800 border-orange-200',
      button: 'bg-orange-600 hover:bg-orange-700',
    },
  }[accentColor]

  const isDefault = JSON.stringify(reasons) === JSON.stringify(defaults)

  const handleAdd = () => {
    setError('')
    const trimmed = newReason.trim()
    if (!trimmed) return
    if (reasons.includes(trimmed)) {
      setError('Deze reden bestaat al')
      return
    }
    const success = onAdd(settingKey, reasons, trimmed)
    if (success !== false) {
      setNewReason('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorClasses.iconBg}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>
      </div>

      {/* Reason list */}
      <div className="px-5 py-3">
        {reasons.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-2">Geen redenen ingesteld</p>
        ) : (
          <div className="space-y-1.5">
            {reasons.map((reason, index) => (
              <div
                key={`${reason}-${index}`}
                className="flex items-center justify-between group"
              >
                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-sm ${colorClasses.badge}`}>
                  {reason}
                </span>
                <button
                  onClick={() => onRemove(settingKey, reasons, index)}
                  className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Verwijderen"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add new reason */}
      <div className="px-5 py-3 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={newReason}
            onChange={e => { setNewReason(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
            placeholder="Nieuwe reden..."
            className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleAdd}
            disabled={!newReason.trim()}
            className={`px-3 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 ${colorClasses.button}`}
          >
            <Plus className="w-3.5 h-3.5" />
            Toevoegen
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
      </div>

      {/* Reset to defaults */}
      {!isDefault && (
        <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => onReset(settingKey, defaults)}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            Standaardwaarden herstellen
          </button>
        </div>
      )}
    </div>
  )
}
