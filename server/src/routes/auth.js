import { Router } from 'express'
import { 
  login, 
  register,
  registerInitialAdmin,
  refreshToken, 
  logout, 
  getProfile, 
  updateProfile, 
  changePassword,
  verifyEmail,
  getHostelBlocks,
  forgotPassword,
  resetPassword,
  resendVerificationEmail
} from '../controllers/authController.js'
import { authenticateToken } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'
import {
  registerSchema,
  registerInitialAdminSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationEmailSchema,
  updateProfileSchema,
} from '../middleware/validation.js'
import {
  authLimiter,
  createAccountLimiter,
  passwordResetLimiter,
  emailLimiter,
} from '../middleware/rateLimiter.js'

const router = Router()

// Public routes with validation and rate limiting
router.post('/register-initial-admin', createAccountLimiter, validate(registerInitialAdminSchema), registerInitialAdmin)
router.post('/login', authLimiter, validate(loginSchema), login)
router.post('/register', createAccountLimiter, validate(registerSchema), register)
router.post('/verify-email', emailLimiter, validate(verifyEmailSchema), verifyEmail)
router.post('/resend-verification', emailLimiter, validate(resendVerificationEmailSchema), resendVerificationEmail)
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), forgotPassword)
router.post('/reset-password', passwordResetLimiter, validate(resetPasswordSchema), resetPassword)
router.get('/hostel-blocks', getHostelBlocks)
router.post('/refresh', refreshToken)
router.post('/logout', logout)

// Protected routes with validation
router.get('/me', authenticateToken, getProfile)
router.put('/profile', authenticateToken, validate(updateProfileSchema), updateProfile)
router.put('/change-password', authenticateToken, validate(changePasswordSchema), changePassword)

export default router
