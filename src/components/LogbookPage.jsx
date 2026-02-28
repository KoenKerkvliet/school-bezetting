import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ClipboardList, RefreshCw, AlertCircle, Search, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAuditLogs } from '../services/userService';

// Human-readable action labels (Dutch)
const ACTION_LABELS = {
  // Staff
  ADD_STAFF: 'Medewerker toegevoegd',
  UPDATE_STAFF: 'Medewerker bijgewerkt',
  DELETE_STAFF: 'Medewerker verwijderd',
  // Groups
  ADD_GROUP: 'Groep toegevoegd',
  UPDATE_GROUP: 'Groep bijgewerkt',
  DELETE_GROUP: 'Groep verwijderd',
  // Units
  ADD_UNIT: 'Unit toegevoegd',
  UPDATE_UNIT: 'Unit bijgewerkt',
  DELETE_UNIT: 'Unit verwijderd',
  // Absences
  ADD_ABSENCE: 'Afwezigheid toegevoegd',
  DELETE_ABSENCE: 'Afwezigheid verwijderd',
  ADD_TIME_ABSENCE: 'Tijdelijke afwezigheid toegevoegd',
  DELETE_TIME_ABSENCE: 'Tijdelijke afwezigheid verwijderd',
  // Assignments
  ADD_STAFF_DATE_ASSIGNMENT: 'Vervanging ingepland',
  DELETE_STAFF_DATE_ASSIGNMENT: 'Vervanging verwijderd',
  DELETE_STAFF_DATE_ASSIGNMENTS_BY_DATE_AND_STAFF: 'Vervangingen verwijderd',
  // Users
  UPDATE_USER_ROLE: 'Gebruikersrol gewijzigd',
  DELETE_USER: 'Gebruiker verwijderd',
  DISABLE_USER: 'Gebruiker uitgeschakeld',
  UPDATE_USER_ORGANIZATION: 'Gebruiker verplaatst naar andere school',
};

// Resource type labels
const RESOURCE_TYPE_LABELS = {
  staff: 'Medewerker',
  group: 'Groep',
  unit: 'Unit',
  absence: 'Afwezigheid',
  time_absence: 'Tijdelijke afwezigheid',
  assignment: 'Vervanging',
  user: 'Gebruiker',
};

// Color for action types
function getActionColor(action) {
  if (action?.startsWith('ADD_') || action?.startsWith('CREATE_')) return 'bg-green-100 text-green-700';
  if (action?.startsWith('UPDATE_')) return 'bg-blue-100 text-blue-700';
  if (action?.startsWith('DELETE_') || action?.startsWith('DISABLE_')) return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-700';
}

export default function LogbookPage() {
  const { organizationId } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const loadLogs = useCallback(async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      setError('');
      const data = await getAuditLogs(organizationId, 500);
      setLogs(data);
    } catch (err) {
      console.error('Error loading audit logs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const getUserName = (log) => {
    if (log.users) {
      const name = [log.users.first_name, log.users.last_name].filter(Boolean).join(' ');
      return name || log.users.email || 'Onbekend';
    }
    return 'Systeem';
  };

  const getActionLabel = (action) => {
    return ACTION_LABELS[action] || action;
  };

  const getChangesDescription = (log) => {
    if (!log.changes) return null;
    const changes = typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes;

    const parts = [];
    if (changes.name) parts.push(`Naam: ${changes.name}`);
    if (changes.staffName) parts.push(`Medewerker: ${changes.staffName}`);
    if (changes.groupName) parts.push(`Groep: ${changes.groupName}`);
    if (changes.reason) parts.push(`Reden: ${changes.reason}`);
    if (changes.date) parts.push(`Datum: ${changes.date}`);
    if (changes.newRole) parts.push(`Nieuwe rol: ${changes.newRole}`);
    if (changes.startTime && changes.endTime) parts.push(`Tijd: ${changes.startTime} - ${changes.endTime}`);

    return parts.length > 0 ? parts.join(' | ') : null;
  };

  const formatTimestamp = (timestamp) => {
    try {
      return format(new Date(timestamp), "d MMM yyyy 'om' HH:mm", { locale: nl });
    } catch {
      return timestamp;
    }
  };

  // Get unique action types for filter dropdown
  const uniqueActions = [...new Set(logs.map(l => l.action))].sort();

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' ||
      getUserName(log).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getActionLabel(log.action).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (getChangesDescription(log) || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterAction === 'all' || log.action === filterAction;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Logboek</h1>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Vernieuwen
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Zoeken in logboek..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
          >
            <option value="all">Alle acties</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{getActionLabel(action)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-4">Logboek laden...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center text-gray-500">
          <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">
            {searchTerm || filterAction !== 'all'
              ? 'Geen resultaten gevonden'
              : 'Nog geen activiteit gelogd'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tijdstip</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Gebruiker</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actie</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatTimestamp(log.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium whitespace-nowrap">
                      {getUserName(log)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {getChangesDescription(log) && (
                        <span className="text-gray-500">{getChangesDescription(log)}</span>
                      )}
                      {log.resource_type && !getChangesDescription(log) && (
                        <span className="text-gray-400 italic">
                          {RESOURCE_TYPE_LABELS[log.resource_type] || log.resource_type}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer with count */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'regel' : 'regels'}
            {filteredLogs.length !== logs.length && ` (van ${logs.length} totaal)`}
          </div>
        </div>
      )}
    </div>
  );
}
