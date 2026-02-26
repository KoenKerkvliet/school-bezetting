import { supabase } from './supabaseClient'

// ============ GROUPS ============
export async function fetchGroups(organizationId) {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('organization_id', organizationId)
  if (error) throw error
  return data || []
}

export async function addGroup(group) {
  const { data, error } = await supabase.from('groups').insert([group]).select()
  if (error) throw error
  return data[0]
}

export async function updateGroup(id, updates) {
  const { data, error } = await supabase.from('groups').update(updates).eq('id', id).select()
  if (error) throw error
  return data[0]
}

export async function deleteGroup(id) {
  const { error } = await supabase.from('groups').delete().eq('id', id)
  if (error) throw error
}

// ============ UNITS ============
export async function fetchUnits(organizationId) {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .eq('organization_id', organizationId)
  if (error) throw error
  return data || []
}

export async function addUnit(unit) {
  const { data, error } = await supabase.from('units').insert([unit]).select()
  if (error) throw error
  return data[0]
}

export async function updateUnit(id, updates) {
  const { data, error } = await supabase.from('units').update(updates).eq('id', id).select()
  if (error) throw error
  return data[0]
}

export async function deleteUnit(id) {
  const { error } = await supabase.from('units').delete().eq('id', id)
  if (error) throw error
}

// ============ STAFF ============
export async function fetchStaff(organizationId) {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('organization_id', organizationId)
  if (error) throw error
  return data || []
}

export async function addStaff(staff) {
  const { data, error } = await supabase.from('staff').insert([staff]).select()
  if (error) throw error
  return data[0]
}

export async function updateStaff(id, updates) {
  const { data, error } = await supabase.from('staff').update(updates).eq('id', id).select()
  if (error) throw error
  return data[0]
}

export async function deleteStaff(id) {
  const { error } = await supabase.from('staff').delete().eq('id', id)
  if (error) throw error
}

// ============ STAFF SCHEDULE ============
export async function fetchStaffSchedule(staffId) {
  const { data, error } = await supabase
    .from('staff_schedule')
    .select('*')
    .eq('staff_id', staffId)
  if (error) throw error
  return data || []
}

export async function updateStaffSchedule(staffId, day, scheduleData) {
  const { data: existing } = await supabase
    .from('staff_schedule')
    .select('id')
    .eq('staff_id', staffId)
    .eq('day', day)
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('staff_schedule')
      .update(scheduleData)
      .eq('staff_id', staffId)
      .eq('day', day)
      .select()
    if (error) throw error
    return data[0]
  } else {
    const { data, error } = await supabase
      .from('staff_schedule')
      .insert([{ staff_id: staffId, day, ...scheduleData }])
      .select()
    if (error) throw error
    return data[0]
  }
}

// ============ ABSENCES ============
export async function fetchAbsences(organizationId) {
  const { data, error } = await supabase
    .from('absences')
    .select('*')
    .eq('organization_id', organizationId)
  if (error) throw error
  return data || []
}

export async function addAbsence(absence) {
  const { data, error } = await supabase.from('absences').insert([absence]).select()
  if (error) throw error
  return data[0]
}

export async function deleteAbsence(id) {
  const { error } = await supabase.from('absences').delete().eq('id', id)
  if (error) throw error
}

// ============ TIME ABSENCES ============
export async function fetchTimeAbsences(organizationId) {
  const { data, error } = await supabase
    .from('time_absences')
    .select('*')
    .eq('organization_id', organizationId)
  if (error) throw error
  return data || []
}

export async function addTimeAbsence(timeAbsence) {
  const { data, error } = await supabase.from('time_absences').insert([timeAbsence]).select()
  if (error) throw error
  return data[0]
}

export async function deleteTimeAbsence(id) {
  const { error } = await supabase.from('time_absences').delete().eq('id', id)
  if (error) throw error
}

// ============ LOAD ALL DATA ============
export async function loadAllData(organizationId) {
  try {
    const [groups, units, staff, absences, timeAbsences] = await Promise.all([
      fetchGroups(organizationId),
      fetchUnits(organizationId),
      fetchStaff(organizationId),
      fetchAbsences(organizationId),
      fetchTimeAbsences(organizationId),
    ])

    return { groups, units, staff, absences, timeAbsences }
  } catch (error) {
    console.error('Error loading data:', error)
    throw error
  }
}
