/**
 * Application Constants — Frontend
 * client/src/constants/index.js
 */

// ─── API Configuration ────────────────────────────────────────────────────────
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

// ─── User Roles ───────────────────────────────────────────────────────────────
export const USER_ROLES = {
  STUDENT: 'student',
  WARDEN: 'warden',
  ADMIN: 'admin',
  SECURITY: 'security',
  COUNSELLOR: 'counsellor',
  HOD: 'hod',
  SUPER_ADMIN: 'super_admin',
}

// ─── Admin Sub-Roles ──────────────────────────────────────────────────────────
export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  HOSTEL_ADMIN: 'hostel_admin',
  ACADEMIC_ADMIN: 'academic_admin',
  SECURITY_ADMIN: 'security_admin',
  SYSTEM_ADMIN: 'system_admin',
}

// ─── User Status ──────────────────────────────────────────────────────────────
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
}

// ─── Outpass Status ───────────────────────────────────────────────────────────
export const OUTPASS_STATUS = {
  PENDING: 'pending',
  COUNSELLOR_PENDING: 'counsellor_pending',
  COUNSELLOR_APPROVED: 'counsellor_approved',
  REJECTED_BY_COUNSELLOR: 'rejected_by_counsellor',
  APPROVED: 'approved',
  APPROVED_BY_WARDEN: 'approved_by_warden',
  APPROVED_BY_HOD: 'approved_by_hod',
  REJECTED: 'rejected',
  REJECTED_BY_HOD: 'rejected_by_hod',
  CANCELLED: 'cancelled',
  OUT: 'out',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  OVERDUE: 'overdue',
}

// ─── Outpass Types ────────────────────────────────────────────────────────────
export const OUTPASS_TYPES = {
  LOCAL: 'local',
  HOME: 'home',
  MEDICAL: 'medical',
  EMERGENCY: 'emergency',
  ACADEMIC: 'academic',
  PERSONAL: 'personal',
}

// ─── Hostel Types ─────────────────────────────────────────────────────────────
export const HOSTEL_TYPES = {
  BOYS: 'boys',
  GIRLS: 'girls',
}

// ─── Hostel Blocks ────────────────────────────────────────────────────────────
// Boys hostel  → A, B, C, D
// Girls hostel → E, F, G, H
export const BOYS_BLOCKS  = ['A', 'B', 'C', 'D']
export const GIRLS_BLOCKS = ['E', 'F', 'G', 'H']
export const ALL_BLOCKS   = [...BOYS_BLOCKS, ...GIRLS_BLOCKS]

// Use HOSTEL_BLOCKS[hostelType] to get blocks for a specific hostel type
// HOSTEL_BLOCKS['boys']  → ['A','B','C','D']
// HOSTEL_BLOCKS['girls'] → ['E','F','G','H']
export const HOSTEL_BLOCKS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export const HOSTEL_BLOCKS_BY_TYPE = {
  boys: BOYS_BLOCKS,
  girls: GIRLS_BLOCKS,
}

export const getHostelTypeFromBlock = (block) => {
  if (!block) return null
  const upper = block.toUpperCase()
  if (BOYS_BLOCKS.includes(upper))  return 'boys'
  if (GIRLS_BLOCKS.includes(upper)) return 'girls'
  return null
}

// ─── Departments ──────────────────────────────────────────────────────────────
export const DEPARTMENTS = ['CSE', 'ECE', 'ME', 'CE', 'EE', 'IT']

// ─── Courses ──────────────────────────────────────────────────────────────────
export const COURSES = [
  'B.Tech',
  'M.Tech',
  'MBA',
  'MCA',
  'BBA',
  'BCA',
  'BSc',
]

// ─── Priority Levels ──────────────────────────────────────────────────────────
export const PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  EMERGENCY: 'emergency',
}

// ─── Theme ────────────────────────────────────────────────────────────────────
export const THEME = {
  LIGHT: 'light',
  DARK: 'dark',
}

// ─── Local Storage Keys ───────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_DATA: 'userData',
  PENDING_VERIFICATION_EMAIL: 'pendingVerificationEmail',
  THEME: 'theme',
}

// ─── Colors ───────────────────────────────────────────────────────────────────
export const COLORS = {
  PRIMARY: '#3498DB',
  ACCENT_GREEN: '#2ECC71',
  ACCENT_RED: '#E74C3C',
  NEUTRAL_BG: '#F8F8F8',
  NEUTRAL_TEXT: '#333333',
}

// ─── Status Badge Colors ──────────────────────────────────────────────────────
export const STATUS_COLORS = {
  // Outpass statuses
  pending:               'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  counsellor_pending:    'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  counsellor_approved:   'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  rejected_by_counsellor:'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  approved:              'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  approved_by_warden:    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  approved_by_hod:       'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  rejected:              'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  rejected_by_hod:       'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  cancelled:             'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  out:                   'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  completed:             'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  expired:               'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  overdue:               'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',

  // User statuses
  active:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  inactive:  'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  pending_user: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
}

// ─── Routes ───────────────────────────────────────────────────────────────────
export const ROUTES = {
  HOME: '/',

  // Role-specific login pages
  LOGIN: '/login',
  STUDENT_LOGIN: '/student/login',
  WARDEN_LOGIN: '/warden/login',
  ADMIN_LOGIN: '/admin/login',
  SECURITY_LOGIN: '/security/login',
  HOD_LOGIN: '/hod/login',
  COUNSELLOR_LOGIN: '/counsellor/login',

  // Dashboards
  DASHBOARD: '/dashboard',
  STUDENT_DASHBOARD: '/student/dashboard',
  ADMIN_DASHBOARD: '/admin/dashboard',
  SECURITY_DASHBOARD: '/security/dashboard',
  HOD_DASHBOARD: '/hod/dashboard',
  COUNSELLOR_DASHBOARD: '/counsellor/dashboard',

  // Features
  STUDENTS: '/students',
  WARDENS: '/wardens',
  HODS: '/hods',
  COUNSELLORS: '/counsellors',
  SECURITY: '/security',
  OUTPASS_REQUESTS: '/outpass-requests',
  OUTPASS_HISTORY: '/history',
  STUDENT_HISTORY: '/student/history',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  SECURITY_SCAN: '/security/scan',
  ATTENDANCE: '/attendance',
  PARENTS: '/parents',

  // Auth
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',

  NOT_FOUND: '/404',
}

// ─── API Endpoints ────────────────────────────────────────────────────────────
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
  PROFILE: '/auth/me',
  HOSTEL_BLOCKS: '/auth/hostel-blocks',

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
  HOD_PROFILE: '/hods/profile',
  HOD_STUDENTS: '/hods/students',

  // Counsellor
  COUNSELLOR_DASHBOARD: '/counsellors/dashboard',
  COUNSELLOR_OUTPASSES: '/counsellors/outpasses',
  COUNSELLOR_STUDENTS: '/counsellors/students',
  COUNSELLOR_APPROVE: '/counsellors/approve',
  COUNSELLOR_REJECT: '/counsellors/reject',
  COUNSELLOR_PROFILE: '/counsellors/profile',

  // Health
  HEALTH: '/health',
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  LIMITS: [10, 25, 50, 100],
}
// given hostelType → returns array of blocks
// getBlocksForHostel('boys')  → ['A','B','C','D']
// getBlocksForHostel('girls') → ['E','F','G','H']
export const getBlocksForHostel = (hostelType) => {
  if (!hostelType) return ALL_BLOCKS
  return HOSTEL_BLOCKS_BY_TYPE[hostelType] || ALL_BLOCKS
}
// ─── Date Formats ─────────────────────────────────────────────────────────────
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_TIME: 'MMM dd, yyyy hh:mm a',
  API: 'yyyy-MM-dd',
  API_TIME: "yyyy-MM-dd'T'HH:mm:ss",
}

// ─── Validation Rules ─────────────────────────────────────────────────────────
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PHONE_PATTERN: /^[0-9]{10,15}$/,
  PHONE_INDIAN: /^[6-9]\d{9}$/,
  EMAIL_PATTERN: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
  ROLL_NUMBER_PATTERN: /^[A-Z0-9]+$/i,
  STUDENT_ID_PATTERN: /^\d{4}-\d{4}$/,
  TIME_HH_MM: /^\d{2}:\d{2}$/,
}

// ─── Toast Configuration ──────────────────────────────────────────────────────
export const TOAST_CONFIG = {
  SUCCESS: {
    duration: 3000,
    position: 'top-right',
    style: { background: '#2ECC71', color: '#fff' },
  },
  ERROR: {
    duration: 4000,
    position: 'top-right',
    style: { background: '#E74C3C', color: '#fff' },
  },
  LOADING: {
    duration: Infinity,
    position: 'top-right',
  },
}