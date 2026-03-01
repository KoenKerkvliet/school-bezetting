import React, { useState } from 'react';
import { Plus, Pencil, Trash2, X, Clock, BookOpen, Layers } from 'lucide-react';
import { useApp, GROUP_COLORS, generateId, DAYS, DAY_LABELS_SHORT, GRADE_LEVELS, getGroupTimesForDay } from '../context/AppContext.jsx';

// ── Default form values ────────────────────────────────────────────────────

const ALL_DAYS_ACTIVE = { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true };

const SHORT_BREAK_PRESETS = {
  vroeg: { start: '10:00', end: '10:15', label: 'Vroege pauze', time: '10:00–10:15' },
  laat:  { start: '10:15', end: '10:30', label: 'Late pauze',   time: '10:15–10:30' },
};

const LONG_BREAK_PRESETS = {
  vroeg: { start: '11:30', end: '12:30', label: 'Vroege TSO', time: '11:30–12:30' },
  laat:  { start: '13:00', end: '14:00', label: 'Late TSO',   time: '13:00–14:00' },
};

function detectBreakType(breakVal, presets, fallback) {
  if (!breakVal) return fallback;
  const key = Object.keys(presets).find(k =>
    presets[k].start === breakVal.start && presets[k].end === breakVal.end
  );
  return key || fallback;
}

const defaultGroupForm = {
  name: '',
  unitId: '',
  gradeLevel: null,
  startTime: '08:30',
  endTime: '15:30',
  shortBreakType: 'laat',
  shortBreak: { start: '10:15', end: '10:30' },
  longBreakType: 'vroeg',
  longBreak: { start: '11:30', end: '12:30' },
  color: GROUP_COLORS[0],
  days: { ...ALL_DAYS_ACTIVE },
};

const defaultUnitForm = { name: '' };

// ── Main page ──────────────────────────────────────────────────────────────

export default function GroupsPage() {
  const { state, dispatch } = useApp();
  const { groups, units } = state;

  const [tab, setTab] = useState('groups'); // 'groups' | 'units'
  const [sortAsc, setSortAsc] = useState(true); // true = A→Z, false = Z→A

  // Group modal state
  const [groupModal, setGroupModal] = useState(null); // null | { mode:'add'|'edit', data }

  // Unit modal state
  const [unitModal, setUnitModal] = useState(null); // null | { mode:'add'|'edit', data }

  // ── Group handlers ──────────────────────────────────────────────────────

  function openAddGroup() {
    setGroupModal({ mode: 'add', data: { ...defaultGroupForm, id: generateId() } });
  }

  function openEditGroup(group) {
    const shortBreakType = group.shortBreakType || detectBreakType(group.shortBreak, SHORT_BREAK_PRESETS, 'laat');
    const longBreakType  = group.longBreakType  || detectBreakType(group.longBreak,  LONG_BREAK_PRESETS,  'vroeg');
    setGroupModal({
      mode: 'edit',
      data: { ...group, days: group.days || { ...ALL_DAYS_ACTIVE }, shortBreakType, longBreakType },
    });
  }

  function saveGroup(data) {
    if (groupModal.mode === 'add') {
      dispatch({ type: 'ADD_GROUP', payload: data });
    } else {
      dispatch({ type: 'UPDATE_GROUP', payload: data });
    }
    setGroupModal(null);
  }

  function deleteGroup(id) {
    if (window.confirm('Weet je zeker dat je deze groep wilt verwijderen?')) {
      dispatch({ type: 'DELETE_GROUP', payload: id });
    }
  }

  // ── Unit handlers ───────────────────────────────────────────────────────

  function openAddUnit() {
    setUnitModal({ mode: 'add', data: { ...defaultUnitForm, id: generateId() } });
  }

  function openEditUnit(unit) {
    setUnitModal({ mode: 'edit', data: { ...unit } });
  }

  function saveUnit(data) {
    if (unitModal.mode === 'add') {
      dispatch({ type: 'ADD_UNIT', payload: data });
    } else {
      dispatch({ type: 'UPDATE_UNIT', payload: data });
    }
    setUnitModal(null);
  }

  function deleteUnit(id) {
    if (window.confirm('Weet je zeker dat je deze unit wilt verwijderen? Groepen worden losgekoppeld.')) {
      dispatch({ type: 'DELETE_UNIT', payload: id });
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Groepen &amp; Units</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Beheer de lesgroepen en units van jouw school
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'groups' && (
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="px-3 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              title={sortAsc ? 'Sorteren: A → Z' : 'Sorteren: Z → A'}
            >
              {sortAsc ? '↑ A–Z' : '↓ Z–A'}
            </button>
          )}
          <button
            onClick={tab === 'groups' ? openAddGroup : openAddUnit}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            {tab === 'groups' ? 'Nieuwe groep' : 'Nieuwe unit'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
        {[
          { id: 'groups', label: 'Groepen', icon: BookOpen, count: groups.length },
          { id: 'units',  label: 'Units',   icon: Layers,   count: units.length },
        ].map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === id ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === id ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Groups tab */}
      {tab === 'groups' && (
        <div>
          {groups.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-10 h-10 text-gray-300" />}
              title="Nog geen groepen"
              description="Maak je eerste lesgroep aan."
              action={{ label: 'Nieuwe groep', onClick: openAddGroup }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...groups].sort((a, b) => {
                const cmp = a.name.localeCompare(b.name, 'nl');
                return sortAsc ? cmp : -cmp;
              }).map(group => {
                const unit = units.find(u => u.id === group.unitId);
                return (
                  <div key={group.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    {/* Color bar */}
                    <div className="h-2" style={{ backgroundColor: group.color }} />
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900">{group.name}</h3>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {group.gradeLevel && (
                              <span className="text-xs text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5 inline-block">
                                Lj {group.gradeLevel}
                              </span>
                            )}
                            {unit && (
                              <span className="text-xs text-blue-600 bg-blue-50 rounded px-1.5 py-0.5 inline-block">
                                {unit.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditGroup(group)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Bewerken"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteGroup(group.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Verwijderen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            {(() => {
                              const mon = getGroupTimesForDay(group, state.gradeLevelSchedules, 'monday');
                              const wed = getGroupTimesForDay(group, state.gradeLevelSchedules, 'wednesday');
                              if (wed.endTime !== mon.endTime) {
                                return `${mon.startTime} – ${mon.endTime} (wo ${wed.endTime})`;
                              }
                              return `${mon.startTime} – ${mon.endTime}`;
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <span className="w-3.5" />
                          <span>
                            {group.shortBreakType
                              ? SHORT_BREAK_PRESETS[group.shortBreakType]?.label
                              : 'Kleine pauze'}
                            {': '}{group.shortBreak.start}–{group.shortBreak.end}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <span className="w-3.5" />
                          <span>
                            {group.longBreakType
                              ? LONG_BREAK_PRESETS[group.longBreakType]?.label
                              : 'Grote pauze'}
                            {': '}{group.longBreak.start}–{group.longBreak.end}
                          </span>
                        </div>
                        <div className="flex gap-1 pt-1">
                          {DAYS.map((day, idx) => {
                            const active = !group.days || group.days[day] !== false;
                            return (
                              <span
                                key={day}
                                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  active ? 'bg-gray-100 text-gray-600' : 'text-gray-300'
                                }`}
                              >
                                {DAY_LABELS_SHORT[idx]}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Units tab */}
      {tab === 'units' && (
        <div>
          {units.length === 0 ? (
            <EmptyState
              icon={<Layers className="w-10 h-10 text-gray-300" />}
              title="Nog geen units"
              description="Maak een unit aan om groepen te bundelen."
              action={{ label: 'Nieuwe unit', onClick: openAddUnit }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {units.map(unit => {
                const unitGroups = groups.filter(g => g.unitId === unit.id);
                return (
                  <div key={unit.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-500" />
                          {unit.name}
                        </h3>
                        <span className="text-xs text-gray-500">{unitGroups.length} groepen</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditUnit(unit)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteUnit(unit.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {unitGroups.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {unitGroups.map(g => (
                          <span
                            key={g.id}
                            className="text-xs rounded-full px-2.5 py-1 text-white font-medium"
                            style={{ backgroundColor: g.color }}
                          >
                            {g.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Geen groepen gekoppeld</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Group modal */}
      {groupModal && (
        <GroupModal
          data={groupModal.data}
          mode={groupModal.mode}
          units={units}
          gradeLevelSchedules={state.gradeLevelSchedules}
          onSave={saveGroup}
          onClose={() => setGroupModal(null)}
        />
      )}

      {/* Unit modal */}
      {unitModal && (
        <UnitModal
          data={unitModal.data}
          mode={unitModal.mode}
          groups={groups}
          onSave={saveUnit}
          onClose={() => setUnitModal(null)}
        />
      )}
    </div>
  );
}

// ── Group Modal ────────────────────────────────────────────────────────────

function GroupModal({ data, mode, units, gradeLevelSchedules, onSave, onClose }) {
  const [form, setForm] = useState(data);
  const [autoPopulated, setAutoPopulated] = useState(false);

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleGradeLevelChange(value) {
    const gl = value ? parseInt(value) : null;
    setForm(f => {
      const updated = { ...f, gradeLevel: gl };
      if (gl) {
        const schedule = (gradeLevelSchedules || []).find(s => s.gradeLevel === gl);
        if (schedule?.schedule?.monday) {
          updated.startTime = schedule.schedule.monday.startTime;
          updated.endTime = schedule.schedule.monday.endTime;
          setAutoPopulated(true);
        }
      } else {
        setAutoPopulated(false);
      }
      return updated;
    });
  }

  function setShortBreakType(type) {
    setForm(f => ({ ...f, shortBreakType: type, shortBreak: { ...SHORT_BREAK_PRESETS[type] } }));
  }

  function setLongBreakType(type) {
    setForm(f => ({ ...f, longBreakType: type, longBreak: { ...LONG_BREAK_PRESETS[type] } }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  }

  return (
    <Modal title={mode === 'add' ? 'Nieuwe groep' : 'Groep bewerken'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Groepsnaam *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="bijv. Groep 4"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            autoFocus
          />
        </div>

        {/* Grade Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Leerjaar</label>
          <select
            value={form.gradeLevel || ''}
            onChange={e => handleGradeLevelChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Geen leerjaar —</option>
            {GRADE_LEVELS.map(gl => (
              <option key={gl} value={gl}>Leerjaar {gl}</option>
            ))}
          </select>
          {autoPopulated && (
            <p className="text-xs text-blue-600 mt-1">Tijden overgenomen van leerjaar {form.gradeLevel}</p>
          )}
        </div>

        {/* Unit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit (optioneel)</label>
          <select
            value={form.unitId || ''}
            onChange={e => set('unitId', e.target.value || null)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Geen unit —</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Days */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Lesdagen</label>
          <div className="flex gap-2">
            {DAYS.map((day, idx) => {
              const active = form.days?.[day] !== false;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, days: { ...(f.days || {}), [day]: !active } }))}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {DAY_LABELS_SHORT[idx]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Short break */}
        <BreakSelector
          label="Kleine pauze"
          value={form.shortBreakType || 'laat'}
          presets={SHORT_BREAK_PRESETS}
          onChange={setShortBreakType}
        />

        {/* Long break / TSO */}
        <BreakSelector
          label="Grote pauze (TSO)"
          value={form.longBreakType || 'vroeg'}
          presets={LONG_BREAK_PRESETS}
          onChange={setLongBreakType}
        />

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Kleur</label>
          <div className="flex flex-wrap gap-2">
            {GROUP_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => set('color', c)}
                className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-600 scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuleren
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
          >
            {mode === 'add' ? 'Aanmaken' : 'Opslaan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Unit Modal ─────────────────────────────────────────────────────────────

function UnitModal({ data, mode, groups, onSave, onClose }) {
  const [form, setForm] = useState(data);

  function toggleGroup(groupId) {
    setForm(f => {
      const groupIds = f.groupIds || [];
      if (groupIds.includes(groupId)) {
        return { ...f, groupIds: groupIds.filter(id => id !== groupId) };
      }
      return { ...f, groupIds: [...groupIds, groupId] };
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({ ...form, groupIds: form.groupIds || [] });
  }

  const selectedGroupIds = form.groupIds || [];

  return (
    <Modal title={mode === 'add' ? 'Nieuwe unit' : 'Unit bewerken'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="bijv. Onderbouw"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Groepen in deze unit</label>
          {groups.length === 0 ? (
            <p className="text-xs text-gray-400">Er zijn nog geen groepen aangemaakt.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {groups.map(g => (
                <label
                  key={g.id}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    selectedGroupIds.includes(g.id)
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.includes(g.id)}
                    onChange={() => toggleGroup(g.id)}
                    className="rounded"
                  />
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: g.color }}
                  />
                  <span className="text-sm">{g.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuleren
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
          >
            {mode === 'add' ? 'Aanmaken' : 'Opslaan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Break selector ─────────────────────────────────────────────────────────

function BreakSelector({ label, value, presets, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(presets).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`flex flex-col items-center px-3 py-2.5 rounded-lg border-2 transition-colors ${
              value === key
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className="font-medium text-sm">{preset.label}</span>
            <span className="text-xs mt-0.5 opacity-75">{preset.time}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Shared components ──────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description, action }) {
  return (
    <div className="text-center py-16">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="font-semibold text-gray-600 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 mb-4">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
