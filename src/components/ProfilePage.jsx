import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Building2, Lock, AlertTriangle, X, Pencil, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getOrganization } from '../services/organizationService';
import { updatePasswordWithToken } from '../services/authService';
import { deleteOwnAccount, updateUserName } from '../services/userService';

export default function ProfilePage() {
  const { user, role, userData, organizationId, logout } = useAuth();
  const [schoolName, setSchoolName] = useState(null);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Name edit state
  const [editingName, setEditingName] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const firstName = userData?.first_name || '';
  const lastName = userData?.last_name || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Onbekend';

  useEffect(() => {
    if (!organizationId) return;
    getOrganization(organizationId)
      .then(org => setSchoolName(org.name))
      .catch(err => console.error('Error loading organization:', err));
  }, [organizationId]);

  // Handle name edit
  const startEditingName = () => {
    setEditFirstName(firstName);
    setEditLastName(lastName);
    setEditingName(true);
    setNameError('');
    setNameSuccess('');
  };

  const handleSaveName = async () => {
    const trimFirst = editFirstName.trim();
    const trimLast = editLastName.trim();

    if (!trimFirst && !trimLast) {
      setNameError('Vul minimaal een voornaam of achternaam in');
      return;
    }

    try {
      setNameLoading(true);
      setNameError('');
      await updateUserName(user.id, trimFirst, trimLast, organizationId);
      // Update local auth context
      await updateProfile({ first_name: trimFirst, last_name: trimLast });
      setEditingName(false);
      setNameSuccess('Naam succesvol gewijzigd');
      setTimeout(() => setNameSuccess(''), 3000);
    } catch (err) {
      setNameError(err.message || 'Fout bij het opslaan van de naam');
    } finally {
      setNameLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('Wachtwoord moet minimaal 6 tekens bevatten');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Wachtwoorden komen niet overeen');
      return;
    }

    try {
      setPasswordLoading(true);
      await updatePasswordWithToken(newPassword);
      setPasswordSuccess('Wachtwoord succesvol gewijzigd');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.message || 'Fout bij het wijzigen van wachtwoord');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'VERWIJDER') return;

    try {
      setDeleteLoading(true);
      setDeleteError('');
      await deleteOwnAccount(organizationId);
      // Sign out after deletion
      await logout();
    } catch (err) {
      setDeleteError(err.message || 'Fout bij het verwijderen van account');
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Profiel</h1>

      <div className="space-y-6">
        {/* Profile Info Card */}
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Avatar + Name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      placeholder="Voornaam"
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={nameLoading}
                      autoFocus
                    />
                    <input
                      type="text"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      placeholder="Achternaam"
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={nameLoading}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveName}
                      disabled={nameLoading}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {nameLoading ? 'Opslaan...' : 'Opslaan'}
                    </button>
                    <button
                      onClick={() => { setEditingName(false); setNameError(''); }}
                      disabled={nameLoading}
                      className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Annuleren
                    </button>
                  </div>
                  {nameError && <p className="text-red-600 text-xs">{nameError}</p>}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-gray-800">{fullName}</h2>
                  <button
                    onClick={startEditingName}
                    className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-gray-600"
                    title="Naam bewerken"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              )}
              {nameSuccess && <p className="text-green-600 text-xs mt-1">{nameSuccess}</p>}
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

            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-xs text-gray-500 font-medium">School</div>
                <div className="text-sm text-gray-800">{schoolName || '—'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Password Change Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-800">Wachtwoord wijzigen</h3>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nieuw wachtwoord
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Minimaal 6 tekens"
                disabled={passwordLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bevestig wachtwoord
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Herhaal wachtwoord"
                disabled={passwordLoading}
              />
            </div>

            {passwordError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{passwordError}</p>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm">{passwordSuccess}</p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={passwordLoading || !newPassword || !confirmPassword}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
              >
                {passwordLoading ? 'Bezig...' : 'Wachtwoord opslaan'}
              </button>
            </div>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-lg shadow border-2 border-red-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-red-700">Gevarenzone</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Het verwijderen van je account is permanent en kan niet ongedaan worden gemaakt.
            Al je gegevens worden verwijderd.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Account verwijderen
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-bold text-gray-900">Account verwijderen</h3>
              </div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setDeleteError('');
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Dit is permanent! Je account, profiel en alle gekoppelde gegevens worden verwijderd.
              Je kunt dit niet ongedaan maken.
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

            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                <p className="text-red-700 text-sm">{deleteError}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setDeleteError('');
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors"
                disabled={deleteLoading}
              >
                Annuleren
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'VERWIJDER' || deleteLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
              >
                {deleteLoading ? 'Bezig met verwijderen...' : 'Account definitief verwijderen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
