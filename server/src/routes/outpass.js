import express from 'express';
import outpassController from '../controllers/outpassController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Warden creates outpass request (can flag for HOD approval)
router.post('/create', authMiddleware, outpassController.createOutpassRequest);

// Student: Get own outpass requests
router.get('/student/my-outpasses', authMiddleware, outpassController.getStudentOutpasses);

// Warden: Get all outpass requests
router.get('/warden/all', authMiddleware, outpassController.getWardenOutpasses);

// Warden: Approve outpass request
router.post('/warden/approve/:requestId', authMiddleware, outpassController.wardenApproveOutpass);

// Warden: Reject outpass request
router.post('/warden/reject/:requestId', authMiddleware, outpassController.wardenRejectOutpass);

// HOD approves/rejects outpass request
router.post('/hod/approve/:requestId', authMiddleware, outpassController.hodApproveOutpass);

// HOD dashboard: get pending outpass requests for department
router.get('/hod/dashboard', authMiddleware, outpassController.getHodDashboard);

export default router;
