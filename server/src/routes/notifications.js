import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { readLimiter, writeLimiter } from '../middleware/rateLimiter.js'
import * as NotificationController from '../controllers/notificationController.js'

const router = express.Router()

/**
 * @route   GET /api/v1/notifications
 * @desc    Get user's notifications
 * @access  Private
 */
router.get(
  '/',
  authenticateToken,
  readLimiter,
  NotificationController.getNotifications
)

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get(
  '/unread-count',
  authenticateToken,
  readLimiter,
  NotificationController.getUnreadCount
)

/**
 * @route   PATCH /api/v1/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.patch(
  '/:id/read',
  authenticateToken,
  writeLimiter,
  NotificationController.markAsRead
)

/**
 * @route   PATCH /api/v1/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.patch(
  '/mark-all-read',
  authenticateToken,
  writeLimiter,
  NotificationController.markAllAsRead
)

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete(
  '/:id',
  authenticateToken,
  writeLimiter,
  NotificationController.deleteNotification
)

/**
 * @route   DELETE /api/v1/notifications/clear-all
 * @desc    Clear all notifications
 * @access  Private
 */
router.delete(
  '/clear-all',
  authenticateToken,
  writeLimiter,
  NotificationController.clearAllNotifications
)

export default router
