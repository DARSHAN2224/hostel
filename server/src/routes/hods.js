import express from 'express';
import hodController from '../controllers/hodController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Super admin creates HOD
router.post('/create', authMiddleware, hodController.createHod);

// Super admin edits HOD
router.put('/edit/:hodId', authMiddleware, hodController.editHod);

// HOD login
router.post('/login', hodController.loginHod);

export default router;
