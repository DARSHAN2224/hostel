import express from 'express';
import hodController from '../controllers/hodController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Admin: create HOD
router.post('/create', authenticateToken, hodController.createHod);

// Admin: edit HOD by ID
router.put('/edit/:hodId', authenticateToken, hodController.editHod);

// Admin: delete HOD
router.delete('/delete/:hodId', authenticateToken, hodController.deleteHod);

// Admin: get all HODs
router.get('/all', authenticateToken, hodController.getAllHods);

// Public: HOD login
router.post('/login', hodController.loginHod);

// HOD: get own profile
router.get('/profile', authenticateToken, hodController.getHodProfile);

// FIX 5: HOD updates their own profile (was calling PUT /hods/profile but route didn't exist)
router.put('/profile', authenticateToken, hodController.updateHodProfile);

// HOD: get students in their department
router.get('/students', authenticateToken, hodController.getStudentsByDepartment);

// FIX 6: HOD department statistics (was calling GET /hods/statistics but route didn't exist)
router.get('/statistics', authenticateToken, hodController.getDepartmentStatistics);

export default router;