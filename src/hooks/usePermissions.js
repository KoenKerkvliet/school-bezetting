import { useAuth } from '../context/AuthContext'
import { isSuperAdmin, isAdminOrAbove, isPlannerOrAbove } from '../utils/roles'

/**
 * Hook to check user permissions
 * @returns {object} permissions object with can* methods and role checks
 */
export function usePermissions() {
  const { hasPermission, role } = useAuth()

  return {
    // CRUD permissions
    canRead: () => hasPermission('read'),
    canCreate: () => hasPermission('create'),
    canEdit: () => hasPermission('update'),
    canDelete: () => hasPermission('delete'),
    canPlan: () => hasPermission('plan'),

    // Admin permissions
    canManageUsers: () => hasPermission('manage_users'),
    canViewAudit: () => hasPermission('view_audit'),
    canManageSchools: () => hasPermission('manage_schools'),

    // Check any permission
    has: (permission) => hasPermission(permission),

    // Role hierarchy checks
    isSuperAdmin: () => isSuperAdmin(role),
    isAdminOrAbove: () => isAdminOrAbove(role),
    isPlannerOrAbove: () => isPlannerOrAbove(role),
    isViewer: () => role === 'Viewer',
    isPlanner: () => role === 'Planner',

    // Legacy — kept for backward compatibility
    isAdmin: () => isAdminOrAbove(role),

    // Get role
    getRole: () => role,
  }
}
