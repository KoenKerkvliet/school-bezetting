import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ClipboardList, RefreshCw, AlertCircle, Search, Filter, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAuditLogs, clearAuditLogs, cleanupOldAuditLogs } from '../services/userService';
import { isSuperAdmin } from '../utils/roles';

const PAGE_SIZE = 50;

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
  const { organizationId, role, orgSettings } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const cleanupDoneRef = useRef(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const loadLogs = useCallback(async (targetPage = 0) => {
    if (!organizationId) return;
    try {
      setLoading(true);
      setError('');

      // Auto-cleanup: run once per session
      if (!cleanupDoneRef.current) {
        cleanupDoneRef.current = true;
        const retentionMonths = orgSettings.logbookRetentionMonths || 3;
        // Fire and forget — don't block page load
        cleanupOldAuditLogs(organizationId, retentionMonths).catch(() => {});
      }

      const result = await getAuditLogs(organizationId, { page: targetPage, pageSize: PAGE_SIZE });
      setLogs(result.data);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error('Error loading audit logs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organizationId, orgSettings.logbookRetentionMonths]);

  useEffect(() => {
    loadLogs(page);
  }, [page, loadLogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [searchTerm, filterAction]);

  const handleClearLogs = async () => {
    if (!organizationId) return;
    try {
      setClearing(true);
      await clearAuditLogs(organizationId);
      setShowClearConfirm(false);
      setPage(0);
      await loadLogs(0);
    } catch (err) {
      console.error('Error clearing audit logs:', err);
      setError(err.message);
    } finally {
      setClearing(false);
    }
  };

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

  // Client-side filter on current page
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Logboek</h1>
        <div className="flex items-center gap-2">
          {isSuperAdmin(role) && (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={loading || totalCount === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Logboek wissen</span>
            </button>
          )}
          <button
            onClick={() => loadLogs(page)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Vernieuwen
          </button>
        </div>
      </div>

      {/* Clear confirmation dialog */}
      {showClearConfirm && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">
                Weet je zeker dat je het volledige logboek wilt wissen?
              </p>
              <p className="text-sm text-red-600 mt-1">
                Alle {totalCount} logboekregels worden permanent verwijderd. Dit kan niet ongedaan worden.
              </p>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={handleClearLogs}
                  disabled={clearing}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {clearing ? 'Bezig met wissen...' : 'Ja, alles wissen'}
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  disabled={clearing}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
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

          {/* Pagination footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {totalCount} {totalCount === 1 ? 'regel' : 'regels'} totaal
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>

                <span className="text-sm text-gray-600 min-w-[100px] text-center">
                  Pagina {page + 1} van {totalPages}
                </span>

                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
