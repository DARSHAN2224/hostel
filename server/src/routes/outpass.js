import express from 'express';
import outpassController from '../controllers/outpassController.js';
import authMiddleware from '../middleware/auth.js';
import { parentPublicApproveLimiter, readLimiter } from '../middleware/rateLimiter.js'

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

// Request parent OTP (warden/admin)
router.post('/parent/request-otp/:requestId', authMiddleware, outpassController.requestParentOtp);

// Warden: send to HOD for approval
router.post('/warden/send-to-hod/:requestId', authMiddleware, outpassController.sendToHod);
router.post('/warden/send-to-counsellor/:requestId', authMiddleware, outpassController.sendToCounsellor);
// Parent approves via OTP (parent portal) - authenticated portal (warden/admin or parent with account)
router.post('/parent/approve/:requestId', authMiddleware, outpassController.parentApproveOutpass);

// Parent approves via OTP (public/OTP-only) - rate-limited to prevent abuse (stricter)
router.post('/parent/approve-public/:requestId', parentPublicApproveLimiter, outpassController.parentApproveOutpass);

// Parent portal: after OTP approval, parent (or app) can fetch full outpass details using the short-lived token
router.get('/parent/portal/:requestId', readLimiter, outpassController.getOutpassForParentPortal);

// Get outpass history with filters (admin/warden)
router.get('/history', authMiddleware, outpassController.getOutpassHistory);

// Get outpass statistics for reports
router.get('/statistics', authMiddleware, outpassController.getOutpassStatistics);

// Record exit (security)
router.post('/:requestId/exit', authMiddleware, outpassController.recordOutpassExit);

// Record return (security)
router.post('/:requestId/return', authMiddleware, outpassController.recordOutpassReturn);

// Get outpass by ID
router.get('/:requestId', authMiddleware, outpassController.getOutpassById);

// Update outpass (student can update pending outpass)
router.patch('/:requestId', authMiddleware, outpassController.updateOutpass);

// Cancel outpass
router.delete('/:requestId/cancel', authMiddleware, outpassController.cancelOutpass);

// Bulk approve outpasses (warden/admin)
router.post('/bulk/approve', authMiddleware, outpassController.bulkApproveOutpasses);

// Bulk reject outpasses (warden/admin)
router.post('/bulk/reject', authMiddleware, outpassController.bulkRejectOutpasses);

export default router;
