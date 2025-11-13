/**
 * Student Routes
 * 
 * Defines all HTTP endpoints for student-related operations
 */

import express from 'express'
import StudentController from '../controllers/studentController.js'
import { authenticateToken, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'
import {

  changePasswordSchema,
  updateProfileSchema,
  studentIdSchema,
  searchStudentsSchema,
  suspendStudentSchema,
  updateStudentParentDetailsSchema,
} from '../middleware/validation.js'
import {

  readLimiter,
  writeLimiter,
} from '../middleware/rateLimiter.js'

const router = express.Router()

// Note: Student self-registration and student-specific login are removed.
// Use unified endpoints:
//   - POST /api/v1/users (Admin/Warden) to create students
//   - POST /api/v1/auth/login for login across all roles

// ========================================
// PROTECTED ROUTES (Authentication required)
// ========================================

/**
 * @route   POST /api/v1/students/logout
 * @desc    Logout student
 * @access  Private (Student)
 */
router.post('/logout', authenticateToken, StudentController.logout)

/**
 * @route   GET /api/v1/students/profile
 * @desc    Get current student profile
 * @access  Private (Student)
 */
router.get('/profile', authenticateToken, readLimiter, StudentController.getProfile)

/**
 * @route   PATCH /api/v1/students/profile
 * @desc    Update student profile (includes completing optional fields)
 * @access  Private (Student)
 */
router.patch('/profile', authenticateToken, writeLimiter, validate(updateProfileSchema), StudentController.updateProfile)

/**
 * @route   GET /api/v1/students/profile/completion-status
 * @desc    Check profile completion status
 * @access  Private (Student)
 */
router.get('/profile/completion-status', authenticateToken, readLimiter, StudentController.getProfileCompletionStatus)

/**
 * @route   POST /api/v1/students/change-password
 * @desc    Change password
 * @access  Private (Student)
 */
router.post('/change-password', authenticateToken, writeLimiter, validate(changePasswordSchema), StudentController.changePassword)

/**
 * @route   GET /api/v1/students/can-request-outpass
 * @desc    Check if student can request outpass
 * @access  Private (Student)
 */
router.get('/can-request-outpass', authenticateToken, readLimiter, StudentController.canRequestOutpass)

// ========================================
// ADMIN/WARDEN ONLY ROUTES
// ========================================

/**
 * @route   GET /api/v1/students
 * @desc    Get all students with filters
 * @access  Private (Admin, Warden, Security)
 */
router.get('/', authenticateToken, authorize('admin', 'warden', 'security'), readLimiter, StudentController.getAllStudents)

/**
 * @route   GET /api/v1/students/search
 * @desc    Search students
 * @access  Private (Admin, Warden, Security)
 */
router.get('/search', authenticateToken, authorize('admin', 'warden', 'security'), readLimiter, validate(searchStudentsSchema, 'query'), StudentController.searchStudents)

/**
 * @route   GET /api/v1/students/statistics
 * @desc    Get student statistics
 * @access  Private (Admin, Warden, Security)
 */
router.get('/statistics', authenticateToken, authorize('admin', 'warden', 'security'), readLimiter, StudentController.getStatistics)

/**
 * @route   GET /api/v1/students/by-student-id/:studentId
 * @desc    Get student by student ID
 * @access  Private (Admin, Warden, Security)
 */
router.get('/by-student-id/:studentId', authenticateToken, authorize('admin', 'warden', 'security'), readLimiter, StudentController.getStudentByStudentId)

/**
 * @route   GET /api/v1/students/:id
 * @desc    Get student by ID
 * @access  Private (Admin, Warden, Security)
 */
router.get('/:id', authenticateToken, authorize('admin', 'warden', 'security'), readLimiter, validate(studentIdSchema, 'params'), StudentController.getStudentById)

/**
 * @route   POST /api/v1/students/:id/suspend
 * @desc    Suspend student
 * @access  Private (Admin, Warden)
 */
router.post('/:id/suspend', authenticateToken, authorize('admin', 'warden'), writeLimiter, validate(studentIdSchema, 'params'), validate(suspendStudentSchema), StudentController.suspendStudent)

/**
 * @route   POST /api/v1/students/:id/activate
 * @desc    Activate student
 * @access  Private (Admin, Warden)
 */
router.post('/:id/activate', authenticateToken, authorize('admin', 'warden'), writeLimiter, validate(studentIdSchema, 'params'), StudentController.activateStudent)

/**
 * @route   PATCH /api/v1/students/:id/parent-details
 * @desc    Update student parent details (also creates/updates Parent model)
 * @access  Private (Admin, Warden)
 */
router.patch('/:id/parent-details', authenticateToken, authorize('admin', 'warden'), writeLimiter, validate(studentIdSchema, 'params'), validate(updateStudentParentDetailsSchema), StudentController.updateParentDetails)

export default router
