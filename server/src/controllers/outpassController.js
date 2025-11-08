
import OutpassRequest from '../models/OutpassRequest.js';
import Student from '../models/Student.js';
import Hod from '../models/Hod.js';


const outpassController = {
  // Warden creates outpass request, can flag for HOD approval
  async createOutpassRequest(req, res) {
    try {
      const { studentId, outpassType, reason, leaveTime, expectedReturnTime, destination, hodApprovalRequested } = req.body;
      const student = await Student.findById(studentId);
      if (!student) return res.status(404).json({ message: 'Student not found' });

      let hodId = student.hodId;
      let hod = hodId ? await Hod.findById(hodId) : null;

      const outpassRequest = new OutpassRequest({
        student: student._id,
        studentId: student.studentId,
        rollNumber: student.rollNumber,
        outpassType,
        reason,
        leaveTime,
        expectedReturnTime,
        destination,
        warden: req.user._id,
        hodApprovalRequested: !!hodApprovalRequested,
        hod: hod ? hod._id : undefined
      });
      await outpassRequest.save();
      res.status(201).json({ message: 'Outpass request created', outpassRequest });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // HOD approves or rejects outpass request
  async hodApproveOutpass(req, res) {
    try {
      const { requestId } = req.params;
      const { approved, comments } = req.body;
      const outpass = await OutpassRequest.findById(requestId);
      if (!outpass) return res.status(404).json({ message: 'Outpass request not found' });
      if (!outpass.hodApprovalRequested || !outpass.hod.equals(req.user._id)) {
        return res.status(403).json({ message: 'Not authorized for this outpass request' });
      }
      outpass.hodApproval = {
        approved,
        approvedAt: new Date(),
        approvedBy: req.user._id,
        comments
      };
      outpass.status = approved ? 'approved_by_hod' : 'rejected_by_hod';
      await outpass.save();
      res.json({ message: approved ? 'Outpass approved by HOD' : 'Outpass rejected by HOD', outpass });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // HOD dashboard: get pending outpass requests for department
  async getHodDashboard(req, res) {
    try {
      if (req.user.role !== 'hod') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const hodId = req.user._id;
      const hod = await Hod.findById(hodId);
      if (!hod) {
        return res.status(404).json({ message: 'HOD not found' });
      }

      // Get pending outpass requests
      const pendingOutpasses = await OutpassRequest.find({ 
        hod: hodId, 
        hodApprovalRequested: true, 
        'hodApproval.approved': false, 
        status: { $in: ['pending', 'approved_by_warden'] } 
      }).populate('student', 'firstName lastName rollNumber email');

      // Get total students in department
      const totalStudents = await Student.countDocuments({ department: hod.department, hodId: hodId });

      // Get approved outpasses count
      const approvedCount = await OutpassRequest.countDocuments({ 
        hod: hodId, 
        'hodApproval.approved': true 
      });

      // Get rejected outpasses count
      const rejectedCount = await OutpassRequest.countDocuments({ 
        hod: hodId, 
        status: 'rejected_by_hod' 
      });

      res.json({ 
        department: hod.department,
        statistics: {
          totalStudents,
          pendingOutpasses: pendingOutpasses.length,
          approvedOutpasses: approvedCount,
          rejectedOutpasses: rejectedCount
        },
        pendingOutpasses 
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Student: Get own outpass requests
  async getStudentOutpasses(req, res) {
    try {
      if (req.user.role !== 'student') {
        return res.status(403).json({ message: 'Access denied' });
      }
      const outpasses = await OutpassRequest.find({ student: req.user._id }).sort({ createdAt: -1 });
      res.json({ outpasses, count: outpasses.length });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Warden: Get all outpass requests
  async getWardenOutpasses(req, res) {
    try {
      // Allow warden, admin, and hod to view outpasses
      if (!['warden', 'admin', 'hod'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied. Only warden, admin, or HOD can view outpasses.' });
      }
      
      // Build query based on role
      let query = {};
      if (req.user.role === 'warden') {
        query.warden = req.user._id;
      }
      // Admin and HOD can see all outpasses
      
      // Add status filter if provided
      if (req.query.status && req.query.status !== 'all') {
        query.status = req.query.status;
      }
      
      const outpasses = await OutpassRequest.find(query)
        .populate('student', 'firstName lastName rollNumber email department')
        .populate('warden', 'firstName lastName email')
        .populate('hod', 'firstName lastName email')
        .sort({ createdAt: -1 });
      res.json({ outpasses, count: outpasses.length });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Warden: Approve outpass request
  async wardenApproveOutpass(req, res) {
    try {
      // Allow warden and admin to approve
      if (!['warden', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied. Only warden or admin can approve outpasses.' });
      }
      const { requestId } = req.params;
      const { comments } = req.body;
      const outpass = await OutpassRequest.findById(requestId);
      if (!outpass) return res.status(404).json({ message: 'Outpass request not found' });
      
      outpass.wardenApproval = {
        approved: true,
        approvedAt: new Date(),
        approvedBy: req.user._id,
        comments
      };
      
      // If HOD approval is requested, mark as approved_by_warden, else mark as approved
      if (outpass.hodApprovalRequested) {
        outpass.status = 'approved_by_warden';
      } else {
        outpass.status = 'approved';
      }
      
      await outpass.save();
      res.json({ message: 'Outpass approved by warden', outpass });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Warden: Reject outpass request
  async wardenRejectOutpass(req, res) {
    try {
      // Allow warden and admin to reject
      if (!['warden', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied. Only warden or admin can reject outpasses.' });
      }
      const { requestId } = req.params;
      const { reason } = req.body;
      const outpass = await OutpassRequest.findById(requestId);
      if (!outpass) return res.status(404).json({ message: 'Outpass request not found' });
      
      outpass.status = 'rejected';
      outpass.rejectionReason = reason;
      outpass.rejectedAt = new Date();
      outpass.rejectedBy = req.user._id;
      outpass.rejectedByModel = 'Warden';
      
      await outpass.save();
      res.json({ message: 'Outpass rejected by warden', outpass });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Get outpass history with filters (accessible by admin/warden)
  async getOutpassHistory(req, res) {
    try {
      const { status, search, limit = 100, sort = '-createdAt' } = req.query;
      const query = {};
      if (status && status !== 'all') {
        query.status = status;
      }
      if (search) {
        query.$or = [
          { rollNumber: { $regex: search, $options: 'i' } },
          { studentId: { $regex: search, $options: 'i' } },
          { reason: { $regex: search, $options: 'i' } }
        ];
      }
      const outpasses = await OutpassRequest.find(query)
        .populate('student', 'firstName lastName rollNumber email')
        .limit(Number.parseInt(limit))
        .sort(sort);
      res.json({ outpasses, count: outpasses.length });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Get outpass statistics for reports
  async getOutpassStatistics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const dateRange = {};
      if (startDate && endDate) {
        dateRange.startDate = new Date(startDate);
        dateRange.endDate = new Date(endDate);
      }
      const stats = await OutpassRequest.getStats(dateRange);
      // Transform aggregated stats into a simpler object
      let totalRequests = 0;
      let approved = 0;
      let rejected = 0;
      let pending = 0;
      for (const s of stats) {
        totalRequests += s.count;
        if (s._id === 'approved' || s._id === 'approved_by_warden' || s._id === 'approved_by_hod') {
          approved += s.count;
        } else if (s._id === 'rejected' || s._id === 'rejected_by_hod') {
          rejected += s.count;
        } else if (s._id === 'pending') {
          pending += s.count;
        }
      }
      // Find the most common reason
      const reasonAgg = await OutpassRequest.aggregate([
        ...(dateRange.startDate && dateRange.endDate ? [{ $match: { createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate } } }] : []),
        { $group: { _id: '$outpassType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 }
      ]);
      const topReason = reasonAgg.length > 0 ? reasonAgg[0]._id : 'N/A';
      // Calculate average processing time (mock for now)
      const avgProcessingTime = '2.3h';
      res.json({
        data: {
          totalRequests,
          approved,
          rejected,
          pending,
          avgProcessingTime,
          topReason
        }
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Record exit (security)
  async recordOutpassExit(req, res) {
    try {
      const { requestId } = req.params;
      const outpass = await OutpassRequest.findById(requestId);
      if (!outpass) return res.status(404).json({ message: 'Outpass request not found' });
      if (outpass.status !== 'approved' && outpass.status !== 'approved_by_hod') {
        return res.status(400).json({ message: 'Outpass not approved for exit' });
      }
      await outpass.recordExit(req.user.id);
      res.json({ message: 'Exit recorded successfully', outpass });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Record return (security)
  async recordOutpassReturn(req, res) {
    try {
      const { requestId } = req.params;
      const outpass = await OutpassRequest.findById(requestId);
      if (!outpass) return res.status(404).json({ message: 'Outpass request not found' });
      if (outpass.status !== 'out') {
        return res.status(400).json({ message: 'Student has not exited yet' });
      }
      await outpass.recordReturn(req.user.id);
      res.json({ message: 'Return recorded successfully', outpass });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Get outpass by ID
  async getOutpassById(req, res) {
    try {
      const { requestId } = req.params;
      const outpass = await OutpassRequest.findById(requestId)
        .populate('student', 'firstName lastName rollNumber email phoneNumber hostelBlock profilePicture')
        .populate('wardenApprovedBy', 'firstName lastName')
        .populate('hodApprovedBy', 'firstName lastName');

      if (!outpass) {
        return res.status(404).json({ message: 'Outpass request not found' });
      }

      // Check authorization
      if (req.user.role === 'student' && outpass.student._id.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json({ outpass });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Update outpass (only for pending/draft status)
  async updateOutpass(req, res) {
    try {
      const { requestId } = req.params;
      const updates = req.body;

      const outpass = await OutpassRequest.findById(requestId);
      if (!outpass) {
        return res.status(404).json({ message: 'Outpass request not found' });
      }

      // Only student can update their own outpass
      if (req.user.role === 'student' && outpass.student.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Can only update if status is pending
      if (outpass.status !== 'pending') {
        return res.status(400).json({ message: 'Cannot update outpass after approval/rejection' });
      }

      // Update allowed fields
      const allowedFields = ['outpassType', 'reason', 'destination', 'fromDate', 'toDate', 'contactNumber', 'parentContact'];
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          outpass[field] = updates[field];
        }
      }

      await outpass.save();
      res.json({ message: 'Outpass updated successfully', outpass });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Delete/Cancel outpass
  async cancelOutpass(req, res) {
    try {
      const { requestId } = req.params;
      const { reason } = req.body;

      const outpass = await OutpassRequest.findById(requestId);
      if (!outpass) {
        return res.status(404).json({ message: 'Outpass request not found' });
      }

      // Check authorization
      if (req.user.role === 'student' && outpass.student.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Can only cancel if not completed or if not exited
      if (outpass.exitTime) {
        return res.status(400).json({ message: 'Cannot cancel outpass after exit has been recorded' });
      }

      outpass.status = 'cancelled';
      outpass.cancellationReason = reason || 'Cancelled by student';
      outpass.cancelledAt = new Date();
      outpass.cancelledBy = req.user.id;

      await outpass.save();
      res.json({ message: 'Outpass cancelled successfully', outpass });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Bulk approve outpasses (for warden/admin)
  async bulkApproveOutpasses(req, res) {
    try {
      const { outpassIds } = req.body;

      if (!outpassIds || !Array.isArray(outpassIds) || outpassIds.length === 0) {
        return res.status(400).json({ message: 'Outpass IDs array is required' });
      }

      const results = {
        approved: [],
        failed: []
      };

      for (const id of outpassIds) {
        try {
          const outpass = await OutpassRequest.findById(id);
          if (!outpass) {
            results.failed.push({ id, reason: 'Not found' });
            continue;
          }

          if (outpass.wardenApprovalStatus !== 'pending') {
            results.failed.push({ id, reason: 'Already processed' });
            continue;
          }

          outpass.wardenApprovalStatus = 'approved';
          outpass.wardenApprovalDate = new Date();
          outpass.wardenApprovedBy = req.user.id;
          outpass.status = 'approved_by_warden';

          await outpass.save();
          results.approved.push(id);
        } catch (error) {
          results.failed.push({ id, reason: error.message });
        }
      }

      res.json({
        message: `Bulk approval completed: ${results.approved.length} approved, ${results.failed.length} failed`,
        results
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Bulk reject outpasses (for warden/admin)
  async bulkRejectOutpasses(req, res) {
    try {
      const { outpassIds, reason } = req.body;

      if (!outpassIds || !Array.isArray(outpassIds) || outpassIds.length === 0) {
        return res.status(400).json({ message: 'Outpass IDs array is required' });
      }

      if (!reason) {
        return res.status(400).json({ message: 'Rejection reason is required' });
      }

      const results = {
        rejected: [],
        failed: []
      };

      for (const id of outpassIds) {
        try {
          const outpass = await OutpassRequest.findById(id);
          if (!outpass) {
            results.failed.push({ id, reason: 'Not found' });
            continue;
          }

          if (outpass.wardenApprovalStatus !== 'pending') {
            results.failed.push({ id, reason: 'Already processed' });
            continue;
          }

          outpass.wardenApprovalStatus = 'rejected';
          outpass.wardenApprovalDate = new Date();
          outpass.wardenApprovedBy = req.user.id;
          outpass.wardenRejectionReason = reason;
          outpass.status = 'rejected';

          await outpass.save();
          results.rejected.push(id);
        } catch (error) {
          results.failed.push({ id, reason: error.message });
        }
      }

      res.json({
        message: `Bulk rejection completed: ${results.rejected.length} rejected, ${results.failed.length} failed`,
        results
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
};

export default outpassController;
