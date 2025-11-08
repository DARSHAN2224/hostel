import express from 'express'
import {
  getAllParents,
  getParentById,
  createParent,
  updateParent,
  deleteParent,
  addStudentToParent,
  removeStudentFromParent,
  getParentStats
} from '../controllers/parentController.js'
import { authenticateToken, authorize } from '../middleware/auth.js'
import { readLimiter, writeLimiter } from '../middleware/rateLimiter.js'

const router = express.Router()

// Protect all routes - require authentication
router.use(authenticateToken)

// Statistics route (must be before /:id)
router.get('/stats', readLimiter, authorize('admin'), getParentStats)

// CRUD routes
router
  .route('/')
  .get(readLimiter, authorize('admin', 'warden'), getAllParents)
  .post(writeLimiter, authorize('admin'), createParent)

router
  .route('/:id')
  .get(readLimiter, authorize('admin', 'warden'), getParentById)
  .patch(writeLimiter, authorize('admin'), updateParent)
  .delete(writeLimiter, authorize('admin'), deleteParent)

// Student management routes
router.post('/:id/students', writeLimiter, authorize('admin'), addStudentToParent)
router.delete('/:id/students/:studentId', writeLimiter, authorize('admin'), removeStudentFromParent)

export default router
