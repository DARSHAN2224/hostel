import nodemailer from 'nodemailer'
import { config } from '../config/config.js'
import { logger } from './logger.js'

let transporter

/**
 * Get or create email transporter (Singleton pattern)
 * @returns {nodemailer.Transporter}
 */
export const getTransporter = () => {
  if (transporter) return transporter
  
  const { service, user, password, port, host } = config.email
  
  transporter = nodemailer.createTransport({
    service,
    secure: true,
    port,
    host,
    auth: {
      user,
      pass: password
    }
  })
  
  return transporter
}

/**
 * Send email with proper error handling
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 * @param {string} options.context - Context for logging (e.g., 'verification', 'password-reset')
 * @returns {Promise<Object>} Email info
 * @throws {Error} Throws error with context
 */
export const sendEmail = async ({ to, subject, text, html, context = 'email' }) => {
  const tx = getTransporter()
  
  try {
    const info = await tx.sendMail({
      from: config.email.from,
      to,
      subject,
      text,
      html
    })
    
    logger.info(`Email sent successfully - Context: ${context}, To: ${to}`)
    return info
    
  } catch (error) {
    // Log the error with context
    logger.error(`Failed to send email - Context: ${context}, To: ${to}, Error: ${error.message}`)
    
    // Throw error with context for upstream handling
    const err = new Error(`Failed to send ${context} email`)
    err.originalError = error
    err.context = context
    throw err
  }
}

/**
 * Email Types - Constants for different email contexts
 */
export const EMAIL_TYPES = {
  VERIFICATION: 'verification',
  PASSWORD_RESET: 'password-reset',
  PASSWORD_CHANGED: 'password-changed',
  WELCOME: 'welcome',
  NOTIFICATION: 'notification'
}

/**
 * Get user-friendly error message based on email type
 * @param {string} emailType - Type of email from EMAIL_TYPES
 * @returns {string} User-friendly error message
 */
export const getEmailErrorMessage = (emailType) => {
  const errorMessages = {
    [EMAIL_TYPES.VERIFICATION]: 'Failed to send verification email. Please try again or contact support.',
    [EMAIL_TYPES.PASSWORD_RESET]: 'Failed to send password reset email. Please try again later.',
    [EMAIL_TYPES.PASSWORD_CHANGED]: 'Password was changed but confirmation email could not be sent.',
    [EMAIL_TYPES.WELCOME]: 'Account created but welcome email could not be sent.',
    [EMAIL_TYPES.NOTIFICATION]: 'Failed to send notification email.'
  }
  
  return errorMessages[emailType] || 'Failed to send email. Please try again later.'
}
