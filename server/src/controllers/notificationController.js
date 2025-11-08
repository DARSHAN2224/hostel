import asyncHandler from 'express-async-handler'
import { Notification } from '../models/index.js'
import { ApiResponse } from '../utils/ApiResponse.js'

/**
 * @desc    Get user's notifications
 * @route   GET /api/v1/notifications
 * @access  Private
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const { limit = 50, skip = 0, isRead, type, priority } = req.query
  const userId = req.user.id

  const query = { recipient: userId }
  if (isRead !== undefined) query.isRead = isRead === 'true'
  if (type) query.type = type
  if (priority) query.priority = priority

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(Number.parseInt(limit))
    .skip(Number.parseInt(skip))

  const total = await Notification.countDocuments(query)
  const unreadCount = await Notification.getUnreadCount(userId)

  res.json(
    new ApiResponse(
      200,
      {
        notifications,
        unreadCount,
        pagination: {
          total,
          limit: Number.parseInt(limit),
          skip: Number.parseInt(skip),
          hasMore: total > Number.parseInt(skip) + Number.parseInt(limit),
        },
      },
      'Notifications fetched successfully'
    )
  )
})

/**
 * @desc    Get unread notification count
 * @route   GET /api/v1/notifications/unread-count
 * @access  Private
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.getUnreadCount(req.user.id)
  res.json(new ApiResponse(200, { count }, 'Unread count fetched successfully'))
})

/**
 * @desc    Mark notification as read
 * @route   PATCH /api/v1/notifications/:id/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params

  const notification = await Notification.findOne({
    _id: id,
    recipient: req.user.id,
  })

  if (!notification) {
    return res.status(404).json(new ApiResponse(404, null, 'Notification not found'))
  }

  await notification.markAsRead()

  res.json(new ApiResponse(200, notification, 'Notification marked as read'))
})

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/v1/notifications/mark-all-read
 * @access  Private
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.markAllAsRead(req.user.id)

  res.json(
    new ApiResponse(
      200,
      { modifiedCount: result.modifiedCount },
      'All notifications marked as read'
    )
  )
})

/**
 * @desc    Delete notification
 * @route   DELETE /api/v1/notifications/:id
 * @access  Private
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params

  const notification = await Notification.findOneAndDelete({
    _id: id,
    recipient: req.user.id,
  })

  if (!notification) {
    return res.status(404).json(new ApiResponse(404, null, 'Notification not found'))
  }

  res.json(new ApiResponse(200, null, 'Notification deleted successfully'))
})

/**
 * @desc    Clear all notifications
 * @route   DELETE /api/v1/notifications/clear-all
 * @access  Private
 */
export const clearAllNotifications = asyncHandler(async (req, res) => {
  const result = await Notification.deleteMany({ recipient: req.user.id })

  res.json(
    new ApiResponse(
      200,
      { deletedCount: result.deletedCount },
      'All notifications cleared'
    )
  )
})

/**
 * Helper function to create notification
 * Can be used by other controllers to send notifications
 */
export const createNotification = async (data) => {
  try {
    return await Notification.createNotification(data)
  } catch (error) {
    console.error('Error creating notification:', error)
    return null
  }
}
