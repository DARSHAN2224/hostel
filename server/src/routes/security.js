import express from 'express'
import { authenticateToken, authorize } from '../middleware/auth.js'
import { readLimiter, writeLimiter } from '../middleware/rateLimiter.js'
import * as SecurityController from '../controllers/securityController.js'

const router = express.Router()

// Dashboard stats
router.get('/dashboard/stats', authenticateToken, authorize('security', 'admin', 'warden', 'hod'), readLimiter, SecurityController.getSecurityDashboardStats)

// Active approved outpasses list
router.get('/active-outpasses', authenticateToken, authorize('security', 'admin', 'warden', 'hod'), readLimiter, SecurityController.getActiveOutpasses)

// ─── PRIMARY: Auto scan endpoint (exit on 1st scan, return on 2nd after 10 min) ───
router.post('/scan', authenticateToken, authorize('security', 'admin'), writeLimiter, SecurityController.scanOutpass)

// Verify only (no recording)
router.post('/verify-outpass', authenticateToken, authorize('security', 'admin'), writeLimiter, SecurityController.verifyOutpass)

// Manual exit / return
router.post('/record-exit/:outpassId', authenticateToken, authorize('security', 'admin'), writeLimiter, SecurityController.recordExit)
router.post('/record-return/:outpassId', authenticateToken, authorize('security', 'admin'), writeLimiter, SecurityController.recordReturn)

// Students currently out
router.get('/students-out', authenticateToken, authorize('security', 'admin', 'warden', 'hod'), readLimiter, SecurityController.getStudentsOut)

// Recent gate activity
router.get('/recent-activity', authenticateToken, authorize('security', 'admin', 'warden', 'hod'), readLimiter, SecurityController.getRecentActivity)

// Overdue returns
router.get('/overdue-returns', authenticateToken, authorize('security', 'admin', 'warden', 'hod'), readLimiter, SecurityController.getOverdueReturns)
router.get('/exited-today', authenticateToken, authorize('security', 'admin', 'warden', 'hod'), readLimiter, SecurityController.getExitedToday)

// Currently in (active students not out)
router.get('/currently-in', authenticateToken, authorize('security', 'admin', 'warden', 'hod'), readLimiter, SecurityController.getCurrentlyIn)

// Returned logs
router.get('/returned-logs', authenticateToken, authorize('security', 'admin', 'warden', 'hod'), readLimiter, SecurityController.getReturnedLogs)

// Debug (dev only)
router.get('/debug/outpass/:id', authenticateToken, authorize('security', 'admin'), readLimiter, SecurityController.debugGetOutpass)

export default router