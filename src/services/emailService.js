import { supabase } from './supabaseClient'

/**
 * Send an invite email to a newly created user
 * @param {string} to - Recipient email
 * @param {string} firstName - User's first name (for personalization)
 * @param {string} resetUrl - URL for setting password
 * @param {string} schoolName - Organization/school name
 * @returns {Promise<object>}
 */
export async function sendInviteEmail(to, firstName, resetUrl, schoolName) {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      type: 'invite',
      to,
      data: {
        firstName,
        resetUrl,
        schoolName,
      },
    },
  })

  if (error) {
    console.error('Failed to send invite email:', error)
    throw new Error(`Email versturen mislukt: ${error.message}`)
  }

  return data
}

/**
 * Send a password reset email
 * @param {string} to - Recipient email
 * @param {string} resetUrl - URL for resetting password
 * @returns {Promise<object>}
 */
export async function sendPasswordResetEmail(to, resetUrl) {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      type: 'reset',
      to,
      data: {
        resetUrl,
      },
    },
  })

  if (error) {
    console.error('Failed to send reset email:', error)
    throw new Error(`Email versturen mislukt: ${error.message}`)
  }

  return data
}
