import mongoose from 'mongoose'

const parentSchema = new mongoose.Schema({
  // Personal Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters']
  },
  
  // Contact Information
  primaryPhone: {
    type: String,
    required: [true, 'Primary phone number is required'],
    trim: true,
    match: [/^[0-9]{10,15}$/, 'Please provide a valid phone number']
  },
  secondaryPhone: {
    type: String,
    trim: true,
    match: [/^[0-9]{10,15}$/, 'Please provide a valid secondary phone number']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  
  // Relationship with Student
  relationshipToStudent: {
    type: String,
    required: [true, 'Relationship to student is required'],
    enum: ['father', 'mother', 'guardian', 'uncle', 'aunt', 'grandfather', 'grandmother', 'brother', 'sister', 'other']
  },
  
  // Student References
  students: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    studentId: {
      type: String,
      required: true
    },
    rollNumber: {
      type: String,
      required: true
    },
    relationship: {
      type: String,
      required: true,
      enum: ['father', 'mother', 'guardian', 'uncle', 'aunt', 'grandfather', 'grandmother', 'brother', 'sister', 'other']
    },
    isPrimaryContact: {
      type: Boolean,
      default: false
    },
    canApproveOutpass: {
      type: Boolean,
      default: true
    }
  }],
  
  // Address Information
  address: {
    street: String,
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    zipCode: {
      type: String,
      required: [true, 'ZIP code is required']
    },
    country: {
      type: String,
      default: 'India'
    }
  },
  
  // Professional Information
  occupation: {
    type: String,
    trim: true
  },
  workPlace: {
    type: String,
    trim: true
  },
  
  // Outpass Approval Preferences
  approvalPreferences: {
    preferredContactMethod: {
      type: String,
      enum: ['phone_call', 'sms', 'email', 'whatsapp'],
      default: 'phone_call'
    },
    autoApproveLocalOutpass: {
      type: Boolean,
      default: false
    },
    maxOutpassDuration: {
      type: Number, // in hours
      default: 24,
      min: 1,
      max: 168 // 7 days
    },
    requireApprovalFor: {
      overnight: {
        type: Boolean,
        default: true
      },
      longDuration: {
        type: Boolean,
        default: true
      },
      emergencyLeave: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // Communication Preferences
  communicationPreferences: {
    language: {
      type: String,
      enum: ['english', 'hindi', 'gujarati', 'marathi', 'tamil', 'telugu', 'kannada', 'malayalam', 'bengali', 'punjabi'],
      default: 'english'
    },
    bestTimeToCall: {
      start: {
        type: String, // Format: "HH:MM"
        default: "09:00"
      },
      end: {
        type: String, // Format: "HH:MM"
        default: "21:00"
      }
    },
    timeZone: {
      type: String,
      default: 'Asia/Kolkata'
    }
  },
  
  // Verification Status
  verification: {
    phoneVerified: {
      type: Boolean,
      default: false
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    documentsVerified: {
      type: Boolean,
      default: false
    },
    verificationDate: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'verificationModel'
    },
    verificationModel: {
      type: String,
      enum: ['Admin', 'Warden']
    }
  },
  
  // Outpass History & Statistics
  outpassStats: {
    totalRequestsReceived: {
      type: Number,
      default: 0
    },
    totalApproved: {
      type: Number,
      default: 0
    },
    totalRejected: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number, // in minutes
      default: 0
    },
    lastApprovalDate: Date
  },
  
  // Emergency Contact (alternate contact)
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String,
    email: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked'],
    default: 'active'
  },
  // Force user to change password on first login (if applicable)
  mustChangePassword: {
    type: Boolean,
    default: false
  },
  
  // Blocking/Restriction Information
  restrictions: {
    isBlocked: {
      type: Boolean,
      default: false
    },
    blockReason: String,
    blockedAt: Date,
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'blockedByModel'
    },
    blockedByModel: {
      type: String,
      enum: ['Admin', 'Warden']
    },
    blockExpiresAt: Date
  },
  
  // Last Activity
  lastContactDate: Date,
  lastOutpassApproval: Date,
  
  // Notes from staff
  staffNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'noteAddedByModel'
    },
    noteAddedByModel: {
      type: String,
      enum: ['Admin', 'Warden']
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    isImportant: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for better performance
parentSchema.index({ primaryPhone: 1 })
parentSchema.index({ email: 1 })
parentSchema.index({ 'students.studentId': 1 })
parentSchema.index({ 'students.rollNumber': 1 })
parentSchema.index({ status: 1 })
parentSchema.index({ 'verification.phoneVerified': 1 })

// Virtual for full name
parentSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`
})

// Virtual for primary student
parentSchema.virtual('primaryStudent').get(function() {
  return this.students.find(student => student.isPrimaryContact)
})

// Virtual for approval rate
parentSchema.virtual('approvalRate').get(function() {
  const total = this.outpassStats.totalRequestsReceived
  if (total === 0) return 0
  return Math.round((this.outpassStats.totalApproved / total) * 100)
})

// Virtual for response time in readable format
parentSchema.virtual('avgResponseTimeFormatted').get(function() {
  const minutes = this.outpassStats.averageResponseTime
  if (minutes < 60) return `${minutes} minutes`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
})

// Pre-save middleware to update verification status
parentSchema.pre('save', function(next) {
  // Auto-verify if phone and email are provided (basic verification)
  if (this.primaryPhone && !this.verification.phoneVerified) {
    // In production, this would trigger OTP verification
    this.verification.phoneVerified = true
  }
  
  if (this.email && !this.verification.emailVerified) {
    // In production, this would trigger email verification
    this.verification.emailVerified = true
  }
  
  next()
})

// Static method to find by phone number
parentSchema.statics.findByPhone = function(phone) {
  return this.findOne({
    $or: [
      { primaryPhone: phone },
      { secondaryPhone: phone }
    ]
  })
}

// Static method to find by student ID
parentSchema.statics.findByStudentId = function(studentId) {
  return this.find({ 'students.studentId': studentId })
}

// Static method to find by student roll number
parentSchema.statics.findByRollNumber = function(rollNumber) {
  return this.find({ 'students.rollNumber': rollNumber })
}

// Instance method to add student relationship
parentSchema.methods.addStudent = async function(studentData) {
  // Check if student already exists
  const existingStudent = this.students.find(s => s.studentId === studentData.studentId)
  if (existingStudent) {
    throw new Error('Student relationship already exists')
  }
  
  this.students.push(studentData)
  await this.save()
  return this
}

// Instance method to remove student relationship
parentSchema.methods.removeStudent = async function(studentId) {
  this.students = this.students.filter(s => s.studentId !== studentId)
  await this.save()
  return this
}

// Instance method to approve outpass
parentSchema.methods.approveOutpass = async function(outpassRequestId, comments = '') {
  this.outpassStats.totalApproved += 1
  this.lastOutpassApproval = new Date()
  this.lastContactDate = new Date()

  // If approver supplied comments, record them as a staff note for audit
  if (comments) {
    this.staffNotes.push({ note: `Approved: ${comments}`, addedAt: new Date(), isImportant: false })
    // keep only last 50 notes
    if (this.staffNotes.length > 50) this.staffNotes = this.staffNotes.slice(-50)
  }

  // Update average response time (simplified calculation)
  // In real implementation, this would calculate based on actual request time

  await this.save({ validateBeforeSave: false })
  return this
}

// Instance method to reject outpass
parentSchema.methods.rejectOutpass = async function(outpassRequestId, reason = '') {
  this.outpassStats.totalRejected += 1
  this.lastContactDate = new Date()

  // Record rejection reason as a staff note for traceability
  if (reason) {
    this.staffNotes.push({ note: `Rejected: ${reason}`, addedAt: new Date(), isImportant: false })
    if (this.staffNotes.length > 50) this.staffNotes = this.staffNotes.slice(-50)
  }

  await this.save({ validateBeforeSave: false })
  return this
}

// Instance method to update contact preferences
parentSchema.methods.updateContactPreferences = async function(preferences) {
  Object.assign(this.communicationPreferences, preferences)
  await this.save()
  return this
}

// Instance method to add staff note
parentSchema.methods.addStaffNote = async function(note, addedBy, addedByModel, isImportant = false) {
  this.staffNotes.push({
    note,
    addedBy,
    noteAddedByModel: addedByModel,
    isImportant,
    addedAt: new Date()
  })
  
  // Keep only last 50 notes
  if (this.staffNotes.length > 50) {
    this.staffNotes = this.staffNotes.slice(-50)
  }
  
  await this.save()
  return this
}

// Instance method to block parent
parentSchema.methods.blockParent = async function(reason, blockedBy, blockedByModel, duration = null) {
  this.restrictions.isBlocked = true
  this.restrictions.blockReason = reason
  this.restrictions.blockedAt = new Date()
  this.restrictions.blockedBy = blockedBy
  this.restrictions.blockedByModel = blockedByModel
  this.status = 'blocked'
  
  if (duration) {
    this.restrictions.blockExpiresAt = new Date(Date.now() + duration)
  }
  
  await this.save()
  return this
}

// Instance method to unblock parent
parentSchema.methods.unblockParent = async function() {
  this.restrictions.isBlocked = false
  this.restrictions.blockReason = undefined
  this.restrictions.blockedAt = undefined
  this.restrictions.blockedBy = undefined
  this.restrictions.blockedByModel = undefined
  this.restrictions.blockExpiresAt = undefined
  this.status = 'active'
  
  await this.save()
  return this
}

// Static method to get parent statistics
parentSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgApprovalRate: {
          $avg: {
            $cond: [
              { $gt: ['$outpassStats.totalRequestsReceived', 0] },
              {
                $multiply: [
                  { $divide: ['$outpassStats.totalApproved', '$outpassStats.totalRequestsReceived'] },
                  100
                ]
              },
              0
            ]
          }
        },
        avgResponseTime: { $avg: '$outpassStats.averageResponseTime' }
      }
    }
  ])
  
  return stats
}

// Method to check if parent can approve outpass
parentSchema.methods.canApproveOutpass = function(studentId, outpassType = 'general') {
  if (this.status !== 'active' || this.restrictions.isBlocked) {
    return false
  }
  
  const studentRelation = this.students.find(s => s.studentId === studentId)
  if (!studentRelation || !studentRelation.canApproveOutpass) {
    return false
  }
  
  // Check specific approval requirements
  const prefs = this.approvalPreferences.requireApprovalFor
  if (outpassType === 'overnight' && !prefs.overnight) {
    return false
  }
  
  return true
}

// Method to get preferred contact info
parentSchema.methods.getPreferredContact = function() {
  const method = this.approvalPreferences.preferredContactMethod
  
  switch (method) {
    case 'phone_call':
    case 'sms':
    case 'whatsapp':
      return this.primaryPhone
    case 'email':
      return this.email
    default:
      return this.primaryPhone
  }
}

const Parent = mongoose.model('Parent', parentSchema)

export default Parent