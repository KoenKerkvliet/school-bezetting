import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import * as db from '../services/database';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';
import {
  appGroupToDb, appUnitToDb, appStaffToDb, appStaffToScheduleRows,
  appAbsenceToDb, appTimeAbsenceToDb,
} from '../services/dataMapper';

const AppContext = createContext(null);

// Start empty — data comes from Supabase or localStorage
const emptyState = {
  groups: [],
  units: [],
  staff: [],
  absences: [],
  timeAbsences: [],
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

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const { organizationId, isAuthenticated } = useAuth();

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
            dispatch({
              type: 'SET_INITIAL_STATE',
              payload: {
                groups: data.groups || [],
                units: data.units || [],
                staff: data.staff || [],
                absences: data.absences || [],
                timeAbsences: data.timeAbsences || [],
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
      writeToSupabase(organizationId, action)
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
  }, [organizationId]);

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

// ── Write a single action to Supabase (with field mapping) ────────────
async function writeToSupabase(orgId, action) {
  const p = action.payload;

  switch (action.type) {
    // ── Groups ──
    case 'ADD_GROUP': {
      const row = appGroupToDb(p, orgId);
      const { error } = await supabase.from('groups').insert([row]);
      if (error) throw error;
      return;
    }
    case 'UPDATE_GROUP': {
      const row = appGroupToDb(p, orgId);
      const { id, organization_id, ...updates } = row;
      const { error } = await supabase.from('groups')
        .update(updates).eq('id', id).eq('organization_id', orgId);
      if (error) throw error;
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
      return;
    }

    // ── Units ──
    case 'ADD_UNIT': {
      const row = appUnitToDb(p, orgId);
      const { error } = await supabase.from('units').insert([row]);
      if (error) throw error;
      return;
    }
    case 'UPDATE_UNIT': {
      const row = appUnitToDb(p, orgId);
      const { id, organization_id, ...updates } = row;
      const { error } = await supabase.from('units')
        .update(updates).eq('id', id).eq('organization_id', orgId);
      if (error) throw error;
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
      return;
    }

    // ── Absences ──
    case 'ADD_ABSENCE': {
      const row = appAbsenceToDb(p, orgId);
      const { error } = await supabase.from('absences').insert([row]);
      if (error) throw error;
      return;
    }
    case 'DELETE_ABSENCE': {
      const { error } = await supabase.from('absences').delete().eq('id', p);
      if (error) throw error;
      return;
    }

    // ── Time absences ──
    case 'ADD_TIME_ABSENCE': {
      const row = appTimeAbsenceToDb(p, orgId);
      const { error } = await supabase.from('time_absences').insert([row]);
      if (error) throw error;
      return;
    }
    case 'DELETE_TIME_ABSENCE': {
      const { error } = await supabase.from('time_absences').delete().eq('id', p);
      if (error) throw error;
      return;
    }

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

export const ROLES = ['Leerkracht', 'Onderwijsassistent', 'Intern Begeleider', 'Directie', 'Overig'];

export const ABSENCE_REASONS = ['Ziek', 'Studiedag', 'Verlof', 'Nascholing', 'Vergadering', 'Overig'];
export const TIME_ABSENCE_REASONS = ['Bespreking', 'Vergadering', 'Overleg', 'Oudergesprek', 'Nascholing', 'Overig'];

export const GROUP_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
  '#64748b', '#84cc16', '#06b6d4', '#a855f7',
];

export function generateId() {
  return Math.random().toString(36).slice(2, 10);
}
