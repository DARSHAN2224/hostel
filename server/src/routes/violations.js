import express from 'express'
import {
  createViolation,
  getViolations,
  getPendingViolations,
  getStudentViolations,
  getViolationStatistics,
  resolveViolation,
  dismissViolation,
  addViolationNote,
} from '../controllers/violationController.js'
import { authenticateToken, authorize } from '../middleware/auth.js'

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

// Create violation - Security, Warden, Admin, HOD
router.post(
  '/',
  authorize(['security', 'warden', 'admin', 'hod']),
  createViolation
)

// Get all violations - Warden, Admin, HOD
router.get(
  '/',
  authorize(['warden', 'admin', 'hod']),
  getViolations
)

// Get pending violations - Warden, Admin, HOD
router.get(
  '/pending',
  authorize(['warden', 'admin', 'hod']),
  getPendingViolations
)

// Get violation statistics - Warden, Admin, HOD
router.get(
  '/statistics',
  authorize(['warden', 'admin', 'hod']),
  getViolationStatistics
)

// Get student violations - Student can view own, others restricted
router.get(
  '/student/:studentId',
  getStudentViolations
)

// Resolve violation - Warden, Admin, HOD
router.put(
  '/:id/resolve',
  authorize(['warden', 'admin', 'hod']),
  resolveViolation
)

// Dismiss violation - Warden, Admin, HOD
router.put(
  '/:id/dismiss',
  authorize(['warden', 'admin', 'hod']),
  dismissViolation
)

// Add note to violation - Security, Warden, Admin, HOD
router.post(
  '/:id/notes',
  authorize(['security', 'warden', 'admin', 'hod']),
  addViolationNote
)

export default router
