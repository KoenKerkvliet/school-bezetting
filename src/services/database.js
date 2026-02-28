import { supabase } from './supabaseClient'
import {
  dbGroupToApp,
  dbUnitToApp,
  dbStaffToApp,
  dbAbsenceToApp,
  dbTimeAbsenceToApp,
} from './dataMapper'

// ============ LOAD ALL DATA (with mapping) ============

export async function loadAllData(organizationId) {
  const [
    { data: groups, error: gErr },
    { data: units, error: uErr },
    { data: staff, error: sErr },
    { data: schedules, error: scErr },
    { data: absences, error: aErr },
    { data: timeAbsences, error: taErr },
  ] = await Promise.all([
    supabase.from('groups').select('*').eq('organization_id', organizationId),
    supabase.from('units').select('*').eq('organization_id', organizationId),
    supabase.from('staff').select('*').eq('organization_id', organizationId),
    supabase.from('staff_schedule').select('*'),
    supabase.from('absences').select('*').eq('organization_id', organizationId),
    supabase.from('time_absences').select('*').eq('organization_id', organizationId),
  ])

  // Log any errors for debugging
  if (gErr) console.warn('[DB] groups error:', gErr.message)
  if (uErr) console.warn('[DB] units error:', uErr.message)
  if (sErr) console.warn('[DB] staff error:', sErr.message)
  if (scErr) console.warn('[DB] staff_schedule error:', scErr.message)
  if (aErr) console.warn('[DB] absences error:', aErr.message)
  if (taErr) console.warn('[DB] time_absences error:', taErr.message)

  // Map from DB format → App format
  const scheduleRows = schedules || []

  return {
    groups: (groups || []).map(dbGroupToApp),
    units: (units || []).map(dbUnitToApp),
    staff: (staff || []).map(s => dbStaffToApp(s, scheduleRows)),
    absences: (absences || []).map(dbAbsenceToApp),
    timeAbsences: (timeAbsences || []).map(dbTimeAbsenceToApp),
  }
}
