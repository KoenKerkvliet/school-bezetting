import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import * as db from '../services/database';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

// Sample data to demonstrate functionality
const initialState = {
  groups: [
    {
      id: 'g1', name: 'Groep 1', unitId: 'u1',
      startTime: '08:30', endTime: '14:30',
      shortBreak: { start: '10:15', end: '10:30' },
      longBreak: { start: '12:00', end: '12:45' },
      color: '#f97316',
    },
    {
      id: 'g2', name: 'Groep 2', unitId: 'u1',
      startTime: '08:30', endTime: '14:30',
      shortBreak: { start: '10:15', end: '10:30' },
      longBreak: { start: '12:00', end: '12:45' },
      color: '#eab308',
    },
    {
      id: 'g3', name: 'Groep 3', unitId: 'u1',
      startTime: '08:30', endTime: '14:30',
      shortBreak: { start: '10:15', end: '10:30' },
      longBreak: { start: '12:00', end: '12:45' },
      color: '#22c55e',
    },
    {
      id: 'g4', name: 'Groep 4', unitId: 'u2',
      startTime: '08:30', endTime: '15:00',
      shortBreak: { start: '10:15', end: '10:30' },
      longBreak: { start: '12:15', end: '13:00' },
      color: '#14b8a6',
    },
    {
      id: 'g5', name: 'Groep 5', unitId: 'u2',
      startTime: '08:30', endTime: '15:00',
      shortBreak: { start: '10:15', end: '10:30' },
      longBreak: { start: '12:15', end: '13:00' },
      color: '#3b82f6',
    },
    {
      id: 'g6', name: 'Groep 6', unitId: 'u2',
      startTime: '08:30', endTime: '15:00',
      shortBreak: { start: '10:15', end: '10:30' },
      longBreak: { start: '12:15', end: '13:00' },
      color: '#8b5cf6',
    },
    {
      id: 'g7', name: 'Groep 7', unitId: 'u2',
      startTime: '08:30', endTime: '15:00',
      shortBreak: { start: '10:15', end: '10:30' },
      longBreak: { start: '12:15', end: '13:00' },
      color: '#ec4899',
    },
    {
      id: 'g8', name: 'Groep 8', unitId: 'u2',
      startTime: '08:30', endTime: '15:00',
      shortBreak: { start: '10:15', end: '10:30' },
      longBreak: { start: '12:15', end: '13:00' },
      color: '#ef4444',
    },
  ],
  units: [
    { id: 'u1', name: 'Onderbouw', groupIds: ['g1', 'g2', 'g3'] },
    { id: 'u2', name: 'Bovenbouw', groupIds: ['g4', 'g5', 'g6', 'g7', 'g8'] },
  ],
  staff: [
    {
      id: 's1', name: 'Anja de Vries', role: 'Leerkracht',
      schedule: {
        monday:    { type: 'group', groupId: 'g1' },
        tuesday:   { type: 'group', groupId: 'g1' },
        wednesday: { type: 'group', groupId: 'g1' },
        thursday:  { type: 'group', groupId: 'g1' },
        friday:    { type: 'group', groupId: 'g1' },
      },
    },
    {
      id: 's2', name: 'Bert Smit', role: 'Leerkracht',
      schedule: {
        monday:    { type: 'group', groupId: 'g2' },
        tuesday:   { type: 'group', groupId: 'g2' },
        wednesday: { type: 'none' },
        thursday:  { type: 'group', groupId: 'g2' },
        friday:    { type: 'group', groupId: 'g2' },
      },
    },
    {
      id: 's3', name: 'Clara Jansen', role: 'Leerkracht',
      schedule: {
        monday:    { type: 'group', groupId: 'g2' },
        tuesday:   { type: 'none' },
        wednesday: { type: 'group', groupId: 'g3' },
        thursday:  { type: 'none' },
        friday:    { type: 'group', groupId: 'g3' },
      },
    },
    {
      id: 's4', name: 'David Bakker', role: 'Leerkracht',
      schedule: {
        monday:    { type: 'group', groupId: 'g3' },
        tuesday:   { type: 'group', groupId: 'g3' },
        wednesday: { type: 'none' },
        thursday:  { type: 'group', groupId: 'g3' },
        friday:    { type: 'none' },
      },
    },
    {
      id: 's5', name: 'Emma Visser', role: 'Leerkracht',
      schedule: {
        monday:    { type: 'group', groupId: 'g4' },
        tuesday:   { type: 'group', groupId: 'g4' },
        wednesday: { type: 'group', groupId: 'g4' },
        thursday:  { type: 'group', groupId: 'g4' },
        friday:    { type: 'group', groupId: 'g4' },
      },
    },
    {
      id: 's6', name: 'Frank Mulder', role: 'Leerkracht',
      schedule: {
        monday:    { type: 'group', groupId: 'g5' },
        tuesday:   { type: 'group', groupId: 'g5' },
        wednesday: { type: 'group', groupId: 'g5' },
        thursday:  { type: 'none' },
        friday:    { type: 'group', groupId: 'g5' },
      },
    },
    {
      id: 's7', name: 'Gina Peters', role: 'Leerkracht',
      schedule: {
        monday:    { type: 'group', groupId: 'g6' },
        tuesday:   { type: 'group', groupId: 'g6' },
        wednesday: { type: 'group', groupId: 'g6' },
        thursday:  { type: 'group', groupId: 'g6' },
        friday:    { type: 'group', groupId: 'g6' },
      },
    },
    {
      id: 's8', name: 'Hans de Groot', role: 'Leerkracht',
      schedule: {
        monday:    { type: 'group', groupId: 'g7' },
        tuesday:   { type: 'group', groupId: 'g7' },
        wednesday: { type: 'group', groupId: 'g7' },
        thursday:  { type: 'group', groupId: 'g7' },
        friday:    { type: 'group', groupId: 'g7' },
      },
    },
    {
      id: 's9', name: 'Iris Wolters', role: 'Leerkracht',
      schedule: {
        monday:    { type: 'group', groupId: 'g8' },
        tuesday:   { type: 'group', groupId: 'g8' },
        wednesday: { type: 'group', groupId: 'g8' },
        thursday:  { type: 'group', groupId: 'g8' },
        friday:    { type: 'group', groupId: 'g8' },
      },
    },
    {
      id: 's10', name: 'Jan Koopmans', role: 'Onderwijsassistent',
      schedule: {
        monday:    { type: 'unit', unitId: 'u1' },
        tuesday:   { type: 'unit', unitId: 'u1' },
        wednesday: { type: 'unit', unitId: 'u1' },
        thursday:  { type: 'unit', unitId: 'u1' },
        friday:    { type: 'unit', unitId: 'u1' },
      },
    },
    {
      id: 's11', name: 'Karen van Dam', role: 'Intern Begeleider',
      schedule: {
        monday:    { type: 'unit', unitId: 'u2' },
        tuesday:   { type: 'unit', unitId: 'u2' },
        wednesday: { type: 'none' },
        thursday:  { type: 'unit', unitId: 'u2' },
        friday:    { type: 'unit', unitId: 'u2' },
      },
    },
  ],
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
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { organizationId, isAuthenticated } = useAuth();

  // Load data from Supabase on mount or when organizationId changes
  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated || !organizationId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await db.loadAllData(organizationId);

        // Reconstruct staff schedules
        const staffWithSchedules = data.staff.map(staff => {
          const schedules = data.timeAbsences || [];
          return { ...staff, schedule: {} };
        });

        dispatch({
          type: 'SET_INITIAL_STATE',
          payload: {
            groups: data.groups || [],
            units: data.units || [],
            staff: staffWithSchedules,
            absences: data.absences || [],
            timeAbsences: data.timeAbsences || [],
          }
        });
        setError(null);
      } catch (err) {
        console.error('Failed to load data from Supabase:', err);
        setError(err.message);
        // Fallback to localStorage
        try {
          const saved = localStorage.getItem('schoolPlanning');
          if (saved) {
            dispatch({ type: 'SET_INITIAL_STATE', payload: JSON.parse(saved) });
          }
        } catch {
          // Use initial state
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [organizationId, isAuthenticated]);

  // Save to Supabase when state changes (debounced)
  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(() => {
      // Save to localStorage as backup
      localStorage.setItem('schoolPlanning', JSON.stringify(state));
    }, 1000);

    return () => clearTimeout(timer);
  }, [state, loading]);

  return (
    <AppContext.Provider value={{ state, dispatch, loading, error }}>
      {children}
    </AppContext.Provider>
  );
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
