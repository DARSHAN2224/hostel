import express from 'express'
import { authenticateToken, authorize } from '../middleware/auth.js'
import { validate, managedCreateSchema } from '../middleware/validation.js'
import userManagementController, { listUsers, getUserStats, updateUser, deleteUser, uploadProfilePicture } from '../controllers/userManagementController.js'
import { upload, handleUploadErrors } from '../middleware/upload.js'

const router = express.Router()

// Managed user creation by Admin/Warden
router.post(
  '/',
  authenticateToken,
  authorize('admin', 'warden'),
  validate(managedCreateSchema),
  userManagementController.createUserManaged
)

// List users (admin/warden) with optional role, search, pagination
router.get(
  '/',
  authenticateToken,
  authorize('admin', 'warden'),
  listUsers
)

// User stats (admin)
router.get(
  '/stats',
  authenticateToken,
  authorize('admin'),
  getUserStats
)

// Update user (admin) - minimal common fields
router.patch(
  '/:role/:id',
  authenticateToken,
  authorize('admin'),
  updateUser
)

// Delete user (admin)
router.delete(
  '/:role/:id',
  authenticateToken,
  authorize('admin'),
  deleteUser
)

// Upload profile picture (any authenticated user)
router.post(
  '/profile-picture',
  authenticateToken,
  upload.single('profilePicture'),
  handleUploadErrors,
  uploadProfilePicture
)

export default router
