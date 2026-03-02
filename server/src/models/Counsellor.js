import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { config } from '../config/config.js'

const Schema = mongoose.Schema

const counsellorSchema = new Schema({
  // firstName / lastName — consistent with Warden, Student, Security (not Hod's single `name`)
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
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[0-9]{10,15}$/, 'Please provide a valid phone number']
  },

  // Department the counsellor is responsible for
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  hostelType: {
  type: String,
  enum: ['boys', 'girls'],
  trim: true
  // optional — counsellor may cover one or both hostels
  },
  // Role — fixed as 'counsellor' for auth middleware identification
  role: {
    type: String,
    enum: ['counsellor'],
    default: 'counsellor'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },

  // College hours this counsellor covers — used to detect college-hours outpasses
  // Format: "HH:MM" (24-hour)
  collegeHoursStart: {
    type: String,
    default: '09:00',
    trim: true
  },
  collegeHoursEnd: {
    type: String,
    default: '17:00',
    trim: true
  },

  // Auth / security fields — same pattern as Hod, Student, Warden, Security
  mustChangePassword: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,

  // Login tracking
  lastLogin: {
    type: Date
  },
  loginCount: {
    type: Number,
    default: 0
  },

  // Outpass processing stats
  outpassStats: {
    totalProcessed:    { type: Number, default: 0 },
    totalApproved:     { type: Number, default: 0 },
    totalRejected:     { type: Number, default: 0 },
    lastProcessedDate: { type: Date }
  },

  // Audit trail — who created / last updated this record
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin'
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true,          // createdAt / updatedAt
  toJSON:   { virtuals: true },
  toObject: { virtuals: true }
})

// ─── Indexes ──────────────────────────────────────────────────────────────────
counsellorSchema.index({ email: 1 }, { unique: true })
counsellorSchema.index({ department: 1 })
counsellorSchema.index({ status: 1 })
counsellorSchema.index({ hostelType: 1 })
// ─── Virtuals ─────────────────────────────────────────────────────────────────
counsellorSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`
})

// Virtual populate — count of students assigned to this counsellor
counsellorSchema.virtual('assignedStudentsCount', {
  ref:        'Student',
  localField:  '_id',
  foreignField: 'counsellorId',
  count:       true
})

// ─── Pre-save hooks ───────────────────────────────────────────────────────────
// Hash password when modified — same bcrypt cost (12) as all other models
counsellorSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (err) {
    next(err)
  }
})

// ─── Instance methods ─────────────────────────────────────────────────────────

// Verify candidate password against stored hash — same as all other auth models
counsellorSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword)
}

// Generate access + refresh tokens — same payload shape as Hod / Student
counsellorSchema.methods.generateTokens = function () {
  const payload = {
    id:         this._id,
    email:      this.email,
    role:       this.role,
    department: this.department
  }

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  })

  const refreshToken = jwt.sign({ id: this._id }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn
  })

  return { accessToken, refreshToken }
}

// Track login time and count — identical to all other auth models
counsellorSchema.methods.updateLastLogin = async function () {
  this.lastLogin  = new Date()
  this.loginCount = (this.loginCount || 0) + 1
  await this.save({ validateBeforeSave: false })
}

// Create password-reset token — same pattern as Student / Warden
counsellorSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex')
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000 // 10 minutes
  return resetToken
}

// Increment outpass processing stats after approve / reject
counsellorSchema.methods.processOutpass = async function (action) {
  this.outpassStats.totalProcessed = (this.outpassStats.totalProcessed || 0) + 1
  if (action === 'approve') {
    this.outpassStats.totalApproved = (this.outpassStats.totalApproved || 0) + 1
  } else if (action === 'reject') {
    this.outpassStats.totalRejected = (this.outpassStats.totalRejected || 0) + 1
  }
  this.outpassStats.lastProcessedDate = new Date()
  await this.save({ validateBeforeSave: false })
}

// Returns true if the given leaveTime falls inside this counsellor's college hours window
counsellorSchema.methods.isDuringCollegeHours = function (leaveTime) {
  const leave        = new Date(leaveTime)
  const leaveMinutes = leave.getHours() * 60 + leave.getMinutes()

  const [startH, startM] = (this.collegeHoursStart || '09:00').split(':').map(Number)
  const [endH,   endM]   = (this.collegeHoursEnd   || '17:00').split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes   = endH   * 60 + endM

  return leaveMinutes >= startMinutes && leaveMinutes < endMinutes
}

// Strip sensitive fields from JSON responses — same as all other models
counsellorSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.password
  delete obj.passwordResetToken
  delete obj.passwordResetExpires
  delete obj.emailVerificationToken
  delete obj.emailVerificationExpires
  delete obj.__v
  return obj
}

// ─── Static methods ───────────────────────────────────────────────────────────

// Find by email including password — called by authController login flow
counsellorSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password')
}

// Department-level aggregated stats for admin reports
counsellorSchema.statics.getStats = async function () {
  return this.aggregate([
    {
      $group: {
        _id:   { department: '$department', status: '$status' },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id:    '$_id.department',
        total:  { $sum: '$count' },
        active: {
          $sum: { $cond: [{ $eq: ['$_id.status', 'active'] }, '$count', 0] }
        }
      }
    }
  ])
}

const Counsellor = mongoose.model('Counsellor', counsellorSchema)
export default Counsellor