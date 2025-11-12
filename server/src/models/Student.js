import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { config } from '../config/config.js'
import { HOSTEL_TYPES, USER_STATUS } from '../utils/constants.js'

const studentSchema = new mongoose.Schema({
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
  
  // Student Specific Information
  studentId: {
    type: String,
    trim: true,
    uppercase: true
    // unique: true - removed to avoid duplicate index warning (defined in schema.index below)
  },
  rollNumber: {
    type: String,
    required: [true, 'Roll number is required'],
    trim: true,
    uppercase: true
    // unique: true - removed to avoid duplicate index warning (defined in schema.index below)
  },
  
  // Academic Information
  course: {
    type: String,
    required: [true, 'Course is required'],
    trim: true
  },
  // "year" is the Academic Year (e.g., 2025). Use yearOfStudy for 1st/2nd/3rd/4th
  year: {
    type: Number,
    required: [true, 'Academic year is required'],
    min: [2000, 'Academic year seems invalid'],
    max: [2100, 'Academic year seems invalid']
  },
  // yearOfStudy represents which year of the program the student is in (1..6)
  yearOfStudy: {
    type: Number,
    required: [true, 'Year of study is required'],
    min: [1, 'Year of study must be at least 1'],
    max: [6, 'Year of study cannot exceed 6']
  },
  semester: {
    type: Number,
    required: [true, 'Semester is required'],
    min: [1, 'Semester must be at least 1'],
    max: [12, 'Semester cannot exceed 12']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  
  // Personal Details (optional for initial creation, can be completed later)
  dateOfBirth: {
    type: Date,
    required: false
  },
  gender: {
    type: String,
    required: false,
    enum: ['male', 'female', 'other']
  },
  bloodGroup: {
    type: String,
    trim: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  
  // Address Information (optional for initial creation)
  permanentAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  
  // User Role & Status
  role: {
    type: String,
    enum: ['student'],
    default: 'student'
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
  
  // Hostel Information
  hostelType: {
    type: String,
    enum: Object.values(HOSTEL_TYPES),
    required: [true, 'Hostel type is required']
  },
  hostelBlock: {
    type: String,
    required: [true, 'Hostel block is required'],
    trim: true
  },
  roomNumber: {
    type: String,
    required: [true, 'Room number is required'],
    trim: true
  },
  
  // Parent/Guardian Information (optional for initial creation)
  parentDetails: {
    fatherName: {
      type: String,
      trim: true
    },
    motherName: {
      type: String,
      trim: true
    },
    guardianPhone: {
      type: String,
      match: [/^[0-9]{10,15}$/, 'Please provide a valid guardian phone number']
    },
    guardianEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid guardian email'
      ]
    }
  },
  

  // Reference to Parent model
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parent'
  },

  // Reference to HOD (assigned by department)
  hodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hod'
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
  },
  
  // Outpass related
  activeOutpasses: {
    type: Number,
    default: 0,
    max: [3, 'Cannot have more than 3 active outpasses']
  },
  
  // Emergency contact
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for better performance (unique indexes defined here)
studentSchema.index({ email: 1 }, { unique: true })
studentSchema.index({ studentId: 1 }, { unique: true })
studentSchema.index({ rollNumber: 1 }, { unique: true })
studentSchema.index({ hostelBlock: 1, roomNumber: 1 })
studentSchema.index({ course: 1, year: 1 })
studentSchema.index({ course: 1, yearOfStudy: 1 })
studentSchema.index({ status: 1 })

// Virtual for full name
studentSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
})

// Pre-save middleware to auto-generate studentId yearly-wise
studentSchema.pre('save', async function(next) {
  if (!this.studentId) {
    const year = new Date().getFullYear();
    // Find last student for this year
    const lastStudent = await this.constructor.findOne({ studentId: new RegExp(`^${year}-`) })
      .sort({ studentId: -1 });
    let sequence = 1;
    if (lastStudent && lastStudent.studentId) {
      const lastSeq = parseInt(lastStudent.studentId.split('-')[1]);
      if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }
    this.studentId = `${year}-${sequence.toString().padStart(4, '0')}`;
  }
  next();
})

// Virtual for age
studentSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null
  const today = new Date()
  const birthDate = new Date(this.dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
})

// Virtual for room identifier
studentSchema.virtual('roomIdentifier').get(function() {
  return `${this.hostelBlock}-${this.roomNumber}`
})

// Pre-save middleware to hash password
studentSchema.pre('save', async function(next) {
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
studentSchema.pre('save', function(next) {
  // Check if required fields for profile completion are filled
  const requiredFields = [
    'firstName', 'lastName', 'email', 'phone', 'studentId', 'rollNumber',
    'course', 'year', 'yearOfStudy', 'semester', 'department', 'dateOfBirth', 'gender',
    'hostelType', 'hostelBlock', 'roomNumber'
  ]
  
  const parentFields = [
    'parentDetails.fatherName', 'parentDetails.motherName', 'parentDetails.guardianPhone'
  ]
  
  const isRequiredComplete = requiredFields.every(field => this[field])
  const isParentComplete = parentFields.every(field => {
    const keys = field.split('.')
    return keys.reduce((obj, key) => obj && obj[key], this)
  })
  
  this.profileCompleted = isRequiredComplete && isParentComplete
  
  next()
})

// Instance method to check password
studentSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword)
}

// Instance method to generate JWT tokens
studentSchema.methods.generateTokens = function() {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
    studentId: this.studentId,
    hostelBlock: this.hostelBlock
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
studentSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date()
  this.loginCount += 1
  await this.save({ validateBeforeSave: false })
}

// Static method to find user by email
studentSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password')
}

// Static method to find by student ID
studentSchema.statics.findByStudentId = function(studentId) {
  return this.findOne({ studentId: studentId.toUpperCase() })
}

// Static method to find by roll number
studentSchema.statics.findByRollNumber = function(rollNumber) {
  return this.findOne({ rollNumber: rollNumber.toUpperCase() })
}

// Instance method to create password reset token
studentSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex')
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000 // 10 minutes
  
  return resetToken
}

// Static method to get student stats
studentSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: {
          hostelBlock: '$hostelBlock',
          year: '$year',
          status: '$status'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: {
          hostelBlock: '$_id.hostelBlock',
          year: '$_id.year'
        },
        total: { $sum: '$count' },
        active: {
          $sum: {
            $cond: [{ $eq: ['$_id.status', 'active'] }, '$count', 0]
          }
        },
        inactive: {
          $sum: {
            $cond: [{ $eq: ['$_id.status', 'inactive'] }, '$count', 0]
          }
        }
      }
    }
  ])
  
  return stats
}

// Method to check if student can request outpass
studentSchema.methods.canRequestOutpass = function() {
  return this.status === USER_STATUS.ACTIVE && 
         this.profileCompleted && 
         this.activeOutpasses < 3
}

// Remove sensitive fields when converting to JSON
studentSchema.methods.toJSON = function() {
  const student = this.toObject()
  delete student.password
  delete student.passwordResetToken
  delete student.passwordResetExpires
  delete student.emailVerificationToken
  delete student.emailVerificationExpires
  delete student.__v
  return student
}

const Student = mongoose.model('Student', studentSchema)

export default Student