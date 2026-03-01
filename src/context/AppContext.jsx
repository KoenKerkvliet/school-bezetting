import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import * as db from '../services/database';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';
import {
  appGroupToDb, appUnitToDb, appStaffToDb, appStaffToScheduleRows,
  appAbsenceToDb, appTimeAbsenceToDb, appStaffDateAssignmentToDb, appUnitOverrideToDb, appDayNoteToDb,
} from '../services/dataMapper';
import { logAuditAction } from '../services/userService';

const AppContext = createContext(null);

// Start empty — data comes from Supabase or localStorage
const emptyState = {
  groups: [],
  units: [],
  staff: [],
  absences: [],
  timeAbsences: [],
  staffDateAssignments: [], // Date-specific staff assignments (replacements, overrides)
  unitOverrides: [], // Day-specific unit reassignments { id, staffId, date, unitId }
  dayNotes: [], // Notes per day { id, date, text }
  gradeLevelSchedules: [], // Lesson times per grade level per day
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_INITIAL_STATE':
      return action.payload;

    case 'ADD_GROUP':
      return { ...state, groups: [...state.groups, action.payload] };
    case 'UPDATE_GROUP':
      return { ...state, groups: state.groups.map(g => g.id === action.payload.id ? action.payload : g) };
    case 'DELETE_GROUP':
      return {
        ...state,
        groups: state.groups.filter(g => g.id !== action.payload),
        units: state.units.map(u => ({ ...u, groupIds: (u.groupIds || []).filter(id => id !== action.payload) })),
      };

    case 'ADD_UNIT':
      return { ...state, units: [...state.units, action.payload] };
    case 'UPDATE_UNIT':
      return { ...state, units: state.units.map(u => u.id === action.payload.id ? action.payload : u) };
    case 'DELETE_UNIT':
      return {
        ...state,
        units: state.units.filter(u => u.id !== action.payload),
        groups: state.groups.map(g => g.unitId === action.payload ? { ...g, unitId: null } : g),
      };

    case 'ADD_STAFF':
      return { ...state, staff: [...state.staff, action.payload] };
    case 'UPDATE_STAFF':
      return { ...state, staff: state.staff.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_STAFF':
      return {
        ...state,
        staff: state.staff.filter(s => s.id !== action.payload),
        absences: state.absences.filter(a => a.staff_id !== action.payload),
        timeAbsences: (state.timeAbsences || []).filter(a => a.staff_id !== action.payload),
      };

    case 'ADD_ABSENCE':
      return { ...state, absences: [...state.absences, action.payload] };
    case 'DELETE_ABSENCE':
      return { ...state, absences: state.absences.filter(a => a.id !== action.payload) };

    case 'ADD_TIME_ABSENCE':
      return { ...state, timeAbsences: [...(state.timeAbsences || []), action.payload] };
    case 'DELETE_TIME_ABSENCE':
      return { ...state, timeAbsences: (state.timeAbsences || []).filter(a => a.id !== action.payload) };

    case 'ADD_STAFF_DATE_ASSIGNMENT':
      return { ...state, staffDateAssignments: [...(state.staffDateAssignments || []), action.payload] };
    case 'DELETE_STAFF_DATE_ASSIGNMENT':
      return { ...state, staffDateAssignments: (state.staffDateAssignments || []).filter(a => a.id !== action.payload) };
    case 'DELETE_STAFF_DATE_ASSIGNMENTS_BY_DATE_AND_STAFF':
      // Delete all assignments for a specific staff on a specific date
      return {
        ...state,
        staffDateAssignments: (state.staffDateAssignments || []).filter(
          a => !(a.date === action.payload.date && a.staffId === action.payload.staffId)
        ),
      };

    case 'SET_UNIT_OVERRIDE': {
      // Upsert: replace existing override for same staff+date, or add new
      const existingOverride = (state.unitOverrides || []).find(
        o => o.staffId === action.payload.staffId && o.date === action.payload.date
      );
      if (existingOverride) {
        return {
          ...state,
          unitOverrides: state.unitOverrides.map(o =>
            o.staffId === action.payload.staffId && o.date === action.payload.date
              ? { ...o, unitId: action.payload.unitId }
              : o
          ),
        };
      }
      return { ...state, unitOverrides: [...(state.unitOverrides || []), action.payload] };
    }
    case 'DELETE_UNIT_OVERRIDE':
      // payload is { id, staffId, date } — filter by staffId+date for reliability
      return { ...state, unitOverrides: (state.unitOverrides || []).filter(o =>
        !(o.staffId === action.payload.staffId && o.date === action.payload.date)
      ) };

    case 'SET_DAY_NOTE': {
      // Upsert: replace existing note for same date, or add new
      const existing = (state.dayNotes || []).find(n => n.date === action.payload.date);
      if (existing) {
        return {
          ...state,
          dayNotes: state.dayNotes.map(n =>
            n.date === action.payload.date ? { ...n, text: action.payload.text } : n
          ),
        };
      }
      return { ...state, dayNotes: [...(state.dayNotes || []), action.payload] };
    }
    case 'DELETE_DAY_NOTE':
      return { ...state, dayNotes: (state.dayNotes || []).filter(n => n.id !== action.payload) };

    case 'SET_GRADE_LEVEL_SCHEDULES':
      return { ...state, gradeLevelSchedules: action.payload };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const { organizationId, isAuthenticated, user } = useAuth();

  // ── Load data on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        if (organizationId) {
          // Try Supabase first
          console.log('[AppContext] Loading from Supabase, orgId:', organizationId);
          const data = await db.loadAllData(organizationId);

          if (cancelled) return;

          const hasData = (data.groups?.length > 0 || data.staff?.length > 0);

          if (hasData) {
            // Grade level schedules come from localStorage (not Supabase yet)
            const savedLocal = localStorage.getItem('schoolPlanning');
            const localGLS = savedLocal ? (JSON.parse(savedLocal).gradeLevelSchedules || []) : [];

            dispatch({
              type: 'SET_INITIAL_STATE',
              payload: {
                groups: data.groups || [],
                units: data.units || [],
                staff: data.staff || [],
                absences: data.absences || [],
                timeAbsences: data.timeAbsences || [],
                staffDateAssignments: data.staffDateAssignments || [],
                unitOverrides: data.unitOverrides || [],
                dayNotes: data.dayNotes || [],
                gradeLevelSchedules: localGLS.length > 0 ? localGLS : DEFAULT_GRADE_LEVEL_SCHEDULES,
              }
            });
            console.log('[AppContext] Loaded from Supabase:', data.groups?.length, 'groups,', data.staff?.length, 'staff');
          } else {
            // Supabase is empty — try localStorage
            console.log('[AppContext] Supabase empty, trying localStorage');
            loadLocalStorage(cancelled);
          }
        } else {
          // No organizationId — use localStorage
          console.log('[AppContext] No organizationId, using localStorage');
          loadLocalStorage(cancelled);
        }

        if (!cancelled) setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error('[AppContext] Supabase load failed:', err);
        setError(err.message);
        loadLocalStorage(cancelled);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    function loadLocalStorage(skip) {
      if (skip) return;
      try {
        const saved = localStorage.getItem('schoolPlanning');
        if (saved) {
          const parsed = JSON.parse(saved);
          // Seed grade level schedules defaults if not present
          if (!parsed.gradeLevelSchedules || parsed.gradeLevelSchedules.length === 0) {
            parsed.gradeLevelSchedules = DEFAULT_GRADE_LEVEL_SCHEDULES;
          }
          dispatch({ type: 'SET_INITIAL_STATE', payload: parsed });
          console.log('[AppContext] Loaded from localStorage');
        }
      } catch {
        console.warn('[AppContext] localStorage parse failed');
      }
    }

    load();
    return () => { cancelled = true; };
  }, [organizationId, isAuthenticated]);

  // ── Enhanced dispatch: local update + Supabase write ────────────────
  const enhancedDispatch = useCallback((action) => {
    // 1. Update local state immediately (optimistic)
    dispatch(action);

    // 2. Write to Supabase in background
    if (organizationId && action.type !== 'SET_INITIAL_STATE') {
      console.log('[AppContext] Syncing', action.type, 'to Supabase...');
      writeToSupabase(organizationId, action, user?.id)
        .then(() => {
          console.log('[AppContext]', action.type, 'synced successfully');
          setSyncError(null);
        })
        .catch(err => {
          console.error('[AppContext]', action.type, 'sync failed:', err.message || err);
          setSyncError(`${action.type}: ${err.message || err}`);
        });
    } else if (!organizationId && action.type !== 'SET_INITIAL_STATE') {
      console.warn('[AppContext] Not syncing:', action.type, '— organizationId is null');
    }
  }, [organizationId, user]);

  // ── Save to localStorage as backup ──────────────────────────────────
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      localStorage.setItem('schoolPlanning', JSON.stringify(state));
    }, 500);
    return () => clearTimeout(timer);
  }, [state, loading]);

  return (
    <AppContext.Provider value={{
      state,
      dispatch: enhancedDispatch,
      loading,
      error,
      syncError,
    }}>
      {children}
    </AppContext.Provider>
  );
}

// ── Write a single action to Supabase (with field mapping + audit logging) ──
async function writeToSupabase(orgId, action, userId) {
  const p = action.payload;

  // Helper to log audit (fire-and-forget, never blocks)
  const audit = (resourceType, resourceId, changes) => {
    logAuditAction(orgId, userId, action.type, resourceType, resourceId, changes)
      .catch(() => {}); // silently ignore audit failures
  };

  switch (action.type) {
    // ── Groups ──
    case 'ADD_GROUP': {
      const row = appGroupToDb(p, orgId);
      const { error } = await supabase.from('groups').insert([row]);
      if (error) throw error;
      audit('group', p.id, { name: p.name });
      return;
    }
    case 'UPDATE_GROUP': {
      const row = appGroupToDb(p, orgId);
      const { id, organization_id, ...updates } = row;
      const { error } = await supabase.from('groups')
        .update(updates).eq('id', id).eq('organization_id', orgId);
      if (error) throw error;
      audit('group', p.id, { name: p.name });
      return;
    }
    case 'DELETE_GROUP': {
      // Cascade: remove from units.group_ids
      const { data: units } = await supabase.from('units')
        .select('id, group_ids').eq('organization_id', orgId);
      for (const unit of units || []) {
        if (unit.group_ids?.includes(p)) {
          await supabase.from('units')
            .update({ group_ids: unit.group_ids.filter(id => id !== p) })
            .eq('id', unit.id);
        }
      }
      const { error } = await supabase.from('groups')
        .delete().eq('id', p).eq('organization_id', orgId);
      if (error) throw error;
      audit('group', p, {});
      return;
    }

    // ── Units ──
    case 'ADD_UNIT': {
      const row = appUnitToDb(p, orgId);
      const { error } = await supabase.from('units').insert([row]);
      if (error) throw error;
      audit('unit', p.id, { name: p.name });
      return;
    }
    case 'UPDATE_UNIT': {
      const row = appUnitToDb(p, orgId);
      const { id, organization_id, ...updates } = row;
      const { error } = await supabase.from('units')
        .update(updates).eq('id', id).eq('organization_id', orgId);
      if (error) throw error;
      audit('unit', p.id, { name: p.name });
      return;
    }
    case 'DELETE_UNIT': {
      // Cascade: unlink groups
      await supabase.from('groups')
        .update({ unit_id: null })
        .eq('unit_id', p)
        .eq('organization_id', orgId);
      const { error } = await supabase.from('units')
        .delete().eq('id', p).eq('organization_id', orgId);
      if (error) throw error;
      audit('unit', p, {});
      return;
    }

    // ── Staff ──
    case 'ADD_STAFF': {
      const row = appStaffToDb(p, orgId);
      const { error } = await supabase.from('staff').insert([row]);
      if (error) throw error;
      // Also save schedule rows
      const schedRows = appStaffToScheduleRows(p).map(r => ({ ...r, organization_id: orgId }));
      console.log('[Sync] ADD_STAFF schedule rows:', schedRows.length);
      if (schedRows.length > 0) {
        const { error: sErr } = await supabase.from('staff_schedule').insert(schedRows);
        if (sErr) throw new Error(`Schedule save failed: ${sErr.message}`);
      }
      audit('staff', p.id, { name: p.name, staffName: p.name });
      return;
    }
    case 'UPDATE_STAFF': {
      const row = appStaffToDb(p, orgId);
      const { id, organization_id, ...updates } = row;
      const { error } = await supabase.from('staff')
        .update(updates).eq('id', id).eq('organization_id', orgId);
      if (error) throw error;
      // Replace schedule: delete old rows, insert new
      await supabase.from('staff_schedule').delete().eq('staff_id', p.id);
      const schedRows = appStaffToScheduleRows(p).map(r => ({ ...r, organization_id: orgId }));
      if (schedRows.length > 0) {
        const { error: sErr } = await supabase.from('staff_schedule').insert(schedRows);
        if (sErr) throw new Error(`Schedule update failed: ${sErr.message}`);
      }
      audit('staff', p.id, { name: p.name, staffName: p.name });
      return;
    }
    case 'DELETE_STAFF': {
      // Cascade
      await supabase.from('absences').delete().eq('staff_id', p);
      await supabase.from('time_absences').delete().eq('staff_id', p);
      await supabase.from('staff_schedule').delete().eq('staff_id', p);
      const { error } = await supabase.from('staff')
        .delete().eq('id', p).eq('organization_id', orgId);
      if (error) throw error;
      audit('staff', p, {});
      return;
    }

    // ── Absences ──
    case 'ADD_ABSENCE': {
      const row = appAbsenceToDb(p, orgId);
      console.log('[Sync] ADD_ABSENCE row:', row);
      const { error } = await supabase.from('absences').insert([row]);
      if (error) {
        console.error('[Sync] ADD_ABSENCE error:', error);
        throw error;
      }
      audit('absence', p.id, { staffName: p.staffName || '', reason: p.reason, date: p.date });
      return;
    }
    case 'DELETE_ABSENCE': {
      const { error } = await supabase.from('absences').delete().eq('id', p);
      if (error) throw error;
      audit('absence', p, {});
      return;
    }

    // ── Time absences ──
    case 'ADD_TIME_ABSENCE': {
      const row = appTimeAbsenceToDb(p, orgId);
      console.log('[Sync] ADD_TIME_ABSENCE row:', row);
      const { error } = await supabase.from('time_absences').insert([row]);
      if (error) {
        console.error('[Sync] ADD_TIME_ABSENCE error:', error);
        throw error;
      }
      audit('time_absence', p.id, { staffName: p.staffName || '', reason: p.reason, date: p.date, startTime: p.startTime, endTime: p.endTime });
      return;
    }
    case 'DELETE_TIME_ABSENCE': {
      const { error } = await supabase.from('time_absences').delete().eq('id', p);
      if (error) throw error;
      audit('time_absence', p, {});
      return;
    }

    // ── Date-specific staff assignments (replacements) ──
    case 'ADD_STAFF_DATE_ASSIGNMENT': {
      const row = appStaffDateAssignmentToDb(p, orgId);
      console.log('[Sync] ADD_STAFF_DATE_ASSIGNMENT row:', row);
      const { error } = await supabase.from('staff_date_assignments').insert([row]);
      if (error) {
        console.error('[Sync] ADD_STAFF_DATE_ASSIGNMENT error:', error);
        throw error;
      }
      audit('assignment', p.id, { staffName: p.staffName || '', groupName: p.groupName || '', date: p.date });
      return;
    }
    case 'DELETE_STAFF_DATE_ASSIGNMENT': {
      const { error } = await supabase.from('staff_date_assignments').delete().eq('id', p);
      if (error) throw error;
      audit('assignment', p, {});
      return;
    }
    case 'DELETE_STAFF_DATE_ASSIGNMENTS_BY_DATE_AND_STAFF': {
      // Delete all assignments for a specific staff on a specific date
      const { error } = await supabase.from('staff_date_assignments')
        .delete()
        .eq('staff_id', p.staffId)
        .eq('date', p.date)
        .eq('organization_id', orgId);
      if (error) throw error;
      audit('assignment', null, { staffId: p.staffId, date: p.date });
      return;
    }

    // ── Unit Overrides ──
    case 'SET_UNIT_OVERRIDE': {
      const row = appUnitOverrideToDb(p, orgId);
      // Upsert: check if override exists for this staff+date
      const { data: existingUO } = await supabase.from('staff_unit_overrides')
        .select('id').eq('staff_id', row.staff_id).eq('date', row.date).eq('organization_id', orgId).maybeSingle();
      if (existingUO) {
        const { error } = await supabase.from('staff_unit_overrides').update({ unit_id: row.unit_id }).eq('id', existingUO.id);
        if (error) throw error;
      } else {
        // Omit id from insert — let Supabase generate a proper UUID
        const { id: _localId, ...rowWithoutId } = row;
        const { error } = await supabase.from('staff_unit_overrides').insert([rowWithoutId]);
        if (error) throw error;
      }
      audit('unit_override', p.id, { staffId: p.staffId, date: p.date, unitId: p.unitId });
      return;
    }
    case 'DELETE_UNIT_OVERRIDE': {
      // p is { id, staffId, date } — delete by staff_id + date for reliability
      const { error } = await supabase.from('staff_unit_overrides')
        .delete()
        .eq('staff_id', p.staffId)
        .eq('date', p.date)
        .eq('organization_id', orgId);
      if (error) throw error;
      audit('unit_override', p.id, { staffId: p.staffId, date: p.date });
      return;
    }

    // ── Day Notes ──
    case 'SET_DAY_NOTE': {
      const row = appDayNoteToDb(p, orgId);
      // Upsert: try update first, then insert
      const { data: existing } = await supabase.from('day_notes')
        .select('id').eq('date', row.date).eq('organization_id', orgId).maybeSingle();
      if (existing) {
        const { error } = await supabase.from('day_notes')
          .update({ text: row.text }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('day_notes').insert([row]);
        if (error) throw error;
      }
      return;
    }
    case 'DELETE_DAY_NOTE': {
      const { error } = await supabase.from('day_notes').delete().eq('id', p);
      if (error) throw error;
      return;
    }

    case 'SET_GRADE_LEVEL_SCHEDULES':
      // Grade level schedules are stored in localStorage only (Supabase table not yet created)
      console.log('[Sync] Grade level schedules saved to localStorage (no Supabase sync yet)');
      return;

    default:
      console.warn('[Sync] Unknown action type:', action.type);
  }
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
export const DAY_LABELS_NL = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'];
export const DAY_LABELS_SHORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr'];

export const ROLES = ['Directie', 'MT', 'Intern Begeleider', 'Leerkracht', 'Onderwijsondersteuner', 'Onderwijsassistent', 'Conciërge', 'Overig'];

export const ABSENCE_REASONS = ['Ziek', 'Studiedag', 'Verlof', 'Nascholing', 'Vergadering', 'Overig'];
export const TIME_ABSENCE_REASONS = ['Bespreking', 'Vergadering', 'Overleg', 'Oudergesprek', 'Nascholing', 'Overig'];

export const GRADE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];

function makeGradeSchedule(gradeLevel, startTime, endTime, wedEnd) {
  return {
    id: `grade-${gradeLevel}`,
    gradeLevel,
    schedule: {
      monday:    { startTime, endTime },
      tuesday:   { startTime, endTime },
      wednesday: { startTime, endTime: wedEnd },
      thursday:  { startTime, endTime },
      friday:    { startTime, endTime },
    },
  };
}

export const DEFAULT_GRADE_LEVEL_SCHEDULES = [
  makeGradeSchedule(1, '08:30', '14:00', '12:30'),
  makeGradeSchedule(2, '08:30', '14:00', '12:30'),
  makeGradeSchedule(3, '08:30', '15:00', '12:30'),
  makeGradeSchedule(4, '08:30', '15:00', '12:30'),
  makeGradeSchedule(5, '08:30', '15:00', '12:30'),
  makeGradeSchedule(6, '08:30', '15:00', '12:30'),
  makeGradeSchedule(7, '08:30', '15:00', '12:30'),
  makeGradeSchedule(8, '08:30', '15:00', '12:30'),
];

export const GROUP_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
  '#64748b', '#84cc16', '#06b6d4', '#a855f7',
];

export function generateId() {
  // Use native crypto.randomUUID() for proper UUID format required by Supabase
  // Falls back to a simple UUID v4 implementation for older browsers
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: simple UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
