
import OutpassRequest from '../models/OutpassRequest.js';
import Student from '../models/Student.js';
import Hod from '../models/Hod.js';
import Warden from '../models/Warden.js';
import { sendSms } from '../utils/smsSender.js'
import jwt from 'jsonwebtoken'
import { config } from '../config/config.js'


const outpassController = {
  // Warden creates outpass request, can flag for HOD approval
  async createOutpassRequest(req, res) {
    try {
      const { studentId, outpassType, reason, leaveTime, expectedReturnTime, destination, hodApprovalRequested } = req.body;

      // Determine target student: if caller is a student, use their id; if warden/admin is creating
      // on behalf, studentId must be provided.
      let student = null;
      if (req.user?.role === 'student') {
        student = await Student.findById(req.user.id)
      } else if (studentId) {
        student = await Student.findById(studentId)
      }

      if (!student) return res.status(404).json({ message: 'Student not found' });

      // Prevent creating a new outpass if the student already has an active/pending/approved/out outpass
      const activeStatuses = ['pending', 'approved', 'approved_by_warden', 'approved_by_hod', 'out']
      const existingActive = await OutpassRequest.countDocuments({ student: student._id, status: { $in: activeStatuses } })
      if (existingActive > 0) {
        return res.status(400).json({ message: 'Student has an active or pending outpass. New requests are allowed only after the previous outpass is completed.' })
      }

      let hodId = student.hodId;
      let hod = hodId ? await Hod.findById(hodId) : null;

      // Normalize destination: controller accepts either a string or object
      const dest = typeof destination === 'string' ? { place: destination } : (destination || {})

      const outpassRequest = new OutpassRequest({
        student: student._id,
        studentId: student.studentId,
        rollNumber: student.rollNumber,
        outpassType,
        reason,
        leaveTime,
        expectedReturnTime,
        destination: dest,
  // If the request is created by a warden/admin, record the warden; otherwise leave undefined
  warden: ['warden', 'admin'].includes(req.user?.role) ? req.user.id : undefined,
        hodApprovalRequested: !!hodApprovalRequested,
        hod: hod ? hod._id : undefined
      });
      await outpassRequest.save();
      // Increment student's activeOutpasses counter
      try {
        student.activeOutpasses = (student.activeOutpasses || 0) + 1
        await student.save({ validateBeforeSave: false })
      } catch (incErr) {
        console.warn('Failed to increment student.activeOutpasses', incErr && incErr.message ? incErr.message : incErr)
      }
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
      if (!outpass.hodApprovalRequested || !outpass.hod.equals(req.user.id)) {
        return res.status(403).json({ message: 'Not authorized for this outpass request' });
      }
      outpass.hodApproval = {
        approved,
        approvedAt: new Date(),
        approvedBy: req.user.id,
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
      
  const hodId = req.user.id;
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

      // Get distribution by yearOfStudy (1..6)
      const yearAgg = await Student.aggregate([
        { $match: { department: hod.department, hodId: hodId } },
        { $group: { _id: '$yearOfStudy', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
      const yearDistribution = yearAgg.map(y => ({ yearOfStudy: y._id, count: y.count }))

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
          rejectedOutpasses: rejectedCount,
          yearDistribution
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
  const outpasses = await OutpassRequest.find({ student: req.user.id }).sort({ createdAt: -1 });
      res.json({ outpasses, count: outpasses.length });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Warden: Get all outpass requests
  async getWardenOutpasses(req, res) {
    try {
      // Allow warden, admin, hod and security to view outpasses
      if (!['warden', 'admin', 'hod', 'security'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied. Only warden, admin, HOD, or security can view outpasses.' });
      }
      
      // Build query based on role
      let query = {};
      if (req.user.role === 'warden') {
        // Fetch warden assigned blocks and include outpasses for students in those blocks
        try {
          const warden = await Warden.findById(req.user.id).select('assignedHostelBlocks');
          const assignedBlocks = Array.isArray(warden?.assignedHostelBlocks)
            ? warden.assignedHostelBlocks.map(b => (b && b.blockName ? b.blockName : null)).filter(Boolean)
            : [];

          if (assignedBlocks.length > 0) {
            // Find student ids that belong to these blocks
            const studentsInBlocks = await Student.find({ hostelBlock: { $in: assignedBlocks } }).select('_id');
            const studentIds = studentsInBlocks.map(s => s._id);

            // Query outpasses either explicitly assigned to this warden OR belonging to students in assigned blocks
            query.$or = [ { warden: req.user.id } ];
            if (studentIds.length > 0) query.$or.push({ student: { $in: studentIds } });
          } else {
            // If no assigned blocks, fall back to only outpasses explicitly assigned to warden
            query.warden = req.user.id;
          }
        } catch (err) {
          // On any failure retrieving warden info, fall back to warden-specific outpasses
          query.warden = req.user.id;
        }
      }
      // Admin and HOD can see all outpasses
      
      // Add status filter if provided
      if (req.query.status && req.query.status !== 'all') {
        query.status = req.query.status;
      }
      
      let outpasses = await OutpassRequest.find(query)
        .populate('student', 'firstName lastName rollNumber email department')
        .populate('warden', 'firstName lastName email')
        .populate('hod', 'firstName lastName email')
        .sort({ createdAt: -1 });

      // Convert to plain objects and attach assignedStudentsCount for populated wardens/hods
      const plain = outpasses.map(op => (op.toObject ? op.toObject() : JSON.parse(JSON.stringify(op))));

      // Collect unique warden/hod ids from results
      const wardenIds = Array.from(new Set(plain.map(p => p.warden && p.warden._id).filter(Boolean)));
      const hodIds = Array.from(new Set(plain.map(p => p.hod && p.hod._id).filter(Boolean)));

      const counts = {};
      // For wardens
      await Promise.all(wardenIds.map(async id => {
        counts[`warden_${id}`] = await Student.countDocuments({ wardenId: id });
      }));
      // For hods
      await Promise.all(hodIds.map(async id => {
        counts[`hod_${id}`] = await Student.countDocuments({ hodId: id });
      }));

      // Attach counts back to plain objects
      const enhanced = plain.map(p => {
        if (p.warden && p.warden._id) p.warden.assignedStudentsCount = counts[`warden_${p.warden._id}`] || 0
        if (p.hod && p.hod._id) p.hod.assignedStudentsCount = counts[`hod_${p.hod._id}`] || 0
        return p
      })

      res.json({ outpasses: enhanced, count: enhanced.length });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Warden: Approve outpass request
  async wardenApproveOutpass(req, res) {
    try {
      const { requestId } = req.params;
      const { comments } = req.body;
      const outpass = await OutpassRequest.findById(requestId);
      if (!outpass) return res.status(404).json({ message: 'Outpass request not found' });

      // If parent OTP was requested but not yet approved, do not allow approval
      if (outpass.parentApproval && outpass.parentApproval.requestedAt && !outpass.parentApproval.approved) {
        return res.status(403).json({ message: 'Cannot approve until parent verification is completed' });
      }

      // If parent approval is present, only the assigned warden may approve (prevent admin bypass)
      if (outpass.parentApproval && outpass.parentApproval.approved) {
        if (req.user.role !== 'warden') {
          return res.status(403).json({ message: 'Only the assigned warden can approve after parent verification' });
        }
        if (outpass.warden && outpass.warden.toString() !== req.user.id) {
          return res.status(403).json({ message: 'Only the assigned warden can approve this outpass' });
        }
      } else {
        // If no parent approval involved, allow warden or admin
        if (!['warden', 'admin'].includes(req.user.role)) {
          return res.status(403).json({ message: 'Access denied. Only warden or admin can approve outpasses.' });
        }
      }

      outpass.wardenApproval = {
        approved: true,
        approvedAt: new Date(),
        approvedBy: req.user.id,
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
  outpass.rejectedBy = req.user.id;
      outpass.rejectedByModel = 'Warden';
      
      await outpass.save();
      // Decrement student's activeOutpasses (if present)
      try {
        const stud = await Student.findById(outpass.student)
        if (stud && stud.activeOutpasses && stud.activeOutpasses > 0) {
          stud.activeOutpasses = Math.max(0, stud.activeOutpasses - 1)
          await stud.save({ validateBeforeSave: false })
        }
      } catch (decErr) {
        console.warn('Failed to decrement student.activeOutpasses on reject', decErr && decErr.message ? decErr.message : decErr)
      }
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
      // Decrement student's activeOutpasses (student has returned)
      try {
        const stud = await Student.findById(outpass.student)
        if (stud && stud.activeOutpasses && stud.activeOutpasses > 0) {
          stud.activeOutpasses = Math.max(0, stud.activeOutpasses - 1)
          await stud.save({ validateBeforeSave: false })
        }
      } catch (decErr) {
        console.warn('Failed to decrement student.activeOutpasses on return', decErr && decErr.message ? decErr.message : decErr)
      }
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
        .populate('warden', 'firstName lastName email')
        .populate('hod', 'firstName lastName email')
        .populate('wardenApprovedBy', 'firstName lastName')
        .populate('hodApprovedBy', 'firstName lastName');

      if (!outpass) {
        return res.status(404).json({ message: 'Outpass request not found' });
      }

      // Check authorization
      if (req.user.role === 'student' && outpass.student._id.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Attach assignedStudentsCount for populated warden/hod (if present)
      const plain = outpass.toObject ? outpass.toObject() : JSON.parse(JSON.stringify(outpass))
      if (plain.warden && plain.warden._id) {
        plain.warden.assignedStudentsCount = await Student.countDocuments({ wardenId: plain.warden._id })
      }
      if (plain.hod && plain.hod._id) {
        plain.hod.assignedStudentsCount = await Student.countDocuments({ hodId: plain.hod._id })
      }

      res.json({ outpass: plain });
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
      // Decrement student's activeOutpasses (if present)
      try {
        const stud = await Student.findById(outpass.student)
        if (stud && stud.activeOutpasses && stud.activeOutpasses > 0) {
          stud.activeOutpasses = Math.max(0, stud.activeOutpasses - 1)
          await stud.save({ validateBeforeSave: false })
        }
      } catch (decErr) {
        console.warn('Failed to decrement student.activeOutpasses on cancel', decErr && decErr.message ? decErr.message : decErr)
      }
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
  },

  // Request parent OTP / verification (triggered by admin/warden)
  async requestParentOtp(req, res) {
    try {
      // Only warden/admin should trigger parent contact
      if (!['warden', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied. Only warden or admin can request parent verification.' });
      }
      const { requestId } = req.params;
      const outpass = await OutpassRequest.findById(requestId).populate('student', 'firstName lastName parentDetails parentId');
      if (!outpass) return res.status(404).json({ message: 'Outpass request not found' });

      // Determine parent contact: prefer explicit parentApproval.parentContact, then student.parentDetails.guardianPhone
      let parentPhone = outpass.parentApproval?.parentContact || outpass.student?.parentDetails?.guardianPhone || null;
      if (!parentPhone && outpass.student?.parentId) {
        const Parent = await import('../models/Parent.js').then(m => m.default)
        const parent = await Parent.findById(outpass.student.parentId)
        parentPhone = parent ? (parent.primaryPhone || parent.phone || null) : null
      }

      if (!parentPhone) {
        return res.status(400).json({ message: 'Parent contact not available for this student' });
      }

      // Prevent requesting OTP if parent already approved
      if (outpass.parentApproval && outpass.parentApproval.approved) {
        return res.status(400).json({ message: 'Parent has already approved this outpass' });
      }

      // Generate a short-lived OTP (6 digits) and store on outpass.parentApproval
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      outpass.parentApproval = outpass.parentApproval || {}
      outpass.parentApproval.otp = otp
      outpass.parentApproval.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      outpass.parentApproval.parentContact = parentPhone
      outpass.parentApproval.requestedAt = new Date()

      // Persist OTP on the outpass so it can be validated by parent portal/tests
      await outpass.save()

      // Compose a short SMS with OTP and a brief summary. Full outpass object is returned in the
      // API response (for admin/warden/testing) but SMS contains a short human-friendly message.
      const smsBody = `Your child's outpass request. Student: ${outpass.student?.firstName || ''} ${outpass.student?.lastName || ''}. ` +
        `Leave: ${outpass.leaveTime ? new Date(outpass.leaveTime).toLocaleString() : 'N/A'}. Return: ${outpass.expectedReturnTime ? new Date(outpass.expectedReturnTime).toLocaleString() : 'N/A'}. ` +
        `Destination: ${(outpass.destination && (outpass.destination.place || outpass.destination)) || 'N/A'}. OTP: ${otp}. This code expires in 10 minutes.`

      let smsResult = { success: false }
      try {
        smsResult = await sendSms(parentPhone, smsBody)
      } catch (smsErr) {
        // Log and continue — admin can still see OTP in response during development
        console.error('Failed to send parent OTP SMS:', smsErr.message || smsErr)
      }

      // Return parent contact and whether SMS was sent. Do NOT include the OTP or OTP expiry in API responses.
      const sanitized = outpass.toObject ? outpass.toObject() : JSON.parse(JSON.stringify(outpass))
      if (sanitized.parentApproval) {
        delete sanitized.parentApproval.otp
        delete sanitized.parentApproval.otpExpiresAt
      }

      res.json({ message: 'Parent verification requested', parentContact: parentPhone, otpSent: !!smsResult.success, outpass: sanitized })
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Warden: send request to HOD for approval
  async sendToHod(req, res) {
    try {
      if (!['warden', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied. Only warden or admin can send to HOD.' });
      }

      const { requestId } = req.params;
      const outpass = await OutpassRequest.findById(requestId).populate('student', 'firstName lastName hodId');
      if (!outpass) return res.status(404).json({ message: 'Outpass request not found' });

      // If already requested, just return
      if (outpass.hodApprovalRequested) {
        return res.json({ message: 'Already sent to HOD', outpass });
      }

      // Mark as requested for HOD approval and set hod reference if student has one
      outpass.hodApprovalRequested = true;
      if (outpass.student && outpass.student.hodId) {
        outpass.hod = outpass.student.hodId;
      }

      await outpass.save();

      const sanitized = outpass.toObject ? outpass.toObject() : JSON.parse(JSON.stringify(outpass))
      if (sanitized.parentApproval) {
        delete sanitized.parentApproval.otp
        delete sanitized.parentApproval.otpExpiresAt
      }

      // Try to notify HOD by SMS (if HOD assigned and has phone)
      let smsResult = { success: false }
      try {
        if (outpass.hod) {
          const hodRecord = await Hod.findById(outpass.hod)
          if (hodRecord && hodRecord.phone) {
            const studentName = outpass.student ? `${outpass.student.firstName || ''} ${outpass.student.lastName || ''}`.trim() : ''
            const smsBody = `Outpass requires your approval. Student: ${studentName || 'Unknown'}; Request: ${outpass.requestId || ''}. Leave: ${outpass.leaveTime ? new Date(outpass.leaveTime).toLocaleString() : 'N/A'}. Please review in the HOD portal.`
            smsResult = await sendSms(hodRecord.phone, smsBody)
          }
        }
      } catch (smsErr) {
        console.error('Failed to send HOD notification SMS:', smsErr && smsErr.message ? smsErr.message : smsErr)
      }

      res.json({ message: 'Outpass sent to HOD for approval', outpass: sanitized, hodSmsSent: !!smsResult.success })
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Parent uses OTP to approve outpass (parent portal)
  async parentApproveOutpass(req, res) {
    try {
      const { requestId } = req.params;
      const { otp, comments } = req.body;

      // If this endpoint is called by an authenticated user, only wardens are allowed
      // to submit the OTP on behalf of the parent. Parents should use the public
      // `/parent/approve-public/:requestId` endpoint (rate-limited) or the parent portal.
      if (req.user && req.user.role && req.user.role !== 'warden') {
        return res.status(403).json({ message: 'Only wardens can submit parent OTP via this portal' });
      }

      const outpass = await OutpassRequest.findById(requestId);
      if (!outpass) return res.status(404).json({ message: 'Outpass request not found' });

      if (!outpass.parentApproval || !outpass.parentApproval.otp) {
        return res.status(400).json({ message: 'No parent approval request found for this outpass' });
      }

      if (new Date() > new Date(outpass.parentApproval.otpExpiresAt)) {
        return res.status(400).json({ message: 'OTP expired' });
      }

      if (!otp || otp.toString() !== outpass.parentApproval.otp.toString()) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }

      // Mark approved and record metadata
      outpass.parentApproval.approved = true
      outpass.parentApproval.approvedAt = new Date()
      outpass.parentApproval.comments = comments || ''

      // Remove OTP fields to prevent reuse/replay attacks
      if (outpass.parentApproval.otp) delete outpass.parentApproval.otp
      if (outpass.parentApproval.otpExpiresAt) delete outpass.parentApproval.otpExpiresAt

      // If parent approves and warden already approved, update final status if needed
      if (outpass.wardenApproval && outpass.wardenApproval.approved) {
        outpass.status = 'approved'
      }

      await outpass.save()

      // Generate a short-lived parent token so parent/mobile app can fetch full details securely
      const parentToken = jwt.sign(
        { sub: outpass._id.toString(), type: 'parent' },
        config.jwt.secret,
        { expiresIn: '15m' }
      )

      // Do not leak OTP values back in the response
      const sanitized = outpass.toObject ? outpass.toObject() : JSON.parse(JSON.stringify(outpass))
      if (sanitized.parentApproval) {
        delete sanitized.parentApproval.otp
        delete sanitized.parentApproval.otpExpiresAt
      }

      res.json({ message: 'Outpass approved by parent', outpass: sanitized, parentToken, expiresIn: 15 * 60 })
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Parent portal: fetch full outpass after OTP approval using short-lived parent token
  async getOutpassForParentPortal(req, res) {
    try {
      const { requestId } = req.params

      // Accept token via Authorization Bearer or ?token= query
      let token = null
      const authHeader = req.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1]
      if (!token) token = req.query.token

      if (!token) return res.status(401).json({ message: 'Missing parent token' })

      let payload
      try {
        payload = jwt.verify(token, config.jwt.secret)
      } catch (err) {
        console.debug && console.debug('Parent token verification failed', err)
        return res.status(401).json({ message: 'Invalid or expired token' })
      }

      if (!payload || payload.type !== 'parent' || payload.sub !== requestId) {
        return res.status(403).json({ message: 'Token does not grant access to this outpass' })
      }

      const outpass = await OutpassRequest.findById(requestId)
        .populate('student', 'firstName lastName rollNumber email phoneNumber hostelBlock profilePicture')

      if (!outpass) return res.status(404).json({ message: 'Outpass not found' })

      // Ensure parent has approved
      if (!outpass.parentApproval || !outpass.parentApproval.approved) {
        return res.status(403).json({ message: 'Parent approval not completed for this outpass' })
      }

      const sanitized = outpass.toObject ? outpass.toObject() : JSON.parse(JSON.stringify(outpass))
      if (sanitized.parentApproval) {
        delete sanitized.parentApproval.otp
        delete sanitized.parentApproval.otpExpiresAt
      }

      res.json({ outpass: sanitized })
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message })
    }
  }
};

export default outpassController;
