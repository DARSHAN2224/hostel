// Central export file for all models
export { default as Student } from './Student.js'
export { default as Warden } from './Warden.js'
export { default as Security } from './Security.js'
export { default as Admin } from './Admin.js'
export { default as Parent } from './Parent.js'
export { default as OutpassRequest } from './OutpassRequest.js'
export { default as OutpassLog } from './OutpassLog.js'
export { default as Hod } from './Hod.js'
export { default as Violation } from './Violation.js'
export { default as AuditLog } from './AuditLog.js'
export { default as Notification } from './Notification.js'

// Import for default export
import Student from './Student.js'
import Warden from './Warden.js'
import Security from './Security.js'
import Admin from './Admin.js'
import Parent from './Parent.js'
import OutpassRequest from './OutpassRequest.js'
import OutpassLog from './OutpassLog.js'
import Hod from './Hod.js'
import Violation from './Violation.js'
import AuditLog from './AuditLog.js'
import Notification from './Notification.js'

// Default export for convenience
export default {
  Student,
  Warden,
  Security,
  Admin,
  Parent,
  OutpassRequest,
  OutpassLog,
  Hod,
  Violation,
  AuditLog,
  Notification
}