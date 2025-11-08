import mongoose from 'mongoose'

const violationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    outpass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OutpassRequest',
      index: true,
    },
    violationType: {
      type: String,
      required: true,
      enum: [
        'late_return',
        'no_return',
        'unauthorized_exit',
        'fake_outpass',
        'misconduct',
        'other',
      ],
      index: true,
    },
    severity: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'reporterModel',
      required: true,
    },
    reporterModel: {
      type: String,
      required: true,
      enum: ['Security', 'Warden', 'Admin', 'Hod'],
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'acknowledged', 'resolved', 'dismissed'],
      default: 'pending',
      index: true,
    },
    actionTaken: {
      type: String,
      trim: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'resolverModel',
    },
    resolverModel: {
      type: String,
      enum: ['Warden', 'Admin', 'Hod'],
    },
    resolvedAt: {
      type: Date,
    },
    evidence: [
      {
        type: String,
        trim: true,
      },
    ],
    notes: [
      {
        text: String,
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'notes.addedByModel',
        },
        addedByModel: {
          type: String,
          enum: ['Security', 'Warden', 'Admin', 'Hod'],
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
)

// Indexes
violationSchema.index({ student: 1, createdAt: -1 })
violationSchema.index({ status: 1, severity: -1 })
violationSchema.index({ violationType: 1, createdAt: -1 })

// Static methods
violationSchema.statics.getStudentViolations = async function (studentId) {
  return this.find({ student: studentId })
    .populate('student', 'name rollNumber')
    .populate('reportedBy')
    .populate('resolvedBy')
    .sort({ createdAt: -1 })
}

violationSchema.statics.getPendingViolations = async function () {
  return this.find({ status: 'pending' })
    .populate('student', 'name rollNumber email phoneNumber')
    .populate('reportedBy')
    .sort({ severity: -1, createdAt: -1 })
}

violationSchema.statics.getViolationStats = async function (filters = {}) {
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
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        dismissed: { $sum: { $cond: [{ $eq: ['$status', 'dismissed'] }, 1, 0] } },
        critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
        low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } },
      },
    },
  ])
}

// Instance methods
violationSchema.methods.resolve = async function (resolvedBy, resolverModel, actionTaken) {
  this.status = 'resolved'
  this.resolvedBy = resolvedBy
  this.resolverModel = resolverModel
  this.actionTaken = actionTaken
  this.resolvedAt = new Date()
  return this.save()
}

violationSchema.methods.dismiss = async function (resolvedBy, resolverModel, reason) {
  this.status = 'dismissed'
  this.resolvedBy = resolvedBy
  this.resolverModel = resolverModel
  this.actionTaken = reason
  this.resolvedAt = new Date()
  return this.save()
}

violationSchema.methods.addNote = async function (text, addedBy, addedByModel) {
  this.notes.push({
    text,
    addedBy,
    addedByModel,
    addedAt: new Date(),
  })
  return this.save()
}

const Violation = mongoose.model('Violation', violationSchema)

export default Violation
