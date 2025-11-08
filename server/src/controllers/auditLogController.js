import AuditLog from '../models/AuditLog.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'

/**
 * @desc    Get recent audit logs
 * @route   GET /api/v1/audit-logs
 * @access  Private (Admin only)
 */
export const getAuditLogs = asyncHandler(async (req, res) => {
  const { limit = 100, skip = 0, action, resource, startDate, endDate } = req.query

  const logs = await AuditLog.getRecentActivity({
    limit,
    skip,
    action,
    resource,
    startDate,
    endDate,
  })

  const total = await AuditLog.countDocuments()

  res.json(
    new ApiResponse(
      200,
      {
        logs,
        pagination: {
          total,
          limit: Number.parseInt(limit),
          skip: Number.parseInt(skip),
          hasMore: total > Number.parseInt(skip) + Number.parseInt(limit),
        },
      },
      'Audit logs fetched successfully'
    )
  )
})

/**
 * @desc    Get user activity logs
 * @route   GET /api/v1/audit-logs/user/:userId
 * @access  Private (Admin or own user)
 */
export const getUserActivityLogs = asyncHandler(async (req, res) => {
  const { userId } = req.params
  const { limit = 50, skip = 0 } = req.query

  // Users can only view their own activity unless they're admin
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return res.status(403).json(new ApiResponse(403, null, 'Access denied'))
  }

  const logs = await AuditLog.getUserActivity(userId, { limit, skip })
  const total = await AuditLog.countDocuments({ user: userId })

  res.json(
    new ApiResponse(
      200,
      {
        logs,
        pagination: {
          total,
          limit: Number.parseInt(limit),
          skip: Number.parseInt(skip),
          hasMore: total > Number.parseInt(skip) + Number.parseInt(limit),
        },
      },
      'User activity logs fetched successfully'
    )
  )
})

/**
 * @desc    Get audit statistics
 * @route   GET /api/v1/audit-logs/statistics
 * @access  Private (Admin only)
 */
export const getAuditStatistics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query

  const stats = await AuditLog.getActivityStats({ startDate, endDate })

  const result = stats[0] || {
    totalActions: 0,
    successfulActions: 0,
    failedActions: 0,
    uniqueUserCount: 0,
  }

  res.json(new ApiResponse(200, result, 'Audit statistics fetched successfully'))
})

/**
 * Middleware to log actions
 */
export const logAction = (action, resource) => {
  return asyncHandler(async (req, res, next) => {
    // Capture original send
    const originalSend = res.json

    // Override send to capture response
    res.json = function (data) {
      // Determine user model based on role
      const userModelMap = {
        student: 'Student',
        warden: 'Warden',
        admin: 'Admin',
        security: 'Security',
        hod: 'Hod',
      }

      // Log the action
      AuditLog.logAction({
        user: req.user?.id,
        userModel: userModelMap[req.user?.role],
        action,
        resource,
        resourceId: req.params.id || req.params.requestId || req.body._id,
        details: {
          method: req.method,
          path: req.path,
          query: req.query,
          body: sanitizeBody(req.body),
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        status: res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure',
      })

      // Call original send
      return originalSend.call(this, data)
    }

    next()
  })
}

// Helper function to sanitize sensitive data from body
function sanitizeBody(body) {
  if (!body) return {}

  const sanitized = { ...body }
  const sensitiveFields = ['password', 'newPassword', 'oldPassword', 'token', 'refreshToken']

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]'
    }
  }

  return sanitized
}
