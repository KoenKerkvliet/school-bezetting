import { supabase } from './supabaseClient'

/**
 * Planning Service: CRUD operations for groups, units, staff, and absences
 * All functions handle Supabase writes + cascade deletes
 */

// ============ GROUPS ============

export async function addGroup(organizationId, groupData) {
  const { data, error } = await supabase
    .from('groups')
    .insert([
      {
        ...groupData,
        organization_id: organizationId,
      },
    ])
    .select()

  if (error) throw new Error(`Failed to add group: ${error.message}`)
  return data[0]
}

export async function updateGroup(organizationId, groupId, updates) {
  const { data, error } = await supabase
    .from('groups')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', groupId)
    .eq('organization_id', organizationId)
    .select()

  if (error) throw new Error(`Failed to update group: ${error.message}`)
  return data[0]
}

export async function deleteGroup(organizationId, groupId) {
  // Step 1: Remove groupId from all units.groupIds
  try {
    const { data: units, error: fetchError } = await supabase
      .from('units')
      .select('id, groupIds')
      .eq('organization_id', organizationId)

    if (fetchError) throw fetchError

    // Update each unit to remove this groupId
    for (const unit of units || []) {
      if (unit.groupIds && unit.groupIds.includes(groupId)) {
        const updatedGroupIds = unit.groupIds.filter(id => id !== groupId)
        await supabase
          .from('units')
          .update({ groupIds: updatedGroupIds })
          .eq('id', unit.id)
      }
    }
  } catch (err) {
    throw new Error(`Failed to cascade delete group from units: ${err.message}`)
  }

  // Step 2: Delete the group record
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId)
    .eq('organization_id', organizationId)

  if (error) throw new Error(`Failed to delete group: ${error.message}`)
}

export async function fetchGroupsForSync(organizationId) {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('organization_id', organizationId)

  if (error) throw new Error(`Failed to fetch groups: ${error.message}`)
  return data || []
}

// ============ UNITS ============

export async function addUnit(organizationId, unitData) {
  const { data, error } = await supabase
    .from('units')
    .insert([
      {
        ...unitData,
        organization_id: organizationId,
      },
    ])
    .select()

  if (error) throw new Error(`Failed to add unit: ${error.message}`)
  return data[0]
}

export async function updateUnit(organizationId, unitId, updates) {
  const { data, error } = await supabase
    .from('units')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', unitId)
    .eq('organization_id', organizationId)
    .select()

  if (error) throw new Error(`Failed to update unit: ${error.message}`)
  return data[0]
}

export async function deleteUnit(organizationId, unitId) {
  // Step 1: Remove unitId from all groups
  try {
    const { error: updateError } = await supabase
      .from('groups')
      .update({ unitId: null })
      .eq('unitId', unitId)
      .eq('organization_id', organizationId)

    if (updateError) throw updateError
  } catch (err) {
    throw new Error(`Failed to cascade delete unit from groups: ${err.message}`)
  }

  // Step 2: Delete the unit record
  const { error } = await supabase
    .from('units')
    .delete()
    .eq('id', unitId)
    .eq('organization_id', organizationId)

  if (error) throw new Error(`Failed to delete unit: ${error.message}`)
}

export async function fetchUnitsForSync(organizationId) {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .eq('organization_id', organizationId)

  if (error) throw new Error(`Failed to fetch units: ${error.message}`)
  return data || []
}

// ============ STAFF ============

export async function addStaff(organizationId, staffData) {
  const { data, error } = await supabase
    .from('staff')
    .insert([
      {
        ...staffData,
        organization_id: organizationId,
      },
    ])
    .select()

  if (error) throw new Error(`Failed to add staff: ${error.message}`)
  return data[0]
}

export async function updateStaff(organizationId, staffId, updates) {
  const { data, error } = await supabase
    .from('staff')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', staffId)
    .eq('organization_id', organizationId)
    .select()

  if (error) throw new Error(`Failed to update staff: ${error.message}`)
  return data[0]
}

export async function deleteStaff(organizationId, staffId) {
  try {
    // Step 1: Delete all absences for this staff
    const { error: absError } = await supabase
      .from('absences')
      .delete()
      .eq('staff_id', staffId)

    if (absError) throw absError

    // Step 2: Delete all time absences for this staff
    const { error: timeAbsError } = await supabase
      .from('time_absences')
      .delete()
      .eq('staff_id', staffId)

    if (timeAbsError) throw timeAbsError

    // Step 3: Delete staff schedule records (if exists)
    const { error: schedError } = await supabase
      .from('staff_schedule')
      .delete()
      .eq('staff_id', staffId)

    if (schedError && schedError.code !== 'PGRST116') {
      // PGRST116 = table not found, ignore
      throw schedError
    }
  } catch (err) {
    throw new Error(`Failed to cascade delete staff: ${err.message}`)
  }

  // Step 4: Delete the staff record
  const { error } = await supabase
    .from('staff')
    .delete()
    .eq('id', staffId)
    .eq('organization_id', organizationId)

  if (error) throw new Error(`Failed to delete staff: ${error.message}`)
}

export async function fetchStaffForSync(organizationId) {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('organization_id', organizationId)

  if (error) throw new Error(`Failed to fetch staff: ${error.message}`)
  return data || []
}

// ============ ABSENCES ============

export async function addAbsence(organizationId, absenceData) {
  const { data, error } = await supabase
    .from('absences')
    .insert([
      {
        ...absenceData,
        organization_id: organizationId,
      },
    ])
    .select()

  if (error) throw new Error(`Failed to add absence: ${error.message}`)
  return data[0]
}

export async function deleteAbsence(organizationId, absenceId) {
  const { error } = await supabase
    .from('absences')
    .delete()
    .eq('id', absenceId)

  if (error) throw new Error(`Failed to delete absence: ${error.message}`)
}

export async function fetchAbsencesForSync(organizationId) {
  const { data, error } = await supabase
    .from('absences')
    .select('*')
    .eq('organization_id', organizationId)

  if (error) throw new Error(`Failed to fetch absences: ${error.message}`)
  return data || []
}

// ============ TIME ABSENCES ============

export async function addTimeAbsence(organizationId, timeAbsenceData) {
  const { data, error } = await supabase
    .from('time_absences')
    .insert([
      {
        ...timeAbsenceData,
        organization_id: organizationId,
      },
    ])
    .select()

  if (error) throw new Error(`Failed to add time absence: ${error.message}`)
  return data[0]
}

export async function deleteTimeAbsence(organizationId, timeAbsenceId) {
  const { error } = await supabase
    .from('time_absences')
    .delete()
    .eq('id', timeAbsenceId)

  if (error) throw new Error(`Failed to delete time absence: ${error.message}`)
}

export async function fetchTimeAbsencesForSync(organizationId) {
  const { data, error } = await supabase
    .from('time_absences')
    .select('*')
    .eq('organization_id', organizationId)

  if (error) throw new Error(`Failed to fetch time absences: ${error.message}`)
  return data || []
}

// ============ SYNC ORCHESTRATION ============

/**
 * Main sync function: detect diffs and execute changes to Supabase
 * Handles optimistic UI updates from AppContext
 */
export async function syncStateToSupabase(organizationId, prevState, currentState) {
  const errors = []

  try {
    // Detect what changed
    const diffs = detectStateDiffs(prevState, currentState)

    if (diffs.deletions.length === 0 && diffs.updates.length === 0 && diffs.additions.length === 0) {
      return { success: true, errors: [] }
    }

    // Execute in safe order: deletions → updates → additions
    // This prevents FK constraint violations

    // Process deletions
    for (const deletion of diffs.deletions) {
      try {
        await processDeletion(organizationId, deletion)
      } catch (err) {
        errors.push(err.message)
        console.error(`Deletion failed: ${deletion.entity} ${deletion.id}`, err)
      }
    }

    // Process updates
    for (const update of diffs.updates) {
      try {
        await processUpdate(organizationId, update)
      } catch (err) {
        errors.push(err.message)
        console.error(`Update failed: ${update.entity} ${update.id}`, err)
      }
    }

    // Process additions
    for (const addition of diffs.additions) {
      try {
        await processAddition(organizationId, addition)
      } catch (err) {
        errors.push(err.message)
        console.error(`Addition failed: ${addition.entity}`, err)
      }
    }

    return {
      success: errors.length === 0,
      errors,
    }
  } catch (err) {
    console.error('Sync orchestration failed:', err)
    return {
      success: false,
      errors: [err.message],
    }
  }
}

function detectStateDiffs(prevState = {}, currentState = {}) {
  const deletions = []
  const updates = []
  const additions = []

  // Compare groups
  compareArrays(prevState.groups || [], currentState.groups || [], 'group', deletions, updates, additions)

  // Compare units
  compareArrays(prevState.units || [], currentState.units || [], 'unit', deletions, updates, additions)

  // Compare staff
  compareArrays(prevState.staff || [], currentState.staff || [], 'staff', deletions, updates, additions)

  // Compare absences
  compareArrays(prevState.absences || [], currentState.absences || [], 'absence', deletions, updates, additions)

  // Compare timeAbsences
  compareArrays(prevState.timeAbsences || [], currentState.timeAbsences || [], 'timeAbsence', deletions, updates, additions)

  return { deletions, updates, additions }
}

function compareArrays(prevArr, currArr, entityType, deletions, updates, additions) {
  const currIds = new Set(currArr.map(item => item.id))
  const prevIds = new Set(prevArr.map(item => item.id))

  // Deletions: in prev but not in curr
  prevArr.forEach(prevItem => {
    if (!currIds.has(prevItem.id)) {
      deletions.push({ entity: entityType, id: prevItem.id, data: prevItem })
    }
  })

  // Updates & Additions
  currArr.forEach(currItem => {
    const prevItem = prevArr.find(p => p.id === currItem.id)
    if (prevItem) {
      // Check if changed
      if (JSON.stringify(prevItem) !== JSON.stringify(currItem)) {
        updates.push({ entity: entityType, id: currItem.id, data: currItem })
      }
    } else {
      // New item
      additions.push({ entity: entityType, data: currItem })
    }
  })
}

async function processDeletion(organizationId, deletion) {
  switch (deletion.entity) {
    case 'group':
      return deleteGroup(organizationId, deletion.id)
    case 'unit':
      return deleteUnit(organizationId, deletion.id)
    case 'staff':
      return deleteStaff(organizationId, deletion.id)
    case 'absence':
      return deleteAbsence(organizationId, deletion.id)
    case 'timeAbsence':
      return deleteTimeAbsence(organizationId, deletion.id)
    default:
      throw new Error(`Unknown entity type: ${deletion.entity}`)
  }
}

async function processUpdate(organizationId, update) {
  switch (update.entity) {
    case 'group':
      return updateGroup(organizationId, update.id, update.data)
    case 'unit':
      return updateUnit(organizationId, update.id, update.data)
    case 'staff':
      return updateStaff(organizationId, update.id, update.data)
    default:
      throw new Error(`Cannot update entity type: ${update.entity}`)
  }
}

async function processAddition(organizationId, addition) {
  switch (addition.entity) {
    case 'group':
      return addGroup(organizationId, addition.data)
    case 'unit':
      return addUnit(organizationId, addition.data)
    case 'staff':
      return addStaff(organizationId, addition.data)
    case 'absence':
      return addAbsence(organizationId, addition.data)
    case 'timeAbsence':
      return addTimeAbsence(organizationId, addition.data)
    default:
      throw new Error(`Unknown entity type: ${addition.entity}`)
  }
}
