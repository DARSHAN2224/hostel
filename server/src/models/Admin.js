import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { config } from '../config/config.js'
import { USER_STATUS, ADMIN_ROLES } from '../utils/constants.js'

const adminSchema = new mongoose.Schema({
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
    minlength: [8, 'Password must be at least 8 characters'],
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
    enum: ['admin'],
    default: 'admin'
  },
  adminRole: {
    type: String,
    enum: Object.values(ADMIN_ROLES),
    required: [true, 'Admin role is required']
  },
  status: {
    type: String,
    enum: Object.values(USER_STATUS),
    default: USER_STATUS.ACTIVE
  },
  // Force user to change password on first login (set by admin when created)
  mustChangePassword: {
    type: Boolean,
    default: false
  },
  
  // Permissions and Access Control
  permissions: {
    // User Management
    canManageStudents: {
      type: Boolean,
      default: false
    },
    canManageWardens: {
      type: Boolean,
      default: false
    },
    canManageSecurity: {
      type: Boolean,
      default: false
    },
    canManageAdmins: {
      type: Boolean,
      default: false
    },
    
    // Outpass Management
    canViewAllOutpasses: {
      type: Boolean,
      default: true
    },
    canApproveOutpasses: {
      type: Boolean,
      default: false
    },
    canRejectOutpasses: {
      type: Boolean,
      default: false
    },
    canCancelOutpasses: {
      type: Boolean,
      default: false
    },
    
    // System Management
    canViewReports: {
      type: Boolean,
      default: true
    },
    canExportData: {
      type: Boolean,
      default: true
    },
    canManageSystem: {
      type: Boolean,
      default: false
    },
    canViewLogs: {
      type: Boolean,
      default: false
    },
    canModifySettings: {
      type: Boolean,
      default: false
    }
  },
  
  // Reporting Access
  reportAccess: {
    canViewStudentReports: {
      type: Boolean,
      default: true
    },
    canViewWardenReports: {
      type: Boolean,
      default: true
    },
    canViewSecurityReports: {
      type: Boolean,
      default: true
    },
    canViewOutpassReports: {
      type: Boolean,
      default: true
    },
    canViewSystemReports: {
      type: Boolean,
      default: false
    }
  },
  
  // Admin specific settings
  dashboardPreferences: {
    defaultView: {
      type: String,
      enum: ['overview', 'outpasses', 'users', 'reports'],
      default: 'overview'
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    }
  },
  
  // Two-Factor Authentication
  twoFactorAuth: {
    enabled: {
      type: Boolean,
      default: false
    },
    secret: String,
    backupCodes: [String]
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
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  
  // Session Management
  currentSessions: [{
    sessionId: String,
    ipAddress: String,
    userAgent: String,
    loginTime: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Activity Log
  lastActivity: Date,
  activityLog: [{
    action: String,
    target: String,
    targetId: mongoose.Schema.Types.ObjectId,
    details: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String
  }],
  
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
adminSchema.index({ email: 1 }, { unique: true })
adminSchema.index({ role: 1, status: 1 })
adminSchema.index({ adminRole: 1 })
adminSchema.index({ lockUntil: 1 })

// Virtual for full name
adminSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`
})

// Virtual for years of service
adminSchema.virtual('yearsOfService').get(function() {
  if (!this.joiningDate) return 0
  const today = new Date()
  const joining = new Date(this.joiningDate)
  return Math.floor((today - joining) / (365.25 * 24 * 60 * 60 * 1000))
})

// Virtual for account locked status
adminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now())
})

// Pre-save middleware to hash password
adminSchema.pre('save', async function(next) {
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
adminSchema.pre('save', function(next) {
  // Check if required fields for profile completion are filled
  const requiredFields = [
    'firstName', 'lastName', 'email', 'phone',
    'joiningDate', 'designation', 'adminRole'
  ]
  
  const isCompleted = requiredFields.every(field => this[field])
  this.profileCompleted = isCompleted
  
  next()
})

// Pre-save middleware to set default permissions based on admin role
adminSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('adminRole')) {
    switch (this.adminRole) {
      case ADMIN_ROLES.SUPER_ADMIN:
      case ADMIN_ROLES.SYSTEM_ADMIN:
        // Super/system admin gets all permissions
        Object.keys(this.permissions.toObject()).forEach(key => {
          this.permissions[key] = true
        })
        Object.keys(this.reportAccess.toObject()).forEach(key => {
          this.reportAccess[key] = true
        })
        break
        
      case ADMIN_ROLES.HOSTEL_ADMIN:
        this.permissions.canManageStudents = true
        this.permissions.canManageWardens = true
        this.permissions.canApproveOutpasses = true
        this.permissions.canRejectOutpasses = true
        this.permissions.canCancelOutpasses = true
        break
        
      case ADMIN_ROLES.ACADEMIC_ADMIN:
        this.permissions.canManageStudents = true
        this.reportAccess.canViewStudentReports = true
        this.reportAccess.canViewOutpassReports = true
        break
        
      case ADMIN_ROLES.SECURITY_ADMIN:
        this.permissions.canManageSecurity = true
        this.permissions.canViewLogs = true
        this.reportAccess.canViewSecurityReports = true
        break
    }
  }
  next()
})

// Instance method to check password
adminSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword)
}

// Instance method to generate JWT tokens
adminSchema.methods.generateTokens = function() {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
    adminRole: this.adminRole,
    employeeId: this.employeeId,
    permissions: this.permissions,
    reportAccess: this.reportAccess
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
adminSchema.methods.updateLastLogin = async function(ipAddress = '', userAgent = '') {
  this.lastLogin = new Date()
  this.loginCount += 1
  this.lastActivity = new Date()
  this.failedLoginAttempts = 0 // Reset failed attempts on successful login
  
  // Add new session
  const sessionId = crypto.randomBytes(16).toString('hex')
  this.currentSessions.push({
    sessionId,
    ipAddress,
    userAgent,
    loginTime: new Date(),
    isActive: true
  })
  
  // Keep only last 5 sessions
  if (this.currentSessions.length > 5) {
    this.currentSessions = this.currentSessions.slice(-5)
  }
  
  await this.save({ validateBeforeSave: false })
  return sessionId
}

// Instance method to handle failed login
adminSchema.methods.handleFailedLogin = async function() {
  this.failedLoginAttempts += 1
  
  // Lock account after 5 failed attempts for 30 minutes
  if (this.failedLoginAttempts >= 5) {
    this.lockUntil = Date.now() + 30 * 60 * 1000 // 30 minutes
  }
  
  await this.save({ validateBeforeSave: false })
}

// Instance method to log activity
adminSchema.methods.logActivity = async function(action, target, targetId, details, ipAddress) {
  this.activityLog.push({
    action,
    target,
    targetId,
    details,
    ipAddress,
    timestamp: new Date()
  })
  
  this.lastActivity = new Date()
  
  // Keep only last 100 activity logs
  if (this.activityLog.length > 100) {
    this.activityLog = this.activityLog.slice(-100)
  }
  
  await this.save({ validateBeforeSave: false })
}

// Static method to find user by email
adminSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password')
}

// Static method to find by employee ID
adminSchema.statics.findByEmployeeId = function(employeeId) {
  return this.findOne({ employeeId: employeeId.toUpperCase() })
}

// Instance method to create password reset token
adminSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex')
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000 // 10 minutes
  
  return resetToken
}

// Static method to get admin stats
adminSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: {
          adminRole: '$adminRole',
          status: '$status'
        },
        count: { $sum: 1 },
        avgLoginCount: { $avg: '$loginCount' }
      }
    }
  ])
  
  return stats
}

// Method to check specific permission
adminSchema.methods.hasPermission = function(permission) {
  return this.permissions[permission] === true
}

// Method to check report access
adminSchema.methods.hasReportAccess = function(reportType) {
  return this.reportAccess[reportType] === true
}

// Method to logout from specific session
adminSchema.methods.logoutSession = async function(sessionId) {
  const session = this.currentSessions.id(sessionId)
  if (session) {
    session.isActive = false
    await this.save({ validateBeforeSave: false })
  }
}

// Method to logout from all sessions
adminSchema.methods.logoutAllSessions = async function() {
  this.currentSessions.forEach(session => {
    session.isActive = false
  })
  await this.save({ validateBeforeSave: false })
}

// FIX: Guard twoFactorAuth before accessing sub-fields to prevent TypeError
// when the subdoc is missing on older documents
adminSchema.methods.toJSON = function() {
  const admin = this.toObject()
  delete admin.password
  delete admin.passwordResetToken
  delete admin.passwordResetExpires
  delete admin.emailVerificationToken
  delete admin.emailVerificationExpires
  if (admin.twoFactorAuth) {
    delete admin.twoFactorAuth.secret
    delete admin.twoFactorAuth.backupCodes
  }
  delete admin.__v
  return admin
}

const Admin = mongoose.model('Admin', adminSchema)

export default Admin