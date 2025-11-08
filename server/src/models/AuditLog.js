import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'userModel',
      required: true,
      index: true,
    },
    userModel: {
      type: String,
      required: true,
      enum: ['Student', 'Warden', 'Admin', 'Security', 'Hod'],
    },
    action: {
      type: String,
      required: true,
      enum: [
        'create',
        'update',
        'delete',
        'login',
        'logout',
        'approve',
        'reject',
        'view',
        'export',
        'upload',
        'download',
      ],
      index: true,
    },
    resource: {
      type: String,
      required: true,
      enum: [
        'user',
        'student',
        'outpass',
        'violation',
        'settings',
        'report',
        'profile',
        'password',
      ],
      index: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['success', 'failure', 'partial'],
      default: 'success',
      index: true,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
auditLogSchema.index({ user: 1, createdAt: -1 })
auditLogSchema.index({ action: 1, resource: 1, createdAt: -1 })
auditLogSchema.index({ createdAt: -1 })

// Static methods
auditLogSchema.statics.logAction = async function (data) {
  try {
    return await this.create(data)
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't throw - audit logging should not break the main flow
    return null
  }
}

auditLogSchema.statics.getUserActivity = async function (userId, options = {}) {
  const query = { user: userId }
  const { limit = 50, skip = 0 } = options

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean()
}

auditLogSchema.statics.getRecentActivity = async function (options = {}) {
  const { limit = 100, skip = 0, action, resource, startDate, endDate } = options

  const query = {}
  if (action) query.action = action
  if (resource) query.resource = resource
  if (startDate || endDate) {
    query.createdAt = {}
    if (startDate) query.createdAt.$gte = new Date(startDate)
    if (endDate) query.createdAt.$lte = new Date(endDate)
  }

  return this.find(query)
    .populate('user')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean()
}

auditLogSchema.statics.getActivityStats = async function (filters = {}) {
  const matchStage = {}
  if (filters.startDate) matchStage.createdAt = { $gte: new Date(filters.startDate) }
  if (filters.endDate) {
    matchStage.createdAt = matchStage.createdAt || {}
    matchStage.createdAt.$lte = new Date(filters.endDate)
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalActions: { $sum: 1 },
        successfulActions: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
        failedActions: { $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] } },
        uniqueUsers: { $addToSet: '$user' },
      },
    },
    {
      $project: {
        _id: 0,
        totalActions: 1,
        successfulActions: 1,
        failedActions: 1,
        uniqueUserCount: { $size: '$uniqueUsers' },
      },
    },
  ])
}

const AuditLog = mongoose.model('AuditLog', auditLogSchema)

export default AuditLog
