import React, { useState } from 'react'
import { Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { isAdminOrAbove } from '../utils/roles'
import GradeLevelScheduleEditor from './GradeLevelScheduleEditor'
import SchoolClosureEditor from './SchoolClosureEditor'
import AdminDashboard from './AdminDashboard'

export default function SettingsPage({ onNavigateToUserDetail }) {
  const { role } = useAuth()
  const [activeTab, setActiveTab] = useState('schedules')

  if (!isAdminOrAbove(role)) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 font-medium">Je hebt geen toegang tot de instellingen.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-7 h-7 text-gray-700" />
        <h1 className="text-3xl font-bold text-gray-900">Instellingen</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('schedules')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'schedules'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Lestijden per leerjaar
        </button>
        <button
          onClick={() => setActiveTab('closures')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'closures'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Vakanties & vrije dagen
        </button>
      </div>

      {/* Tab content */}
      <div className="space-y-10">
        <section>
          {activeTab === 'schedules' && <GradeLevelScheduleEditor />}
          {activeTab === 'closures' && <SchoolClosureEditor />}
        </section>

        {/* Admin Section */}
        <section className="border-t border-gray-200 pt-10">
          <AdminDashboard
            embedded
            onNavigateToUserDetail={onNavigateToUserDetail}
          />
        </section>
      </div>
    </div>
  )
}
