import React, { useState, useRef, useEffect } from 'react';
import { format, parseISO, isSameDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  Plus, Pencil, Trash2, X, UserX, CalendarX,
  CheckCircle, User, ChevronDown, ChevronUp, Clock, MoreVertical,
} from 'lucide-react';
import {
  useApp, DAYS, DAY_LABELS_NL, DAY_LABELS_SHORT,
  ROLES, ABSENCE_REASONS, TIME_ABSENCE_REASONS, generateId,
} from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { isPlannerOrAbove, isAdminOrAbove } from '../utils/roles';

// ── Defaults ───────────────────────────────────────────────────────────────

function makeEmptySchedule() {
  const s = {};
  DAYS.forEach(d => { s[d] = { type: 'none' }; });
  return s;
}

const defaultStaffForm = {
  name: '',
  role: ROLES[0],
  schedule: makeEmptySchedule(),
};

const defaultAbsenceForm = {
  date: format(new Date(), 'yyyy-MM-dd'),
  reason: ABSENCE_REASONS[0],
};

const defaultTimeAbsenceForm = {
  date: format(new Date(), 'yyyy-MM-dd'),
  startTime: '09:00',
  endTime: '10:00',
  reason: '',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function scheduleLabel(daySchedule, groups, units) {
  if (!daySchedule || daySchedule.type === 'none') return { text: '—', color: 'text-gray-400' };
  if (daySchedule.type === 'vrij')      return { text: 'Vrij',     color: 'text-gray-400' };

  const timeStr = (daySchedule.startTime && daySchedule.endTime)
    ? ` (${daySchedule.startTime}–${daySchedule.endTime})`
    : '';

  if (daySchedule.type === 'ambulant')  return { text: 'Ambulant' + timeStr, color: 'text-purple-600' };
  if (daySchedule.type === 'group') {
    const g = groups.find(x => x.id === daySchedule.groupId);
    return { text: (g ? g.name : '?') + timeStr, color: 'text-green-700' };
  }
  if (daySchedule.type === 'unit') {
    const u = units.find(x => x.id === daySchedule.unitId);
    return { text: (u ? `Unit: ${u.name}` : 'Unit') + timeStr, color: 'text-blue-700' };
  }
  return { text: '—', color: 'text-gray-400' };
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function StaffPage() {
  const { state, dispatch } = useApp();
  const { staff, groups, units, absences, timeAbsences } = state;
  const { role } = useAuth();
  const canPlan = isPlannerOrAbove(role);
  const isAdmin = isAdminOrAbove(role);

  const [staffModal, setStaffModal] = useState(null);
  const [absenceModal, setAbsenceModal] = useState(null);
  const [timeAbsenceModal, setTimeAbsenceModal] = useState(null);
  const [expandedStaff, setExpandedStaff] = useState(null);
  const [openMenu, setOpenMenu] = useState(null); // staff id whose menu is open

  // ── Staff handlers ──────────────────────────────────────────────────────

  function openAddStaff() {
    setStaffModal({ mode: 'add', data: { ...defaultStaffForm, id: generateId(), schedule: makeEmptySchedule() } });
  }

  function openEditStaff(member) {
    // Deep clone schedule
    const schedule = {};
    DAYS.forEach(d => {
      schedule[d] = member.schedule?.[d] ? { ...member.schedule[d] } : { type: 'none' };
    });
    setStaffModal({ mode: 'edit', data: { ...member, schedule } });
  }

  function saveStaff(data) {
    if (staffModal.mode === 'add') {
      dispatch({ type: 'ADD_STAFF', payload: data });
    } else {
      dispatch({ type: 'UPDATE_STAFF', payload: data });
    }
    setStaffModal(null);
  }

  function deleteStaff(id) {
    if (window.confirm('Weet je zeker dat je deze collega wilt verwijderen?')) {
      dispatch({ type: 'DELETE_STAFF', payload: id });
    }
  }

  // ── Absence handlers ────────────────────────────────────────────────────

  function openAbsenceModal(staffId) {
    setAbsenceModal({
      staffId,
      data: { ...defaultAbsenceForm, id: generateId() },
    });
  }

  function saveAbsence() {
    const { staffId, data } = absenceModal;
    dispatch({
      type: 'ADD_ABSENCE',
      payload: { ...data, staff_id: staffId },
    });
    setAbsenceModal(null);
  }

  function deleteAbsence(id) {
    dispatch({ type: 'DELETE_ABSENCE', payload: id });
  }

  // ── Upcoming absences for a staff member ────────────────────────────────
  function getAbsences(staffId) {
    return absences
      .filter(a => a.staff_id === staffId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  function getTimeAbsencesForStaff(staffId) {
    return (timeAbsences || [])
      .filter(a => a.staff_id === staffId)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }

  // ── Time absence handlers ────────────────────────────────────────────────
  function openTimeAbsenceModal(staffId) {
    setTimeAbsenceModal({
      staffId,
      data: { ...defaultTimeAbsenceForm, id: generateId() },
    });
  }

  function saveTimeAbsence() {
    const { staffId, data } = timeAbsenceModal;
    dispatch({ type: 'ADD_TIME_ABSENCE', payload: { ...data, staff_id: staffId } });
    setTimeAbsenceModal(null);
  }

  function deleteTimeAbsence(id) {
    dispatch({ type: 'DELETE_TIME_ABSENCE', payload: id });
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Collega's</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Beheer roosters en uitroosteringen
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openAddStaff}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Nieuwe collega
          </button>
        )}
      </div>

      {/* Staff list */}
      {staff.length === 0 ? (
        <div className="text-center py-16">
          <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-600 mb-1">Nog geen collega's</h3>
          <p className="text-sm text-gray-400 mb-4">Voeg je eerste collega toe.</p>
          {isAdmin && (
            <button
              onClick={openAddStaff}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Nieuwe collega
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {[
            { label: 'Leerkrachten', roles: ['Leerkracht'], color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
            { label: 'Onderwijsondersteuners', roles: ['Onderwijsondersteuner', 'Onderwijs Ondersteuner'], color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
            { label: 'Onderwijsassistenten', roles: ['Onderwijsassistent'], color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
            { label: 'MT & Staf', roles: ['Directie', 'MT', 'Intern Begeleider', 'Conciërge'], color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
            { label: 'Overige collega\'s', roles: ['Overig'], color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' },
          ].map(section => {
            const sectionStaff = [...staff]
              .filter(s => section.roles.includes(s.role))
              .sort((a, b) => a.name.localeCompare(b.name, 'nl'));
            if (sectionStaff.length === 0) return null;
            return (
              <div key={section.label}>
                <div className={`flex items-center gap-2 mb-3 px-1`}>
                  <h2 className={`text-sm font-bold uppercase tracking-wide ${section.color}`}>{section.label}</h2>
                  <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${section.bg} ${section.color} ${section.border} border`}>{sectionStaff.length}</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {sectionStaff.map(member => {
            const memberAbsences = getAbsences(member.id);
            const memberTimeAbsences = getTimeAbsencesForStaff(member.id);
            const isExpanded = expandedStaff === member.id;
            const hasExpandable = memberAbsences.length > 0 || memberTimeAbsences.length > 0;
            const todayAbsent = absences.some(a =>
              a.staffId === member.id && isSameDay(parseISO(a.date), new Date())
            );
            const isMenuOpen = openMenu === member.id;

            // Border color per role
            const borderColor =
              member.role === 'Leerkracht' ? 'border-l-blue-500' :
              (member.role === 'Onderwijsondersteuner' || member.role === 'Onderwijs Ondersteuner') ? 'border-l-green-500' :
              member.role === 'Onderwijsassistent' ? 'border-l-yellow-500' :
              'border-l-gray-300';

            // Compact schedule string
            const scheduleStr = DAYS.map((day, i) => {
              const { text } = scheduleLabel(member.schedule?.[day], groups, units);
              return `${DAY_LABELS_SHORT[i]}: ${text}`;
            }).join('  ·  ');

            return (
              <div
                key={member.id}
                className={`bg-white rounded-xl border border-l-4 shadow-sm transition-all ${borderColor} ${
                  todayAbsent ? 'border-t-amber-300 border-r-amber-300 border-b-amber-300' : 'border-t-gray-200 border-r-gray-200 border-b-gray-200'
                }`}
              >
                {/* Staff card */}
                <div className="px-4 py-3 relative">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mt-0.5 ${
                      todayAbsent ? 'bg-amber-400' : 'bg-blue-500'
                    }`}>
                      {member.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </div>

                    {/* Name + schedule */}
                    <div className="flex-1 min-w-0 pr-8">
                      {/* Line 1: Name + optional badges */}
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-semibold text-gray-900 truncate">{member.name}</span>
                        {todayAbsent && (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-medium flex-shrink-0">
                            <UserX className="w-3 h-3" />
                            Afwezig
                          </span>
                        )}
                        {hasExpandable && !todayAbsent && (
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {[
                              memberAbsences.length > 0 ? `${memberAbsences.length}x` : null,
                              memberTimeAbsences.length > 0 ? `${memberTimeAbsences.length} uur` : null,
                            ].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </div>

                      {/* Line 2: Compact weekly schedule */}
                      <div className="text-xs text-gray-500 mt-1 truncate" title={scheduleStr}>
                        {DAYS.map((day, i) => {
                          const { text, color } = scheduleLabel(member.schedule?.[day], groups, units);
                          return (
                            <span key={day}>
                              {i > 0 && <span className="text-gray-300 mx-1">·</span>}
                              <span className="text-gray-400">{DAY_LABELS_SHORT[i]}</span>{' '}
                              <span className={`font-medium ${color}`}>{text}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Menu button (top-right) */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5">
                      {hasExpandable && (
                        <button
                          onClick={() => setExpandedStaff(isExpanded ? null : member.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Afwezigheden tonen"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                      {canPlan && (
                        <StaffMenu
                          memberId={member.id}
                          isOpen={isMenuOpen}
                          onToggle={() => setOpenMenu(isMenuOpen ? null : member.id)}
                          onClose={() => setOpenMenu(null)}
                          onAbsence={() => { openAbsenceModal(member.id); setOpenMenu(null); }}
                          onTimeAbsence={() => { openTimeAbsenceModal(member.id); setOpenMenu(null); }}
                          onEdit={isAdmin ? () => { openEditStaff(member); setOpenMenu(null); } : null}
                          onDelete={isAdmin ? () => { deleteStaff(member.id); setOpenMenu(null); } : null}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded: absences + time absences */}
                {isExpanded && hasExpandable && (
                  <div className="border-t border-gray-100">
                    {/* Full-day absences */}
                    {memberAbsences.length > 0 && (
                      <div className="px-4 py-3 bg-gray-50">
                        <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                          <CalendarX className="w-3 h-3" />
                          Afwezigheidsdagen
                        </h4>
                        <div className="space-y-1.5">
                          {memberAbsences.map(a => (
                            <div key={a.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-800">
                                  {capitalize(format(parseISO(a.date), 'EEEE d MMMM yyyy', { locale: nl }))}
                                </span>
                                <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                                  a.reason === 'Ziek'
                                    ? 'bg-red-100 text-red-700'
                                    : a.reason === 'Studiedag'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {a.reason}
                                </span>
                              </div>
                              {canPlan && (
                                <button
                                  onClick={() => deleteAbsence(a.id)}
                                  className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                  title="Verwijderen"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Time absences */}
                    {memberTimeAbsences.length > 0 && (
                      <div className={`px-4 py-3 bg-orange-50 ${memberAbsences.length > 0 ? 'border-t border-gray-100' : ''}`}>
                        <h4 className="text-xs font-semibold text-orange-700 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          Tijdelijk uitroosterd
                        </h4>
                        <div className="space-y-1.5">
                          {memberTimeAbsences.map(ta => (
                            <div key={ta.id} className="flex items-center justify-between bg-white border border-orange-200 rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-gray-800">
                                  {capitalize(format(parseISO(ta.date), 'EEEE d MMMM yyyy', { locale: nl }))}
                                </span>
                                <span className="text-xs font-semibold text-orange-700 bg-orange-100 rounded-full px-2 py-0.5">
                                  {ta.startTime}–{ta.endTime}
                                </span>
                                {ta.reason && (
                                  <span className="text-xs text-orange-600 italic">{ta.reason}</span>
                                )}
                              </div>
                              {canPlan && (
                                <button
                                  onClick={() => deleteTimeAbsence(ta.id)}
                                  className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors flex-shrink-0"
                                  title="Verwijderen"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Staff modal */}
      {staffModal && (
        <StaffModal
          data={staffModal.data}
          mode={staffModal.mode}
          groups={groups}
          units={units}
          onSave={saveStaff}
          onClose={() => setStaffModal(null)}
        />
      )}

      {/* Absence modal */}
      {absenceModal && (
        <AbsenceModal
          staffName={staff.find(s => s.id === absenceModal.staffId)?.name}
          data={absenceModal.data}
          onChange={data => setAbsenceModal(m => ({ ...m, data }))}
          onSave={saveAbsence}
          onClose={() => setAbsenceModal(null)}
        />
      )}

      {/* Time absence modal */}
      {timeAbsenceModal && (
        <TimeAbsenceModal
          staffName={staff.find(s => s.id === timeAbsenceModal.staffId)?.name}
          data={timeAbsenceModal.data}
          onChange={data => setTimeAbsenceModal(m => ({ ...m, data }))}
          onSave={saveTimeAbsence}
          onClose={() => setTimeAbsenceModal(null)}
        />
      )}
    </div>
  );
}

// ── Staff Menu (fixed-position dropdown) ──────────────────────────────────

function StaffMenu({ memberId, isOpen, onToggle, onClose, onAbsence, onTimeAbsence, onEdit, onDelete }) {
  const btnRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, right: 0, openUp: false });

  useEffect(() => {
    if (isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const menuHeight = 200; // approximate max menu height
      const openUp = rect.bottom + menuHeight > window.innerHeight;
      setPos({
        top: openUp ? rect.top : rect.bottom + 4,
        right: window.innerWidth - rect.right,
        openUp,
      });
    }
  }, [isOpen]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={onToggle}
        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        title="Acties"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div
            className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-52"
            style={pos.openUp
              ? { bottom: window.innerHeight - pos.top + 4, right: pos.right }
              : { top: pos.top, right: pos.right }
            }
          >
            <button
              onClick={onAbsence}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
            >
              <CalendarX className="w-4 h-4" />
              Dag uitroosteren
            </button>
            <button
              onClick={onTimeAbsence}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
            >
              <Clock className="w-4 h-4" />
              Tijdelijk uitroosteren
            </button>
            {(onEdit || onDelete) && (
              <>
                <div className="border-t border-gray-100 my-1" />
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Bewerken
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={onDelete}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Verwijderen
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}

// ── Staff Modal ────────────────────────────────────────────────────────────

function StaffModal({ data, mode, groups, units, onSave, onClose }) {
  const [form, setForm] = useState(data);

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function setDaySchedule(day, field, value) {
    setForm(f => ({
      ...f,
      schedule: {
        ...f.schedule,
        [day]: { ...f.schedule[day], [field]: value },
      },
    }));
  }

  function setDayType(day, type) {
    const needsTimes = ['group', 'unit', 'ambulant'].includes(type);
    setForm(f => ({
      ...f,
      schedule: {
        ...f.schedule,
        [day]: needsTimes
          ? { type, startTime: '08:00', endTime: '17:00' }
          : { type },
      },
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;

    // Validate schedule: if type is 'group'/'unit', must have selection
    for (const day of DAYS) {
      const ds = form.schedule[day];
      if (ds.type === 'group' && !ds.groupId) {
        alert(`${DAY_LABELS_NL[DAYS.indexOf(day)]}: selecteer een groep`);
        return;
      }
      if (ds.type === 'unit' && !ds.unitId) {
        alert(`${DAY_LABELS_NL[DAYS.indexOf(day)]}: selecteer een unit`);
        return;
      }
    }

    onSave(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-900">
            {mode === 'add' ? 'Nieuwe collega' : 'Collega bewerken'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                placeholder="Voor- en achternaam"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Functie</label>
              <select
                value={form.role}
                onChange={e => setField('role', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Weekly schedule */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Weekrooster</h3>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              {/* Header row */}
              <div className="grid grid-cols-[100px_1fr_1fr_160px] bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <div className="px-3 py-2">Dag</div>
                <div className="px-3 py-2">Type</div>
                <div className="px-3 py-2">Koppeling</div>
                <div className="px-3 py-2">Werktijden</div>
              </div>
              {/* Day rows */}
              {DAYS.map((day, i) => {
                const ds = form.schedule[day] || { type: 'none' };
                return (
                  <div
                    key={day}
                    className={`grid grid-cols-[100px_1fr_1fr_160px] items-center border-b last:border-b-0 border-gray-100 ${
                      i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <div className="px-3 py-2.5 text-sm font-medium text-gray-700">
                      {DAY_LABELS_NL[i]}
                    </div>
                    <div className="px-3 py-2">
                      <select
                        value={ds.type}
                        onChange={e => setDayType(day, e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="none">Niet ingeroosterd</option>
                        <option value="group">Groep</option>
                        <option value="unit">Unit</option>
                        <option value="ambulant">Ambulant</option>
                        <option value="vrij">Vrij</option>
                      </select>
                    </div>
                    <div className="px-3 py-2">
                      {ds.type === 'group' && (
                        <select
                          value={ds.groupId || ''}
                          onChange={e => setDaySchedule(day, 'groupId', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">— Kies groep —</option>
                          {[...groups].sort((a, b) => a.name.localeCompare(b.name, 'nl')).map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                      )}
                      {ds.type === 'unit' && (
                        <select
                          value={ds.unitId || ''}
                          onChange={e => setDaySchedule(day, 'unitId', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">— Kies unit —</option>
                          {units.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      )}
                      {(ds.type === 'none' || ds.type === 'ambulant' || ds.type === 'vrij') && (
                        <span className="text-xs text-gray-400 px-2">—</span>
                      )}
                    </div>
                    <div className="px-3 py-2">
                      {(ds.type === 'group' || ds.type === 'unit' || ds.type === 'ambulant') ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="time"
                            value={ds.startTime || ''}
                            onChange={e => setDaySchedule(day, 'startTime', e.target.value || undefined)}
                            className="w-[70px] border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-gray-400 text-xs">–</span>
                          <input
                            type="time"
                            value={ds.endTime || ''}
                            onChange={e => setDaySchedule(day, 'endTime', e.target.value || undefined)}
                            className="w-[70px] border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 px-2">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
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
              {mode === 'add' ? 'Toevoegen' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Time Absence Modal ─────────────────────────────────────────────────────

function TimeAbsenceModal({ staffName, data, onChange, onSave, onClose }) {
  function handleSubmit(e) {
    e.preventDefault();
    if (!data.date || !data.startTime || !data.endTime) return;
    onSave();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-bold text-gray-900">Tijdelijk uitroosteren</h2>
            <p className="text-xs text-gray-500 mt-0.5">{staffName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2 text-sm text-orange-800">
            <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>{staffName}</strong> is tijdelijk niet beschikbaar, maar staat de rest van de dag wel voor de groep.
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
            <input
              type="date"
              value={data.date}
              onChange={e => onChange({ ...data, date: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Van *</label>
              <input
                type="time"
                value={data.startTime}
                onChange={e => onChange({ ...data, startTime: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tot *</label>
              <input
                type="time"
                value={data.endTime}
                onChange={e => onChange({ ...data, endTime: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reden</label>
            <input
              type="text"
              value={data.reason}
              onChange={e => onChange({ ...data, reason: e.target.value })}
              placeholder="bijv. Bespreking, Vergadering..."
              list="time-absence-reasons"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <datalist id="time-absence-reasons">
              {TIME_ABSENCE_REASONS.map(r => <option key={r} value={r} />)}
            </datalist>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors font-medium flex items-center gap-1.5"
            >
              <Clock className="w-4 h-4" />
              Tijdelijk uitroosteren
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Absence Modal ──────────────────────────────────────────────────────────

function AbsenceModal({ staffName, data, onChange, onSave, onClose }) {
  function handleSubmit(e) {
    e.preventDefault();
    if (!data.date) return;
    onSave();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-bold text-gray-900">Uitroosteren</h2>
            <p className="text-xs text-gray-500 mt-0.5">{staffName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 text-sm text-amber-800">
            <UserX className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Op de gekozen datum wordt <strong>{staffName}</strong> als afwezig gemarkeerd. De groep staat die dag onbemand.
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
            <input
              type="date"
              value={data.date}
              onChange={e => onChange({ ...data, date: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reden</label>
            <select
              value={data.reason}
              onChange={e => onChange({ ...data, reason: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ABSENCE_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors font-medium flex items-center gap-1.5"
            >
              <CalendarX className="w-4 h-4" />
              Uitroosteren
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
