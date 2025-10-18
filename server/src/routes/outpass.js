import express from 'express';
import outpassController from '../controllers/outpassController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Warden creates outpass request (can flag for HOD approval)
router.post('/create', authMiddleware, outpassController.createOutpassRequest);

// HOD approves/rejects outpass request
router.post('/hod/approve/:requestId', authMiddleware, outpassController.hodApproveOutpass);

// HOD dashboard: get pending outpass requests for department
router.get('/hod/dashboard', authMiddleware, outpassController.getHodDashboard);

export default router;
