import React, { useMemo, useState } from 'react';
import { format, parseISO, startOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Clock, AlertCircle, Trash2, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { isPlannerOrAbove } from '../utils/roles';

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function AbsencePage({ onBack, onNavigateToDay }) {
  const { state, dispatch } = useApp();
  const { absences, timeAbsences, staff } = state;
  const { role } = useAuth();
  const canPlan = isPlannerOrAbove(role);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showPast, setShowPast] = useState(true);

  // Create a staff map for quick lookup
  const staffMap = useMemo(() => {
    return Object.fromEntries(staff.map(s => [s.id, s]));
  }, [staff]);

  const today = startOfDay(new Date());

  // Combine and split into current/past
  const { currentAbsences, pastAbsences } = useMemo(() => {
    const combined = [
      ...((absences || []).map(a => ({
        ...a,
        type: 'full',
        date: parseISO(a.date),
        sortDate: a.date,
      }))),
      ...((timeAbsences || []).map(ta => ({
        ...ta,
        type: 'partial',
        date: parseISO(ta.date),
        sortDate: ta.date,
      }))),
    ];

    const current = [];
    const past = [];

    combined.forEach(item => {
      if (startOfDay(item.date) >= today) {
        current.push(item);
      } else {
        past.push(item);
      }
    });

    // Current: nearest first (ascending)
    current.sort((a, b) => new Date(a.sortDate) - new Date(b.sortDate));
    // Past: most recent first (descending)
    past.sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));

    return { currentAbsences: current, pastAbsences: past };
  }, [absences, timeAbsences, today]);

  const getStaffName = (staffId) => {
    return staffMap[staffId]?.name || 'Onbekend';
  };

  const deleteAbsence = (item) => {
    if (item.type === 'full') {
      dispatch({ type: 'DELETE_ABSENCE', payload: item.id });
    } else {
      dispatch({ type: 'DELETE_TIME_ABSENCE', payload: item.id });
    }
    setConfirmDelete(null);
  };

  const totalCount = currentAbsences.length + pastAbsences.length;

  return (
    <div>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-800">Afwezigheidsoverzicht</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalCount} melding{totalCount !== 1 ? 'en' : ''}</p>
        </div>

        {totalCount === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center text-gray-500">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Geen afwezigheden geregistreerd</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Actueel section */}
            {currentAbsences.length > 0 && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-blue-700 mb-2 flex items-center gap-2 px-1">
                  Actueel
                  <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200">
                    {currentAbsences.length}
                  </span>
                </h2>
                <div className="space-y-1.5">
                  {currentAbsences.map(item => (
                    <AbsenceRow
                      key={`${item.type}-${item.id}`}
                      item={item}
                      staffName={getStaffName(item.staff_id)}
                      canPlan={canPlan}
                      confirmDelete={confirmDelete}
                      onConfirmDelete={setConfirmDelete}
                      onDelete={deleteAbsence}
                      onNavigateToDay={onNavigateToDay}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Verlopen section */}
            {pastAbsences.length > 0 && (
              <div>
                <button
                  onClick={() => setShowPast(!showPast)}
                  className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-2 px-1 hover:text-gray-700 transition-colors"
                >
                  Verlopen
                  <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-gray-100 text-gray-500 border border-gray-200">
                    {pastAbsences.length}
                  </span>
                  {showPast ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showPast && (
                  <div className="space-y-1.5">
                    {pastAbsences.map(item => (
                      <AbsenceRow
                        key={`${item.type}-${item.id}`}
                        item={item}
                        staffName={getStaffName(item.staff_id)}
                        canPlan={canPlan}
                        confirmDelete={confirmDelete}
                        onConfirmDelete={setConfirmDelete}
                        onDelete={deleteAbsence}
                        onNavigateToDay={onNavigateToDay}
                        isPast
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AbsenceRow({ item, staffName, canPlan, confirmDelete, onConfirmDelete, onDelete, onNavigateToDay, isPast }) {
  const borderColor =
    item.type === 'full' && item.reason === 'Ziek'
      ? 'border-l-red-500'
      : item.type === 'full'
      ? 'border-l-blue-400'
      : 'border-l-amber-500';

  return (
    <div className={`bg-white rounded-lg border-l-4 ${borderColor} ${isPast ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3 px-3 py-2">
        {/* Left: name + date */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-900 truncate">{staffName}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              item.type === 'full'
                ? item.reason === 'Ziek' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {item.type === 'full' ? (item.reason === 'Ziek' ? 'Ziek' : item.reason || 'Afwezig') : 'Deels'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500">
              {capitalize(format(item.date, 'EEE d MMM yyyy', { locale: nl }))}
            </span>
            {item.type === 'partial' && (
              <span className="text-xs text-orange-600 flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {item.startTime}–{item.endTime}
              </span>
            )}
            {item.type === 'partial' && item.reason && (
              <span className="text-xs text-gray-400 truncate">({item.reason})</span>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => onNavigateToDay && onNavigateToDay(item.date)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Bekijk dag op dashboard"
          >
            <Calendar className="w-3.5 h-3.5" />
          </button>
          {canPlan && (
            <button
              onClick={() => onConfirmDelete(item)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Verwijderen"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete?.id === item.id && confirmDelete?.type === item.type && (
        <div className="px-3 pb-2">
          <div className="p-2 bg-red-50 border border-red-200 rounded flex items-center justify-between">
            <p className="text-xs text-red-700 font-medium">Verwijderen?</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => onConfirmDelete(null)}
                className="px-2.5 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={() => onDelete(item)}
                className="px-2.5 py-1 text-xs rounded bg-red-600 hover:bg-red-700 text-white transition-colors font-medium"
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
