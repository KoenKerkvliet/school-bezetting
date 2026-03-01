import React, { useState, useEffect } from 'react';
import {
  format, startOfWeek, addDays, addWeeks, subWeeks,
  isSameDay, isToday, getISOWeek,
} from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, AlertTriangle, CheckCircle,
  UserX, Users, Clock, X, Plus, UserPlus, Printer, StickyNote, Pencil, Trash2, CalendarOff,
} from 'lucide-react';
import { useApp, DAYS, DAY_LABELS_NL, generateId, getGroupTimesForDay, getClosureForDate, isFullClosureDate } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { isPlannerOrAbove } from '../utils/roles';

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

/** Check if two HH:MM time ranges overlap */
function timeRangesOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
}

/** Check if staff working hours fully cover a required time range. NULL = full day. */
function workingHoursCover(daySchedule, requiredStart, requiredEnd) {
  if (!daySchedule?.startTime || !daySchedule?.endTime) return true;
  return daySchedule.startTime <= requiredStart && daySchedule.endTime >= requiredEnd;
}

export default function Dashboard({ initialDate, onInitialDateUsed }) {
  const { state, dispatch } = useApp();
  const { groups, units, staff, absences, timeAbsences, unitOverrides, dayNotes, gradeLevelSchedules, schoolClosures } = state;
  const { role } = useAuth();
  const canPlan = isPlannerOrAbove(role);

  // Initialize currentWeek from localStorage or use today
  const [currentWeek, setCurrentWeek] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboardWeek');
      return saved ? new Date(saved) : new Date();
    } catch {
      return new Date();
    }
  });
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null); // { group, date }
  const [unitMovePopup, setUnitMovePopup] = useState(null); // { staffId, staffName, date, currentUnitId, rect }
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Handle navigation from other pages (e.g. AbsencePage → specific day)
  useEffect(() => {
    if (initialDate) {
      setCurrentWeek(initialDate);
      setSelectedDay(initialDate);
      setSelectedGroup(null);
      if (onInitialDateUsed) onInitialDateUsed();
    }
  }, [initialDate]);

  // Save currentWeek to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('dashboardWeek', currentWeek.toISOString());
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, [currentWeek]);

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
    const dateStr = formatLocalDate(date);

    // Get staff from weekly schedule
    const weeklyStaff = staff
      .filter(s => s.schedule[dayKey]?.type === 'group' && s.schedule[dayKey]?.groupId === groupId)
      .map(s => ({ ...s, isReplacement: false, replacementStartTime: null, replacementEndTime: null, assignmentId: null }));

    // Get staff from date-specific assignments
    const dateAssignments = (state.staffDateAssignments || [])
      .filter(a => a.date === dateStr && a.groupId === groupId);

    // Add staff from date assignments, excluding those already in weekly schedule
    const dateAssignmentStaff = dateAssignments
      .map(a => {
        const staffMember = staff.find(s => s.id === a.staffId);
        if (!staffMember) return null;
        if (weeklyStaff.some(ws => ws.id === staffMember.id)) return null;
        return {
          ...staffMember,
          isReplacement: true,
          replacementStartTime: a.startTime || null,
          replacementEndTime: a.endTime || null,
          assignmentId: a.id,
        };
      })
      .filter(Boolean);

    // Combine and map
    return [...weeklyStaff, ...dateAssignmentStaff]
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
    const dateStr = formatLocalDate(date);
    return staff
      .filter(s => {
        const sched = s.schedule[dayKey];
        if (sched?.type !== 'unit') return false;
        // Check for day-specific unit override
        const override = (unitOverrides || []).find(
          o => o.staffId === s.id && o.date === dateStr
        );
        if (override) return override.unitId === unitId;
        return sched.unitId === unitId;
      })
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

  /** Staff available to cover a group that day (not absent, not tied to an active group, not already assigned as replacement) */
  function getAvailableStaff(date) {
    const dayKey = getDayKey(date);
    const dateStr = formatLocalDate(date);

    // Get all date-specific assignments for this day (replacements already placed)
    const dayAssignments = (state.staffDateAssignments || [])
      .filter(a => a.date === dateStr);

    return staff.filter(s => {
      if (isAbsent(s.id, date)) return false;

      // Exclude staff already assigned as whole-day replacement somewhere
      const hasWholeDayAssignment = dayAssignments.some(
        a => a.staffId === s.id && !a.startTime
      );
      if (hasWholeDayAssignment) return false;

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

  // ── Unit override helpers ──────────────────────────────────────────────
  function getEffectiveUnitId(staffMember, date) {
    const dateStr = formatLocalDate(date);
    const override = (unitOverrides || []).find(
      o => o.staffId === staffMember.id && o.date === dateStr
    );
    if (override) return override.unitId;
    const dayKey = getDayKey(date);
    const sched = staffMember.schedule?.[dayKey];
    return sched?.type === 'unit' ? sched.unitId : null;
  }

  function getUnitOverride(staffId, date) {
    const dateStr = formatLocalDate(date);
    return (unitOverrides || []).find(
      o => o.staffId === staffId && o.date === dateStr
    );
  }

  function handleUnitMove(staffId, date, newUnitId) {
    const dateStr = formatLocalDate(date);
    const existingOverride = getUnitOverride(staffId, date);
    // Check if new unit is the same as the original schedule (no override needed)
    const staffMember = staff.find(s => s.id === staffId);
    const dayKey = getDayKey(date);
    const schedUnitId = staffMember?.schedule?.[dayKey]?.unitId;
    if (newUnitId === schedUnitId && existingOverride) {
      // Moving back to original — just delete the override
      dispatch({ type: 'DELETE_UNIT_OVERRIDE', payload: { id: existingOverride.id, staffId, date: dateStr } });
    } else if (newUnitId !== schedUnitId || !existingOverride) {
      dispatch({
        type: 'SET_UNIT_OVERRIDE',
        payload: {
          id: existingOverride?.id || generateId(),
          staffId,
          date: dateStr,
          unitId: newUnitId,
        },
      });
    }
    setUnitMovePopup(null);
  }

  function handleUnitMoveReset(staffId, date) {
    const dateStr = formatLocalDate(date);
    const existingOverride = getUnitOverride(staffId, date);
    if (existingOverride) {
      dispatch({ type: 'DELETE_UNIT_OVERRIDE', payload: { id: existingOverride.id, staffId, date: dateStr } });
    }
    setUnitMovePopup(null);
  }

  // ── Day notes helpers ───────────────────────────────────────────────────
  function getDayNote(date) {
    const dateStr = formatLocalDate(date);
    return (dayNotes || []).find(n => n.date === dateStr);
  }

  // ── School closure helpers ─────────────────────────────────────────────
  function getClosureForDay(date) {
    const dateStr = formatLocalDate(date);
    return getClosureForDate(schoolClosures, dateStr);
  }

  // ── PDF generation ──────────────────────────────────────────────────────

  function generateWeekPDF(startWeekOffset = 0, weekCount = 1) {
    // Helper: build one week's data and HTML
    function buildWeekBlock(wkDates, wkNum) {
      const daysData = wkDates.map((date) => {
        const dayKey = getDayKey(date);
        const dayShort = capitalize(format(date, 'EEEE', { locale: nl }));
        const dayDate = format(date, 'd MMM', { locale: nl });

        // Check for school closures
        const closure = getClosureForDay(date);
        const isFullClosure = closure && (closure.type === 'vacation' || closure.type === 'holiday');
        const isHalfDay = closure && closure.type === 'half_day';

        if (isFullClosure) {
          return { dayShort, dayDate, isFullClosure: true, closureName: closure.name, closureType: closure.type, changedGroups: [], unitSupportData: [], dayNote: null };
        }

        const changedGroups = [...groups]
          .sort((a, b) => a.name.localeCompare(b.name, 'nl'))
          .filter(group => isGroupActiveOnDay(group, dayKey))
          .map(group => {
            const gs = getGroupStaff(group.id, date);
            const unmanned = isGroupUnmanned(group.id, date);
            const hasAbsentStaff = gs.some(s => s.absent);
            const hasTimeAbsent = gs.some(s => !s.absent && s.timeAbsences?.length > 0);
            const hasReplacement = gs.some(s => s.isReplacement);
            const wholeDayStaffCount = gs.filter(s => !s.absent && !s.replacementStartTime).length;
            const isOverstaffed = wholeDayStaffCount > 1;
            const hasChanges = unmanned || hasAbsentStaff || hasTimeAbsent || hasReplacement || isOverstaffed;
            if (!hasChanges) return null;
            return { group, gs, unmanned };
          })
          .filter(Boolean);

        const dateStr = formatLocalDate(date);
        const wholeDayReplacementIds = new Set(
          (state.staffDateAssignments || [])
            .filter(a => a.date === dateStr && !a.startTime)
            .map(a => a.staffId)
        );

        const unitSupportData = units
          .map(unit => {
            const unitStaff = getUnitStaff(unit.id, date)
              .filter(s => !wholeDayReplacementIds.has(s.id));
            if (unitStaff.length === 0) return null;
            return { unit, unitStaff };
          })
          .filter(Boolean);

        const dayNote = getDayNote(date);
        return { dayShort, dayDate, changedGroups, unitSupportData, dayNote, isHalfDay, closureName: isHalfDay ? closure.name : null, freeFromTime: isHalfDay ? closure.freeFromTime : null };
      });

      const dateRange = `${capitalize(format(wkDates[0], 'd MMMM', { locale: nl }))} t/m ${format(wkDates[4], 'd MMMM yyyy', { locale: nl })}`;
      const hasAnyChanges = daysData.some(d => d.isFullClosure || d.changedGroups.length > 0);
      const hasAnySupport = daysData.some(d => d.unitSupportData.length > 0);
      const hasAnyNotes = daysData.some(d => d.dayNote);

      const columns = daysData.map(({ dayShort, dayDate, changedGroups, unitSupportData, dayNote, isFullClosure: dayFullClosure, closureName, closureType, isHalfDay: dayHalfDay, freeFromTime }) => {
        let content = '';
        if (dayFullClosure) {
          content += `<div style="text-align:center;padding:16px 4px;color:#9ca3af;">`;
          content += `<div style="font-size:18px;margin-bottom:4px;">📅</div>`;
          content += `<div style="font-weight:600;font-size:10px;">${closureName}</div>`;
          content += `<div style="font-size:9px;color:#b0b0b0;margin-top:2px;">${closureType === 'vacation' ? 'Vakantie' : 'Feestdag'}</div>`;
          content += `</div>`;
        } else {
          if (dayHalfDay) {
            content += `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:4px;padding:3px 6px;font-size:9px;color:#92400e;font-weight:600;margin-bottom:8px;">⏰ ${closureName} — vrij vanaf ${freeFromTime}</div>`;
          }
          if (changedGroups.length === 0) {
            content += `<div style="color:#94a3b8;font-size:9px;font-style:italic;margin-bottom:8px;">Geen wisselingen</div>`;
          } else {
            changedGroups.forEach(({ group, gs, unmanned }) => {
            content += `<div style="margin-bottom:6px;">`;
            content += `<div style="font-weight:700;font-size:10px;color:#1e293b;border-left:3px solid ${group.color};padding-left:5px;margin-bottom:2px;">${group.name}`;
            if (unmanned) content += ` <span style="color:#dc2626;">⚠</span>`;
            content += `</div>`;
            gs.forEach(s => {
              if (s.absent) {
                content += `<div style="font-size:9px;padding:1px 0 1px 8px;color:#92400e;">`;
                content += `<s>${s.name.split(' ')[0]}</s> <span style="color:#b45309;">(${s.reason || 'afw.'})</span>`;
                content += `</div>`;
              } else if (s.isReplacement) {
                content += `<div style="font-size:9px;padding:1px 0 1px 8px;color:#4f46e5;font-weight:600;">`;
                content += `↪ ${s.name.split(' ')[0]}`;
                if (s.replacementStartTime) content += ` <span style="font-weight:400;">${s.replacementStartTime}–${s.replacementEndTime}</span>`;
                content += `</div>`;
              }
              if (!s.absent && s.timeAbsences?.length > 0) {
                s.timeAbsences.forEach(ta => {
                  content += `<div style="font-size:9px;padding:1px 0 1px 8px;color:#ea580c;">`;
                  content += `${s.name.split(' ')[0]} ✗ ${ta.startTime}–${ta.endTime}`;
                  if (ta.reason) content += ` (${ta.reason})`;
                  content += `</div>`;
                });
              }
            });
            content += `</div>`;
          });
          }
          if (unitSupportData.length > 0) {
            content += `<div style="margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;">`;
            content += `<div style="font-weight:700;font-size:9px;color:#6366f1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Ondersteuning</div>`;
            unitSupportData.forEach(({ unit, unitStaff }) => {
              content += `<div style="margin-bottom:4px;">`;
              content += `<div style="font-size:9px;font-weight:600;color:#4f46e5;margin-bottom:1px;">${unit.name}</div>`;
              unitStaff.forEach(s => {
                if (s.absent) {
                  content += `<div style="font-size:9px;padding:1px 0 1px 8px;color:#92400e;">`;
                  content += `<s>${s.name.split(' ')[0]}</s> <span style="color:#b45309;">(${s.reason || 'afw.'})</span>`;
                  content += `</div>`;
                } else {
                  content += `<div style="font-size:9px;padding:1px 0 1px 8px;color:#4338ca;">`;
                  content += `${s.name.split(' ')[0]}`;
                  content += `</div>`;
                }
              });
              content += `</div>`;
            });
            content += `</div>`;
          }
          if (dayNote) {
            content += `<div style="margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;">`;
            content += `<div style="font-weight:700;font-size:9px;color:#d97706;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">📝 Notitie</div>`;
            content += `<div style="font-size:9px;color:#92400e;font-style:italic;padding:3px 6px;background:#fef3c7;border-radius:3px;white-space:pre-wrap;">${dayNote.text}</div>`;
            content += `</div>`;
          }
        }
        return { dayShort, dayDate, content };
      });

      let gridHtml = '';
      if (!hasAnyChanges && !hasAnySupport && !hasAnyNotes) {
        gridHtml = `<div style="text-align:center;padding:30px;color:#94a3b8;font-size:14px;">Geen wisselingen deze week ✓</div>`;
      } else {
        gridHtml += `<table style="width:100%;border-collapse:collapse;table-layout:fixed;">`;
        gridHtml += `<thead><tr>`;
        columns.forEach(({ dayShort, dayDate }) => {
          gridHtml += `<th style="width:20%;padding:6px 8px;text-align:left;border-bottom:2px solid #3b82f6;font-size:11px;font-weight:700;color:#1e293b;">`;
          gridHtml += `${dayShort} <span style="font-weight:400;color:#64748b;">${dayDate}</span>`;
          gridHtml += `</th>`;
        });
        gridHtml += `</tr></thead>`;
        gridHtml += `<tbody><tr>`;
        columns.forEach(({ content }) => {
          gridHtml += `<td style="width:20%;padding:8px;vertical-align:top;border-right:1px solid #e2e8f0;">${content}</td>`;
        });
        gridHtml += `</tr></tbody></table>`;
      }

      return { wkNum, dateRange, gridHtml };
    }

    // Build all week blocks
    const weekBlocks = [];
    for (let w = 0; w < weekCount; w++) {
      const thisWeekBase = addWeeks(currentWeek, startWeekOffset + w);
      const wkDates = getWeekDates(thisWeekBase);
      const wkNum = getISOWeek(wkDates[0]);
      weekBlocks.push(buildWeekBlock(wkDates, wkNum));
    }

    // Build full HTML
    const titleWeeks = weekBlocks.map(b => b.wkNum).join(', ');
    let bodyContent = '';
    weekBlocks.forEach((block, idx) => {
      const pageBreak = idx > 0 ? 'page-break-before:always;' : '';
      bodyContent += `
  <div style="${pageBreak}">
    <div style="margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #3b82f6;display:flex;justify-content:space-between;align-items:baseline;">
      <div>
        <span style="font-size:16px;font-weight:800;color:#1e293b;">Weekoverzicht — Week ${block.wkNum}</span>
        <span style="font-size:11px;color:#64748b;margin-left:8px;">${block.dateRange}</span>
      </div>
      <span style="font-size:9px;color:#94a3b8;">Wisselingen & ondersteuning</span>
    </div>
    ${block.gridHtml}
  </div>`;
    });

    const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>Weekoverzicht — Week ${titleWeeks}</title>
  <style>
    @media print {
      body { margin: 0; }
      @page { size: landscape; margin: 10mm; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0 auto;
      padding: 16px;
      color: #1e293b;
    }
    table { page-break-inside: avoid; }
    td:last-child { border-right: none !important; }
  </style>
</head>
<body>
  ${bodyContent}
  <div style="margin-top:16px;font-size:8px;color:#cbd5e1;text-align:right;">
    ${format(new Date(), 'd MMM yyyy HH:mm', { locale: nl })}
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => { printWindow.print(); };
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Calendar ── */}
      <div>
        {/* Header / navigation */}
        <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-800">
                Weekoverzicht — Week {weekNum}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                {capitalize(format(weekDates[0], 'd MMMM', { locale: nl }))} t/m{' '}
                {format(weekDates[4], 'd MMMM yyyy', { locale: nl })}
              </p>
            </div>
            <button
              onClick={() => setShowPrintModal(true)}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors border border-gray-200 text-gray-500 hover:text-gray-700"
              title="Weekoverzicht printen (PDF)"
            >
              <Printer className="w-4 h-4" />
            </button>
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
        <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 text-xs text-gray-500">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {weekDates.map((date, i) => {
            const today = isToday(date);
            const selected = selectedDay && isSameDay(selectedDay, date);
            const dayKey = getDayKey(date);
            const closure = getClosureForDay(date);
            const isFullClosure = closure && (closure.type === 'vacation' || closure.type === 'holiday');
            const isHalfDay = closure && closure.type === 'half_day';
            const { unmannedCount, absentCount } = isFullClosure ? { unmannedCount: 0, absentCount: 0 } : getDayStats(date);
            const hasProblems = unmannedCount > 0;
            const availableStaff = getAvailableStaff(date);
            const ambulantStaff = getAmbulantStaff(date);

            // Group available staff by unit for "Ondersteuning" display (with overrides)
            const staffByUnit = {};
            const staffNoUnit = [];
            availableStaff.forEach(s => {
              const effectiveUnit = getEffectiveUnitId(s, date);
              if (effectiveUnit) {
                if (!staffByUnit[effectiveUnit]) staffByUnit[effectiveUnit] = [];
                staffByUnit[effectiveUnit].push(s);
              } else {
                staffNoUnit.push(s);
              }
            });

            return (
              <div
                key={i}
                className={`rounded-xl border-2 transition-all ${
                  isFullClosure
                    ? 'border-gray-200 opacity-60'
                    : selected
                    ? 'border-blue-400 shadow-md'
                    : today
                    ? 'border-blue-300'
                    : hasProblems
                    ? 'border-red-200'
                    : 'border-gray-200'
                } bg-white overflow-hidden`}
              >
                {/* Day header — clickable to open day detail */}
                <div
                  onClick={() => setSelectedDay(date)}
                  className={`px-3 py-2 cursor-pointer transition-colors ${
                    isFullClosure
                      ? 'bg-gray-200 text-gray-500'
                      : today
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-50 border-b border-gray-100 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`font-semibold text-sm ${isFullClosure ? 'text-gray-500' : today ? 'text-white' : 'text-gray-800'} flex items-center gap-1`}>
                        {DAY_LABELS_NL[i]}
                        {getDayNote(date) && <span title={getDayNote(date).note}><StickyNote className={`w-3.5 h-3.5 ${today ? 'text-yellow-300' : 'text-yellow-500'}`} /></span>}
                      </div>
                      <div className={`text-xs ${isFullClosure ? 'text-gray-400' : today ? 'text-blue-100' : 'text-gray-400'}`}>
                        {format(date, 'd MMM', { locale: nl })}
                      </div>
                    </div>
                    {isFullClosure ? (
                      <span className="inline-flex items-center gap-0.5 text-xs bg-gray-400 text-white rounded px-1.5 py-0.5 font-medium">
                        <CalendarOff className="w-2.5 h-2.5" />
                        Vrij
                      </span>
                    ) : unmannedCount > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-xs bg-red-500 text-white rounded px-1.5 py-0.5 font-medium">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {unmannedCount} onbemand
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-xs bg-green-500 text-white rounded px-1.5 py-0.5 font-medium">
                        <CheckCircle className="w-2.5 h-2.5" />
                        OK
                      </span>
                    )}
                  </div>
                </div>

                {/* Full closure body */}
                {isFullClosure ? (
                  <div className="p-4 text-center">
                    <CalendarOff className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                    <div className="text-sm font-medium text-gray-400">{closure.name}</div>
                    <div className="text-xs text-gray-300 mt-0.5">
                      {closure.type === 'vacation' ? 'Vakantie' : 'Feestdag'}
                    </div>
                  </div>
                ) : (
                <>
                {/* Group cards */}
                <div className="p-2 space-y-1">
                  {isHalfDay && (
                    <div className="mb-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {closure.name} — vrij vanaf {closure.freeFromTime}
                    </div>
                  )}
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
                    // Only count whole-day staff for overstaffing (time-limited replacements don't count)
                    const wholeDayStaffCount = gs.filter(s => !s.absent && !s.replacementStartTime).length;
                    const isOverstaffed = wholeDayStaffCount > 1;

                    // Absent but covered by replacement → green with orange border
                    const absentButCovered = hasAbsent && !unmanned;

                    return (
                      <div
                        key={group.id}
                        onClick={() => setSelectedGroup({ group, date })}
                        className={`rounded-lg px-2 py-1.5 text-xs border cursor-pointer hover:brightness-95 transition-all ${
                          unmanned
                            ? 'bg-red-50 border-red-300'
                            : isOverstaffed
                            ? 'bg-yellow-50 border-yellow-300'
                            : absentButCovered
                            ? 'bg-green-50 border-orange-400'
                            : hasTimeAbsent
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
                                    {s.replacementStartTime && (
                                      <span className="text-indigo-500 text-[9px] ml-0.5">({s.replacementStartTime}–{s.replacementEndTime})</span>
                                    )}
                                  </span>
                                </span>
                              ))}
                            </span>
                          )}
                          {unmanned ? (
                            <AlertTriangle className="w-3 h-3 text-red-500 ml-auto flex-shrink-0" title="Onbemand" />
                          ) : isOverstaffed ? (
                            <AlertTriangle className="w-3 h-3 text-yellow-500 ml-auto flex-shrink-0" title="Te veel medewerkers!" />
                          ) : (
                            <CheckCircle className="w-3 h-3 text-green-500 ml-auto flex-shrink-0" title="OK" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Ondersteuning (unit support) */}
                {availableStaff.length > 0 && (
                  <div className="px-2 pt-1 pb-1.5 border-t border-gray-100">
                    <div className={`text-xs font-semibold flex items-center gap-1 mb-1 ${today ? 'text-blue-200' : 'text-indigo-500'}`}>
                      <Users className="w-3 h-3" />
                      Ondersteuning
                    </div>
                    {units.filter(u => staffByUnit[u.id]).map(u => (
                      <div key={u.id} className="mb-1">
                        <div className="text-[10px] font-semibold text-indigo-400 mb-0.5">{u.name}</div>
                        <div className="flex flex-wrap gap-1">
                          {staffByUnit[u.id].map(s => {
                            const hasOverride = !!getUnitOverride(s.id, date);
                            return (
                              <span
                                key={s.id}
                                onClick={canPlan ? (e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setUnitMovePopup({
                                    staffId: s.id,
                                    staffName: s.name.split(' ')[0],
                                    date,
                                    currentUnitId: getEffectiveUnitId(s, date),
                                    rect,
                                  });
                                } : undefined}
                                className={`text-xs rounded-full px-1.5 py-0.5 transition-colors ${
                                  canPlan ? 'cursor-pointer hover:bg-indigo-200' : ''
                                } ${
                                  hasOverride
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                }`}
                                title={!canPlan ? s.name.split(' ')[0] : hasOverride ? `${s.name.split(' ')[0]} — verplaatst (klik om te wijzigen)` : `${s.name.split(' ')[0]} — klik om te verplaatsen`}
                              >
                                {hasOverride && '↪ '}{s.name.split(' ')[0]}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {staffNoUnit.length > 0 && (
                      <div className="mb-1">
                        <div className="text-[10px] font-semibold text-gray-400 mb-0.5">Overig</div>
                        <div className="flex flex-wrap gap-1">
                          {staffNoUnit.map(s => (
                            <span key={s.id} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-1.5 py-0.5">
                              {s.name.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
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

                {/* Day note */}
                <DayNoteInline date={date} note={getDayNote(date)} dispatch={dispatch} canPlan={canPlan} />

              </>
              )}
            </div>
            );
          })}
        </div>
      </div>

      {/* ── Unit move popup ── */}
      {canPlan && unitMovePopup && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setUnitMovePopup(null)} />
          <div
            className="fixed z-50 bg-white shadow-xl rounded-lg border border-gray-200 py-1 min-w-[160px]"
            style={{
              top: Math.min(unitMovePopup.rect.bottom + 4, window.innerHeight - 200),
              left: Math.min(unitMovePopup.rect.left, window.innerWidth - 180),
            }}
          >
            <div className="px-3 py-1.5 text-xs font-bold text-gray-500 border-b border-gray-100">
              {unitMovePopup.staffName} verplaatsen
            </div>
            {units.map(unit => (
              <button
                key={unit.id}
                onClick={() => handleUnitMove(unitMovePopup.staffId, unitMovePopup.date, unit.id)}
                className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                  unit.id === unitMovePopup.currentUnitId
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {unit.name}
                {unit.id === unitMovePopup.currentUnitId && ' ✓'}
              </button>
            ))}
            {getUnitOverride(unitMovePopup.staffId, unitMovePopup.date) && (
              <button
                onClick={() => handleUnitMoveReset(unitMovePopup.staffId, unitMovePopup.date)}
                className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100"
              >
                Standaard herstellen
              </button>
            )}
          </div>
        </>
      )}

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
          getEffectiveUnitId={getEffectiveUnitId}
          getUnitOverride={getUnitOverride}
          onUnitMove={handleUnitMove}
          onUnitMoveReset={handleUnitMoveReset}
          dayNote={getDayNote(selectedDay)}
          dispatch={dispatch}
          onClose={() => setSelectedDay(null)}
          canPlan={canPlan}
        />
      )}

      {/* ── Single group popup ── */}
      {selectedGroup && (
        <GroupPopup
          group={selectedGroup.group}
          date={selectedGroup.date}
          staffList={getGroupStaff(selectedGroup.group.id, selectedGroup.date)}
          allStaff={staff}
          unitStaff={selectedGroup.group.unitId ? getUnitStaff(selectedGroup.group.unitId, selectedGroup.date) : []}
          unit={units.find(u => u.id === selectedGroup.group.unitId) || null}
          unmanned={isGroupUnmanned(selectedGroup.group.id, selectedGroup.date)}
          absences={absences}
          timeAbsences={timeAbsences || []}
          staffDateAssignments={state.staffDateAssignments || []}
          gradeLevelSchedules={gradeLevelSchedules}
          dispatch={dispatch}
          onClose={() => setSelectedGroup(null)}
          canPlan={canPlan}
        />
      )}

      {/* Print options modal */}
      {showPrintModal && (
        <PrintOptionsModal
          onPrint={(offset, count) => {
            setShowPrintModal(false);
            generateWeekPDF(offset, count);
          }}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}

// ── Print options modal ──────────────────────────────────────────────────

function PrintOptionsModal({ onPrint, onClose }) {
  const [startWeek, setStartWeek] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('printPreferences'));
      return saved?.startWeek || 'current';
    } catch { return 'current'; }
  });
  const [weekCount, setWeekCount] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('printPreferences'));
      return saved?.weekCount || 1;
    } catch { return 1; }
  });

  function handlePrint() {
    try {
      localStorage.setItem('printPreferences', JSON.stringify({ startWeek, weekCount }));
    } catch { /* ignore */ }
    const offset = startWeek === 'next' ? 1 : 0;
    onPrint(offset, weekCount);
  }

  const rangeOptions = [
    { value: 'current', label: 'Huidige week' },
    { value: 'next', label: 'Volgende week' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Printer className="w-4 h-4 text-gray-500" />
            Afdrukken
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Bereik */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Bereik</label>
            <div className="flex gap-2">
              {rangeOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStartWeek(opt.value)}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
                    startWeek === opt.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Aantal weken */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Aantal weken</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setWeekCount(n)}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
                    weekCount === n
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <Printer className="w-3.5 h-3.5" />
            Afdrukken
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Day detail modal ───────────────────────────────────────────────────────

function DayDetailModal({
  date, groups, units, staff, absences, timeAbsences,
  getGroupStaff, getUnitStaff, getAbsentOnDay, getAvailableStaff, getAmbulantStaff,
  isGroupUnmanned, getEffectiveUnitId, getUnitOverride, onUnitMove, onUnitMoveReset,
  dayNote, dispatch, onClose, canPlan,
}) {
  const [staffAction, setStaffAction] = useState(null);
  const [unitMoveTarget, setUnitMoveTarget] = useState(null);
  const absentStaff = getAbsentOnDay(date);
  const availableStaff = getAvailableStaff(date);
  const ambulantStaff = getAmbulantStaff(date);
  const dateLabel = capitalize(format(date, 'EEEE d MMMM yyyy', { locale: nl }));
  const today = isToday(date);
  const dayKey = getDayKey(date);

  // Group available staff by unit for "Ondersteuning" display (with overrides)
  const staffByUnit = {};
  const staffNoUnit = [];
  availableStaff.forEach(s => {
    const effectiveUnit = getEffectiveUnitId(s, date);
    if (effectiveUnit) {
      if (!staffByUnit[effectiveUnit]) staffByUnit[effectiveUnit] = [];
      staffByUnit[effectiveUnit].push(s);
    } else {
      staffNoUnit.push(s);
    }
  });

  const ungroupedGroups = groups.filter(g => !g.unitId || !units.find(u => u.id === g.unitId)).sort((a, b) => a.name.localeCompare(b.name, 'nl'));

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
              const unitGroups = groups.filter(g => g.unitId === unit.id).sort((a, b) => a.name.localeCompare(b.name, 'nl'));
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
                          date={date}
                          staffList={getGroupStaff(group.id, date)}
                          unmanned={isGroupUnmanned(group.id, date)}
                          onStaffClick={canPlan ? setStaffAction : undefined}
                          canPlan={canPlan}
                          gradeLevelSchedules={gradeLevelSchedules}
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
                          onClick={canPlan ? () => setStaffAction(s) : undefined}
                          className={`flex items-center gap-2 text-xs py-1 px-1 rounded transition-colors ${canPlan ? 'cursor-pointer' : ''} ${s.absent ? 'text-amber-700' + (canPlan ? ' hover:bg-amber-100' : '') : 'text-blue-700' + (canPlan ? ' hover:bg-blue-100' : '')}`}
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
                        date={date}
                        staffList={getGroupStaff(group.id, date)}
                        unmanned={isGroupUnmanned(group.id, date)}
                        canPlan={canPlan}
                        gradeLevelSchedules={gradeLevelSchedules}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ondersteuning (unit support) */}
            {availableStaff.length > 0 && (
              <div className="pt-2 border-t border-gray-100 relative">
                <h3 className="font-bold text-gray-700 text-sm mb-2 pb-1 border-b border-gray-200 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-500" />
                  Ondersteuning ({availableStaff.length})
                  {canPlan && <span className="text-[10px] font-normal text-gray-400 ml-auto">Klik om te verplaatsen</span>}
                </h3>
                <div className="space-y-2">
                  {units.filter(u => staffByUnit[u.id]).map(u => (
                    <div key={u.id}>
                      <div className="text-xs font-semibold text-indigo-500 mb-1">{u.name}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {staffByUnit[u.id].map(s => {
                          const hasOverride = !!getUnitOverride(s.id, date);
                          return (
                            <span
                              key={s.id}
                              onClick={canPlan ? () => setUnitMoveTarget({
                                staffId: s.id,
                                staffName: s.name,
                                date,
                                currentUnitId: getEffectiveUnitId(s, date),
                              }) : undefined}
                              className={`text-xs rounded-full px-2.5 py-1 font-medium transition-colors ${canPlan ? 'cursor-pointer' : ''} ${
                                hasOverride
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300' + (canPlan ? ' hover:bg-amber-200' : '')
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200' + (canPlan ? ' hover:bg-indigo-100' : '')
                              }`}
                              title={!canPlan ? s.name : hasOverride ? 'Verplaatst — klik om te wijzigen' : 'Klik om te verplaatsen'}
                            >
                              {hasOverride && '↪ '}{s.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {staffNoUnit.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-400 mb-1">Overig</div>
                      <div className="flex flex-wrap gap-1.5">
                        {staffNoUnit.map(s => (
                          <span key={s.id} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1 font-medium">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Unit move popup within modal */}
                {canPlan && unitMoveTarget && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setUnitMoveTarget(null)} />
                    <div className="absolute right-0 top-0 z-[70] bg-white shadow-xl rounded-lg border border-gray-200 py-1 min-w-[180px]">
                      <div className="px-3 py-1.5 text-xs font-bold text-gray-500 border-b border-gray-100">
                        {unitMoveTarget.staffName.split(' ')[0]} verplaatsen
                      </div>
                      {units.map(unit => (
                        <button
                          key={unit.id}
                          onClick={() => {
                            onUnitMove(unitMoveTarget.staffId, unitMoveTarget.date, unit.id);
                            setUnitMoveTarget(null);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                            unit.id === unitMoveTarget.currentUnitId
                              ? 'bg-indigo-50 text-indigo-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {unit.name}
                          {unit.id === unitMoveTarget.currentUnitId && ' ✓'}
                        </button>
                      ))}
                      {getUnitOverride(unitMoveTarget.staffId, unitMoveTarget.date) && (
                        <button
                          onClick={() => {
                            onUnitMoveReset(unitMoveTarget.staffId, unitMoveTarget.date);
                            setUnitMoveTarget(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100"
                        >
                          Standaard herstellen
                        </button>
                      )}
                    </div>
                  </>
                )}
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

            {/* Absent staff */}
            {absentStaff.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <h3 className="font-bold text-gray-700 text-sm mb-2 pb-1 border-b border-gray-200 flex items-center gap-1.5">
                  <UserX className="w-4 h-4 text-amber-500" />
                  Afwezig ({absentStaff.length})
                </h3>
                <div className="space-y-1">
                  {absentStaff.map(s => (
                    <div key={s.id} className="flex items-center gap-2 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-2.5 py-1.5">
                      <UserX className="w-3 h-3 flex-shrink-0" />
                      <span className="line-through font-medium flex-1">{s.name}</span>
                      <span className="text-amber-500 font-semibold ml-auto">({s.reason || 'afwezig'})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Day note */}
            <DayNoteSection date={date} note={dayNote} dispatch={dispatch} canPlan={canPlan} />
          </div>
        </div>
      </div>
    </div>
    {canPlan && staffAction && (
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

function GroupDetailCard({ group, date, staffList, unmanned, onStaffClick, canPlan, gradeLevelSchedules }) {
  const hasAbsent = staffList.some(s => s.absent);
  const hasTimeAbsent = staffList.some(s => !s.absent && s.timeAbsences?.length > 0);
  const hasReplacement = staffList.some(s => s.isReplacement === true);
  const dayKey = DAYS[date.getDay() - 1] || 'monday';
  const times = getGroupTimesForDay(group, gradeLevelSchedules, dayKey);

  return (
    <div
      className={`rounded-lg p-3 border text-sm ${
        unmanned
          ? 'bg-red-50 border-red-300'
          : (hasAbsent || hasTimeAbsent)
          ? 'bg-amber-50 border-amber-200'
          : 'bg-white border-gray-200'
      } ${hasReplacement ? 'border-l-4 border-l-orange-400' : ''}`}
    >
      {/* Group name + times */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
        <span className="font-semibold text-gray-800">{group.name}</span>
        <span className="ml-auto text-xs text-gray-400">
          {times.startTime}–{times.endTime}
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
                onClick={onStaffClick ? (e => { e.stopPropagation(); onStaffClick(s); }) : undefined}
                className={`flex items-center gap-2 rounded px-2 py-1 transition-colors ${onStaffClick ? 'cursor-pointer' : ''} ${
                  s.absent ? 'bg-amber-100 text-amber-800' + (onStaffClick ? ' hover:bg-amber-200' : '') : 'bg-green-100 text-green-800' + (onStaffClick ? ' hover:bg-green-200' : '')
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

function GroupPopup({ group, date, staffList, allStaff, unitStaff, unit, unmanned, absences, timeAbsences, staffDateAssignments, gradeLevelSchedules, dispatch, onClose, canPlan }) {
  const [staffAction, setStaffAction] = useState(null);
  const [showReplacementMode, setShowReplacementMode] = useState(false);
  const [replacementTimeSlot, setReplacementTimeSlot] = useState(null); // { startTime, endTime } or null for whole-day
  const dateLabel = capitalize(format(date, 'EEEE d MMMM yyyy', { locale: nl }));
  const today = isToday(date);
  const dayKey = DAYS[date.getDay() - 1] || 'monday';
  const groupTimes = getGroupTimesForDay(group, gradeLevelSchedules, dayKey);
  const hasAbsent = staffList.some(s => s.absent);
  const hasTimeAbsent = staffList.some(s => !s.absent && s.timeAbsences?.length > 0);

  // Split all staff into available and absent
  const dateStr = formatLocalDate(date);
  const availableStaff = (allStaff || []).filter(s => {
    // Check if already in this group
    const inGroupEntries = staffList.filter(st => st.id === s.id);
    if (inGroupEntries.length > 0) {
      if (replacementTimeSlot) {
        // In time-slot mode: only exclude if whole-day presence or overlapping time slot
        const blocked = inGroupEntries.some(st =>
          (!st.replacementStartTime && !st.absent) ||
          (st.replacementStartTime && timeRangesOverlap(st.replacementStartTime, st.replacementEndTime, replacementTimeSlot.startTime, replacementTimeSlot.endTime))
        );
        if (blocked) return false;
        // Non-overlapping time slots in this group — still available for this slot
      } else {
        return false; // Whole-day mode: already in group = not available
      }
    }

    // Not absent
    if (absences.some(a => a.staff_id === s.id && isSameDay(new Date(a.date), date))) return false;

    // Get the schedule for this day
    const daySchedule = s.schedule?.[dayKey];
    const scheduleType = daySchedule?.type;

    // Assigned to another group via weekly schedule → not available
    if (scheduleType === 'group') return false;

    // Free or unit type → potentially available
    if (scheduleType === 'unit' || scheduleType === 'none' || scheduleType === undefined || scheduleType === null) {
      // In time-slot mode: also check date assignments on OTHER groups for overlap
      if (replacementTimeSlot) {
        const otherAssignments = (staffDateAssignments || []).filter(a =>
          a.staffId === s.id && a.date === dateStr && a.groupId !== group.id
        );
        const blockedByOther = otherAssignments.some(a =>
          !a.startTime || // whole-day assignment to another group
          timeRangesOverlap(a.startTime, a.endTime, replacementTimeSlot.startTime, replacementTimeSlot.endTime)
        );
        if (blockedByOther) return false;
      }

      // Check working hours cover the required time range
      const requiredStart = replacementTimeSlot?.startTime || groupTimes.startTime;
      const requiredEnd = replacementTimeSlot?.endTime || groupTimes.endTime;
      if (!workingHoursCover(daySchedule, requiredStart, requiredEnd)) return false;

      return true;
    }

    return false;
  });

  // Get absent staff (not already in this group and not in other groups)
  const absentStaffForReplacement = (allStaff || []).filter(s => {
    // Not already in this group
    if (staffList.some(st => st.id === s.id)) return false;

    // Must be absent on this day
    const isAbsent = absences.some(a => a.staff_id === s.id && isSameDay(new Date(a.date), date));
    if (!isAbsent) return false;

    // Don't show if assigned to another group
    const daySchedule = s.schedule?.[dayKey];
    if (daySchedule?.type === 'group') return false;

    return true;
  });

  function addReplacement(staffId, startTime = null, endTime = null) {
    // Create a date-specific assignment for this replacement
    const dateStr = formatLocalDate(date);
    dispatch({
      type: 'ADD_STAFF_DATE_ASSIGNMENT',
      payload: {
        id: generateId(),
        staffId,
        groupId: group.id,
        date: dateStr,
        type: 'replacement',
        startTime,
        endTime,
      },
    });
    setShowReplacementMode(false);
    setReplacementTimeSlot(null);
  }

  function removeStaffFromGroup(staffMember) {
    if (staffMember.assignmentId) {
      // Delete specific assignment by ID
      dispatch({
        type: 'DELETE_STAFF_DATE_ASSIGNMENT',
        payload: staffMember.assignmentId,
      });
    } else {
      // Fallback: delete all assignments for this staff on this date
      const dateStr = formatLocalDate(date);
      dispatch({
        type: 'DELETE_STAFF_DATE_ASSIGNMENTS_BY_DATE_AND_STAFF',
        payload: { date: dateStr, staffId: staffMember.id },
      });
    }
  }

  // Split staff into available and absent
  const availableStaffList = staffList.filter(s => !s.absent);
  const absentStaffList = staffList.filter(s => s.absent);

  // Recalculate unmanned based on available staff only
  const staffUnmanned = unmanned && availableStaffList.length === 0;

  const statusColor = staffUnmanned
    ? { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' }
    : availableStaffList.some(s => s.timeAbsences?.length > 0)
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
          <div className="flex items-center gap-2.5 flex-1">
            <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
            <div>
              <div className="font-bold text-gray-900">{group.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">{dateLabel}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canPlan && (
              <button
                onClick={() => setShowReplacementMode(!showReplacementMode)}
                className="p-1 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                title="Vervanging regelen"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-lg text-gray-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-12rem)]">
          <div className="p-4 space-y-4">
            {/* Times */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span className="font-medium text-gray-700">{groupTimes.startTime}–{groupTimes.endTime}</span>
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
              {availableStaffList.length === 0 ? (
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold ${statusColor.bg} ${statusColor.border} border ${statusColor.text}`}>
                  <AlertTriangle className="w-4 h-4" />
                  Geen leerkracht ingepland!
                </div>
              ) : (
                <div className="space-y-1">
                  {availableStaffList.map(s => (
                    <div key={s.id}>
                      <div
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors text-sm ${
                          s.absent
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-50 text-gray-800'
                        }`}
                      >
                        {canPlan ? (
                          <button
                            onClick={e => { e.stopPropagation(); setStaffAction(s); }}
                            className="flex-1 flex items-center gap-2 cursor-pointer hover:opacity-80"
                          >
                            {s.absent
                              ? <UserX className="w-3.5 h-3.5 flex-shrink-0" />
                              : <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                            }
                            <span className={s.absent ? 'line-through' : ''}>{s.name}</span>
                            <span className="text-xs text-gray-400 ml-0.5">{s.role}</span>
                            {s.isReplacement && s.replacementStartTime && (
                              <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200 font-medium flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {s.replacementStartTime}–{s.replacementEndTime}
                              </span>
                            )}
                            {s.absent && (
                              <span className="ml-auto text-xs text-amber-600">({s.reason || 'afwezig'})</span>
                            )}
                          </button>
                        ) : (
                          <div className="flex-1 flex items-center gap-2">
                            {s.absent
                              ? <UserX className="w-3.5 h-3.5 flex-shrink-0" />
                              : <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                            }
                            <span className={s.absent ? 'line-through' : ''}>{s.name}</span>
                            <span className="text-xs text-gray-400 ml-0.5">{s.role}</span>
                            {s.isReplacement && s.replacementStartTime && (
                              <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200 font-medium flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {s.replacementStartTime}–{s.replacementEndTime}
                              </span>
                            )}
                            {s.absent && (
                              <span className="ml-auto text-xs text-amber-600">({s.reason || 'afwezig'})</span>
                            )}
                          </div>
                        )}
                        {canPlan && (
                          <button
                            onClick={e => { e.stopPropagation(); removeStaffFromGroup(s); }}
                            className="flex-shrink-0 p-1 rounded hover:bg-white/30 text-current transition-colors"
                            title="Verwijderen uit groep"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {!s.absent && s.timeAbsences?.length > 0 && (
                        <div className="ml-4 mt-0.5 space-y-0.5">
                          {s.timeAbsences.map(ta => (
                            <div key={ta.id} className="flex items-center gap-1.5 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-0.5">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              <span className="font-medium">{ta.startTime}–{ta.endTime}</span>
                              {ta.reason && <span className="text-orange-500 truncate">({ta.reason})</span>}
                              {canPlan && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setReplacementTimeSlot({ startTime: ta.startTime, endTime: ta.endTime });
                                  setShowReplacementMode(true);
                                }}
                                className="ml-auto text-blue-600 hover:text-blue-800 flex items-center gap-0.5 transition-colors"
                                title="Vervanger regelen voor dit tijdslot"
                              >
                                <UserPlus className="w-3 h-3" />
                              </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {staffUnmanned && (
                    <div className="flex items-center gap-1.5 text-red-600 text-xs font-semibold px-1 pt-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Geen beschikbare leerkrachten!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Absent staff */}
            {absentStaffList.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Afwezige leerkrachten
                </h3>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 space-y-0.5">
                  {absentStaffList.map(s => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 text-xs py-1 px-1 rounded text-amber-700"
                    >
                      <UserX className="w-3 h-3 flex-shrink-0" />
                      <span className="line-through">{s.name}</span>
                      <span className="text-amber-500 ml-auto font-medium">({s.reason || 'afwezig'})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Replacement mode */}
            {canPlan && showReplacementMode && (
              <div className="space-y-3">
                {/* Available staff */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {replacementTimeSlot
                      ? `Beschikbare vervangers (${replacementTimeSlot.startTime}–${replacementTimeSlot.endTime})`
                      : 'Beschikbare vervangers'
                    }
                  </h3>
                  {availableStaff.length === 0 ? (
                    <div className="text-xs text-gray-500 px-2 py-1.5 rounded bg-gray-50 border border-gray-200">
                      Geen beschikbare collega's
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {availableStaff.map(s => {
                        const daySchedule = s.schedule?.[dayKey];
                        const isUnitStaff = daySchedule?.type === 'unit';
                        return (
                          <button
                            key={s.id}
                            onClick={() => addReplacement(s.id, replacementTimeSlot?.startTime || null, replacementTimeSlot?.endTime || null)}
                            className={`w-full text-left flex items-center gap-2 rounded-lg px-3 py-2 transition-colors text-sm font-medium ${
                              isUnitStaff
                                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            <UserPlus className="w-3.5 h-3.5 flex-shrink-0" />
                            <div className="flex-1">
                              <span>{s.name}</span>
                              {isUnitStaff && (
                                <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-blue-200 text-blue-800 font-semibold">
                                  Ondersteuning
                                </span>
                              )}
                              {daySchedule?.startTime && daySchedule?.endTime && (
                                <span className="ml-1 text-xs text-gray-400">
                                  ({daySchedule.startTime}–{daySchedule.endTime})
                                </span>
                              )}
                            </div>
                            <span className={`text-xs ml-auto ${isUnitStaff ? 'text-blue-600' : 'text-green-600'}`}>
                              {s.role}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Absent staff */}
                {absentStaffForReplacement.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Afwezig
                    </h3>
                    <div className="space-y-1">
                      {absentStaffForReplacement.map(s => {
                        const absence = absences.find(a => a.staff_id === s.id && isSameDay(new Date(a.date), date));
                        return (
                          <button
                            key={s.id}
                            onClick={() => addReplacement(s.id, replacementTimeSlot?.startTime || null, replacementTimeSlot?.endTime || null)}
                            disabled
                            className="w-full text-left flex items-center gap-2 rounded-lg px-3 py-2 transition-colors text-sm font-medium bg-gray-100 text-gray-500 opacity-60 cursor-not-allowed"
                          >
                            <UserX className="w-3.5 h-3.5 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="line-through">{s.name}</span>
                            </div>
                            <span className="text-xs ml-auto text-gray-400">
                              ({absence?.reason || 'afwezig'})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    {canPlan && staffAction && (
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

// ── Day Note inline (calendar column) ─────────────────────────────────────

function DayNoteInline({ date, note, dispatch, canPlan }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note?.text || '');

  useEffect(() => {
    setText(note?.text || '');
  }, [note?.text]);

  const handleSave = () => {
    const trimmed = text.trim();
    if (trimmed) {
      dispatch({
        type: 'SET_DAY_NOTE',
        payload: {
          id: note?.id || generateId(),
          date: formatLocalDate(date),
          text: trimmed,
        },
      });
    } else if (note?.id) {
      dispatch({ type: 'DELETE_DAY_NOTE', payload: note.id });
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setText(note?.text || '');
      setEditing(false);
    }
  };

  if (canPlan && editing) {
    return (
      <div className="px-2 pb-2 pt-1 border-t border-gray-100">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
          rows={2}
          className="w-full text-xs px-2 py-1.5 border border-yellow-300 rounded-lg focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 resize-none bg-yellow-50"
          placeholder="Notitie..."
        />
      </div>
    );
  }

  if (note?.text) {
    return (
      <div
        className={`px-2 pb-2 pt-1 border-t border-gray-100 ${canPlan ? 'cursor-pointer group' : ''}`}
        onClick={canPlan ? (e) => { e.stopPropagation(); setEditing(true); } : undefined}
      >
        <div className="flex items-start gap-1">
          <StickyNote className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 line-clamp-2 flex-1">{note.text}</p>
          {canPlan && <Pencil className="w-2.5 h-2.5 text-gray-300 group-hover:text-gray-500 flex-shrink-0 mt-0.5 transition-colors" />}
        </div>
      </div>
    );
  }

  if (!canPlan) return null;

  return (
    <div className="px-2 pb-1.5 pt-1 border-t border-gray-100">
      <button
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        className="flex items-center gap-1 text-xs text-gray-300 hover:text-gray-500 transition-colors"
      >
        <StickyNote className="w-3 h-3" />
        <span>Notitie</span>
      </button>
    </div>
  );
}

// ── Day Note section (Day Detail Modal) ───────────────────────────────────

function DayNoteSection({ date, note, dispatch, canPlan }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note?.text || '');

  useEffect(() => {
    setText(note?.text || '');
  }, [note?.text]);

  const handleSave = () => {
    const trimmed = text.trim();
    if (trimmed) {
      dispatch({
        type: 'SET_DAY_NOTE',
        payload: {
          id: note?.id || generateId(),
          date: formatLocalDate(date),
          text: trimmed,
        },
      });
    } else if (note?.id) {
      dispatch({ type: 'DELETE_DAY_NOTE', payload: note.id });
    }
    setEditing(false);
  };

  const handleDelete = () => {
    if (note?.id) {
      dispatch({ type: 'DELETE_DAY_NOTE', payload: note.id });
    }
    setText('');
    setEditing(false);
  };

  return (
    <div className="pt-3 border-t border-gray-100">
      <h3 className="font-bold text-gray-700 text-sm mb-2 pb-1 border-b border-gray-200 flex items-center gap-1.5">
        <StickyNote className="w-4 h-4 text-yellow-500" />
        Notitie
      </h3>

      {canPlan && editing ? (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            rows={3}
            className="w-full text-sm px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 resize-none bg-yellow-50"
            placeholder="Schrijf een notitie voor deze dag..."
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSave}
              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Opslaan
            </button>
            <button
              onClick={() => { setText(note?.text || ''); setEditing(false); }}
              className="text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Annuleren
            </button>
            {note?.id && (
              <button
                onClick={handleDelete}
                className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Verwijderen
              </button>
            )}
          </div>
        </div>
      ) : note?.text ? (
        <div
          className={`bg-yellow-50 border border-yellow-200 rounded-lg p-3 transition-colors ${canPlan ? 'cursor-pointer hover:bg-yellow-100 group' : ''}`}
          onClick={canPlan ? () => setEditing(true) : undefined}
        >
          <div className="flex items-start gap-2">
            <p className="text-sm text-gray-700 whitespace-pre-wrap flex-1">{note.text}</p>
            {canPlan && <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 flex-shrink-0 mt-0.5 transition-colors" />}
          </div>
        </div>
      ) : canPlan ? (
        <button
          onClick={() => setEditing(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Notitie toevoegen
        </button>
      ) : (
        <p className="text-sm text-gray-400 italic">Geen notitie</p>
      )}
    </div>
  );
}
