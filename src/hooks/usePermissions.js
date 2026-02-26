import { useAuth } from '../context/AuthContext'

/**
 * Hook to check user permissions
 * @returns {object} permissions object with can* methods
 */
export function usePermissions() {
  const { hasPermission, role } = useAuth()

  return {
    // CRUD permissions
    canRead: () => hasPermission('read'),
    canCreate: () => hasPermission('create'),
    canEdit: () => hasPermission('update'),
    canDelete: () => hasPermission('delete'),

    // Admin permissions
    canManageUsers: () => hasPermission('manage_users'),
    canViewAudit: () => hasPermission('view_audit'),

    // Check any permission
    has: (permission) => hasPermission(permission),

    // Check if user is admin
    isAdmin: () => role === 'Admin',
    isEditor: () => role === 'Editor',
    isViewer: () => role === 'Viewer',

    // Get role
    getRole: () => role,
  }
}
