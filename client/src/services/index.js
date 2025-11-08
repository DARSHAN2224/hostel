/**
 * Services Index
 * Centralized export of all API services
 */

export { default as apiClient } from './api'
export { default as authService } from './authService'
export { default as studentService } from './studentService'
export { default as outpassService } from './outpassService'
export { default as adminService } from './adminService'
export { default as securityService } from './securityService'
export { default as hodService } from './hodService'
export { default as wardenService } from './wardenService'
export { default as notificationService } from './notificationService'
export { default as violationService } from './violationService'
export { default as auditLogService } from './auditLogService'
export { default as userService } from './userService'
export { default as parentService } from './parentService'
export { default as reportService } from './reportService'

// Named exports for convenience
export * from './authService'
export * from './studentService'
export * from './outpassService'
export * from './adminService'
export * from './securityService'
export * from './hodService'
export * from './wardenService'
