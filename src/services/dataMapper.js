/**
 * Data Mapper — converts between app format (camelCase, nested)
 * and Supabase format (snake_case, flat).
 *
 * Supabase table schemas (discovered via API):
 *
 * groups:   id, name, unit_id, start_time, end_time,
 *           short_break_start, short_break_end,
 *           long_break_start, long_break_end,
 *           color, organization_id, created_at, updated_at
 *
 * units:    id, name, group_ids[], organization_id, created_at, updated_at
 *
 * staff:    id, name, role, organization_id, created_at, updated_at
 *           (schedule is in separate staff_schedule table)
 *
 * staff_schedule: id, staff_id, day, schedule_type, group_id, unit_id, created_at
 *
 * absences: id, staff_id, date, reason, organization_id, created_at
 *
 * time_absences: id, staff_id, date, start_time, end_time, reason,
 *                organization_id, created_at
 */

// ── Groups ────────────────────────────────────────────────────────────

export function dbGroupToApp(db) {
  return {
    id: db.id,
    name: db.name,
    unitId: db.unit_id || null,
    startTime: db.start_time || '08:30',
    endTime: db.end_time || '14:30',
    shortBreak: {
      start: db.short_break_start || '10:15',
      end: db.short_break_end || '10:30',
    },
    longBreak: {
      start: db.long_break_start || '12:00',
      end: db.long_break_end || '12:45',
    },
    color: db.color || '#3b82f6',
  }
}

export function appGroupToDb(app, orgId) {
  return {
    id: app.id,
    name: app.name,
    unit_id: app.unitId || null,
    start_time: app.startTime,
    end_time: app.endTime,
    short_break_start: app.shortBreak?.start || null,
    short_break_end: app.shortBreak?.end || null,
    long_break_start: app.longBreak?.start || null,
    long_break_end: app.longBreak?.end || null,
    color: app.color,
    organization_id: orgId,
  }
}

// ── Units ─────────────────────────────────────────────────────────────

export function dbUnitToApp(db) {
  return {
    id: db.id,
    name: db.name,
    groupIds: db.group_ids || [],
  }
}

export function appUnitToDb(app, orgId) {
  return {
    id: app.id,
    name: app.name,
    group_ids: app.groupIds || [],
    organization_id: orgId,
  }
}

// ── Staff ─────────────────────────────────────────────────────────────

export function dbStaffToApp(dbStaff, dbScheduleRows = []) {
  // Build schedule object from staff_schedule rows
  const schedule = {}
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  days.forEach(d => { schedule[d] = { type: 'none' } })

  dbScheduleRows
    .filter(r => r.staff_id === dbStaff.id)
    .forEach(r => {
      schedule[r.day] = {
        type: r.schedule_type || 'none',
        ...(r.group_id ? { groupId: r.group_id } : {}),
        ...(r.unit_id ? { unitId: r.unit_id } : {}),
      }
    })

  return {
    id: dbStaff.id,
    name: dbStaff.name,
    role: dbStaff.role,
    schedule,
  }
}

export function appStaffToDb(app, orgId) {
  return {
    id: app.id,
    name: app.name,
    role: app.role,
    organization_id: orgId,
  }
}

export function appStaffToScheduleRows(staff) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  return days
    .filter(d => {
      const ds = staff.schedule?.[d]
      if (!ds || ds.type === 'none') return false
      // Only include group/unit if actually selected
      if (ds.type === 'group' && !ds.groupId) return false
      if (ds.type === 'unit' && !ds.unitId) return false
      return true
    })
    .map(d => ({
      staff_id: staff.id,
      day: d,
      schedule_type: staff.schedule[d].type,
      group_id: staff.schedule[d].groupId || null,
      unit_id: staff.schedule[d].unitId || null,
    }))
}

// ── Absences ──────────────────────────────────────────────────────────

export function dbAbsenceToApp(db) {
  return {
    id: db.id,
    staff_id: db.staff_id,
    date: db.date,
    reason: db.reason,
  }
}

export function appAbsenceToDb(app, orgId) {
  return {
    id: app.id,
    staff_id: app.staff_id,
    date: app.date,
    reason: app.reason,
    organization_id: orgId,
  }
}

// ── Time Absences ─────────────────────────────────────────────────────

export function dbTimeAbsenceToApp(db) {
  return {
    id: db.id,
    staff_id: db.staff_id,
    date: db.date,
    startTime: db.start_time,
    endTime: db.end_time,
    reason: db.reason,
  }
}

export function appTimeAbsenceToDb(app, orgId) {
  return {
    id: app.id,
    staff_id: app.staff_id,
    date: app.date,
    start_time: app.startTime,
    end_time: app.endTime,
    reason: app.reason,
    organization_id: orgId,
  }
}
