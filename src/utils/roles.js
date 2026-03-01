/**
 * Central role definitions for the application.
 *
 * User account roles (not to be confused with staff job roles like Leerkracht, etc.)
 *
 * Hierarchy: Super Admin > Admin > Planner > Viewer
 */

// All valid user roles
export const USER_ROLES = ['Super Admin', 'Admin', 'Planner', 'Viewer'];

// Numeric hierarchy (higher = more privileges)
export const ROLE_HIERARCHY = {
  'Super Admin': 4,
  'Admin': 3,
  'Planner': 2,
  'Viewer': 1,
};

// ── Convenience checks ──────────────────────────────────────────────────

export function isSuperAdmin(role) {
  return role === 'Super Admin';
}

export function isAdminOrAbove(role) {
  return (ROLE_HIERARCHY[role] || 0) >= 3;
}

export function isPlannerOrAbove(role) {
  return (ROLE_HIERARCHY[role] || 0) >= 2;
}

// ── Permissions ─────────────────────────────────────────────────────────

export function getRolePermissions(role) {
  const permissions = {
    'Super Admin': ['create', 'read', 'update', 'delete', 'manage_users', 'view_audit', 'manage_schools', 'plan'],
    'Admin':       ['create', 'read', 'update', 'delete', 'manage_users', 'view_audit', 'plan'],
    'Planner':     ['read', 'view_audit', 'plan'],
    'Viewer':      ['read'],
    // Backward-compatible: old 'Editor' maps to Planner permissions
    'Editor':      ['read', 'view_audit', 'plan'],
  };
  return permissions[role] || [];
}

export function hasPermission(role, action) {
  return getRolePermissions(role).includes(action);
}

// ── Role assignment ─────────────────────────────────────────────────────

/** Which roles can a user with `currentRole` assign to others? */
export function getAssignableRoles(currentRole) {
  if (isSuperAdmin(currentRole)) return ['Admin', 'Planner', 'Viewer'];
  if (currentRole === 'Admin') return ['Admin', 'Planner', 'Viewer'];
  return [];
}

// ── Display helpers ─────────────────────────────────────────────────────

export function getRoleBadgeColor(role) {
  switch (role) {
    case 'Super Admin': return 'bg-red-100 text-red-700';
    case 'Admin':       return 'bg-purple-100 text-purple-700';
    case 'Planner':     return 'bg-blue-100 text-blue-700';
    case 'Editor':      return 'bg-blue-100 text-blue-700'; // legacy
    case 'Viewer':      return 'bg-gray-100 text-gray-700';
    default:            return 'bg-gray-100 text-gray-700';
  }
}

export function getRoleLabel(role) {
  switch (role) {
    case 'Super Admin': return 'Super Admin';
    case 'Admin':       return 'Admin';
    case 'Planner':     return 'Planner';
    case 'Editor':      return 'Planner'; // legacy display
    case 'Viewer':      return 'Viewer';
    default:            return role || 'Onbekend';
  }
}
