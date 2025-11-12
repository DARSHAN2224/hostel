import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { config } from '../config/config.js'
import { USER_STATUS, SECURITY_SHIFT_TYPES } from '../utils/constants.js'

const securitySchema = new mongoose.Schema({
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
  
 
  // Employment Details
  joiningDate: {
    type: Date,
    required: [true, 'Joining date is required']
  },
  department: {
    type: String,
    default: 'Security'
  },
  designation: {
    type: String,
    required: [true, 'Designation is required'],
    enum: ['Security Guard', 'Head Security', 'Gate Keeper', 'Security Supervisor']
  },
  
  // User Role & Status
  role: {
    type: String,
    enum: ['security'],
    default: 'security'
  },
  // Force user to change password on first login (set by admin when created)
  mustChangePassword: {
    type: Boolean,
    default: false
  },

  
  // Work Assignment
  assignedGates: [{
    gateName: {
      type: String,
      required: true
    },
    gateLocation: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  // Shift Information
  currentShift: {
    type: String,
    enum: Object.values(SECURITY_SHIFT_TYPES),
    required: [true, 'Current shift is required']
  },
  shiftSchedule: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    shift: {
      type: String,
      enum: Object.values(SECURITY_SHIFT_TYPES)
    },
    startTime: String, // Format: "HH:MM"
    endTime: String    // Format: "HH:MM"
  }],
  
  // Permissions and Access
  permissions: {
    canScanQR: {
      type: Boolean,
      default: true
    },
    canManualEntry: {
      type: Boolean,
      default: true
    },
    canViewReports: {
      type: Boolean,
      default: false
    },
    canOverrideSystem: {
      type: Boolean,
      default: false
    }
  },
  
  // Emergency Contact
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
  currentSession: {
    isActive: {
      type: Boolean,
      default: false
    },
    loginTime: Date,
    ipAddress: String,
    userAgent: String
  },
  
  // Work Statistics
  workStats: {
    totalOutpassesProcessed: {
      type: Number,
      default: 0
    },
    totalExitsRecorded: {
      type: Number,
      default: 0
    },
    totalReturnsRecorded: {
      type: Number,
      default: 0
    },
    lastActiveDate: Date
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
securitySchema.index({ email: 1 }, { unique: true })
securitySchema.index({ employeeId: 1 }, { unique: true })
securitySchema.index({ role: 1, status: 1 })
securitySchema.index({ 'assignedGates.gateName': 1 })
securitySchema.index({ currentShift: 1 })

// Virtual for full name
securitySchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`
})

// Virtual for years of service
securitySchema.virtual('yearsOfService').get(function() {
  if (!this.joiningDate) return 0
  const today = new Date()
  const joining = new Date(this.joiningDate)
  return Math.floor((today - joining) / (365.25 * 24 * 60 * 60 * 1000))
})

// Virtual for primary gate
securitySchema.virtual('primaryGate').get(function() {
  return this.assignedGates.find(gate => gate.isPrimary)
})

// Pre-save middleware to hash password
securitySchema.pre('save', async function(next) {
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
securitySchema.pre('save', function(next) {
  // Check if required fields for profile completion are filled
  const requiredFields = [
    'firstName', 'lastName', 'email', 'phone', 'employeeId',
    'dateOfBirth', 'gender', 'joiningDate', 'designation', 'currentShift'
  ]
  
  const addressFields = [
    'address.city', 'address.state', 'address.zipCode'
  ]
  
  const emergencyFields = [
    'emergencyContact.name', 'emergencyContact.phone', 'emergencyContact.relationship'
  ]
  
  const isRequiredComplete = requiredFields.every(field => this[field])
  const isAddressComplete = addressFields.every(field => {
    const keys = field.split('.')
    return keys.reduce((obj, key) => obj && obj[key], this)
  })
  const isEmergencyComplete = emergencyFields.every(field => {
    const keys = field.split('.')
    return keys.reduce((obj, key) => obj && obj[key], this)
  })
  
  this.profileCompleted = isRequiredComplete && isAddressComplete && isEmergencyComplete
  
  next()
})

// Instance method to check password
securitySchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword)
}

// Instance method to generate JWT tokens
securitySchema.methods.generateTokens = function() {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
    employeeId: this.employeeId,
    assignedGates: this.assignedGates.map(gate => gate.gateName),
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

// Instance method to update last login and session
securitySchema.methods.updateLastLogin = async function(ipAddress = '', userAgent = '') {
  this.lastLogin = new Date()
  this.loginCount += 1
  this.currentSession = {
    isActive: true,
    loginTime: new Date(),
    ipAddress,
    userAgent
  }
  this.workStats.lastActiveDate = new Date()
  
  await this.save({ validateBeforeSave: false })
}

// Instance method to logout
securitySchema.methods.logout = async function() {
  this.currentSession.isActive = false
  await this.save({ validateBeforeSave: false })
}

// Static method to find user by email
securitySchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password')
}

// Static method to find by employee ID
securitySchema.statics.findByEmployeeId = function(employeeId) {
  return this.findOne({ employeeId: employeeId.toUpperCase() })
}

// Instance method to create password reset token
securitySchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex')
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000 // 10 minutes
  
  return resetToken
}

// Instance method to record outpass processing
securitySchema.methods.recordOutpassProcessing = async function(type = 'exit') {
  this.workStats.totalOutpassesProcessed += 1
  
  if (type === 'exit') {
    this.workStats.totalExitsRecorded += 1
  } else if (type === 'return') {
    this.workStats.totalReturnsRecorded += 1
  }
  
  this.workStats.lastActiveDate = new Date()
  await this.save({ validateBeforeSave: false })
}

// Static method to find security on duty for specific shift
securitySchema.statics.findOnDuty = function(shift, gateName = null) {
  const query = {
    status: USER_STATUS.ACTIVE,
    currentShift: shift,
    'currentSession.isActive': true
  }
  
  if (gateName) {
    query['assignedGates.gateName'] = gateName
  }
  
  return this.find(query)
}

// Static method to get security stats
securitySchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: {
          shift: '$currentShift',
          status: '$status'
        },
        count: { $sum: 1 },
        totalOutpassesProcessed: { $sum: '$workStats.totalOutpassesProcessed' },
        totalExitsRecorded: { $sum: '$workStats.totalExitsRecorded' },
        totalReturnsRecorded: { $sum: '$workStats.totalReturnsRecorded' }
      }
    }
  ])
  
  return stats
}

// Method to check if security can process outpass
securitySchema.methods.canProcessOutpass = function(gateName = null) {
  const isActive = this.status === USER_STATUS.ACTIVE
  const hasPermission = this.permissions.canScanQR || this.permissions.canManualEntry
  const isOnDuty = this.currentSession.isActive
  
  let isAssignedToGate = true
  if (gateName) {
    isAssignedToGate = this.assignedGates.some(gate => gate.gateName === gateName)
  }
  
  return isActive && hasPermission && isOnDuty && isAssignedToGate
}

// Remove sensitive fields when converting to JSON
securitySchema.methods.toJSON = function() {
  const security = this.toObject()
  delete security.password
  delete security.passwordResetToken
  delete security.passwordResetExpires
  delete security.emailVerificationToken
  delete security.emailVerificationExpires
  delete security.__v
  return security
}

const Security = mongoose.model('Security', securitySchema)

export default Security