import React from 'react'
import { Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { isAdminOrAbove } from '../utils/roles'
import GradeLevelScheduleEditor from './GradeLevelScheduleEditor'
import AdminDashboard from './AdminDashboard'

export default function SettingsPage({ onNavigateToUserDetail }) {
  const { role } = useAuth()

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
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-7 h-7 text-gray-700" />
        <h1 className="text-3xl font-bold text-gray-900">Instellingen</h1>
      </div>

      {/* Sections */}
      <div className="space-y-10">
        {/* Grade Level Schedules Section */}
        <section>
          <GradeLevelScheduleEditor />
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
