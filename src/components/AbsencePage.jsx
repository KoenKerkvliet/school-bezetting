import React, { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Clock, AlertCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function AbsencePage({ onBack }) {
  const { state, dispatch } = useApp();
  const { absences, timeAbsences, staff } = state;
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Create a staff map for quick lookup
  const staffMap = useMemo(() => {
    return Object.fromEntries(staff.map(s => [s.id, s]));
  }, [staff]);

  // Combine and sort all absences (newest first)
  const sortedAbsences = useMemo(() => {
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

    return combined.sort((a, b) => {
      // Newest first
      return new Date(b.sortDate) - new Date(a.sortDate);
    });
  }, [absences, timeAbsences]);

  const getStaffName = (staffId) => {
    return staffMap[staffId]?.name || 'Onbekend';
  };

  const formatDate = (date) => {
    return format(date, 'EEEE d MMMM yyyy', { locale: nl });
  };

  const deleteAbsence = (item) => {
    if (item.type === 'full') {
      dispatch({ type: 'DELETE_ABSENCE', payload: item.id });
    } else {
      dispatch({ type: 'DELETE_TIME_ABSENCE', payload: item.id });
    }
    setConfirmDelete(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
            Terug
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Afwezigheidsoverzicht</h1>
        </div>

        {/* Content */}
        {sortedAbsences.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Geen afwezigheden geregistreerd</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAbsences.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className={`bg-white rounded-lg p-4 border-l-4 ${
                  item.type === 'full'
                    ? 'border-l-red-500'
                    : 'border-l-amber-500'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {getStaffName(item.staff_id)}
                      </h3>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        item.type === 'full'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.type === 'full' ? 'Volledige dag' : 'Gedeeltelijk'}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      {formatDate(item.date)}
                    </p>

                    {item.type === 'partial' && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Clock className="w-4 h-4" />
                        <span>{item.startTime || '—'} tot {item.endTime || '—'}</span>
                      </div>
                    )}

                    <p className="text-sm text-gray-700">
                      <strong>Reden:</strong> {item.reason || 'Geen reden opgegeven'}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="text-xs text-gray-400">
                      {item.type === 'full' ? 'Ziekmeling' : 'Afwezigheid'}
                    </div>
                    <button
                      onClick={() => setConfirmDelete(item)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Delete confirmation */}
                {confirmDelete?.id === item.id && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded flex items-center justify-between">
                    <p className="text-sm text-red-700 font-medium">Verwijderd? Deze actie kan niet ongedaan gemaakt worden.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors"
                      >
                        Annuleren
                      </button>
                      <button
                        onClick={() => deleteAbsence(item)}
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
      </div>
    </div>
  );
}
