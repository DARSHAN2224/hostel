import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../config/config.js'
const Schema = mongoose.Schema;

const HodSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  // Do not select password by default for security
  password: { type: String, required: true, select: false },
  department: { type: String, required: true },
  phone: { type: String },
  status: { type: String, default: 'active' },
  // Role and login tracking so auth flows can treat HOD like other auth models
  role: { type: String, enum: ['hod'], default: 'hod' },
  lastLogin: { type: Date },
  loginCount: { type: Number, default: 0 },
  // Email verification fields (align with other auth-enabled models)
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  // Force change password after admin-created accounts
  mustChangePassword: { type: Boolean, default: false },
  // Password reset fields
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' }, // Super admin who created
  updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Ensure toJSON removes sensitive fields
HodSchema.set('toJSON', { virtuals: true })
HodSchema.set('toObject', { virtuals: true })

HodSchema.methods.toJSON = function() {
  const hod = this.toObject()
  delete hod.password
  delete hod.passwordResetToken
  delete hod.passwordResetExpires
  delete hod.emailVerificationToken
  delete hod.emailVerificationExpires
  delete hod.__v
  return hod
}

// Instance method to check password
HodSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword)
}

// Instance method to generate JWT tokens (compatible with authController expectations)
HodSchema.methods.generateTokens = function() {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role
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
HodSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date()
  this.loginCount = (this.loginCount || 0) + 1
  await this.save({ validateBeforeSave: false })
}

// Pre-save middleware to hash password if modified
HodSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (err) {
    next(err)
  }
})

// Virtual for assigned students count (populate with count)
HodSchema.virtual('assignedStudentsCount', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'hodId',
  count: true
})

const Hod = mongoose.model('Hod', HodSchema);
export default Hod;