import express from 'express'
import { authenticateToken, authorize } from '../middleware/auth.js'
import { readLimiter, writeLimiter } from '../middleware/rateLimiter.js'
import * as WardenController from '../controllers/wardenController.js'

const router = express.Router()

/**
 * @route   GET /api/v1/wardens
 * @desc    Get all wardens
 * @access  Private (Admin, Warden)
 */
router.get(
  '/',
  authenticateToken,
  authorize('admin', 'warden'),
  readLimiter,
  WardenController.getAllWardens
)

/**
 * @route   GET /api/v1/wardens/:id
 * @desc    Get warden by ID
 * @access  Private (Admin, Warden)
 */
router.get(
  '/:id',
  authenticateToken,
  authorize('admin', 'warden'),
  readLimiter,
  WardenController.getWardenById
)

/**
 * @route   GET /api/v1/wardens/dashboard/stats
 * @desc    Get warden dashboard statistics
 * @access  Private (Warden)
 */
router.get(
  '/dashboard/stats',
  authenticateToken,
  authorize('warden'),
  readLimiter,
  WardenController.getWardenDashboardStats
)

/**
 * @route   GET /api/v1/wardens/hostel/:hostelType
 * @desc    Get wardens by hostel type
 * @access  Private (Admin, Warden)
 */
router.get(
  '/hostel/:hostelType',
  authenticateToken,
  authorize('admin', 'warden'),
  readLimiter,
  WardenController.getWardensByHostelType
)

/**
 * @route   PATCH /api/v1/wardens/:id
 * @desc    Update warden details
 * @access  Private (Admin)
 */
router.patch(
  '/:id',
  authenticateToken,
  authorize('admin'),
  writeLimiter,
  WardenController.updateWarden
)

/**
 * @route   DELETE /api/v1/wardens/:id
 * @desc    Delete warden
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authenticateToken,
  authorize('admin'),
  writeLimiter,
  WardenController.deleteWarden
)

/**
 * @route   GET /api/v1/wardens/:id/students
 * @desc    Get students under warden's hostel blocks
 * @access  Private (Warden)
 */
router.get(
  '/:id/students',
  authenticateToken,
  authorize('warden'),
  readLimiter,
  WardenController.getWardenStudents
)

/**
 * @route   GET /api/v1/wardens/:id/outpasses
 * @desc    Get outpasses for warden's hostel blocks
 * @access  Private (Warden)
 */
router.get(
  '/:id/outpasses',
  authenticateToken,
  authorize('warden'),
  readLimiter,
  WardenController.getWardenOutpasses
)

export default router
