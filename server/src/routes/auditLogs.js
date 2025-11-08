import express from 'express'
import {
  getAuditLogs,
  getUserActivityLogs,
  getAuditStatistics,
} from '../controllers/auditLogController.js'
import { authenticateToken, authorize } from '../middleware/auth.js'

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

// Get audit logs - Admin only
router.get(
  '/',
  authorize(['admin']),
  getAuditLogs
)

// Get audit statistics - Admin only
router.get(
  '/statistics',
  authorize(['admin']),
  getAuditStatistics
)

// Get user activity logs - Admin or own user
router.get(
  '/user/:userId',
  getUserActivityLogs
)

export default router
