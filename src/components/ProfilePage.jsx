import React from 'react';
import { User, Mail, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user, role, userData } = useAuth();

  const firstName = userData?.first_name || '';
  const lastName = userData?.last_name || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Onbekend';

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Profiel</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Avatar + Name */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{fullName}</h2>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
              {role}
            </span>
          </div>
        </div>

        {/* Info fields */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-xs text-gray-500 font-medium">Email</div>
              <div className="text-sm text-gray-800">{user?.email || '—'}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-xs text-gray-500 font-medium">Rol</div>
              <div className="text-sm text-gray-800">{role || '—'}</div>
            </div>
          </div>
        </div>

        {/* Placeholder notice */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-blue-800 text-sm">
            Deze pagina wordt nog uitgebreid met meer profielinstellingen.
          </p>
        </div>
      </div>
    </div>
  );
}
