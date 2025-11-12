/**
 * Application Constants
 * Centralized configuration and constants
 */

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

// User Roles
export const USER_ROLES = {
  STUDENT: 'student',
  WARDEN: 'warden',
  ADMIN: 'admin',
  SECURITY: 'security',
  HOD: 'hod',
  SUPER_ADMIN: 'super_admin'
}

// Admin Sub-Roles
export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  HOSTEL_ADMIN: 'hostel_admin',
  ACADEMIC_ADMIN: 'academic_admin',
  SECURITY_ADMIN: 'security_admin',
  SYSTEM_ADMIN: 'system_admin'
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
  APPROVED_BY_WARDEN: 'approved_by_warden',
  APPROVED_BY_HOD: 'approved_by_hod',
  REJECTED: 'rejected',
  REJECTED_BY_HOD: 'rejected_by_hod',
  CANCELLED: 'cancelled',
  OUT: 'out',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  OVERDUE: 'overdue'
}

// Outpass Types
export const OUTPASS_TYPES = {
  LOCAL: 'local',
  HOME: 'home',
  MEDICAL: 'medical',
  EMERGENCY: 'emergency',
  ACADEMIC: 'academic',
  PERSONAL: 'personal'
}

// Hostel Types
export const HOSTEL_TYPES = {
  BOYS: 'boys',
  GIRLS: 'girls'
}

// Departments
export const DEPARTMENTS = [
  'Computer Science',
  'Electronics',
  'Mechanical',
  'Civil',
  'Electrical'
]

// Courses
export const COURSES = [
  'B.Tech',
  'M.Tech',
  'MBA',
  'BSc'
]

// Hostel Blocks
export const HOSTEL_BLOCKS = ['A', 'B', 'C', 'D']

// Priority Levels
export const PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  EMERGENCY: 'emergency'
}

// Theme
export const THEME = {
  LIGHT: 'light',
  DARK: 'dark'
}

// Local Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_DATA: 'userData',
  // When a user has supplied correct credentials but must verify email,
  // store the email here so route-guards can restrict navigation to the
  // verify page until verification completes.
  PENDING_VERIFICATION_EMAIL: 'pendingVerificationEmail',
  THEME: 'theme'
}

// Colors (matching Hostel_UI design)
export const COLORS = {
  PRIMARY: '#3498DB',
  ACCENT_GREEN: '#2ECC71',
  ACCENT_RED: '#E74C3C',
  NEUTRAL_BG: '#F8F8F8',
  NEUTRAL_TEXT: '#333333'
}

// Status Badge Colors
export const STATUS_COLORS = {
  [OUTPASS_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  [OUTPASS_STATUS.APPROVED]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  [OUTPASS_STATUS.APPROVED_BY_WARDEN]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  [OUTPASS_STATUS.APPROVED_BY_HOD]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  [OUTPASS_STATUS.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  [OUTPASS_STATUS.REJECTED_BY_HOD]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  [OUTPASS_STATUS.CANCELLED]: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  [OUTPASS_STATUS.OUT]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  [OUTPASS_STATUS.COMPLETED]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  [OUTPASS_STATUS.EXPIRED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  [OUTPASS_STATUS.OVERDUE]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  [USER_STATUS.ACTIVE]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  [USER_STATUS.INACTIVE]: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  [USER_STATUS.SUSPENDED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  [USER_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
}

// Routes
export const ROUTES = {
  HOME: '/',
  
  // Auth Routes - Unified (backend uses single endpoint)
  LOGIN: '/login',
  
  // Role-specific Login Pages
  STUDENT_LOGIN: '/student/login',
  WARDEN_LOGIN: '/warden/login',
  ADMIN_LOGIN: '/admin/login',
  SECURITY_LOGIN: '/security/login',
  HOD_LOGIN: '/hod/login',
  
  // Note: No signup routes - all accounts are created by admins/wardens via /api/v1/users
  // Students are registered by wardens, not self-registered
  
  // Dashboard
  DASHBOARD: '/dashboard',
  
  // Features
  STUDENTS: '/students',
  WARDENS: '/wardens',
  HODS: '/hods',
  OUTPASS_REQUESTS: '/outpass-requests',
  OUTPASS_HISTORY: '/history',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  NOT_FOUND: '/404'
}

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  REGISTER_ADMIN: '/auth/register-initial-admin',
  VERIFY_EMAIL: '/auth/verify-email',
  RESEND_VERIFICATION: '/auth/resend-verification',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  
  // Students
  STUDENTS: '/students',
  STUDENT_PROFILE: '/students/profile',
  STUDENT_CHANGE_PASSWORD: '/students/change-password',
  STUDENT_SEARCH: '/students/search',
  STUDENT_STATISTICS: '/students/statistics',
  
  // Outpass
  OUTPASS_CREATE: '/outpass/create',
  OUTPASS_LIST: '/outpass/warden/all',
  OUTPASS_MY: '/outpass/student/my-outpasses',
  OUTPASS_APPROVE: '/outpass/warden/approve',
  OUTPASS_REJECT: '/outpass/warden/reject',
  OUTPASS_DASHBOARD: '/outpass/warden/dashboard',
  
  // Users (managed creation)
  USERS: '/users',
  
  // HOD
  HOD_LOGIN: '/hods/login',
  HOD_PROFILE: '/hods/profile',
  HOD_STUDENTS: '/hods/students',
  
  // Health
  HEALTH: '/health'
}

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  LIMITS: [10, 25, 50, 100]
}

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_TIME: 'MMM dd, yyyy hh:mm a',
  API: 'yyyy-MM-dd',
  API_TIME: "yyyy-MM-dd'T'HH:mm:ss"
}

// Validation Rules
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 128,
  PHONE_PATTERN: /^[0-9]{10,15}$/,
  EMAIL_PATTERN: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
  ROLL_NUMBER_PATTERN: /^[A-Z0-9]+$/i,
  STUDENT_ID_PATTERN: /^\d{4}-\d{4}$/
}

// Toast Configuration
export const TOAST_CONFIG = {
  SUCCESS: {
    duration: 3000,
    position: 'top-right',
    style: {
      background: '#2ECC71',
      color: '#fff'
    }
  },
  ERROR: {
    duration: 4000,
    position: 'top-right',
    style: {
      background: '#E74C3C',
      color: '#fff'
    }
  },
  LOADING: {
    duration: Infinity,
    position: 'top-right'
  }
}
