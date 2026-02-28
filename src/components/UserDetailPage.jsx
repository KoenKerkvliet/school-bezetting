import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Shield, Building2, Lock, AlertTriangle, X, Archive, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as userService from '../services/userService';
import * as organizationService from '../services/organizationService';
import { resetPassword } from '../services/authService';

export default function UserDetailPage({ userId, onBack }) {
  const { organizationId, user: currentUser } = useAuth();
  const [userDetail, setUserDetail] = useState(null);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState('');

  const [selectedRole, setSelectedRole] = useState('');
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleSuccess, setRoleSuccess] = useState('');

  const [selectedSchool, setSelectedSchool] = useState('');
  const [schoolLoading, setSchoolLoading] = useState(false);
  const [schoolSuccess, setSchoolSuccess] = useState('');

  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Archive state
  const [archiveLoading, setArchiveLoading] = useState(false);

  const roles = ['Admin', 'Editor', 'Viewer'];

  // Load user and schools
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [user, schoolList] = await Promise.all([
          userService.getUser(userId),
          organizationService.listOrganizations(),
        ]);
        setUserDetail(user);
        setSchools(schoolList);
        setFirstName(user.first_name || '');
        setLastName(user.last_name || '');
        setSelectedRole(user.role || 'Viewer');
        setSelectedSchool(user.organization_id || '');
        setError('');
      } catch (err) {
        setError(err.message);
        console.error('Error loading user details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) loadData();
  }, [userId]);

  const schoolMap = Object.fromEntries(schools.map((s) => [s.id, s]));
  const getSchoolName = (orgId) => schoolMap[orgId]?.name || 'Onbekend';

  // Handle name update
  const handleNameSave = async () => {
    try {
      setNameLoading(true);
      setNameSuccess('');
      setError('');
      const updated = await userService.updateUserName(userId, firstName, lastName, userDetail.organization_id);
      setUserDetail({ ...userDetail, first_name: firstName, last_name: lastName });
      setNameSuccess('Naam opgeslagen');
      setTimeout(() => setNameSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setNameLoading(false);
    }
  };

  // Handle role update
  const handleRoleSave = async () => {
    try {
      setRoleLoading(true);
      setRoleSuccess('');
      setError('');
      await userService.updateUserRole(userId, selectedRole, userDetail.organization_id);
      setUserDetail({ ...userDetail, role: selectedRole });
      setRoleSuccess('Rol opgeslagen');
      setTimeout(() => setRoleSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setRoleLoading(false);
    }
  };

  // Handle school update
  const handleSchoolSave = async () => {
    try {
      setSchoolLoading(true);
      setSchoolSuccess('');
      setError('');
      await userService.updateUserOrganization(userId, selectedSchool, userDetail.organization_id);
      setUserDetail({ ...userDetail, organization_id: selectedSchool });
      setSchoolSuccess('School opgeslagen');
      setTimeout(() => setSchoolSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSchoolLoading(false);
    }
  };

  // Handle password reset
  const handlePasswordReset = async () => {
    try {
      setResetLoading(true);
      setResetSuccess('');
      setResetError('');
      await resetPassword(userDetail.email);
      setResetSuccess('Wachtwoord reset email verstuurd naar ' + userDetail.email);
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  // Handle archive (disable)
  const handleArchive = async () => {
    if (!window.confirm('Weet je zeker dat je deze gebruiker wilt archiveren? De gebruiker kan dan niet meer inloggen.')) return;
    try {
      setArchiveLoading(true);
      setError('');
      await userService.disableUser(userId, userDetail.organization_id);
      setUserDetail({ ...userDetail, email_verified_at: null });
    } catch (err) {
      setError(err.message);
    } finally {
      setArchiveLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (deleteConfirmText !== 'VERWIJDER') return;
    try {
      setDeleteLoading(true);
      setError('');
      await userService.deleteUser(userId, userDetail.organization_id);
      onBack();
    } catch (err) {
      setError(err.message);
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-600 mt-4">Gebruiker laden...</p>
      </div>
    );
  }

  if (!userDetail) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Gebruiker niet gevonden</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">Terug</button>
      </div>
    );
  }

  const isOwnAccount = userId === currentUser?.id;
  const fullName = [userDetail.first_name, userDetail.last_name].filter(Boolean).join(' ') || 'Onbekend';

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back button + header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gebruiker bewerken</h1>
          <p className="text-gray-500 text-sm">{fullName} — {userDetail.email}</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Name Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-800">Naam</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voornaam</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={nameLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Achternaam</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={nameLoading}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleNameSave}
              disabled={nameLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {nameLoading ? 'Bezig...' : 'Naam opslaan'}
            </button>
            {nameSuccess && <span className="text-green-600 text-sm font-medium">{nameSuccess}</span>}
          </div>
        </div>

        {/* Role Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-800">Rol</h3>
          </div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={roleLoading}
          >
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleRoleSave}
              disabled={roleLoading || selectedRole === userDetail.role}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {roleLoading ? 'Bezig...' : 'Rol opslaan'}
            </button>
            {roleSuccess && <span className="text-green-600 text-sm font-medium">{roleSuccess}</span>}
          </div>
        </div>

        {/* School Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-800">School</h3>
          </div>
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={schoolLoading}
          >
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSchoolSave}
              disabled={schoolLoading || selectedSchool === userDetail.organization_id}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {schoolLoading ? 'Bezig...' : 'School opslaan'}
            </button>
            {schoolSuccess && <span className="text-green-600 text-sm font-medium">{schoolSuccess}</span>}
          </div>
        </div>

        {/* Password Reset Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-800">Wachtwoord resetten</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Stuur een wachtwoord reset email naar <strong>{userDetail.email}</strong>.
            De gebruiker kan dan een nieuw wachtwoord instellen.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePasswordReset}
              disabled={resetLoading}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white rounded-lg font-medium transition-colors"
            >
              {resetLoading ? 'Bezig...' : 'Reset email versturen'}
            </button>
            {resetSuccess && <span className="text-green-600 text-sm font-medium">{resetSuccess}</span>}
            {resetError && <span className="text-red-600 text-sm font-medium">{resetError}</span>}
          </div>
        </div>

        {/* Danger Zone */}
        {!isOwnAccount && (
          <div className="bg-white rounded-lg shadow border-2 border-red-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-semibold text-red-700">Gevarenzone</h3>
            </div>

            <div className="space-y-4">
              {/* Archive */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Gebruiker archiveren</p>
                  <p className="text-sm text-gray-600">De gebruiker kan niet meer inloggen, maar gegevens blijven bewaard.</p>
                </div>
                <button
                  onClick={handleArchive}
                  disabled={archiveLoading || !userDetail.email_verified_at}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg font-medium transition-colors"
                >
                  <Archive className="w-4 h-4" />
                  {archiveLoading ? 'Bezig...' : userDetail.email_verified_at ? 'Archiveren' : 'Al gearchiveerd'}
                </button>
              </div>

              {/* Delete */}
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Gebruiker verwijderen</p>
                  <p className="text-sm text-gray-600">Permanent verwijderen. Dit kan niet ongedaan worden.</p>
                </div>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Verwijderen
                </button>
              </div>
            </div>
          </div>
        )}

        {isOwnAccount && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              Dit is jouw eigen account. Ga naar <strong>Profiel</strong> om je eigen wachtwoord te wijzigen of account te verwijderen.
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-bold text-gray-900">Gebruiker verwijderen</h3>
              </div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-2">
              Je staat op het punt om <strong>{fullName}</strong> ({userDetail.email}) permanent te verwijderen.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Dit verwijdert het account en alle gekoppelde gegevens. Dit kan niet ongedaan worden.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Typ <span className="font-bold text-red-600">VERWIJDER</span> om te bevestigen
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="VERWIJDER"
                disabled={deleteLoading}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors"
                disabled={deleteLoading}
              >
                Annuleren
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmText !== 'VERWIJDER' || deleteLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
              >
                {deleteLoading ? 'Bezig...' : 'Definitief verwijderen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
