import express from 'express'
import { authenticateToken, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'
import { managedCreateSchema } from '../middleware/validation.js'
import userManagementController from '../controllers/userManagementController.js'

const router = express.Router()

// Managed user creation by Admin/Warden
router.post(
  '/',
  authenticateToken,
  authorize('admin', 'warden'),
  validate(managedCreateSchema),
  userManagementController.createUserManaged
)

export default router
