import React, { useState } from 'react';
import { CalendarOff, Plus, Pencil, Trash2, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useApp, generateId } from '../context/AppContext.jsx';

const CLOSURE_TYPES = [
  { value: 'vacation', label: 'Vakantie', badge: 'bg-blue-100 text-blue-700' },
  { value: 'holiday', label: 'Feestdag', badge: 'bg-purple-100 text-purple-700' },
  { value: 'half_day', label: 'Halve dag', badge: 'bg-amber-100 text-amber-700' },
];

function emptyForm() {
  return { name: '', type: 'vacation', startDate: '', endDate: '', freeFromTime: '12:00' };
}

function formatDateNL(dateStr) {
  try {
    return format(parseISO(dateStr), 'd MMM yyyy', { locale: nl });
  } catch {
    return dateStr;
  }
}

export default function SchoolClosureEditor() {
  const { state, dispatch } = useApp();
  const closures = [...(state.schoolClosures || [])].sort((a, b) => a.startDate.localeCompare(b.startDate));

  const [editingId, setEditingId] = useState(null); // null = closed, 'new' = adding, uuid = editing
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState('');

  const startAdding = () => {
    setEditingId('new');
    setForm(emptyForm());
    setError('');
  };

  const startEditing = (closure) => {
    setEditingId(closure.id);
    setForm({
      name: closure.name,
      type: closure.type,
      startDate: closure.startDate,
      endDate: closure.endDate,
      freeFromTime: closure.freeFromTime || '12:00',
    });
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError('');
  };

  const handleSave = () => {
    const name = form.name.trim();
    if (!name) { setError('Vul een naam in'); return; }
    if (!form.startDate) { setError('Vul een startdatum in'); return; }
    if (form.type === 'vacation' && !form.endDate) { setError('Vul een einddatum in'); return; }
    if (form.type === 'vacation' && form.endDate < form.startDate) { setError('Einddatum moet na startdatum liggen'); return; }

    const closure = {
      id: editingId === 'new' ? generateId() : editingId,
      name,
      type: form.type,
      startDate: form.startDate,
      endDate: form.type === 'vacation' ? form.endDate : form.startDate,
      freeFromTime: form.type === 'half_day' ? form.freeFromTime : null,
    };

    if (editingId === 'new') {
      dispatch({ type: 'ADD_SCHOOL_CLOSURE', payload: closure });
    } else {
      dispatch({ type: 'UPDATE_SCHOOL_CLOSURE', payload: closure });
    }
    cancelEdit();
  };

  const handleDelete = (id) => {
    dispatch({ type: 'DELETE_SCHOOL_CLOSURE', payload: id });
  };

  const typeMeta = (type) => CLOSURE_TYPES.find(t => t.value === type) || CLOSURE_TYPES[0];

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <CalendarOff className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">Vakanties & vrije dagen</h2>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Beheer schoolvakanties, feestdagen en halve dagen. Deze dagen worden op het dashboard gemarkeerd.
      </p>

      {/* Add button */}
      {!editingId && (
        <button
          onClick={startAdding}
          className="mb-6 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Toevoegen
        </button>
      )}

      {/* Inline form */}
      {editingId && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">
              {editingId === 'new' ? 'Nieuwe vrije dag' : 'Bewerken'}
            </h3>
            <button onClick={cancelEdit} className="p-1 hover:bg-gray-100 rounded transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="bijv. Kerstvakantie, Koningsdag, Studiemiddag"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <div className="flex gap-2">
              {CLOSURE_TYPES.map(ct => (
                <button
                  key={ct.value}
                  onClick={() => setForm({ ...form, type: ct.value })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    form.type === ct.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.type === 'vacation' ? 'Startdatum' : 'Datum'}
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {form.type === 'vacation' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Einddatum</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm({ ...form, endDate: e.target.value })}
                  min={form.startDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {form.type === 'half_day' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vrij vanaf</label>
                <input
                  type="time"
                  value={form.freeFromTime}
                  onChange={e => setForm({ ...form, freeFromTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Opslaan
            </button>
            <button
              onClick={cancelEdit}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Closures list */}
      {closures.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <CalendarOff className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Nog geen vrije dagen ingepland</p>
          <p className="text-gray-400 text-xs mt-1">Klik op "Toevoegen" om vakanties, feestdagen of halve dagen toe te voegen.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Naam</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Periode</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700 w-24">Acties</th>
                </tr>
              </thead>
              <tbody>
                {closures.map((closure, idx) => {
                  const meta = typeMeta(closure.type);
                  let periodStr;
                  if (closure.type === 'vacation') {
                    periodStr = `${formatDateNL(closure.startDate)} – ${formatDateNL(closure.endDate)}`;
                  } else if (closure.type === 'half_day') {
                    periodStr = `${formatDateNL(closure.startDate)}, vrij vanaf ${closure.freeFromTime || '12:00'}`;
                  } else {
                    periodStr = formatDateNL(closure.startDate);
                  }

                  return (
                    <tr
                      key={closure.id}
                      className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-800">{closure.name}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${meta.badge}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{periodStr}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEditing(closure)}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-500 hover:text-gray-700"
                            title="Bewerken"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(closure.id)}
                            className="p-1.5 hover:bg-red-50 rounded transition-colors text-gray-400 hover:text-red-600"
                            title="Verwijderen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
