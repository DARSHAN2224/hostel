import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientRole: {
      type: String,
      enum: ['student', 'warden', 'hod', 'admin', 'security'],
      required: true,
    },
    type: {
      type: String,
      enum: [
        'outpass_approved',
        'outpass_rejected',
        'outpass_pending',
        'violation_reported',
        'violation_resolved',
        'profile_update',
        'password_changed',
        'system_announcement',
        'late_return_warning',
        'outpass_expiring',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    relatedEntity: {
      entityType: {
        type: String,
        enum: ['outpass', 'violation', 'user', 'announcement'],
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    actionUrl: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for efficient querying
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 })
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }) // Auto-delete after 30 days

// Methods
notificationSchema.methods.markAsRead = async function () {
  if (!this.isRead) {
    this.isRead = true
    this.readAt = new Date()
    await this.save()
  }
  return this
}

// Statics
notificationSchema.statics.createNotification = async function (data) {
  return await this.create(data)
}

notificationSchema.statics.getUnreadCount = async function (userId) {
  return await this.countDocuments({ recipient: userId, isRead: false })
}

notificationSchema.statics.markAllAsRead = async function (userId) {
  return await this.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  )
}

notificationSchema.statics.deleteOldNotifications = async function (days = 30) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  return await this.deleteMany({ createdAt: { $lt: cutoffDate } })
}

const Notification = mongoose.model('Notification', notificationSchema)

export default Notification
