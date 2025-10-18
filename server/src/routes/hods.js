import express from 'express';
import hodController from '../controllers/hodController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Super admin creates HOD
router.post('/create', authMiddleware, hodController.createHod);

// Super admin edits HOD
router.put('/edit/:hodId', authMiddleware, hodController.editHod);

// Super admin deletes HOD
router.delete('/delete/:hodId', authMiddleware, hodController.deleteHod);

// Super admin gets all HODs
router.get('/all', authMiddleware, hodController.getAllHods);

// HOD login
router.post('/login', hodController.loginHod);

// HOD gets own profile
router.get('/profile', authMiddleware, hodController.getHodProfile);

// HOD gets students by department
router.get('/students', authMiddleware, hodController.getStudentsByDepartment);

export default router;
