import React from 'react'
import { usePermissions } from '../hooks/usePermissions'

/**
 * Permission guard wrapper
 * Only shows content if user has the required permission
 * @param {string} require - Permission required (e.g., 'create', 'edit', 'delete', 'manage_users')
 * @param {React.ReactNode} children - Content to show if permitted
 * @param {React.ReactNode} fallback - Content to show if not permitted (optional)
 */
export default function PermissionGuard({ require, children, fallback = null }) {
  const permissions = usePermissions()
  const hasPermission = permissions.has(require)

  if (hasPermission) {
    return children
  }

  if (fallback) {
    return fallback
  }

  return null
}

/**
 * Hook to easily check permissions in components
 * Usage: const { canCreate, canEdit, isAdmin } = usePermissions()
 */
export function usePermissionGuard() {
  return usePermissions()
}
