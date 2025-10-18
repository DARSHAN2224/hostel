import { sendEmail, EMAIL_TYPES, getEmailErrorMessage } from '../utils/email.js'
import { 
  VERIFICATION_EMAIL_TEMPLATE, 
  PASSWORD_RESET_REQUEST_TEMPLATE, 
  PASSWORD_RESET_SUCCESS_TEMPLATE,
  WELCOME_PAGE_TEMPLATE 
} from '../utils/emailTemplates.js'
import { AppError } from '../middleware/errorHandler.js'

/**
 * ═══════════════════════════════════════════════════════════════════
 *                          EMAIL SERVICE
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Central service for all email operations with proper error handling.
 * Follows industry-standard patterns for reusability and maintainability.
 * 
 * USAGE PATTERN:
 * --------------
 * 1. Critical emails (throwOnError = true): User flow stops if email fails
 *    - Verification emails, password reset emails
 *    - Example: await sendVerificationEmail(email, name, code)
 * 
 * 2. Non-critical emails (throwOnError = false): User flow continues
 *    - Confirmations, welcome emails, notifications
 *    - Example: await sendPasswordChangedEmail(email, name)
 * 
 * ERROR HANDLING:
 * ---------------
 * - Critical emails throw AppError with user-friendly message
 * - Non-critical emails return false on failure
 * - All errors are logged with context for debugging
 * 
 * ADDING NEW EMAIL TYPES:
 * -----------------------
 * 1. Add type to EMAIL_TYPES in utils/email.js
 * 2. Add error message to getEmailErrorMessage()
 * 3. Create template in utils/emailTemplates.js
 * 4. Add service function below (follow existing pattern)
 * 
 * See: server/src/services/README_EMAIL_SERVICE.md for full documentation
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * Send verification email
 * @param {string} email - Recipient email
 * @param {string} firstName - User's first name
 * @param {string} verificationCode - Verification code
 * @param {boolean} throwOnError - Whether to throw error or return false
 * @returns {Promise<boolean>} Success status
 */
export const sendVerificationEmail = async (email, firstName, verificationCode, throwOnError = true) => {
  try {
    const html = VERIFICATION_EMAIL_TEMPLATE
      .replace('{verificationCode}', verificationCode)
      .replace('{username}', firstName)

    await sendEmail({
      to: email,
      subject: 'Verify your email - Hostel Management',
      text: `Your verification code is ${verificationCode}. It expires in 10 minutes.`,
      html,
      context: EMAIL_TYPES.VERIFICATION
    })

    return true
  } catch (error) {
    if (throwOnError) {
      throw new AppError(getEmailErrorMessage(EMAIL_TYPES.VERIFICATION), 500)
    }
    return false
  }
}

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} firstName - User's first name
 * @param {string} resetURL - Password reset URL
 * @param {boolean} throwOnError - Whether to throw error or return false
 * @returns {Promise<boolean>} Success status
 */
export const sendPasswordResetEmail = async (email, firstName, resetURL, throwOnError = true) => {
  try {
    const html = PASSWORD_RESET_REQUEST_TEMPLATE
      .replace('{username}', firstName)
      .replace('{resetURL}', resetURL)

    await sendEmail({
      to: email,
      subject: 'Reset your password - Hostel Management',
      text: `Reset your password using this link: ${resetURL}. It expires in 1 hour.`,
      html,
      context: EMAIL_TYPES.PASSWORD_RESET
    })

    return true
  } catch (error) {
    if (throwOnError) {
      throw new AppError(getEmailErrorMessage(EMAIL_TYPES.PASSWORD_RESET), 500)
    }
    return false
  }
}

/**
 * Send password changed confirmation email
 * @param {string} email - Recipient email
 * @param {string} firstName - User's first name
 * @param {boolean} throwOnError - Whether to throw error or return false
 * @returns {Promise<boolean>} Success status
 */
export const sendPasswordChangedEmail = async (email, firstName, throwOnError = false) => {
  try {
    const html = PASSWORD_RESET_SUCCESS_TEMPLATE
      .replace('{username}', firstName)

    await sendEmail({
      to: email,
      subject: 'Password Changed Successfully - Hostel Management',
      text: 'Your password has been changed successfully. If you did not make this change, please contact support immediately.',
      html,
      context: EMAIL_TYPES.PASSWORD_CHANGED
    })

    return true
  } catch (error) {
    // Password change confirmations are non-critical, so we don't throw by default
    if (throwOnError) {
      throw new AppError(getEmailErrorMessage(EMAIL_TYPES.PASSWORD_CHANGED), 500)
    }
    return false
  }
}

/**
 * Send welcome email to new users
 * @param {string} email - Recipient email
 * @param {string} firstName - User's first name
 * @param {boolean} throwOnError - Whether to throw error or return false
 * @returns {Promise<boolean>} Success status
 */
export const sendWelcomeEmail = async (email, firstName, throwOnError = false) => {
  try {
    const html = WELCOME_PAGE_TEMPLATE
      .replace('{username}', firstName)

    await sendEmail({
      to: email,
      subject: 'Welcome to Hostel Management System',
      text: `Welcome ${firstName}! Thank you for joining our Hostel Management System.`,
      html,
      context: EMAIL_TYPES.WELCOME
    })

    return true
  } catch (error) {
    // Welcome emails are non-critical
    if (throwOnError) {
      throw new AppError(getEmailErrorMessage(EMAIL_TYPES.WELCOME), 500)
    }
    return false
  }
}

/**
 * Send custom notification email
 * @param {string} email - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content
 * @param {boolean} throwOnError - Whether to throw error or return false
 * @returns {Promise<boolean>} Success status
 */
export const sendNotificationEmail = async (email, subject, text, html, throwOnError = false) => {
  try {
    await sendEmail({
      to: email,
      subject,
      text,
      html,
      context: EMAIL_TYPES.NOTIFICATION
    })

    return true
  } catch (error) {
    if (throwOnError) {
      throw new AppError(getEmailErrorMessage(EMAIL_TYPES.NOTIFICATION), 500)
    }
    return false
  }
}

export default {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendWelcomeEmail,
  sendNotificationEmail
}
