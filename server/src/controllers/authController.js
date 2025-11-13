import jwt from 'jsonwebtoken'
import { config } from '../config/config.js'
import { Student, Warden, Admin, Security, Credential, AuditLog } from '../models/index.js'
import { AppError } from '../middleware/errorHandler.js'
import { HOSTEL_BLOCKS, HOSTEL_TYPES } from '../utils/constants.js'
import generateVerificationCode from '../utils/generateVerificationCode.js'
import { 
  sendVerificationEmail, 
  sendPasswordChangedEmail, 
  sendPasswordResetEmail 
} from '../services/emailService.js'
import crypto from 'crypto'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
// Helper: Set cookie


const setTokenCookie = (res, name, token, maxAge, secure = false) => {
  res.cookie(name, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure, // set true in production (HTTPS)
    maxAge
  })
}

// Internal helpers
const AUTH_MODELS = [Student, Warden, Admin, Security] // Parent excluded from auth flows

const findUserByEmailAcrossAuthModels = async (email, includePassword = false) => {
  for (const Model of AUTH_MODELS) {
    const query = Model.findOne({ email: email.toLowerCase() })
    const user = includePassword ? await query.select('+password') : await query
    if (user) return { user, Model }
  }
  return { user: null, Model: null }
}

const findUserByIdAcrossAuthModels = async (id, includePassword = false) => {
  for (const Model of AUTH_MODELS) {
    const query = Model.findById(id)
    const user = includePassword ? await query.select('+password') : await query
    if (user) return { user, Model }
  }
  return { user: null, Model: null }
}

// Register Initial Admin (with secret key)
export const registerInitialAdmin = asyncHandler(async (req, res, next) => {
  const { email, password, firstName, lastName, phone, secretKey } = req.body

  // Validate secret key
  if (!config.adminRegistrationSecret) {
    return next(new AppError('Admin registration is not configured', 500))
  }

  if (secretKey !== config.adminRegistrationSecret) {
    return next(new AppError('Invalid secret key', 403))
  }

  // Check if any admin already exists
  const existingAdmin = await Admin.findOne({})
  if (existingAdmin) {
    return next(new AppError('Admin already exists. Use POST /api/v1/users to create additional admins.', 403))
  }

  // Create the first admin
  const admin = await Admin.create({
    email: email.toLowerCase(),
    password,
    firstName,
    lastName,
    phone,
    role: 'admin',
    adminRole: 'super_admin',
    isEmailVerified: true, // Skip email verification for initial admin
  })

  // Generate tokens
  const { accessToken, refreshToken } = admin.generateTokens()

  // Set cookies
  setTokenCookie(res, 'accessToken', accessToken, 15 * 60 * 1000, config.nodeEnv === 'production')
  setTokenCookie(res, 'refreshToken', refreshToken, 30 * 24 * 60 * 60 * 1000, config.nodeEnv === 'production')

  res.status(201).json(
    new ApiResponse(201, {
      user: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        firstName: admin.firstName,
        lastName: admin.lastName,
        adminRole: admin.adminRole
      },
      accessToken,
      refreshToken
    }, 'Initial admin created successfully. Please change your password.')
  )
})

// Register
export const register = asyncHandler(async (req, res, next) => {
  // Self-registration is disabled. Accounts must be created by an Admin or Warden.
  return next(new AppError('Self-registration is disabled. Ask an admin or warden to create your account.', 403))
});

// Login
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body

  // Validate input
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400))
  }

  // Try to find user across auth-enabled models
  const { user } = await findUserByEmailAcrossAuthModels(email, true)

  if (!user) {
    return next(new AppError('Invalid email or password', 401))
  }

  // Check password first (we only send verification email after confirming identity)
  const isPasswordCorrect = await user.correctPassword(password, user.password)
  if (!isPasswordCorrect) {
    return next(new AppError('Invalid email or password', 401))
  }

  // If user is not admin and email not verified, generate & send verification email on first login attempt
  if (user.role !== 'admin' && !user.isEmailVerified) {
    const verificationCode = generateVerificationCode()
    user.emailVerificationToken = verificationCode
    user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    await user.save({ validateBeforeSave: false })

    const displayName = user.name || user.firstName || 'User'
    try {
      await sendVerificationEmail(user.email, displayName, verificationCode)
    } catch (emailErr) {
      console.warn('Failed to send verification email on login attempt:', emailErr)
      // Do not leak internal error; fall through to the generic message below
    }

    return next(new AppError('Please verify your email to continue. A verification email has been sent.', 403))
  }

  // Generate tokens
  const { accessToken, refreshToken } = user.generateTokens()

  // Set cookies
  setTokenCookie(res, 'access_token', accessToken, 15 * 60 * 1000, false) // 15 minutes
  setTokenCookie(res, 'refresh_token', refreshToken, 30 * 24 * 60 * 60 * 1000, false) // 30 days

  // Update last login
  await user.updateLastLogin()

  res.json(
    new ApiResponse(200, { 
      user: user.toJSON(),
      mustChangePassword: user.mustChangePassword || false,
      accessToken,
      refreshToken
    }, 'Login successful')
  )
})

// Refresh token
export const refreshToken = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.refresh_token
  
  if (!token) {
    return next(new AppError('No refresh token provided', 401))
  }

  // Verify refresh token and get user id
  const decoded = jwt.verify(token, config.jwt.refreshSecret)
  const { user } = await findUserByIdAcrossAuthModels(decoded.id)
  if (!user) {
    return next(new AppError('User not found', 401))
  }

  // If a status field exists, enforce active status; otherwise skip
  if (typeof user.status !== 'undefined' && user.status !== 'active') {
    return next(new AppError('Account is not active', 403))
  }

  // Generate new access token
  const { accessToken } = user.generateTokens()
  
  // Set new access token cookie
  setTokenCookie(res, 'access_token', accessToken, 15 * 60 * 1000, false)

  res.json(
    new ApiResponse(200, null, 'Token refreshed successfully')
  )
})

// Logout
export const logout = (req, res) => {
  res.clearCookie('access_token')
  res.clearCookie('refresh_token')
  res.json(
    new ApiResponse(200, null, 'Logged out successfully')
  )
}

// Get current user profile
export const getProfile = asyncHandler(async (req, res, next) => {
  // User info is already available from auth middleware
  const { user } = await findUserByIdAcrossAuthModels(req.user.id)
  
  if (!user) {
    return next(new AppError('User not found', 404))
  }

  res.json(
    new ApiResponse(200, { user: user.toJSON() }, 'Profile retrieved successfully')
  )
})

// Update profile
export const updateProfile = asyncHandler(async (req, res, next) => {
  // Minimal common fields allowed across roles to avoid schema conflicts
  const allowedFields = [
    'firstName', 'lastName', 'phone', 'dateOfBirth', 'gender'
  ]

  // Filter allowed fields
  const updates = {}
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field]
    }
  })

  const { user: foundUser, Model } = await findUserByIdAcrossAuthModels(req.user.id)
  if (!foundUser) {
    return next(new AppError('User not found', 404))
  }

  const user = await Model.findByIdAndUpdate(foundUser._id, updates, { new: true, runValidators: true })

  if (!user) {
    return next(new AppError('User not found', 404))
  }

  res.json(
    new ApiResponse(200, { user: user.toJSON() }, 'Profile updated successfully')
  )
})

// Change password
export const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    return next(new AppError('Please provide current and new password', 400))
  }

  // Find user with password across models
  const { user } = await findUserByIdAcrossAuthModels(req.user.id, true)
  
  if (!user) {
    return next(new AppError('User not found', 404))
  }

  // Check current password
  const isCurrentPasswordCorrect = await user.correctPassword(currentPassword, user.password)
  if (!isCurrentPasswordCorrect) {
    return next(new AppError('Current password is incorrect', 400))
  }

  // Update password
  user.password = newPassword
  // Clear any forced-change flag when user updates their password
  if (user.mustChangePassword) user.mustChangePassword = false
  await user.save()
  
  // Remove any stored generated credentials for this user (security: stale plaintext)
  try {
    await Credential.deleteMany({ userId: user._id })
    try {
      await AuditLog.logAction({
        user: user._id, // user performed own password change
        userModel: user.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : undefined,
        action: 'update',
        resource: 'password',
        resourceId: user._id,
        details: { reason: 'user_changed_password' },
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'] || undefined,
        status: 'success'
      })
    } catch (auditErr) {
      console.warn('Failed to write audit log for user password change:', auditErr)
    }
  } catch (delErr) {
    console.warn('Failed to delete stored credentials after password change:', delErr)
  }
  // Send password changed confirmation email (non-critical, won't throw)
  const displayName = user.name || user.firstName || 'User'
  await sendPasswordChangedEmail(user.email, displayName)

  // Return the updated user so clients can refresh state immediately
  res.json(
    new ApiResponse(200, { user: user.toJSON(), mustChangePassword: user.mustChangePassword || false }, 'Password changed successfully')
  )
})

// Verify Email
export const verifyEmail = asyncHandler(async (req, res, next) => {
  const { email, verificationCode } = req.body
  if (!email || !verificationCode) {
    return next(new AppError('Email and verification code are required', 400))
  }

  // Find user across auth-enabled models
  const { user } = await findUserByEmailAcrossAuthModels(email)

  if (!user) return next(new AppError('User not found', 404))

  if (user.isEmailVerified) {
    return next(new AppError('Email already verified', 400))
  }

  if (!user.emailVerificationToken || !user.emailVerificationExpires) {
    return next(new AppError('No verification request found', 400))
  }

  const now = new Date()
  if (user.emailVerificationToken !== verificationCode || user.emailVerificationExpires < now) {
    return next(new AppError('Invalid or expired verification code', 400))
  }

  user.isEmailVerified = true
  user.emailVerificationToken = undefined
  user.emailVerificationExpires = undefined
  await user.save({ validateBeforeSave: false })

  // Generate tokens and set cookies
  const { accessToken, refreshToken } = user.generateTokens()
  setTokenCookie(res, 'access_token', accessToken, 15 * 60 * 1000, false)
  setTokenCookie(res, 'refresh_token', refreshToken, 30 * 24 * 60 * 60 * 1000, false)

  await user.updateLastLogin()
  res.json(
    new ApiResponse(200, {
      user: user.toJSON(),
      mustChangePassword: user.mustChangePassword || false,
      accessToken,
      refreshToken
    }, 'Email verified successfully')
  )
})

// Forgot Password - Request password reset
export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body

  if (!email) {
    return next(new AppError('Please provide email address', 400))
  }

  // Try to find user across auth-enabled models
  const { user } = await findUserByEmailAcrossAuthModels(email)
  
  // Always return success message (security: don't reveal if email exists)
  const successMessage = 'If an account exists with this email, you will receive a password reset link.'
  
  if (!user) {
    return res.json(
      new ApiResponse(200, null, successMessage)
    )
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex')
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
  
  // Save hashed token and expiry
  user.passwordResetToken = resetTokenHash
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  await user.save({ validateBeforeSave: false })

  // Create reset URL
  const resetURL = `${config.app.clientUrl}/reset-password?token=${resetToken}`

  try {
    // Send password reset email
    const displayName = user.name || user.firstName || 'User';
    await sendPasswordResetEmail(user.email, displayName, resetURL)

    res.json(
      new ApiResponse(200, null, successMessage)
    )
  } catch (error) {
    // If email fails, clean up the reset token
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save({ validateBeforeSave: false })
    throw error
  }
})

// Reset Password - Complete password reset with token
export const resetPassword = asyncHandler(async (req, res, next) => {
  const { token, newPassword } = req.body

  if (!token || !newPassword) {
    return next(new AppError('Token and new password are required', 400))
  }

  // Hash the token from URL to compare with stored hash
  const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex')

  // Find user with valid reset token across auth-enabled models
  let user = null
  for (const Model of AUTH_MODELS) {
    const foundUser = await Model.findOne({
      passwordResetToken: resetTokenHash,
      passwordResetExpires: { $gt: new Date() }
    })
    if (foundUser) { user = foundUser; break }
  }

  if (!user) {
    return next(new AppError('Invalid or expired reset token', 400))
  }

  // Update password and clear reset token
  user.password = newPassword
  user.passwordResetToken = undefined
  user.passwordResetExpires = undefined
  // Clear mustChangePassword for password reset flows
  if (user.mustChangePassword) user.mustChangePassword = false
  await user.save()

  // Remove any stored generated credentials for this user (stale plaintext)
  try {
    await Credential.deleteMany({ userId: user._id })
    try {
      await AuditLog.logAction({
        user: user._id,
        userModel: user.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : undefined,
        action: 'update',
        resource: 'password',
        resourceId: user._id,
        details: { reason: 'password_reset_via_token' },
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'] || undefined,
        status: 'success'
      })
    } catch (auditErr) {
      console.warn('Failed to write audit log for password reset:', auditErr)
    }
  } catch (delErr) {
    console.warn('Failed to delete stored credentials after password reset:', delErr)
  }

  // Send confirmation email (non-critical)
  const displayName = user.name || user.firstName || 'User';
  await sendPasswordChangedEmail(user.email, displayName)

  // Generate new tokens
  const { accessToken, refreshToken } = user.generateTokens()
  setTokenCookie(res, 'access_token', accessToken, 15 * 60 * 1000, false)
  setTokenCookie(res, 'refresh_token', refreshToken, 30 * 24 * 60 * 60 * 1000, false)

  res.json(
    new ApiResponse(200, { user: user.toJSON() }, 'Password reset successfully')
  )
})

// Resend verification email
export const resendVerificationEmail = asyncHandler(async (req, res, next) => {
  const { email } = req.body

  if (!email) {
    return next(new AppError('Email is required', 400))
  }

  // Find user across auth-enabled models
  const { user } = await findUserByEmailAcrossAuthModels(email)
  
  if (!user) {
    return next(new AppError('User not found', 404))
  }

  if (user.isEmailVerified) {
    return next(new AppError('Email is already verified', 400))
  }

  // Generate new verification code
  const verificationCode = generateVerificationCode()
  user.emailVerificationToken = verificationCode
  user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  await user.save({ validateBeforeSave: false })

  // Send verification email
  const displayName = user.name || user.firstName || 'User';
  
  try {
    await sendVerificationEmail(user.email, displayName, verificationCode)
    
    res.json(
      new ApiResponse(
        200,
        config.nodeEnv === 'development' ? { verificationCode } : null,
        'Verification email sent successfully'
      )
    );
  } catch (emailError) {
    // In development, still return success with code even if email fails
    if (config.nodeEnv === 'development') {
      console.log('⚠️  Email failed in development. Verification code:', verificationCode);
      
      res.json(
        new ApiResponse(
          200,
          { verificationCode },
          'Email service unavailable - verification code provided in response.'
        )
      );
    } else {
      throw emailError;
    }
  }
})

// Public: Get hostel blocks by type
export const getHostelBlocks = (req, res) => {
  const { type } = req.query
  if (type) {
    const list = HOSTEL_BLOCKS[type]
    return res.json(
      new ApiResponse(200, { type, blocks: list || [] }, 'Hostel blocks retrieved successfully')
    )
  }
  res.json(
    new ApiResponse(200, { types: HOSTEL_TYPES, blocks: HOSTEL_BLOCKS }, 'All hostel data retrieved successfully')
  )
}