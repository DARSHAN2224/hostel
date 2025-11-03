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

// Named exports for convenience
export * from './authService'
export * from './studentService'
export * from './outpassService'
export * from './adminService'
export * from './securityService'
export * from './hodService'
export * from './wardenService'
