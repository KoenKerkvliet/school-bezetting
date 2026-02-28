import React, { useState } from 'react';
import {
  format, startOfWeek, addDays, addWeeks, subWeeks,
  isSameDay, isToday, getISOWeek,
} from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, AlertTriangle, CheckCircle,
  UserX, Users, Clock, X, Plus, Eye,
} from 'lucide-react';
import { useApp, DAYS, DAY_LABELS_NL, generateId } from '../context/AppContext.jsx';

function getWeekDates(base) {
  const monday = startOfWeek(base, { weekStartsOn: 1 });
  return DAYS.map((_, i) => addDays(monday, i));
}

function formatLocalDate(date) {
  // Format date as YYYY-MM-DD in local timezone (not UTC)
  // This prevents timezone shifts when storing/loading dates
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDayKey(date) {
  // getDay(): 0=Sun,1=Mon,...,5=Fri
  const dayIndex = date.getDay() - 1; // 0=Mon,...,4=Fri
  return DAYS[dayIndex];
}

function isGroupActiveOnDay(group, dayKey) {
  if (!group.days) return true; // backwards compatible: no days config = active every day
  return group.days[dayKey] !== false;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function Dashboard() {
  const { state, dispatch } = useApp();
  const { groups, units, staff, absences, timeAbsences } = state;

  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null); // { group, date }

  const weekDates = getWeekDates(currentWeek);
  const weekNum = getISOWeek(weekDates[0]);

  // ── helpers ──────────────────────────────────────────────────────────────

  function isAbsent(staffId, date) {
    return absences.some(a => a.staff_id === staffId && isSameDay(new Date(a.date), date));
  }

  function getAbsenceReason(staffId, date) {
    return absences.find(a => a.staff_id === staffId && isSameDay(new Date(a.date), date))?.reason;
  }

  function getTimeAbsencesOnDay(staffId, date) {
    return (timeAbsences || []).filter(a =>
      a.staff_id === staffId && isSameDay(new Date(a.date), date)
    );
  }

  /** Staff directly assigned to a group on a specific date */
  function getGroupStaff(groupId, date) {
    const dayKey = getDayKey(date);
    return staff
      .filter(s => s.schedule[dayKey]?.type === 'group' && s.schedule[dayKey]?.groupId === groupId)
      .map(s => ({
        ...s,
        absent: isAbsent(s.id, date),
        reason: getAbsenceReason(s.id, date),
        timeAbsences: getTimeAbsencesOnDay(s.id, date),
      }));
  }

  /** Unit-level staff assigned to a unit on a specific date */
  function getUnitStaff(unitId, date) {
    const dayKey = getDayKey(date);
    return staff
      .filter(s => s.schedule[dayKey]?.type === 'unit' && s.schedule[dayKey]?.unitId === unitId)
      .map(s => ({
        ...s,
        absent: isAbsent(s.id, date),
        reason: getAbsenceReason(s.id, date),
        timeAbsences: getTimeAbsencesOnDay(s.id, date),
      }));
  }

  /** A group is unmanned if it's active that day AND has no staff (or all absent) */
  function isGroupUnmanned(groupId, date) {
    const dayKey = getDayKey(date);
    const group = groups.find(g => g.id === groupId);
    if (!group || !isGroupActiveOnDay(group, dayKey)) return false;
    const gs = getGroupStaff(groupId, date);
    return gs.length === 0 || gs.every(s => s.absent);
  }

  /** All absent staff on a date */
  function getAbsentOnDay(date) {
    return staff
      .filter(s => isAbsent(s.id, date))
      .map(s => ({ ...s, reason: getAbsenceReason(s.id, date) }));
  }

  function getDayStats(date) {
    const dayKey = getDayKey(date);
    const activeGroups = groups.filter(g => isGroupActiveOnDay(g, dayKey));
    const unmannedCount = activeGroups.filter(g => isGroupUnmanned(g.id, date)).length;
    const absentCount = getAbsentOnDay(date).length;
    return { unmannedCount, absentCount };
  }

  /** Staff available to cover a group that day (not absent, not tied to an active group) */
  function getAvailableStaff(date) {
    const dayKey = getDayKey(date);
    return staff.filter(s => {
      if (isAbsent(s.id, date)) return false;
      const sched = s.schedule?.[dayKey];
      if (!sched || sched.type === 'none') return true;
      if (sched.type === 'unit') return true;
      if (sched.type === 'vrij' || sched.type === 'ambulant') return false;
      if (sched.type === 'group') {
        const group = groups.find(g => g.id === sched.groupId);
        return group && !isGroupActiveOnDay(group, dayKey);
      }
      return false;
    });
  }

  /** Ambulant staff scheduled that day (not absent) */
  function getAmbulantStaff(date) {
    const dayKey = getDayKey(date);
    return staff.filter(s => !isAbsent(s.id, date) && s.schedule?.[dayKey]?.type === 'ambulant');
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Calendar ── */}
      <div>
        {/* Header / navigation */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Weekoverzicht — Week {weekNum}
            </h1>
            <p className="text-sm text-gray-500">
              {capitalize(format(weekDates[0], 'd MMMM', { locale: nl }))} t/m{' '}
              {format(weekDates[4], 'd MMMM yyyy', { locale: nl })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentWeek(w => subWeeks(w, 1))}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors border border-gray-200"
              title="Vorige week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setCurrentWeek(new Date()); setSelectedDay(null); }}
              className="px-3 py-1.5 text-sm rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors font-medium"
            >
              Vandaag
            </button>
            <button
              onClick={() => setCurrentWeek(w => addWeeks(w, 1))}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors border border-gray-200"
              title="Volgende week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-green-100 border border-green-300 inline-block" />
            Bemand
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-300 inline-block" />
            Onbemand
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-300 inline-block" />
            Gedeeltelijk afwezig
          </span>
        </div>

        {/* 5-column week grid */}
        <div className="grid grid-cols-5 gap-3">
          {weekDates.map((date, i) => {
            const today = isToday(date);
            const selected = selectedDay && isSameDay(selectedDay, date);
            const dayKey = getDayKey(date);
            const { unmannedCount, absentCount } = getDayStats(date);
            const hasProblems = unmannedCount > 0;
            const availableStaff = getAvailableStaff(date);
            const ambulantStaff = getAmbulantStaff(date);

            return (
              <div
                key={i}
                className={`rounded-xl border-2 transition-all ${
                  selected
                    ? 'border-blue-400 shadow-md'
                    : today
                    ? 'border-blue-300'
                    : hasProblems
                    ? 'border-red-200'
                    : 'border-gray-200'
                } bg-white overflow-hidden`}
              >
                {/* Day header */}
                <div className={`px-3 py-2 ${today ? 'bg-blue-600 text-white' : 'bg-gray-50 border-b border-gray-100'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className={`font-semibold text-sm ${today ? 'text-white' : 'text-gray-800'}`}>
                        {DAY_LABELS_NL[i]}
                      </div>
                      <div className={`text-xs ${today ? 'text-blue-100' : 'text-gray-400'}`}>
                        {format(date, 'd MMM', { locale: nl })}
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedDay(date); }}
                      className={`p-1 rounded transition-colors ${today ? 'hover:bg-blue-500 text-blue-200 hover:text-white' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600'}`}
                      title="Volledige dagweergave"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* Badges */}
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {unmannedCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs bg-red-500 text-white rounded px-1.5 py-0.5 font-medium">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {unmannedCount} onbemand
                      </span>
                    )}
                    {absentCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs bg-amber-500 text-white rounded px-1.5 py-0.5 font-medium">
                        <UserX className="w-2.5 h-2.5" />
                        {absentCount} afwezig
                      </span>
                    )}
                    {unmannedCount === 0 && absentCount === 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs bg-green-500 text-white rounded px-1.5 py-0.5 font-medium">
                        <CheckCircle className="w-2.5 h-2.5" />
                        OK
                      </span>
                    )}
                  </div>
                </div>

                {/* Group cards */}
                <div className="p-2 space-y-1">
                  {[...groups].sort((a, b) => a.name.localeCompare(b.name, 'nl')).map(group => {
                    const isActive = isGroupActiveOnDay(group, dayKey);

                    // Inactive day: show blank/transparent card
                    if (!isActive) {
                      return (
                        <div
                          key={group.id}
                          className="rounded-lg px-2 py-1.5 text-xs border border-dashed border-gray-200"
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0 opacity-30"
                              style={{ backgroundColor: group.color }}
                            />
                            <span className="font-medium text-gray-300">{group.name}</span>
                          </div>
                        </div>
                      );
                    }

                    const gs = getGroupStaff(group.id, date);
                    const unmanned = isGroupUnmanned(group.id, date);
                    const hasAbsent = gs.some(s => s.absent);
                    const hasTimeAbsent = gs.some(s => !s.absent && s.timeAbsences?.length > 0);

                    return (
                      <div
                        key={group.id}
                        onClick={() => setSelectedGroup({ group, date })}
                        className={`rounded-lg px-2 py-1.5 text-xs border cursor-pointer hover:brightness-95 transition-all ${
                          unmanned
                            ? 'bg-red-50 border-red-300'
                            : (hasAbsent || hasTimeAbsent)
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-green-50 border-green-200'
                        }`}
                      >
                        {/* Single-row: dot · name · staff names · status icon */}
                        <div className="flex items-center gap-1 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: group.color }}
                          />
                          <span className="font-semibold text-gray-800 flex-shrink-0">{group.name}</span>
                          {/* Staff names inline */}
                          {gs.length === 0 ? (
                            <span className="text-red-500 font-medium ml-1 flex-shrink-0">—</span>
                          ) : (
                            <span className="flex items-center gap-0.5 ml-1 min-w-0 flex-1 overflow-hidden">
                              {gs.map((s, i) => (
                                <span key={s.id} className="flex items-center gap-0.5 flex-shrink-0">
                                  {i > 0 && <span className="text-gray-300">,</span>}
                                  {s.absent && <UserX className="w-2 h-2 text-amber-500" />}
                                  {!s.absent && s.timeAbsences?.length > 0 && (
                                    <Clock className="w-2 h-2 text-orange-400" />
                                  )}
                                  <span className={s.absent ? 'line-through text-amber-600' : 'text-gray-500'}>
                                    {s.name.split(' ')[0]}
                                  </span>
                                </span>
                              ))}
                            </span>
                          )}
                          {unmanned ? (
                            <AlertTriangle className="w-3 h-3 text-red-500 ml-auto flex-shrink-0" />
                          ) : (
                            <CheckCircle className="w-3 h-3 text-green-500 ml-auto flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Available staff */}
                {availableStaff.length > 0 && (
                  <div className="px-2 pt-1 pb-1.5 border-t border-gray-100">
                    <div className={`text-xs font-semibold flex items-center gap-1 mb-1 ${today ? 'text-blue-200' : 'text-blue-500'}`}>
                      <Users className="w-3 h-3" />
                      Beschikbaar
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {availableStaff.map(s => (
                        <span key={s.id} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-1.5 py-0.5">
                          {s.name.split(' ')[0]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ambulant staff */}
                {ambulantStaff.length > 0 && (
                  <div className="px-2 pb-2 pt-1 border-t border-gray-100">
                    <div className={`text-xs font-semibold flex items-center gap-1 mb-1 ${today ? 'text-purple-300' : 'text-purple-500'}`}>
                      <Users className="w-3 h-3" />
                      Ambulant
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ambulantStaff.map(s => (
                        <span key={s.id} className="text-xs bg-purple-50 text-purple-700 border border-purple-100 rounded-full px-1.5 py-0.5">
                          {s.name.split(' ')[0]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>

      {/* ── Day detail modal ── */}
      {selectedDay && (
        <DayDetailModal
          date={selectedDay}
          groups={groups}
          units={units}
          staff={staff}
          absences={absences}
          timeAbsences={timeAbsences || []}
          getGroupStaff={getGroupStaff}
          getUnitStaff={getUnitStaff}
          getAbsentOnDay={getAbsentOnDay}
          getAvailableStaff={getAvailableStaff}
          getAmbulantStaff={getAmbulantStaff}
          isGroupUnmanned={isGroupUnmanned}
          dispatch={dispatch}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {/* ── Single group popup ── */}
      {selectedGroup && (
        <GroupPopup
          group={selectedGroup.group}
          date={selectedGroup.date}
          staffList={getGroupStaff(selectedGroup.group.id, selectedGroup.date)}
          unitStaff={selectedGroup.group.unitId ? getUnitStaff(selectedGroup.group.unitId, selectedGroup.date) : []}
          unit={units.find(u => u.id === selectedGroup.group.unitId) || null}
          unmanned={isGroupUnmanned(selectedGroup.group.id, selectedGroup.date)}
          absences={absences}
          timeAbsences={timeAbsences || []}
          dispatch={dispatch}
          onClose={() => setSelectedGroup(null)}
        />
      )}
    </div>
  );
}

// ── Day detail modal ───────────────────────────────────────────────────────

function DayDetailModal({
  date, groups, units, staff, absences, timeAbsences,
  getGroupStaff, getUnitStaff, getAbsentOnDay, getAvailableStaff, getAmbulantStaff,
  isGroupUnmanned, dispatch, onClose,
}) {
  const [staffAction, setStaffAction] = useState(null);
  const absentStaff = getAbsentOnDay(date);
  const availableStaff = getAvailableStaff(date);
  const ambulantStaff = getAmbulantStaff(date);
  const dateLabel = capitalize(format(date, 'EEEE d MMMM yyyy', { locale: nl }));
  const today = isToday(date);
  const dayKey = getDayKey(date);

  const ungroupedGroups = groups.filter(g => !g.unitId || !units.find(u => u.id === g.unitId));

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-4 py-3 flex items-start justify-between ${today ? 'bg-blue-600 text-white' : 'bg-blue-50 border-b border-blue-200'}`}>
          <div>
            <div className={`font-bold text-sm ${today ? 'text-white' : 'text-blue-800'}`}>{dateLabel}</div>
            <div className={`text-xs mt-0.5 ${today ? 'text-blue-200' : 'text-blue-500'}`}>Dagdetail</div>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors mt-0.5 ${today ? 'hover:bg-blue-500 text-blue-200 hover:text-white' : 'hover:bg-blue-100 text-blue-400'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-12rem)]">
          {/* Absent staff section */}
          {absentStaff.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100 bg-amber-50">
              <h3 className="font-semibold text-amber-800 text-sm flex items-center gap-1.5 mb-2">
                <UserX className="w-4 h-4" />
                Afwezig vandaag ({absentStaff.length})
              </h3>
              <div className="space-y-1.5">
                {absentStaff.map(s => (
                  <div key={s.id} className="flex items-center justify-between bg-white border border-amber-200 rounded-lg px-3 py-1.5">
                    <span className="text-sm text-amber-900 font-medium">{s.name}</span>
                    <span className="text-xs text-amber-700 bg-amber-100 rounded px-2 py-0.5">
                      {s.reason || 'Afwezig'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Units with their groups */}
          <div className="p-4 space-y-5">
            {units.map(unit => {
              const unitGroups = groups.filter(g => g.unitId === unit.id);
              if (unitGroups.length === 0) return null;
              const unitStaff = getUnitStaff(unit.id, date);
              const unmannedInUnit = unitGroups.filter(g => isGroupActiveOnDay(g, dayKey) && isGroupUnmanned(g.id, date)).length;

              return (
                <div key={unit.id}>
                  {/* Unit header */}
                  <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-200">
                    <h3 className="font-bold text-gray-700 text-sm">{unit.name}</h3>
                    {unmannedInUnit > 0 && (
                      <span className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-0.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {unmannedInUnit} onbemand
                      </span>
                    )}
                  </div>

                  {/* Groups in this unit */}
                  <div className="space-y-2">
                    {unitGroups.map(group => {
                      if (!isGroupActiveOnDay(group, dayKey)) {
                        return (
                          <div key={group.id} className="rounded-lg p-3 border border-dashed border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 opacity-40" style={{ backgroundColor: group.color }} />
                              <span className="font-semibold text-gray-400 text-sm">{group.name}</span>
                              <span className="ml-auto text-xs text-gray-400 italic">Geen les vandaag</span>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <GroupDetailCard
                          key={group.id}
                          group={group}
                          staffList={getGroupStaff(group.id, date)}
                          unmanned={isGroupUnmanned(group.id, date)}
                          onStaffClick={setStaffAction}
                        />
                      );
                    })}
                  </div>

                  {/* Unit-level staff */}
                  {unitStaff.length > 0 && (
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2">
                      <div className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Unit-begeleider(s)
                      </div>
                      {unitStaff.map(s => (
                        <div
                          key={s.id}
                          onClick={() => setStaffAction(s)}
                          className={`flex items-center gap-2 text-xs py-1 px-1 rounded cursor-pointer transition-colors ${s.absent ? 'text-amber-700 hover:bg-amber-100' : 'text-blue-700 hover:bg-blue-100'}`}
                        >
                          {s.absent ? <UserX className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                          <span className={s.absent ? 'line-through' : ''}>{s.name}</span>
                          <span className="text-blue-400 ml-auto">{s.role}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Groups not in any unit */}
            {ungroupedGroups.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-700 text-sm mb-2 pb-1 border-b border-gray-200">
                  Overige groepen
                </h3>
                <div className="space-y-2">
                  {ungroupedGroups.map(group => {
                    if (!isGroupActiveOnDay(group, dayKey)) {
                      return (
                        <div key={group.id} className="rounded-lg p-3 border border-dashed border-gray-200 bg-gray-50">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 opacity-40" style={{ backgroundColor: group.color }} />
                            <span className="font-semibold text-gray-400 text-sm">{group.name}</span>
                            <span className="ml-auto text-xs text-gray-400 italic">Geen les vandaag</span>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <GroupDetailCard
                        key={group.id}
                        group={group}
                        staffList={getGroupStaff(group.id, date)}
                        unmanned={isGroupUnmanned(group.id, date)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available staff */}
            {availableStaff.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <h3 className="font-bold text-gray-700 text-sm mb-2 pb-1 border-b border-gray-200 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-500" />
                  Beschikbaar ({availableStaff.length})
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {availableStaff.map(s => (
                    <span key={s.id} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1 font-medium">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ambulant staff */}
            {ambulantStaff.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <h3 className="font-bold text-gray-700 text-sm mb-2 pb-1 border-b border-gray-200 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-500" />
                  Ambulant
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {ambulantStaff.map(s => (
                    <span key={s.id} className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 py-1 font-medium">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    {staffAction && (
      <StaffActionModal
        staff={staffAction}
        date={date}
        allAbsences={absences}
        allTimeAbsences={timeAbsences}
        dispatch={dispatch}
        onClose={() => setStaffAction(null)}
      />
    )}
    </>
  );
}

function GroupDetailCard({ group, staffList, unmanned, onStaffClick }) {
  const hasAbsent = staffList.some(s => s.absent);
  const hasTimeAbsent = staffList.some(s => !s.absent && s.timeAbsences?.length > 0);

  return (
    <div
      className={`rounded-lg p-3 border text-sm ${
        unmanned
          ? 'bg-red-50 border-red-300'
          : (hasAbsent || hasTimeAbsent)
          ? 'bg-amber-50 border-amber-200'
          : 'bg-white border-gray-200'
      }`}
    >
      {/* Group name + times */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
        <span className="font-semibold text-gray-800">{group.name}</span>
        <span className="ml-auto text-xs text-gray-400">
          {group.startTime}–{group.endTime}
        </span>
      </div>

      {/* Break times */}
      <div className="flex gap-3 text-xs text-gray-400 mb-2 pl-4">
        <span className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {group.shortBreak.start}–{group.shortBreak.end}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {group.longBreak.start}–{group.longBreak.end}
        </span>
      </div>

      {/* Staff list */}
      {staffList.length === 0 ? (
        <div className="flex items-center gap-1.5 text-red-600 font-semibold text-xs pl-1">
          <AlertTriangle className="w-3.5 h-3.5" />
          Geen leerkracht ingepland!
        </div>
      ) : (
        <div className="space-y-1 pl-1">
          {staffList.map(s => (
            <div key={s.id}>
              <div
                onClick={e => { e.stopPropagation(); onStaffClick(s); }}
                className={`flex items-center gap-2 rounded px-2 py-1 cursor-pointer transition-colors ${
                  s.absent ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
              >
                {s.absent
                  ? <UserX className="w-3 h-3 flex-shrink-0" />
                  : <CheckCircle className="w-3 h-3 flex-shrink-0" />
                }
                <span className={s.absent ? 'line-through' : ''}>{s.name}</span>
                {s.absent && (
                  <span className="ml-auto text-xs text-amber-600">({s.reason || 'afwezig'})</span>
                )}
              </div>
              {/* Time absences for this staff member */}
              {!s.absent && s.timeAbsences?.length > 0 && (
                <div className="ml-2 mt-0.5 space-y-0.5">
                  {s.timeAbsences.map(ta => (
                    <div key={ta.id} className="flex items-center gap-1.5 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-0.5">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span className="font-medium">{ta.startTime}–{ta.endTime}</span>
                      {ta.reason && <span className="text-orange-500 truncate">({ta.reason})</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {unmanned && staffList.length > 0 && (
            <div className="flex items-center gap-1.5 text-red-600 text-xs font-semibold mt-1 px-1">
              <AlertTriangle className="w-3 h-3" />
              Alle leerkrachten afwezig!
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Single group popup ─────────────────────────────────────────────────────

function GroupPopup({ group, date, staffList, unitStaff, unit, unmanned, absences, timeAbsences, dispatch, onClose }) {
  const [staffAction, setStaffAction] = useState(null);
  const dateLabel = capitalize(format(date, 'EEEE d MMMM yyyy', { locale: nl }));
  const today = isToday(date);
  const hasAbsent = staffList.some(s => s.absent);
  const hasTimeAbsent = staffList.some(s => !s.absent && s.timeAbsences?.length > 0);

  const statusColor = unmanned
    ? { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' }
    : (hasAbsent || hasTimeAbsent)
    ? { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' }
    : { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' };

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-start justify-between border-b"
          style={{ backgroundColor: group.color + '20', borderBottomColor: group.color + '60' }}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
            <div>
              <div className="font-bold text-gray-900">{group.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">{dateLabel}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-lg text-gray-400 transition-colors mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-12rem)]">
          <div className="p-4 space-y-4">
            {/* Times */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span className="font-medium text-gray-700">{group.startTime}–{group.endTime}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Pauze: {group.shortBreak?.start}–{group.shortBreak?.end}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                TSO: {group.longBreak?.start}–{group.longBreak?.end}
              </span>
            </div>

            {/* Staff */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Leerkrachten</h3>
              {staffList.length === 0 ? (
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold ${statusColor.bg} ${statusColor.border} border ${statusColor.text}`}>
                  <AlertTriangle className="w-4 h-4" />
                  Geen leerkracht ingepland!
                </div>
              ) : (
                <div className="space-y-1">
                  {staffList.map(s => (
                    <div key={s.id}>
                      <div
                        onClick={e => { e.stopPropagation(); setStaffAction(s); }}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors text-sm ${
                          s.absent
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            : 'bg-gray-50 text-gray-800 hover:bg-gray-100'
                        }`}
                      >
                        {s.absent
                          ? <UserX className="w-3.5 h-3.5 flex-shrink-0" />
                          : <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        }
                        <span className={s.absent ? 'line-through' : ''}>{s.name}</span>
                        <span className="text-xs text-gray-400 ml-0.5">{s.role}</span>
                        {s.absent && (
                          <span className="ml-auto text-xs text-amber-600">({s.reason || 'afwezig'})</span>
                        )}
                      </div>
                      {!s.absent && s.timeAbsences?.length > 0 && (
                        <div className="ml-4 mt-0.5 space-y-0.5">
                          {s.timeAbsences.map(ta => (
                            <div key={ta.id} className="flex items-center gap-1.5 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-0.5">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              <span className="font-medium">{ta.startTime}–{ta.endTime}</span>
                              {ta.reason && <span className="text-orange-500 truncate">({ta.reason})</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {unmanned && staffList.length > 0 && (
                    <div className="flex items-center gap-1.5 text-red-600 text-xs font-semibold px-1 pt-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Alle leerkrachten afwezig!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Unit staff */}
            {unitStaff.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Begeleiding {unit ? `(${unit.name})` : ''}
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 space-y-0.5">
                  {unitStaff.map(s => (
                    <div
                      key={s.id}
                      onClick={e => { e.stopPropagation(); setStaffAction(s); }}
                      className={`flex items-center gap-2 text-xs py-1 px-1 rounded cursor-pointer transition-colors ${s.absent ? 'text-amber-700 hover:bg-amber-100' : 'text-blue-700 hover:bg-blue-100'}`}
                    >
                      {s.absent ? <UserX className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                      <span className={s.absent ? 'line-through' : ''}>{s.name}</span>
                      <span className="text-blue-400 ml-auto">{s.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    {staffAction && (
      <StaffActionModal
        staff={staffAction}
        date={date}
        allAbsences={absences}
        allTimeAbsences={timeAbsences}
        dispatch={dispatch}
        onClose={() => setStaffAction(null)}
      />
    )}
    </>
  );
}

// ── Staff action modal ─────────────────────────────────────────────────────

function StaffActionModal({ staff, date, allAbsences, allTimeAbsences, dispatch, onClose }) {
  // Derive live from current state so updates reflect immediately
  const absence = allAbsences.find(a => a.staff_id === staff.id && isSameDay(new Date(a.date), date));
  const staffTimeAbsences = (allTimeAbsences || []).filter(
    a => a.staff_id === staff.id && isSameDay(new Date(a.date), date)
  );

  const [showTimeForm, setShowTimeForm] = useState(false);
  const [timeForm, setTimeForm] = useState({ startTime: '08:30', endTime: '10:00', reason: '' });

  const dateLabel = capitalize(format(date, 'EEEE d MMMM yyyy', { locale: nl }));

  function markSick() {
    dispatch({ type: 'ADD_ABSENCE', payload: {
      id: generateId(), staff_id: staff.id, date: formatLocalDate(date), reason: 'Ziek',
    }});
    onClose();
  }

  function removeAbsence() {
    dispatch({ type: 'DELETE_ABSENCE', payload: absence.id });
    onClose();
  }

  function addTimeAbsence(e) {
    e.preventDefault();
    dispatch({ type: 'ADD_TIME_ABSENCE', payload: {
      id: generateId(),
      staff_id: staff.id,
      date: formatLocalDate(date),
      startTime: timeForm.startTime,
      endTime: timeForm.endTime,
      reason: timeForm.reason,
    }});
    setShowTimeForm(false);
    setTimeForm({ startTime: '08:30', endTime: '10:00', reason: '' });
  }

  function removeTimeAbsence(id) {
    dispatch({ type: 'DELETE_TIME_ABSENCE', payload: id });
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 60 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-start justify-between">
          <div>
            <div className="font-bold text-sm text-gray-900">{staff.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">{dateLabel}</div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-lg text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Full-day absence */}
          {absence ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-amber-800">Afwezig hele dag</div>
                <div className="text-xs text-amber-600 mt-0.5">{absence.reason || 'Afwezig'}</div>
              </div>
              <button
                onClick={removeAbsence}
                className="text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 flex-shrink-0 transition-colors"
              >
                Verwijderen
              </button>
            </div>
          ) : (
            <button
              onClick={markSick}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors text-sm font-medium"
            >
              <UserX className="w-4 h-4" />
              Ziek melden (hele dag)
            </button>
          )}

          {/* Partial / time absences */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                Gedeeltelijk afwezig
              </div>
              {!showTimeForm && !absence && (
                <button
                  onClick={() => setShowTimeForm(true)}
                  className="text-xs text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Toevoegen
                </button>
              )}
            </div>

            {/* Existing time absences */}
            {staffTimeAbsences.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {staffTimeAbsences.map(ta => (
                  <div key={ta.id} className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5 text-xs">
                    <Clock className="w-3 h-3 text-orange-500 flex-shrink-0" />
                    <span className="font-medium text-orange-800">{ta.startTime}–{ta.endTime}</span>
                    {ta.reason && <span className="text-orange-600 truncate">({ta.reason})</span>}
                    <button
                      onClick={() => removeTimeAbsence(ta.id)}
                      className="ml-auto text-red-400 hover:text-red-600 flex-shrink-0 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add time absence form */}
            {showTimeForm && (
              <form onSubmit={addTimeAbsence} className="space-y-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Van</label>
                    <input
                      type="time"
                      value={timeForm.startTime}
                      onChange={e => setTimeForm(f => ({ ...f, startTime: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tot</label>
                    <input
                      type="time"
                      value={timeForm.endTime}
                      onChange={e => setTimeForm(f => ({ ...f, endTime: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Reden (optioneel)</label>
                  <input
                    type="text"
                    value={timeForm.reason}
                    onChange={e => setTimeForm(f => ({ ...f, reason: e.target.value }))}
                    placeholder="bijv. vergadering"
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setShowTimeForm(false)}
                    className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Annuleren
                  </button>
                  <button
                    type="submit"
                    className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Opslaan
                  </button>
                </div>
              </form>
            )}

            {staffTimeAbsences.length === 0 && !showTimeForm && (
              <p className="text-xs text-gray-400 italic">Geen gedeeltelijke afwezigheid</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
