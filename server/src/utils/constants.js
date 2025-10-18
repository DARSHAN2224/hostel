/**
 * Application Constants
 * Define all constant values used throughout the application
 */

// HTTP Status Codes
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
}

// User Roles
export const USER_ROLES = {
  STUDENT: 'student',
  WARDEN: 'warden',
  ADMIN: 'admin',
  SECURITY: 'security',
  STAFF: 'staff'
}

// User Status
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending'
}

// Outpass Status
export const OUTPASS_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  OUT: 'out',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
}

// Outpass Types
export const OUTPASS_TYPES = {
  LOCAL: 'local',
  HOME: 'home',
  MEDICAL: 'medical',
  EMERGENCY: 'emergency',
  OFFICIAL: 'official',
  PERSONAL: 'personal'
}

// Admin Roles
export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  HOSTEL_ADMIN: 'hostel_admin',
  ACADEMIC_ADMIN: 'academic_admin',
  SECURITY_ADMIN: 'security_admin',
  SYSTEM_ADMIN: 'system_admin'
}

// Security Shift Types
export const SECURITY_SHIFT_TYPES = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  EVENING: 'evening',
  NIGHT: 'night'
}

// Courses (you can expand this based on your institution)
export const COURSES = [
  'Computer Science Engineering',
  'Information Technology',
  'Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'MBA',
  'MCA',
  'BBA',
  'BCA'
]

// Academic Years
export const YEARS = [1, 2, 3, 4, 5, 6]


// Gender
export const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other'
}

// File Types
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  DOCUMENTS: ['pdf', 'doc', 'docx', 'txt'],
  SPREADSHEETS: ['xls', 'xlsx', 'csv'],
  ALL: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'csv']
}

// File Size Limits (in bytes)
export const FILE_SIZE_LIMITS = {
  AVATAR: 2 * 1024 * 1024,      // 2MB
  DOCUMENT: 10 * 1024 * 1024,   // 10MB
  IMAGE: 5 * 1024 * 1024,       // 5MB
  DEFAULT: 5 * 1024 * 1024      // 5MB
}

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
}

// Date Formats
export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  DATE_ONLY: 'YYYY-MM-DD',
  TIME_ONLY: 'HH:mm:ss',
  DISPLAY: 'DD/MM/YYYY',
  DATETIME_DISPLAY: 'DD/MM/YYYY HH:mm'
}

// Regular Expressions
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  NAME: /^[a-zA-Z\s]{2,50}$/,
  STUDENT_ID: /^[A-Z0-9]{6,12}$/
}

// Cache Keys
export const CACHE_KEYS = {
  USER_PROFILE: (userId) => `user:profile:${userId}`,
  USER_PERMISSIONS: (userId) => `user:permissions:${userId}`,
  ROOM_DETAILS: (roomId) => `room:details:${roomId}`,
  OUTPASS_COUNT: (userId) => `outpass:count:${userId}`
}

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  SHORT: 5 * 60,        // 5 minutes
  MEDIUM: 30 * 60,      // 30 minutes
  LONG: 24 * 60 * 60,   // 24 hours
  VERY_LONG: 7 * 24 * 60 * 60  // 7 days
}

// Error Messages
export const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: 'Invalid email or password',
  UNAUTHORIZED: 'You are not authorized to access this resource',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again',
  TOKEN_INVALID: 'Invalid authentication token',
  
  // Validation
  REQUIRED_FIELD: (field) => `${field} is required`,
  INVALID_EMAIL: 'Please provide a valid email address',
  INVALID_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase and number',
  INVALID_PHONE: 'Please provide a valid phone number',
  
  // Resources
  USER_NOT_FOUND: 'User not found',
  ROOM_NOT_FOUND: 'Room not found',
  OUTPASS_NOT_FOUND: 'Outpass not found',
  
  // Conflicts
  EMAIL_EXISTS: 'Email already exists',
  STUDENT_ID_EXISTS: 'Student ID already exists',
  ROOM_OCCUPIED: 'Room is already occupied',
  
  // Permissions
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action',
  ACCOUNT_SUSPENDED: 'Your account has been suspended',
  
  // Server
  INTERNAL_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable'
}

// Success Messages
export const SUCCESS_MESSAGES = {
  // Authentication
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  REGISTER_SUCCESS: 'Registration successful',
  PASSWORD_RESET: 'Password reset successful',
  
  // CRUD Operations
  CREATED: (resource) => `${resource} created successfully`,
  UPDATED: (resource) => `${resource} updated successfully`,
  DELETED: (resource) => `${resource} deleted successfully`,
  
  // Specific Actions
  OUTPASS_SUBMITTED: 'Outpass request submitted successfully',
  OUTPASS_APPROVED: 'Outpass approved successfully',
  OUTPASS_REJECTED: 'Outpass rejected',
  PROFILE_UPDATED: 'Profile updated successfully'
}

// Environment Types
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  TESTING: 'test',
  STAGING: 'staging',
  PRODUCTION: 'production'
}

// Log Levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  VERBOSE: 'verbose',
  DEBUG: 'debug',
  SILLY: 'silly'
}

// API Versions
export const API_VERSIONS = {
  V1: 'v1',
  V2: 'v2'
}

// Default Values
export const DEFAULTS = {
  USER_ROLE: USER_ROLES.STUDENT,
  USER_STATUS: USER_STATUS.PENDING,
  OUTPASS_STATUS: OUTPASS_STATUS.PENDING,
  PAGE_SIZE: PAGINATION.DEFAULT_LIMIT,
  TIMEZONE: 'UTC'
}

// Hostel Types and Blocks
export const HOSTEL_TYPES = {
  BOYS: 'boys',
  GIRLS: 'girls'
}

// Allowed Hostel Blocks per Type
// Update these arrays to match your actual hostel blocks
export const HOSTEL_BLOCKS = {
  [HOSTEL_TYPES.BOYS]: ['B1', 'B2', 'B3'],
  [HOSTEL_TYPES.GIRLS]: ['G1', 'G2', 'G3']
}