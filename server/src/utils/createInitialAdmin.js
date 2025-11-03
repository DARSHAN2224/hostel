/* eslint-disable no-undef */
/**
 * Auto-Create Initial Admin (Development Only)
 * 
 * This utility automatically creates an admin account on server startup
 * if no admin exists. Only runs in development mode.
 * 
 * Security: This is disabled in production for security reasons.
 */

import { Admin } from '../models/index.js'
import logger from './logger.js'
import { config } from '../config/config.js'

export const createInitialAdmin = async () => {
  // Only run in development mode and if initial admin creation is enabled
  if (config.nodeEnv !== 'development' || !config.initialAdmin?.enabled) {
    return
  }

  try {
    // Check if any admin exists
    const adminExists = await Admin.findOne({})
    
    if (!adminExists) {
      // Create development admin and keep a reference for logging
      const adminEmail = config.initialAdmin?.email || process.env.INITIAL_ADMIN_EMAIL || 'admin@college.edu'
      const adminPassword = config.initialAdmin?.password || process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123'
      const devAdmin = await Admin.create({
        email: adminEmail,
        password: adminPassword,
        firstName: 'Dev',
        lastName: 'Admin',
        phone: '9999999999',
        role: 'admin',
        adminRole: 'super_admin',
        isEmailVerified: true,
        isActive: true
      })

  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  logger.info('✅ Development admin created automatically!')
  logger.info(`📧 Email:    ${adminEmail}`)
  logger.info(`🔑 Password: ${adminPassword}`)
  logger.info(`🆔 ID:       ${devAdmin._id}`)
  logger.info('⚠️  This is a development admin - change credentials!')
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    }
  } catch (error) {
    logger.error('Failed to create initial admin:', error)
    // Don't throw - server should still start
  }
}
