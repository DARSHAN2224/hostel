import mongoose from 'mongoose'
import { OUTPASS_STATUS, OUTPASS_TYPES } from '../utils/constants.js'

const outpassRequestSchema = new mongoose.Schema({
  // Request Basic Information
  requestId: {
    type: String,
    required: true
    // unique: true - removed to avoid duplicate index warning (defined in schema.index below)
  },
  
  // Student Information (Reference)
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student reference is required']
  },
  studentId: {
    type: String,
    required: [true, 'Student ID is required']
  },
  rollNumber: {
    type: String,
    required: [true, 'Roll number is required']
  },
  
  // Outpass Details
  outpassType: {
    type: String,
    enum: Object.values(OUTPASS_TYPES),
    required: [true, 'Outpass type is required']
  },
  reason: {
    type: String,
    required: [true, 'Reason for outpass is required'],
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  
  // Time Details
  leaveTime: {
    type: Date,
    required: [true, 'Leave time is required']
  },
  expectedReturnTime: {
    type: Date,
    required: [true, 'Expected return time is required']
  },
  
  // Destination
  destination: {
    place: {
      type: String,
      required: [true, 'Destination place is required'],
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    contactPerson: {
      name: String,
      phone: String,
      relationship: String
    }
  },
  
  // Status Management
  status: {
    type: String,
    enum: Object.values(OUTPASS_STATUS),
    default: OUTPASS_STATUS.PENDING
  },
  
  // Approval Workflow
  warden: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warden'
  },
  wardenApproval: {
    approved: {
      type: Boolean,
      default: false
    },
    approvedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warden'
    },
    comments: String
  },

  // HOD Approval (if required)
  hodApprovalRequested: {
    type: Boolean,
    default: false
  },
  hod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hod'
  },
  hodApproval: {
    approved: {
      type: Boolean,
      default: false
    },
    approvedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hod'
    },
    comments: String
  },
  
  // Parent Approval
  parentApproval: {
    approved: {
      type: Boolean,
      default: false
    },
    approvedAt: Date,
    parentContact: String,
    verificationMethod: {
      type: String,
      enum: ['phone_call', 'sms', 'email', 'whatsapp'],
      default: 'phone_call'
    },
    comments: String
  },
  
  // Rejection Details
  rejectionReason: {
    type: String,
    trim: true
  },
  rejectedAt: Date,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'rejectedByModel'
  },
  rejectedByModel: {
    type: String,
    enum: ['Warden', 'Admin']
  },
  
  // Security & Gate Management
  qrCode: {
    type: String
    // Only approved outpasses will have QR codes
    // unique: true - removed to avoid duplicate index warning (defined in schema.index below)
    // sparse: true - removed to avoid duplicate index warning (defined in schema.index below)
  },
  gateEntry: {
    exitTime: Date,
    exitRecordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Security'
    },
    returnTime: Date,
    returnRecordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Security'
    },
    isReturned: {
      type: Boolean,
      default: false
    }
  },
  
  // Emergency Information
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  
  // Metadata
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'emergency'],
    default: 'normal'
  },
  isOvernight: {
    type: Boolean,
    default: false
  },
  
  // Academic Impact
  academicDetails: {
    missedClasses: [{
      subject: String,
      period: String,
      date: Date
    }],
    hasExam: {
      type: Boolean,
      default: false
    },
    examDetails: String
  },
  
  // Auto-expiry
  expiresAt: Date,
  
  // Cancellation
  isCancelled: {
    type: Boolean,
    default: false
  },
  cancelledAt: Date,
  cancellationReason: String,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'cancelledByModel'
  },
  cancelledByModel: {
    type: String,
    enum: ['Student', 'Warden', 'Admin']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for better performance
outpassRequestSchema.index({ student: 1, status: 1 })
outpassRequestSchema.index({ requestId: 1 }, { unique: true })
outpassRequestSchema.index({ studentId: 1 })
outpassRequestSchema.index({ rollNumber: 1 })
outpassRequestSchema.index({ status: 1, createdAt: -1 })
outpassRequestSchema.index({ warden: 1, status: 1 })
outpassRequestSchema.index({ leaveTime: 1 })
outpassRequestSchema.index({ qrCode: 1 }, { unique: true, sparse: true })
outpassRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Virtual for duration
outpassRequestSchema.virtual('duration').get(function() {
  if (!this.leaveTime || !this.expectedReturnTime) return null
  return Math.ceil((this.expectedReturnTime - this.leaveTime) / (1000 * 60 * 60)) // hours
})

// Virtual for time until expiry
outpassRequestSchema.virtual('timeUntilExpiry').get(function() {
  if (!this.expiresAt) return null
  const now = new Date()
  return Math.max(0, Math.ceil((this.expiresAt - now) / (1000 * 60))) // minutes
})

// Virtual for full student name (populated)
outpassRequestSchema.virtual('studentName').get(function() {
  if (this.populated('student') && this.student) {
    return `${this.student.firstName} ${this.student.lastName}`
  }
  return null
})

// Pre-save middleware to generate request ID
outpassRequestSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    
    // Find the last request for today
    const lastRequest = await this.constructor
      .findOne({ requestId: new RegExp(`^OUT${dateStr}`) })
      .sort({ requestId: -1 })
    
    let sequence = 1
    if (lastRequest) {
      const lastSequence = parseInt(lastRequest.requestId.slice(-4))
      sequence = lastSequence + 1
    }
    
    this.requestId = `OUT${dateStr}${sequence.toString().padStart(4, '0')}`
  }
  next()
})

// Pre-save middleware to set overnight flag
outpassRequestSchema.pre('save', function(next) {
  if (this.leaveTime && this.expectedReturnTime) {
    const leaveDate = new Date(this.leaveTime).toDateString()
    const returnDate = new Date(this.expectedReturnTime).toDateString()
    this.isOvernight = leaveDate !== returnDate
  }
  next()
})

// Pre-save middleware to set expiry
outpassRequestSchema.pre('save', function(next) {
  if (this.isNew && this.expectedReturnTime) {
    // Outpass expires 2 hours after expected return time
    this.expiresAt = new Date(this.expectedReturnTime.getTime() + 2 * 60 * 60 * 1000)
  }
  next()
})

// Instance method to approve outpass
outpassRequestSchema.methods.approve = async function(wardenId, comments = '') {
  this.status = OUTPASS_STATUS.APPROVED
  this.wardenApproval.approved = true
  this.wardenApproval.approvedAt = new Date()
  this.wardenApproval.approvedBy = wardenId
  this.wardenApproval.comments = comments
  
  // Generate QR code
  this.qrCode = this.generateQRCode()
  
  await this.save()
  return this
}

// Instance method to reject outpass
outpassRequestSchema.methods.reject = async function(userId, reason, userModel = 'Warden') {
  this.status = OUTPASS_STATUS.REJECTED
  this.rejectionReason = reason
  this.rejectedAt = new Date()
  this.rejectedBy = userId
  this.rejectedByModel = userModel
  
  await this.save()
  return this
}

// Instance method to cancel outpass
outpassRequestSchema.methods.cancel = async function(userId, reason, userModel = 'Student') {
  this.isCancelled = true
  this.cancelledAt = new Date()
  this.cancellationReason = reason
  this.cancelledBy = userId
  this.cancelledByModel = userModel
  this.status = OUTPASS_STATUS.CANCELLED
  
  await this.save()
  return this
}

// Instance method to record exit
outpassRequestSchema.methods.recordExit = async function(securityId) {
  this.gateEntry.exitTime = new Date()
  this.gateEntry.exitRecordedBy = securityId
  this.status = OUTPASS_STATUS.OUT
  
  await this.save()
  return this
}

// Instance method to record return
outpassRequestSchema.methods.recordReturn = async function(securityId) {
  this.gateEntry.returnTime = new Date()
  this.gateEntry.returnRecordedBy = securityId
  this.gateEntry.isReturned = true
  this.status = OUTPASS_STATUS.COMPLETED
  
  await this.save()
  return this
}

// Instance method to generate QR code data
outpassRequestSchema.methods.generateQRCode = function() {
  const qrData = {
    requestId: this.requestId,
    studentId: this.studentId,
    rollNumber: this.rollNumber,
    leaveTime: this.leaveTime,
    returnTime: this.expectedReturnTime,
    destination: this.destination.place,
    timestamp: new Date().getTime()
  }
  
  return Buffer.from(JSON.stringify(qrData)).toString('base64')
}

// Instance method to verify QR code
outpassRequestSchema.methods.verifyQRCode = function(qrCode) {
  return this.qrCode === qrCode && this.status === OUTPASS_STATUS.APPROVED
}

// Static method to find pending requests for warden
outpassRequestSchema.statics.findPendingForWarden = function(wardenId) {
  return this.find({
    warden: wardenId,
    status: OUTPASS_STATUS.PENDING
  })
  .populate('student', 'firstName lastName rollNumber phone hostelBlock roomNumber')
  .sort({ createdAt: -1 })
}

// Static method to find approved outpasses for today
outpassRequestSchema.statics.findApprovedForToday = function() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  return this.find({
    status: { $in: [OUTPASS_STATUS.APPROVED, OUTPASS_STATUS.OUT] },
    leaveTime: {
      $gte: today,
      $lt: tomorrow
    }
  })
  .populate('student', 'firstName lastName rollNumber phone hostelBlock roomNumber')
  .sort({ leaveTime: 1 })
}

// Static method to get outpass statistics
outpassRequestSchema.statics.getStats = async function(dateRange = {}) {
  const matchStage = {}
  
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
        _id: '$status',
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' }
      }
    }
  ])
  
  return stats
}

// Static method to find overdue returns
outpassRequestSchema.statics.findOverdueReturns = function() {
  const now = new Date()
  
  return this.find({
    status: OUTPASS_STATUS.OUT,
    expectedReturnTime: { $lt: now },
    'gateEntry.isReturned': false
  })
  .populate('student', 'firstName lastName rollNumber phone parentDetails.guardianPhone')
}

const OutpassRequest = mongoose.model('OutpassRequest', outpassRequestSchema)

export default OutpassRequest