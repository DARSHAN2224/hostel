import express from 'express'
import { authenticateToken, authorize } from '../middleware/auth.js'
import { readLimiter, writeLimiter } from '../middleware/rateLimiter.js'
import * as SecurityController from '../controllers/securityController.js'

const router = express.Router()

/**
 * @route   GET /api/v1/security/dashboard/stats
 * @desc    Get security dashboard statistics
 * @access  Private (Security)
 */
router.get(
  '/dashboard/stats',
  authenticateToken,
  authorize('security'),
  readLimiter,
  SecurityController.getSecurityDashboardStats
)

/**
 * @route   GET /api/v1/security/active-outpasses
 * @desc    Get active/approved outpasses for gate verification
 * @access  Private (Security)
 */
router.get(
  '/active-outpasses',
  authenticateToken,
  authorize('security'),
  readLimiter,
  SecurityController.getActiveOutpasses
)

/**
 * @route   POST /api/v1/security/verify-outpass
 * @desc    Verify outpass by QR code or manual code
 * @access  Private (Security)
 */
router.post(
  '/verify-outpass',
  authenticateToken,
  authorize('security'),
  writeLimiter,
  SecurityController.verifyOutpass
)

/**
 * @route   POST /api/v1/security/record-exit/:outpassId
 * @desc    Record student exit
 * @access  Private (Security)
 */
router.post(
  '/record-exit/:outpassId',
  authenticateToken,
  authorize('security'),
  writeLimiter,
  SecurityController.recordExit
)

/**
 * @route   POST /api/v1/security/record-return/:outpassId
 * @desc    Record student return
 * @access  Private (Security)
 */
router.post(
  '/record-return/:outpassId',
  authenticateToken,
  authorize('security'),
  writeLimiter,
  SecurityController.recordReturn
)

/**
 * @route   GET /api/v1/security/students-out
 * @desc    Get list of students currently out
 * @access  Private (Security)
 */
router.get(
  '/students-out',
  authenticateToken,
  authorize('security'),
  readLimiter,
  SecurityController.getStudentsOut
)

/**
 * @route   GET /api/v1/security/recent-activity
 * @desc    Get recent gate activity (exits/returns)
 * @access  Private (Security)
 */
router.get(
  '/recent-activity',
  authenticateToken,
  authorize('security'),
  readLimiter,
  SecurityController.getRecentActivity
)

/**
 * @route   GET /api/v1/security/overdue-returns
 * @desc    Get students who haven't returned on time
 * @access  Private (Security)
 */
router.get(
  '/overdue-returns',
  authenticateToken,
  authorize('security'),
  readLimiter,
  SecurityController.getOverdueReturns
)

export default router
