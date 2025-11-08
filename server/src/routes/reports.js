import express from 'express'
import {
  getOutpassReport,
  getViolationReport,
  getStudentActivityReport,
  getAuditLogReport,
  getDashboardStats
} from '../controllers/reportController.js'
import { authenticateToken, authorize } from '../middleware/auth.js'
import { readLimiter } from '../middleware/rateLimiter.js'

const router = express.Router()

// Protect all routes - require authentication
router.use(authenticateToken)

// Apply read rate limiting to all routes (reports are read-only)
router.use(readLimiter)

// Dashboard statistics (all authenticated users can view basic stats)
router.get('/dashboard-stats', getDashboardStats)

// Outpass report (Admin, HOD, Warden)
router.get('/outpass', authorize('admin', 'hod', 'warden'), getOutpassReport)

// Violation report (Admin, Warden, Security)
router.get('/violations', authorize('admin', 'warden', 'security'), getViolationReport)

// Student activity report (Admin, Warden)
router.get('/student-activity', authorize('admin', 'warden'), getStudentActivityReport)

// Audit log report (Admin only)
router.get('/audit-logs', authorize('admin'), getAuditLogReport)

export default router
