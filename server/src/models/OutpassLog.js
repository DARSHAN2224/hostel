import mongoose from 'mongoose'

const outpassLogSchema = new mongoose.Schema({
  // Reference to the outpass request
  outpassRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OutpassRequest',
    required: [true, 'Outpass request reference is required']
  },
  
  // Quick access fields (denormalized for performance)
  requestId: {
    type: String,
    required: [true, 'Request ID is required'],
    index: true
  },
  
  // Student Information
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student reference is required']
  },
  studentId: {
    type: String,
    required: [true, 'Student ID is required'],
    index: true
  },
  rollNumber: {
    type: String,
    required: [true, 'Roll number is required'],
    index: true
  },
  studentName: {
    type: String,
    required: [true, 'Student name is required']
  },
  hostelBlock: {
    type: String,
    required: [true, 'Hostel block is required']
  },
  roomNumber: {
    type: String,
    required: [true, 'Room number is required']
  },
  
  // Outpass Details
  outpassType: {
    type: String,
    required: [true, 'Outpass type is required']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required']
  },
  destination: {
    type: String,
    required: [true, 'Destination is required']
  },
  
  // Time Details
  plannedLeaveTime: {
    type: Date,
    required: [true, 'Planned leave time is required']
  },
  plannedReturnTime: {
    type: Date,
    required: [true, 'Planned return time is required']
  },
  
  // Actual Gate Entry/Exit Times
  actualExitTime: {
    type: Date,
    index: true
  },
  actualReturnTime: {
    type: Date,
    index: true
  },
  
  // Security Personnel Details
  exitRecordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Security'
  },
  exitSecurityName: String,
  exitSecurityEmployeeId: String,
  
  returnRecordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Security'
  },
  returnSecurityName: String,
  returnSecurityEmployeeId: String,
  
  // Gate Information
  exitGate: {
    type: String,
    required: true
  },
  returnGate: {
    type: String
  },
  
  // Status Tracking
  status: {
    type: String,
    enum: ['approved', 'exited', 'returned', 'overdue', 'cancelled', 'expired'],
    required: true,
    index: true
  },
  
  // Duration Calculations
  plannedDuration: {
    type: Number, // in minutes
    required: true
  },
  actualDuration: {
    type: Number // in minutes, calculated when returned
  },
  
  // Delays and Variations
  exitDelay: {
    type: Number, // in minutes (positive = late, negative = early)
    default: 0
  },
  returnDelay: {
    type: Number, // in minutes (positive = late, negative = early)
    default: 0
  },
  
  // Flags for quick queries
  isOvernight: {
    type: Boolean,
    default: false
  },
  isOverdue: {
    type: Boolean,
    default: false,
    index: true
  },
  isReturned: {
    type: Boolean,
    default: false,
    index: true
  },
  isLate: {
    type: Boolean,
    default: false
  },
  
  // Parent/Guardian Information
  parentApproval: {
    approved: Boolean,
    approvedAt: Date,
    contactMethod: String,
    parentPhone: String
  },
  
  // Warden Information
  wardenApproval: {
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warden'
    },
    wardenName: String,
    approvedAt: Date,
    comments: String
  },
  
  // Verification Details
  qrCodeUsed: {
    type: Boolean,
    default: false
  },
  manualVerification: {
    type: Boolean,
    default: false
  },
  verificationMethod: {
    type: String,
    enum: ['qr_code', 'manual_search', 'id_verification'],
    default: 'qr_code'
  },
  
  // Emergency or Special Cases
  isEmergency: {
    type: Boolean,
    default: false
  },
  emergencyDetails: String,
  
  // System Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Additional Notes
  exitNotes: String,
  returnNotes: String,
  securityRemarks: String,
  
  // GPS Coordinates (if available)
  exitLocation: {
    latitude: Number,
    longitude: Number
  },
  returnLocation: {
    latitude: Number,
    longitude: Number
  },
  
  // Device Information
  exitDeviceInfo: {
    ipAddress: String,
    userAgent: String,
    deviceType: String
  },
  returnDeviceInfo: {
    ipAddress: String,
    userAgent: String,
    deviceType: String
  },
  
  // Violations or Issues
  violations: [{
    type: {
      type: String,
      enum: ['late_return', 'no_return', 'wrong_gate', 'lost_student', 'document_mismatch']
    },
    description: String,
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'violations.reportedByModel'
    },
    reportedByModel: {
      type: String,
      enum: ['Security', 'Warden', 'Admin']
    },
    reportedAt: {
      type: Date,
      default: Date.now
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    resolved: {
      type: Boolean,
      default: false
    },
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'violations.resolvedByModel'
    },
    resolvedByModel: {
      type: String,
      enum: ['Security', 'Warden', 'Admin']
    },
    resolution: String
  }],
  
  // Academic Impact
  academicImpact: {
    missedClasses: Number,
    missedExams: Number,
    subjects: [String]
  }
}, {
  timestamps: false, // We're managing createdAt manually
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Compound indexes for better query performance
outpassLogSchema.index({ studentId: 1, createdAt: -1 })
outpassLogSchema.index({ status: 1, createdAt: -1 })
outpassLogSchema.index({ hostelBlock: 1, createdAt: -1 })
outpassLogSchema.index({ isOverdue: 1, isReturned: 1 })
outpassLogSchema.index({ actualExitTime: 1, actualReturnTime: 1 })
outpassLogSchema.index({ exitRecordedBy: 1, createdAt: -1 })
outpassLogSchema.index({ returnRecordedBy: 1, createdAt: -1 })

// Virtual for formatted planned duration
outpassLogSchema.virtual('plannedDurationFormatted').get(function() {
  const hours = Math.floor(this.plannedDuration / 60)
  const minutes = this.plannedDuration % 60
  return `${hours}h ${minutes}m`
})

// Virtual for formatted actual duration
outpassLogSchema.virtual('actualDurationFormatted').get(function() {
  if (!this.actualDuration) return 'N/A'
  const hours = Math.floor(this.actualDuration / 60)
  const minutes = this.actualDuration % 60
  return `${hours}h ${minutes}m`
})

// Virtual for exit delay formatted
outpassLogSchema.virtual('exitDelayFormatted').get(function() {
  if (this.exitDelay === 0) return 'On time'
  const absDelay = Math.abs(this.exitDelay)
  const prefix = this.exitDelay > 0 ? 'Late by ' : 'Early by '
  return `${prefix}${absDelay} minutes`
})

// Virtual for return delay formatted
outpassLogSchema.virtual('returnDelayFormatted').get(function() {
  if (!this.returnDelay || this.returnDelay === 0) return 'On time'
  const absDelay = Math.abs(this.returnDelay)
  const prefix = this.returnDelay > 0 ? 'Late by ' : 'Early by '
  return `${prefix}${absDelay} minutes`
})

// Virtual for current status description
outpassLogSchema.virtual('statusDescription').get(function() {
  switch (this.status) {
    case 'approved': return 'Approved - Waiting for exit'
    case 'exited': return this.isOverdue ? 'Out - Overdue' : 'Out - On time'
    case 'returned': return this.isLate ? 'Returned - Late' : 'Returned - On time'
    case 'overdue': return 'Overdue - Not returned'
    case 'cancelled': return 'Cancelled'
    case 'expired': return 'Expired'
    default: return 'Unknown status'
  }
})

// Pre-save middleware to calculate durations and delays
outpassLogSchema.pre('save', function(next) {
  // Calculate planned duration
  if (this.plannedLeaveTime && this.plannedReturnTime) {
    this.plannedDuration = Math.round((this.plannedReturnTime - this.plannedLeaveTime) / (1000 * 60))
  }
  
  // Calculate actual duration if returned
  if (this.actualExitTime && this.actualReturnTime) {
    this.actualDuration = Math.round((this.actualReturnTime - this.actualExitTime) / (1000 * 60))
    this.isReturned = true
  }
  
  // Calculate exit delay
  if (this.actualExitTime && this.plannedLeaveTime) {
    this.exitDelay = Math.round((this.actualExitTime - this.plannedLeaveTime) / (1000 * 60))
  }
  
  // Calculate return delay
  if (this.actualReturnTime && this.plannedReturnTime) {
    this.returnDelay = Math.round((this.actualReturnTime - this.plannedReturnTime) / (1000 * 60))
    this.isLate = this.returnDelay > 0
  }
  
  // Check if overdue
  if (this.status === 'exited' && !this.isReturned) {
    const now = new Date()
    this.isOverdue = now > this.plannedReturnTime
    if (this.isOverdue) {
      this.status = 'overdue'
    }
  }
  
  // Set overnight flag
  if (this.plannedLeaveTime && this.plannedReturnTime) {
    const leaveDate = new Date(this.plannedLeaveTime).toDateString()
    const returnDate = new Date(this.plannedReturnTime).toDateString()
    this.isOvernight = leaveDate !== returnDate
  }
  
  next()
})

// Static method to create log from outpass request
outpassLogSchema.statics.createFromOutpassRequest = async function(outpassRequest) {
  const log = new this({
    outpassRequest: outpassRequest._id,
    requestId: outpassRequest.requestId,
    student: outpassRequest.student,
    studentId: outpassRequest.studentId,
    rollNumber: outpassRequest.rollNumber,
    studentName: outpassRequest.studentName || 'Unknown',
    hostelBlock: outpassRequest.hostelBlock || 'Unknown',
    roomNumber: outpassRequest.roomNumber || 'Unknown',
    outpassType: outpassRequest.outpassType,
    reason: outpassRequest.reason,
    destination: outpassRequest.destination.place,
    plannedLeaveTime: outpassRequest.leaveTime,
    plannedReturnTime: outpassRequest.expectedReturnTime,
    status: 'approved',
    exitGate: 'Main Gate', // Default, can be updated
    isEmergency: outpassRequest.priority === 'emergency',
    parentApproval: outpassRequest.parentApproval,
    wardenApproval: {
      approvedBy: outpassRequest.wardenApproval.approvedBy,
      wardenName: 'Unknown', // Would be populated from warden data
      approvedAt: outpassRequest.wardenApproval.approvedAt,
      comments: outpassRequest.wardenApproval.comments
    }
  })
  
  await log.save()
  return log
}

// Instance method to record exit
outpassLogSchema.methods.recordExit = async function(securityInfo, gateInfo = {}) {
  this.actualExitTime = new Date()
  this.exitRecordedBy = securityInfo.securityId
  this.exitSecurityName = securityInfo.securityName
  this.exitSecurityEmployeeId = securityInfo.employeeId
  this.exitGate = gateInfo.gateName || this.exitGate
  this.exitNotes = gateInfo.notes || ''
  this.qrCodeUsed = gateInfo.qrCodeUsed || false
  this.verificationMethod = gateInfo.verificationMethod || 'qr_code'
  this.status = 'exited'
  
  if (gateInfo.deviceInfo) {
    this.exitDeviceInfo = gateInfo.deviceInfo
  }
  
  if (gateInfo.location) {
    this.exitLocation = gateInfo.location
  }
  
  await this.save()
  return this
}

// Instance method to record return
outpassLogSchema.methods.recordReturn = async function(securityInfo, gateInfo = {}) {
  this.actualReturnTime = new Date()
  this.returnRecordedBy = securityInfo.securityId
  this.returnSecurityName = securityInfo.securityName
  this.returnSecurityEmployeeId = securityInfo.employeeId
  this.returnGate = gateInfo.gateName || this.exitGate
  this.returnNotes = gateInfo.notes || ''
  this.status = 'returned'
  
  if (gateInfo.deviceInfo) {
    this.returnDeviceInfo = gateInfo.deviceInfo
  }
  
  if (gateInfo.location) {
    this.returnLocation = gateInfo.location
  }
  
  await this.save()
  return this
}

// Instance method to add violation
outpassLogSchema.methods.addViolation = async function(violationData) {
  this.violations.push({
    ...violationData,
    reportedAt: new Date()
  })
  
  await this.save()
  return this
}

// Instance method to resolve violation
outpassLogSchema.methods.resolveViolation = async function(violationId, resolution, resolvedBy, resolvedByModel) {
  const violation = this.violations.id(violationId)
  if (violation) {
    violation.resolved = true
    violation.resolvedAt = new Date()
    violation.resolvedBy = resolvedBy
    violation.resolvedByModel = resolvedByModel
    violation.resolution = resolution
    
    await this.save()
  }
  
  return this
}

// Static method to get logs for date range
outpassLogSchema.statics.getLogsForDateRange = function(startDate, endDate, filters = {}) {
  const query = {
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    ...filters
  }
  
  return this.find(query)
    .populate('student', 'firstName lastName phone')
    .populate('exitRecordedBy', 'firstName lastName employeeId')
    .populate('returnRecordedBy', 'firstName lastName employeeId')
    .sort({ createdAt: -1 })
}

// Static method to get overdue students
outpassLogSchema.statics.getOverdueStudents = function() {
  return this.find({
    status: 'overdue',
    isReturned: false
  })
  .populate('student', 'firstName lastName phone parentDetails.guardianPhone')
  .sort({ plannedReturnTime: 1 })
}

// Static method to get statistics
outpassLogSchema.statics.getStatistics = async function(dateRange = {}, filters = {}) {
  const matchStage = { ...filters }
  
  if (dateRange.startDate && dateRange.endDate) {
    matchStage.createdAt = {
      $gte: new Date(dateRange.startDate),
      $lte: new Date(dateRange.endDate)
    }
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOutpasses: { $sum: 1 },
        totalExited: { $sum: { $cond: [{ $ne: ['$actualExitTime', null] }, 1, 0] } },
        totalReturned: { $sum: { $cond: ['$isReturned', 1, 0] } },
        totalOverdue: { $sum: { $cond: ['$isOverdue', 1, 0] } },
        totalOvernight: { $sum: { $cond: ['$isOvernight', 1, 0] } },
        avgPlannedDuration: { $avg: '$plannedDuration' },
        avgActualDuration: { $avg: '$actualDuration' },
        avgExitDelay: { $avg: '$exitDelay' },
        avgReturnDelay: { $avg: '$returnDelay' }
      }
    }
  ])
  
  return stats[0] || {}
}

// Static method to get hostel-wise statistics
outpassLogSchema.statics.getHostelWiseStats = async function(dateRange = {}) {
  const matchStage = {}
  
  if (dateRange.startDate && dateRange.endDate) {
    matchStage.createdAt = {
      $gte: new Date(dateRange.startDate),
      $lte: new Date(dateRange.endDate)
    }
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$hostelBlock',
        totalOutpasses: { $sum: 1 },
        totalReturned: { $sum: { $cond: ['$isReturned', 1, 0] } },
        totalOverdue: { $sum: { $cond: ['$isOverdue', 1, 0] } },
        avgDuration: { $avg: '$actualDuration' }
      }
    },
    { $sort: { totalOutpasses: -1 } }
  ])
}

const OutpassLog = mongoose.model('OutpassLog', outpassLogSchema)

export default OutpassLog