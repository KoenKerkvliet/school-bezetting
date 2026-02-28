import { supabase } from './supabaseClient'

// ============ ORGANIZATION MANAGEMENT ============

/**
 * Create new organization
 * @param {string} name
 * @param {string} slug
 * @param {object} settings
 * @returns {Promise<object>}
 */
export async function createOrganization(name, slug, settings = {}) {
  const { data, error } = await supabase
    .from('organizations')
    .insert([
      {
        name,
        slug,
        settings,
      },
    ])
    .select()

  if (error) throw new Error(error.message)
  return data[0]
}

/**
 * Get organization by ID
 * @param {string} organizationId
 * @returns {Promise<object>}
 */
export async function getOrganization(organizationId) {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

/**
 * Get organization by slug
 * @param {string} slug
 * @returns {Promise<object>}
 */
export async function getOrganizationBySlug(slug) {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) throw new Error(error.message)
  return data
}

/**
 * Update organization
 * @param {string} organizationId
 * @param {object} updates
 * @returns {Promise<object>}
 */
export async function updateOrganization(organizationId, updates) {
  const { data, error } = await supabase
    .from('organizations')
    .update({
      ...updates,
      updated_at: new Date(),
    })
    .eq('id', organizationId)
    .select()

  if (error) throw new Error(error.message)
  return data[0]
}

/**
 * Get organization and its stats
 * @param {string} organizationId
 * @returns {Promise<object>}
 */
export async function getOrganizationWithStats(organizationId) {
  const org = await getOrganization(organizationId)

  // Get user count
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  // Get staff count
  const { count: staffCount } = await supabase
    .from('staff')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  // Get groups count
  const { count: groupCount } = await supabase
    .from('groups')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  return {
    ...org,
    stats: {
      users: userCount || 0,
      staff: staffCount || 0,
      groups: groupCount || 0,
    },
  }
}

/**
 * List all organizations
 * @returns {Promise<array>}
 */
export async function listOrganizations() {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

/**
 * List all organizations with stats (user/staff/group counts)
 * @returns {Promise<array>}
 */
export async function listOrganizationsWithStats() {
  const orgs = await listOrganizations()

  // Fetch stats for all orgs in parallel
  const orgsWithStats = await Promise.all(
    orgs.map(async (org) => {
      const [
        { count: userCount },
        { count: staffCount },
        { count: groupCount },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
        supabase.from('staff').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
        supabase.from('groups').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      ])

      return {
        ...org,
        stats: {
          users: userCount || 0,
          staff: staffCount || 0,
          groups: groupCount || 0,
        },
      }
    })
  )

  return orgsWithStats
}

/**
 * Delete organization
 * @param {string} organizationId
 * @returns {Promise}
 */
export async function deleteOrganization(organizationId) {
  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('id', organizationId)

  if (error) throw new Error(error.message)
}

/**
 * Get user's current organization from users table
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function getUserOrganization(userId) {
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', userId)
    .single()

  if (userError) throw new Error(userError.message)

  if (!userData.organization_id) {
    throw new Error('User not associated with organization')
  }

  return getOrganization(userData.organization_id)
}
