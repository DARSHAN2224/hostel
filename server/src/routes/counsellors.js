import express from 'express'
import counsellorController from '../controllers/counsellorController.js'
import { authenticateToken, authorize } from '../middleware/auth.js'
import { readLimiter, writeLimiter } from '../middleware/rateLimiter.js'

const router = express.Router()

// ─── Counsellor self-service routes ──────────────────────────────────────────

// GET  /api/v1/counsellors/dashboard
router.get(
  '/dashboard',
  authenticateToken,
  authorize('counsellor'),
  readLimiter,
  counsellorController.getDashboard
)

// GET  /api/v1/counsellors/profile
router.get(
  '/profile',
  authenticateToken,
  authorize('counsellor'),
  readLimiter,
  counsellorController.getProfile
)

// PATCH /api/v1/counsellors/profile
router.patch(
  '/profile',
  authenticateToken,
  authorize('counsellor'),
  writeLimiter,
  counsellorController.updateProfile
)

// GET  /api/v1/counsellors/outpasses  — all outpasses assigned to this counsellor
router.get(
  '/outpasses',
  authenticateToken,
  authorize('counsellor'),
  readLimiter,
  counsellorController.getOutpasses
)

// GET  /api/v1/counsellors/students  — students assigned to this counsellor
router.get(
  '/students',
  authenticateToken,
  authorize('counsellor'),
  readLimiter,
  counsellorController.getStudents
)

// POST /api/v1/counsellors/approve/:requestId  — approve a college-hours outpass
router.post(
  '/approve/:requestId',
  authenticateToken,
  authorize('counsellor'),
  writeLimiter,
  counsellorController.approveOutpass
)

// POST /api/v1/counsellors/reject/:requestId  — reject a college-hours outpass
router.post(
  '/reject/:requestId',
  authenticateToken,
  authorize('counsellor'),
  writeLimiter,
  counsellorController.rejectOutpass
)

// ─── Admin-only management routes ────────────────────────────────────────────

// GET  /api/v1/counsellors          — list all counsellors
router.get(
  '/',
  authenticateToken,
  authorize('admin'),
  readLimiter,
  counsellorController.getAllCounsellors
)

// GET  /api/v1/counsellors/stats    — aggregated stats
router.get(
  '/stats',
  authenticateToken,
  authorize('admin'),
  readLimiter,
  counsellorController.getStats
)

// GET  /api/v1/counsellors/:id      — single counsellor by id
router.get(
  '/:id',
  authenticateToken,
  authorize('admin'),
  readLimiter,
  counsellorController.getCounsellorById
)

// PATCH /api/v1/counsellors/:id     — update counsellor
router.patch(
  '/:id',
  authenticateToken,
  authorize('admin'),
  writeLimiter,
  counsellorController.updateCounsellor
)

// DELETE /api/v1/counsellors/:id    — delete counsellor
router.delete(
  '/:id',
  authenticateToken,
  authorize('admin'),
  writeLimiter,
  counsellorController.deleteCounsellor
)

export default router