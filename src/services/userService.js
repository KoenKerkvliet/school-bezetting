import { supabase } from './supabaseClient'
import { sendInviteEmail } from './emailService'

// ============ USER MANAGEMENT (Admin Only) ============

/**
 * Create new user (admin only - creates account and sends invite email via Emailit)
 * @param {string} email
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} role - 'Admin', 'Editor', 'Viewer'
 * @param {string} organizationId
 * @param {string} schoolName - Organization name for email template
 * @returns {Promise<object>} user object
 */
export async function createUser(email, firstName, lastName, role, organizationId, schoolName = 'School Bezetting') {
  // Generate temporary password
  const tempPassword = generateTemporaryPassword()

  try {
    // Create auth user via admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false, // User must verify email
    })

    if (authError) throw new Error(authError.message)

    const userId = authData.user.id

    // Create user record in users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([
        {
          id: userId,
          organization_id: organizationId,
          email,
          first_name: firstName,
          last_name: lastName,
          role,
        },
      ])
      .select()

    if (userError) throw userError

    // Create profile
    await supabase
      .from('profiles')
      .insert([
        {
          user_id: userId,
          first_name: firstName,
          last_name: lastName,
        },
      ])

    // Send branded invitation email via Emailit
    const resetUrl = `${window.location.origin}/set-password`
    try {
      await sendInviteEmail(email, firstName, resetUrl, schoolName)
    } catch (emailErr) {
      // If Emailit fails, fall back to Supabase's built-in email
      console.warn('Emailit invite failed, falling back to Supabase:', emailErr.message)
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/set-password`,
      })
    }

    return userData[0]
  } catch (error) {
    throw new Error(`Failed to create user: ${error.message}`)
  }
}

/**
 * List all users in organization
 * @param {string} organizationId
 * @returns {Promise<array>}
 */
export async function listOrgUsers(organizationId) {
  const { data, error } = await supabase
    .from('users')
    .select('*, profiles(*)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

/**
 * Get single user by ID
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function getUser(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*, profiles(*)')
    .eq('id', userId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

/**
 * Update user role (admin only)
 * @param {string} userId
 * @param {string} newRole - 'Admin', 'Editor', 'Viewer'
 * @param {string} organizationId
 * @returns {Promise<object>}
 */
export async function updateUserRole(userId, newRole, organizationId) {
  const { data, error } = await supabase
    .from('users')
    .update({ role: newRole, updated_at: new Date() })
    .eq('id', userId)
    .eq('organization_id', organizationId)
    .select()

  if (error) throw new Error(error.message)

  // Log to audit
  await logAuditAction(organizationId, userId, 'UPDATE_USER_ROLE', 'user', userId, {
    newRole,
  })

  return data[0]
}

/**
 * Delete user (admin only)
 * @param {string} userId
 * @param {string} organizationId
 * @returns {Promise}
 */
export async function deleteUser(userId, organizationId) {
  // Delete from users table (cascade will remove profiles)
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)
    .eq('organization_id', organizationId)

  if (error) throw new Error(error.message)

  // Also delete from auth (requires service role)
  // This would be done on backend for security

  // Log to audit
  await logAuditAction(organizationId, null, 'DELETE_USER', 'user', userId, {
    deleted: true,
  })
}

/**
 * Update user's organization (admin only)
 * @param {string} userId
 * @param {string} newOrganizationId
 * @param {string} currentOrganizationId - for audit logging
 * @returns {Promise<object>}
 */
export async function updateUserOrganization(userId, newOrganizationId, currentOrganizationId) {
  const { data, error } = await supabase
    .from('users')
    .update({ organization_id: newOrganizationId, updated_at: new Date() })
    .eq('id', userId)
    .select()

  if (error) throw new Error(error.message)

  // Log to audit
  await logAuditAction(currentOrganizationId, userId, 'UPDATE_USER_ORGANIZATION', 'user', userId, {
    newOrganizationId,
  })

  return data[0]
}

/**
 * List all users across all organizations (admin only)
 * @returns {Promise<array>}
 */
export async function listAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*, profiles(*)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

/**
 * Disable user without deleting
 * @param {string} userId
 * @param {string} organizationId
 * @returns {Promise}
 */
export async function disableUser(userId, organizationId) {
  const { error } = await supabase
    .from('users')
    .update({ email_verified_at: null, updated_at: new Date() })
    .eq('id', userId)
    .eq('organization_id', organizationId)

  if (error) throw new Error(error.message)

  // Log to audit
  await logAuditAction(organizationId, null, 'DISABLE_USER', 'user', userId, {
    disabled: true,
  })
}

/**
 * Get audit logs for organization (admin only)
 * @param {string} organizationId
 * @param {number} limit
 * @returns {Promise<array>}
 */
export async function getAuditLogs(organizationId, limit = 100) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, users(first_name, last_name, email)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data || []
}

/**
 * Log audit action (internal)
 * @private
 */
export async function logAuditAction(
  organizationId,
  userId,
  action,
  resourceType,
  resourceId,
  changes
) {
  const { error } = await supabase.from('audit_logs').insert([
    {
      organization_id: organizationId,
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      changes,
    },
  ])

  if (error) {
    console.error('Audit log error:', error)
    // Don't throw - audit failure shouldn't block operations
  }
}

/**
 * Generate temporary password for new user
 * @private
 */
function generateTemporaryPassword() {
  return Math.random().toString(36).slice(2, 15) + Math.random().toString(36).slice(2, 15)
}

/**
 * Get user permissions based on role
 * @param {string} role
 * @returns {array} permissions
 */
export function getRolePermissions(role) {
  const permissions = {
    Admin: ['create', 'read', 'update', 'delete', 'manage_users', 'view_audit'],
    Editor: ['create', 'read', 'update'],
    Viewer: ['read'],
  }
  return permissions[role] || []
}

/**
 * Check if user has permission
 * @param {string} role
 * @param {string} action
 * @returns {boolean}
 */
export function hasPermission(role, action) {
  const permissions = getRolePermissions(role)
  return permissions.includes(action)
}
