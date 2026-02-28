import { supabase } from './supabaseClient'

// ============ AUTHENTICATION ============

/**
 * Sign in with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user, session}>}
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw new Error(error.message)
  return data
}

/**
 * Sign up new user (creates auth user + profile)
 * @param {string} email
 * @param {string} password
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} organizationId
 * @param {string} role - 'Admin', 'Editor', 'Viewer'
 * @returns {Promise<{user, session}>}
 */
export async function signUp(email, password, firstName, lastName, organizationId, role = 'Viewer') {
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) throw new Error(authError.message)

  const userId = authData.user.id

  try {
    // Create user record in users table
    const { error: userError } = await supabase
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

    if (userError) throw userError

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          user_id: userId,
          first_name: firstName,
          last_name: lastName,
        },
      ])

    if (profileError) throw profileError

    return authData
  } catch (error) {
    // Clean up auth user if profile creation fails
    await supabase.auth.admin.deleteUser(userId)
    throw error
  }
}

/**
 * Log out current user
 * @returns {Promise}
 */
export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

/**
 * Get current authenticated user
 * @returns {Promise<{user, session}>}
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(error.message)
  return data
}

/**
 * Get current user with extended info from users table
 * @returns {Promise<object>}
 */
export async function getCurrentUserWithRole() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError

  if (!sessionData.session) return null

  const userId = sessionData.session.user.id

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (userError) throw userError
  return userData
}

/**
 * Send password reset email
 * @param {string} email
 * @returns {Promise}
 */
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })

  if (error) throw new Error(error.message)
}

/**
 * Update password with token (from reset email)
 * @param {string} newPassword
 * @returns {Promise}
 */
export async function updatePasswordWithToken(newPassword) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) throw new Error(error.message)
}

/**
 * Update user profile
 * @param {string} userId
 * @param {object} updates - { first_name, last_name, etc. }
 * @returns {Promise}
 */
export async function updateProfile(userId, updates) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}

/**
 * Check if user's email is verified
 * @returns {Promise<boolean>}
 */
export async function isEmailVerified() {
  const { data, error } = await supabase.auth.getSession()
  if (error) return false

  if (!data.session) return false

  const user = data.session.user
  return !!user.email_confirmed_at
}

/**
 * Resend verification email
 * @param {string} email
 * @returns {Promise}
 */
export async function resendVerificationEmail(email) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
  })

  if (error) throw new Error(error.message)
}

/**
 * Listen to auth state changes
 * @param {function} callback - Called with user info when auth state changes
 * @returns {function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      // Get user role and org info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      // Always call callback, even if user data fetch fails
      callback({
        user: session.user,
        userData: userError ? null : userData,
        isAuthenticated: true,
        isEmailVerified: !!session.user.email_confirmed_at,
      })
    } else {
      callback({
        user: null,
        userData: null,
        isAuthenticated: false,
        isEmailVerified: false,
      })
    }
  })

  return data.subscription.unsubscribe
}
