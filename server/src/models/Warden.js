import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { config } from '../config/config.js'
import { HOSTEL_TYPES, USER_STATUS } from '../utils/constants.js'

const wardenSchema = new mongoose.Schema({
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
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
    // unique: true - removed to avoid duplicate index warning (defined in schema.index below)
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  
  // Contact Information
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[0-9]{10,15}$/, 'Please provide a valid phone number']
  },
  
  
  // User Role & Status
  role: {
    type: String,
    enum: ['warden'],
    default: 'warden'
  },
  // Force user to change password on first login (set by admin when created)
  mustChangePassword: {
    type: Boolean,
    default: false
  },

  
  // Hostel Information
  hostelType: {
    type: String,
    enum: Object.values(HOSTEL_TYPES),
    required: [true, 'Hostel type is required']
  },
  assignedHostelBlocks: [{
    blockName: {
      type: String,
      required: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    floors: [String],
    totalRooms: Number,
    currentOccupancy: Number
  }],

  
  // Working Hours and Schedule
  workingHours: {
    startTime: {
      type: String, // Format: "HH:MM"
      default: "08:00"
    },
    endTime: {
      type: String, // Format: "HH:MM"
      default: "18:00"
    },
    workingDays: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }],
    isOnCall: {
      type: Boolean,
      default: false
    }
  },
  
  // Permissions and Responsibilities
  permissions: {
    canApproveOutpasses: {
      type: Boolean,
      default: true
    },
    canRejectOutpasses: {
      type: Boolean,
      default: true
    },
    canViewAllRequests: {
      type: Boolean,
      default: true
    },
    canManageStudents: {
      type: Boolean,
      default: true
    },
    canContactParents: {
      type: Boolean,
      default: true
    },
    maxOutpassDuration: {
      type: Number, // in hours
      default: 72 // 3 days
    }
  },
  
  // Outpass Management Statistics
  outpassStats: {
    totalProcessed: {
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
    averageProcessingTime: {
      type: Number, // in minutes
      default: 0
    },
    lastProcessedDate: Date
  },
  
  // Emergency Contact Information
  emergencyContact: {
    name: {
      type: String,
      required: [true, 'Emergency contact name is required']
    },
    phone: {
      type: String,
      required: [true, 'Emergency contact phone is required'],
      match: [/^[0-9]{10,15}$/, 'Please provide a valid emergency contact phone']
    },
    relationship: {
      type: String,
      required: [true, 'Emergency contact relationship is required']
    }
  },
  
  // Account Security
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Login tracking
  lastLogin: Date,
  loginCount: {
    type: Number,
    default: 0
  },
  
  // Profile completion
  profileCompleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for better performance
wardenSchema.index({ email: 1 }, { unique: true })
wardenSchema.index({ role: 1})
wardenSchema.index({ 'assignedHostelBlocks.blockName': 1 })
wardenSchema.index({ hostelType: 1 })

// Virtual for full name
wardenSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`
})

// Virtual for primary hostel block
wardenSchema.virtual('primaryHostelBlock').get(function() {
  if (!Array.isArray(this.assignedHostelBlocks)) return null
  return this.assignedHostelBlocks.find(block => block && block.isPrimary)
})

// Virtual for total rooms managed
wardenSchema.virtual('totalRoomsManaged').get(function() {
  if (!Array.isArray(this.assignedHostelBlocks)) return 0
  return this.assignedHostelBlocks.reduce((total, block) => total + ((block && block.totalRooms) || 0), 0)
})

// Virtual for assigned students count (populated via virtual populate/count)
wardenSchema.virtual('assignedStudentsCount', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'wardenId',
  count: true
})

// Virtual for years of service
wardenSchema.virtual('yearsOfService').get(function() {
  if (!this.joiningDate) return 0
  const today = new Date()
  const joining = new Date(this.joiningDate)
  return Math.floor((today - joining) / (365.25 * 24 * 60 * 60 * 1000))
})

// Pre-save middleware to hash password
wardenSchema.pre('save', async function(next) {
  // Only hash password if it has been modified (or is new)
  if (!this.isModified('password')) return next()
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Pre-save middleware to update profile completion
wardenSchema.pre('save', function(next) {
  // Check if required fields for profile completion are filled
  const requiredFields = [
    'firstName', 'lastName', 'email', 'phone',
     'joiningDate', 'designation', 'hostelType'
  ]
  
  const emergencyFields = [
    'emergencyContact.name', 'emergencyContact.phone', 'emergencyContact.relationship'
  ]
  
  const isRequiredComplete = requiredFields.every(field => this[field])
  const isEmergencyComplete = emergencyFields.every(field => {
    const keys = field.split('.')
    return keys.reduce((obj, key) => obj && obj[key], this)
  })
  const hasHostelBlock = this.assignedHostelBlocks && this.assignedHostelBlocks.length > 0
  
  this.profileCompleted = isRequiredComplete && isEmergencyComplete && hasHostelBlock
  
  next()
})

// Instance method to check password
wardenSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword)
}

// Instance method to generate JWT tokens
wardenSchema.methods.generateTokens = function() {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
    employeeId: this.employeeId,
    hostelType: this.hostelType,
    assignedBlocks: this.assignedHostelBlocks.map(block => block.blockName),
    permissions: this.permissions
  }
  
  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  })
  
  const refreshToken = jwt.sign({ id: this._id }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn
  })
  
  return { accessToken, refreshToken }
}

// Instance method to update last login
wardenSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date()
  this.loginCount += 1
  this.outpassStats.lastProcessedDate = new Date()
  await this.save({ validateBeforeSave: false })
}

// Static method to find user by email
wardenSchema.methods.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password')
}

// Static method to find by employee ID
wardenSchema.statics.findByEmployeeId = function(employeeId) {
  return this.findOne({ employeeId: employeeId.toUpperCase() })
}

// Instance method to add hostel block assignment
wardenSchema.methods.addHostelBlock = async function(blockData) {
  // Check if block already assigned
  const existingBlock = this.assignedHostelBlocks.find(block => block.blockName === blockData.blockName)
  if (existingBlock) {
    throw new Error('Hostel block already assigned')
  }
  
  this.assignedHostelBlocks.push(blockData)
  await this.save()
  return this
}

// Instance method to remove hostel block assignment
wardenSchema.methods.removeHostelBlock = async function(blockName) {
  this.assignedHostelBlocks = this.assignedHostelBlocks.filter(block => block.blockName !== blockName)
  await this.save()
  return this
}

// Instance method to process outpass (approve/reject)
wardenSchema.methods.processOutpass = async function(action = 'approve') {
  this.outpassStats.totalProcessed += 1
  
  if (action === 'approve') {
    this.outpassStats.totalApproved += 1
  } else if (action === 'reject') {
    this.outpassStats.totalRejected += 1
  }
  
  this.outpassStats.lastProcessedDate = new Date()
  
  // Update average processing time (simplified calculation)
  // In real implementation, this would calculate based on actual processing time
  
  await this.save({ validateBeforeSave: false })
  return this
}

// Static method to create password reset token
wardenSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex')
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000 // 10 minutes
  
  return resetToken
}

// Static method to get warden stats
wardenSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: {
          hostelType: '$hostelType',
          status: '$status'
        },
        count: { $sum: 1 },
        totalOutpassesProcessed: { $sum: '$outpassStats.totalProcessed' },
        totalOutpassesApproved: { $sum: '$outpassStats.totalApproved' },
        totalOutpassesRejected: { $sum: '$outpassStats.totalRejected' },
        avgProcessingTime: { $avg: '$outpassStats.averageProcessingTime' }
      }
    }
  ])
  
  return stats
}

// Static method to find wardens by hostel block
wardenSchema.statics.findByHostelBlock = function(blockName) {
  return this.find({
    'assignedHostelBlocks.blockName': blockName,
    status: USER_STATUS.ACTIVE
  })
}

// Static method to find available wardens for outpass approval
wardenSchema.statics.findAvailableForApproval = function(hostelType, blockName = null) {
  const query = {
    hostelType,
    status: USER_STATUS.ACTIVE,
    'permissions.canApproveOutpasses': true
  }
  
  if (blockName) {
    query['assignedHostelBlocks.blockName'] = blockName
  }
  
  return this.find(query)
}

// Method to check if warden can approve outpass
wardenSchema.methods.canApproveOutpass = function(studentHostelBlock, outpassDuration) {
  // Check if warden is active and has permission
  if (this.status !== USER_STATUS.ACTIVE || !this.permissions.canApproveOutpasses) {
    return false
  }
  
  // Check if warden is assigned to the student's hostel block
  const hasBlockAccess = this.assignedHostelBlocks.some(block => 
    block.blockName === studentHostelBlock
  )
  
  if (!hasBlockAccess) {
    return false
  }
  
  // Check duration limits
  if (outpassDuration > this.permissions.maxOutpassDuration) {
    return false
  }
  
  return true
}

// Method to check if warden is currently on duty
wardenSchema.methods.isOnDuty = function() {
  const now = new Date()
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()]
  
  // Check if current day is in working days
  if (!this.workingHours.workingDays.includes(currentDay)) {
    return this.workingHours.isOnCall
  }
  
  // Check if current time is within working hours
  if (currentTime >= this.workingHours.startTime && currentTime <= this.workingHours.endTime) {
    return true
  }
  
  return this.workingHours.isOnCall
}

// Remove sensitive fields when converting to JSON
wardenSchema.methods.toJSON = function() {
  const warden = this.toObject()
  delete warden.password
  delete warden.passwordResetToken
  delete warden.passwordResetExpires
  delete warden.emailVerificationToken
  delete warden.emailVerificationExpires
  delete warden.__v
  return warden
}

const WARDEN = mongoose.model('Warden', wardenSchema)

export default WARDEN