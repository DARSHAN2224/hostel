import OutpassRequest from '../models/OutpassRequest.js';
import Student from '../models/Student.js';
import Hod from '../models/Hod.js';
import Warden from '../models/Warden.js';
import { sendSms } from '../utils/smsSender.js'
import jwt from 'jsonwebtoken'
import { config } from '../config/config.js'
import { sendOtpEmail } from '../utils/emailOtpSender.js'
import Counsellor from '../models/Counsellor.js'

// ── Import every emit function actually used in this file ─────────────────────
import {
  emitOutpassCreated,
  emitOutpassApproved,
  emitOutpassRejected,
  emitHodApproved,
  emitHodRejected,
  emitCounsellorDecision,
  emitParentApproved,
  emitOutpassCancelled,
  emitExitRecorded,
  emitReturnRecorded,
  emitDashboardRefresh,
} from '../services/socketService.js'

const outpassController = {

  // ── Create outpass request ────────────────────────────────────────────────
  async createOutpassRequest(req, res) {
    try {
      const { studentId, outpassType, reason, leaveTime, expectedReturnTime, destination, hodApprovalRequested } = req.body;

      let student = null;
      if (req.user?.role === 'student') {
        student = await Student.findById(req.user.id)
      } else if (studentId) {
        student = await Student.findById(studentId)
      }

      if (!student) return res.status(404).json({ message: 'Student not found' });

      const activeStatuses = ['pending', 'approved', 'approved_by_warden', 'approved_by_hod', 'out']
      const existingActive = await OutpassRequest.countDocuments({
        student: student._id,
        status: { $in: activeStatuses }
      })
      if (existingActive > 0) {
        return res.status(400).json({
          message: 'Student has an active or pending outpass. New requests are allowed only after the previous outpass is completed.'
        })
      }

      let hodId = student.hodId;
      let hod = hodId ? await Hod.findById(hodId) : null;

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
        warden: ['warden', 'admin'].includes(req.user?.role) ? req.user.id : undefined,
        hodApprovalRequested: !!hodApprovalRequested,
        hod: hod ? hod._id : undefined
      });

      await outpassRequest.save();

      try {
        student.activeOutpasses = (student.activeOutpasses || 0) + 1
        await student.save({ validateBeforeSave: false })
      } catch (incErr) {
        console.warn('Failed to increment student.activeOutpasses:', incErr?.message)
      }

      // ── Notify wardens/admins a new request arrived ──────────────────────
      emitOutpassCreated(outpassRequest, student)

      res.status(201).json({ message: 'Outpass request created', outpassRequest });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // ── HOD: approve or reject ────────────────────────────────────────────────
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

      const student = await Student.findById(outpass.student)

      // ── Correct event for HOD decision ──────────────────────────────────
      if (approved) {
        emitHodApproved(outpass, student)
      } else {
        emitHodRejected(outpass, student)
      }

      res.json({ message: approved ? 'Outpass approved by HOD' : 'Outpass rejected by HOD', outpass });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // ── HOD dashboard ─────────────────────────────────────────────────────────
  async getHodDashboard(req, res) {
    try {
      if (req.user.role !== 'hod') {
        return res.status(403).json({ message: 'Access denied' });
      }

      const hodId = req.user.id;
      const hod = await Hod.findById(hodId);
      if (!hod) return res.status(404).json({ message: 'HOD not found' });

      const pendingOutpasses = await OutpassRequest.find({
        hod: hodId,
        hodApprovalRequested: true,
        'hodApproval.approved': false,
        status: { $in: ['pending', 'approved_by_warden'] }
      }).populate('student', 'firstName lastName rollNumber email');

      const totalStudents = await Student.countDocuments({ department: hod.department, hodId: hodId });

      const yearAgg = await Student.aggregate([
        { $match: { department: hod.department, hodId: hodId } },
        { $group: { _id: '$yearOfStudy', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
      const yearDistribution = yearAgg.map(y => ({ yearOfStudy: y._id, count: y.count }))

      const approvedCount = await OutpassRequest.countDocuments({ hod: hodId, 'hodApproval.approved': true });
      const rejectedCount = await OutpassRequest.countDocuments({ hod: hodId, status: 'rejected_by_hod' });

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

  // ── Student: get own outpasses ────────────────────────────────────────────
  async getStudentOutpasses(req, res) {
    try {
      if (req.user.role !== 'student') return res.status(403).json({ message: 'Access denied' });
      const outpasses = await OutpassRequest.find({ student: req.user.id }).sort({ createdAt: -1 });
      res.json({ outpasses, count: outpasses.length });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // ── Warden: get all outpasses ─────────────────────────────────────────────
  async getWardenOutpasses(req, res) {
    try {
      if (!['warden', 'admin', 'hod', 'security'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied.' });
      }

      let query = {};
      if (req.user.role === 'warden') {
        try {
          const warden = await Warden.findById(req.user.id).select('hostelType');
          const wardenHostelType = warden?.hostelType || null;
          const studentFilter = {};
          if (wardenHostelType) studentFilter.hostelType = wardenHostelType;
          const studentsInHostel = await Student.find(studentFilter).select('_id');
          const studentIds = studentsInHostel.map(s => s._id);
          if (studentIds.length > 0) {
            query.$or = [{ warden: req.user.id }, { student: { $in: studentIds } }];
          } else {
            query.warden = req.user.id;
          }
        } catch (_) {
          query.warden = req.user.id;
        }
      }

      if (req.query.status && req.query.status !== 'all') {
        query.status = req.query.status;
      }

      let outpasses = await OutpassRequest.find(query)
        .lean()
        .populate('student', 'firstName lastName rollNumber email department')
        .populate('warden', 'firstName lastName email')
        .populate('hod', 'firstName lastName email')
        .sort({ createdAt: -1 });

      const wardenIds = Array.from(new Set(outpasses.map(p => p.warden?._id).filter(Boolean)));
      const hodIds = Array.from(new Set(outpasses.map(p => p.hod?._id).filter(Boolean)));
      const counts = {};
      await Promise.all(wardenIds.map(async id => {
        counts[`warden_${id}`] = await Student.countDocuments({ wardenId: id })
      }));
      await Promise.all(hodIds.map(async id => {
        counts[`hod_${id}`] = await Student.countDocuments({ hodId: id })
      }));

      const enhanced = outpasses.map(p => {
        if (p.warden?._id) p.warden.assignedStudentsCount = counts[`warden_${p.warden._id}`] || 0
        if (p.hod?._id) p.hod.assignedStudentsCount = counts[`hod_${p.hod._id}`] || 0
        if (p.parentApproval) {
          delete p.parentApproval.otp
          delete p.parentApproval.otpExpiresAt
        }
        return p
      })

      res.json({ outpasses: enhanced, count: enhanced.length });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // ── Warden: approve outpass ───────────────────────────────────────────────
  async wardenApproveOutpass(req, res) {
    try {
      const { requestId } = req.params;
      const { comments } = req.body;
      const outpass = await OutpassRequest.findById(requestId);
      if (!outpass) return res.status(404).json({ message: 'Outpass request not found' });

      if (outpass.counsellorApprovalRequested && !outpass.counsellorApproval?.approved) {
        return res.status(403).json({ message: 'Cannot approve until counsellor has approved this outpass' });
      }

      if (outpass.parentApproval?.approved) {
        if (req.user.role !== 'warden') {
          return res.status(403).json({ message: 'Only the assigned warden can approve after parent verification' });
        }
        if (outpass.warden && outpass.warden.toString() !== req.user.id) {
          return res.status(403).json({ message: 'Only the assigned warden can approve this outpass' });
        }
      } else {
        if (!['warden', 'admin'].includes(req.user.role)) {
          return res.status(403).json({ message: 'Access denied.' });
        }
      }

      outpass.wardenApproval = {
        approved: true,
        approvedAt: new Date(),
        approvedBy: req.user.id,
        comments
      };
      outpass.status = outpass.hodApprovalRequested ? 'approved_by_warden' : 'approved';
      await outpass.save();

      const student = await Student.findById(outpass.student)
      emitOutpassApproved(outpass, student)

      res.json({ message: 'Outpass approved by warden', outpass });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // ── Warden: reject outpass ────────────────────────────────────────────────
  async wardenRejectOutpass(req, res) {
    try {
      if (!['warden', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied.' });
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

      const student = await Student.findById(outpass.student)

      // ── Was emitOutpassApproved — fixed ──────────────────────────────────
      emitOutpassRejected(outpass, student)

      try {
        const stud = await Student.findById(outpass.student)
        if (stud && stud.activeOutpasses > 0) {
          stud.activeOutpasses = Math.max(0, stud.activeOutpasses - 1)
          await stud.save({ validateBeforeSave: false })
        }
      } catch (decErr) {
        console.warn('Failed to decrement student.activeOutpasses on reject:', decErr?.message)
      }

      res.json({ message: 'Outpass rejected by warden', outpass });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // ── Get outpass history ───────────────────────────────────────────────────
  async getOutpassHistory(req, res) {
    try {
      const { status, search, limit = 100, sort = '-createdAt' } = req.query;
      const query = {};
      if (status && status !== 'all') query.status = status;
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

  // ── Get outpass statistics ────────────────────────────────────────────────
  async getOutpassStatistics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const dateRange = {};
      if (startDate && endDate) {
        dateRange.startDate = new Date(startDate);
        dateRange.endDate = new Date(endDate);
      }
      const stats = await OutpassRequest.getStats(dateRange);
      let totalRequests = 0, approved = 0, rejected = 0, pending = 0;
      for (const s of stats) {
        totalRequests += s.count;
        if (['approved', 'approved_by_warden', 'approved_by_hod'].includes(s._id)) approved += s.count;
        else if (['rejected', 'rejected_by_hod'].includes(s._id)) rejected += s.count;
        else if (s._id === 'pending') pending += s.count;
      }
      const reasonAgg = await OutpassRequest.aggregate([
        ...(dateRange.startDate && dateRange.endDate
          ? [{ $match: { createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate } } }]
          : []),
        { $group: { _id: '$outpassType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 }
      ]);
      res.json({
        data: {
          totalRequests, approved, rejected, pending,
          avgProcessingTime: '2.3h',
          topReason: reasonAgg[0]?._id || 'N/A'
        }
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // ── Record exit ───────────────────────────────────────────────────────────
  async recordOutpassExit(req, res) {
    try {
      const { requestId } = req.params;
      const outpass = await OutpassRequest.findById(requestId);
      if (!outpass) return res.status(404).json({ message: 'Outpass request not found' });
      if (outpass.status !== 'approved' && outpass.status !== 'approved_by_hod') {
        return res.status(400).json({ message: 'Outpass not approved for exit' });
      }
      await outpass.recordExit(req.user.id);

      // ── Was missing entirely — added ─────────────────────────────────────
      const student = await Student.findById(outpass.student)
      emitExitRecorded(outpass, student)

      res.json({ message: 'Exit recorded successfully', outpass });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // ── Record return ─────────────────────────────────────────────────────────
  async recordOutpassReturn(req, res) {
    try {
      const { requestId } = req.params;
      const outpass = await OutpassRequest.findById(requestId);
      if (!outpass) return res.status(404).json({ message: 'Outpass request not found' });
      if (outpass.status !== 'out') {
        return res.status(400).json({ message: 'Student has not exited yet' });
      }
      await outpass.recordReturn(req.user.id);

      try {
        const stud = await Student.findById(outpass.student)
        if (stud && stud.activeOutpasses > 0) {
          stud.activeOutpasses = Math.max(0, stud.activeOutpasses - 1)
          await stud.save({ validateBeforeSave: false })
        }
      } catch (decErr) {
        console.warn('Failed to decrement student.activeOutpasses on return:', decErr?.message)
      }

      // ── Was missing entirely — added ─────────────────────────────────────
      const student = await Student.findById(outpass.student)
      emitReturnRecorded(outpass, student)

      res.json({ message: 'Return recorded successfully', outpass });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // ── Get outpass by ID ─────────────────────────────────────────────────────
  async getOutpassById(req, res) {
    try {
      const { requestId } = req.params;
      const outpass = await OutpassRequest.findById(requestId)
        .populate('student', 'firstName lastName rollNumber email phoneNumber hostelBlock profilePicture')
        .populate('warden', 'firstName lastName email')
        .populate('hod', 'firstName lastName email')
        .populate('wardenApprovedBy', 'firstName lastName')
        .populate('hodApprovedBy', 'firstName lastName');

      if (!outpass) return res.status(404).json({ message: 'Outpass request not found' });

      if (req.user.role === 'student' && outpass.student._id.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const plain = outpass.toObject ? outpass.toObject() : JSON.parse(JSON.stringify(outpass))
      if (plain.warden?._id) plain.warden.assignedStudentsCount = await Student.countDocuments({ wardenId: plain.warden._id })
      if (plain.hod?._id) plain.hod.assignedStudentsCount = await Student.countDocuments({ hodId: plain.hod._id })

      res.json({ outpass: plain });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // ── Update outpass ────────────────────────────────────────────────────────
  async updateOutpass(req, res) {
    try {
      const { requestId } = req.params;
      const updates = req.body;

      const outpass = await OutpassRequest.findById(requestId);
      if (!outpass) return res.status(404).json({ message: 'Outpass request not found' });

      if (req.user.role === 'student' && outpass.student.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      if (outpass.status !== 'pending') {
        return res.status(400).json({ message: 'Cannot update outpass after approval/rejection' });
      }

      const allowedFields = ['outpassType', 'reason', 'leaveTime', 'expectedReturnTime'];
      for (const field of allowedFields) {
        if (updates[field] !== undefined) outpass[field] = updates[field];
      }
      if (updates.destination !== undefined) {
        outpass.destination = typeof updates.destination === 'string'
          ? { place: updates.destination }
          : updates.destination
      }
      await outpass.save();

      const student = await Student.findById(outpass.student)
      emitOutpassCreated(outpass, student)   // re-notify wardens of the updated pending request

      res.json({ message: 'Outpass updated successfully', outpass });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // ── Cancel outpass ────────────────────────────────────────────────────────
  async cancelOutpass(req, res) {
    try {
      const { requestId } = req.params;
      const { reason } = req.body;

      const outpass = await OutpassRequest.findById(requestId);
      if (!outpass) return res.status(404).json({ message: 'Outpass request not found' });

      if (req.user.role === 'student' && outpass.student.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      if (outpass.exitTime) {
        return res.status(400).json({ message: 'Cannot cancel outpass after exit has been recorded' });
      }

      outpass.status = 'cancelled';
      outpass.cancellationReason = reason || 'Cancelled by student';
      outpass.cancelledAt = new Date();
      outpass.cancelledBy = req.user.id;
      await outpass.save();

      const student = await Student.findById(outpass.student)

      // ── Was emitOutpassApproved — fixed ──────────────────────────────────
      emitOutpassCancelled(outpass, student)

      try {
        const stud = await Student.findById(outpass.student)
        if (stud && stud.activeOutpasses > 0) {
          stud.activeOutpasses = Math.max(0, stud.activeOutpasses - 1)
          await stud.save({ validateBeforeSave: false })
        }
      } catch (decErr) {
        console.warn('Failed to decrement student.activeOutpasses on cancel:', decErr?.message)
      }

      res.json({ message: 'Outpass cancelled successfully', outpass });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // ── Bulk approve ──────────────────────────────────────────────────────────
  async bulkApproveOutpasses(req, res) {
    try {
      const { outpassIds } = req.body;
      if (!outpassIds || !Array.isArray(outpassIds) || outpassIds.length === 0) {
        return res.status(400).json({ message: 'Outpass IDs array is required' });
      }

      const results = { approved: [], failed: [] };
      for (const id of outpassIds) {
        try {
          const outpass = await OutpassRequest.findById(id);
          if (!outpass) { results.failed.push({ id, reason: 'Not found' }); continue; }
          if (outpass.wardenApprovalStatus !== 'pending') { results.failed.push({ id, reason: 'Already processed' }); continue; }

          outpass.wardenApprovalStatus = 'approved';
          outpass.wardenApprovalDate = new Date();
          outpass.wardenApprovedBy = req.user.id;
          outpass.status = 'approved_by_warden';
          await outpass.save();

          const student = await Student.findById(outpass.student)
          emitOutpassApproved(outpass, student)
          results.approved.push(id);
        } catch (error) {
          results.failed.push({ id, reason: error.message });
        }
      }

      emitDashboardRefresh(['warden', 'admin', 'security'])
      res.json({
        message: `Bulk approval: ${results.approved.length} approved, ${results.failed.length} failed`,
        results
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // ── Bulk reject ───────────────────────────────────────────────────────────
  async bulkRejectOutpasses(req, res) {
    try {
      const { outpassIds, reason } = req.body;
      if (!outpassIds || !Array.isArray(outpassIds) || outpassIds.length === 0) {
        return res.status(400).json({ message: 'Outpass IDs array is required' });
      }
      if (!reason) return res.status(400).json({ message: 'Rejection reason is required' });

      const results = { rejected: [], failed: [] };
      for (const id of outpassIds) {
        try {
          const outpass = await OutpassRequest.findById(id);
          if (!outpass) { results.failed.push({ id, reason: 'Not found' }); continue; }
          if (outpass.wardenApprovalStatus !== 'pending') { results.failed.push({ id, reason: 'Already processed' }); continue; }

          outpass.wardenApprovalStatus = 'rejected';
          outpass.wardenApprovalDate = new Date();
          outpass.wardenApprovedBy = req.user.id;
          outpass.wardenRejectionReason = reason;
          outpass.status = 'rejected';
          await outpass.save();

          const student = await Student.findById(outpass.student)
          emitOutpassRejected(outpass, student)
          results.rejected.push(id);
        } catch (error) {
          results.failed.push({ id, reason: error.message });
        }
      }

      emitDashboardRefresh(['warden', 'admin'])
      res.json({
        message: `Bulk rejection: ${results.rejected.length} rejected, ${results.failed.length} failed`,
        results
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // ── Request parent OTP ────────────────────────────────────────────────────
  async requestParentOtp(req, res) {
    try {
      if (!['warden', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied.' });
      }

      const { requestId } = req.params;
      const outpass = await OutpassRequest.findById(requestId)
        .populate('student', 'firstName lastName parentDetails parentId hostelBlock roomNumber');
      if (!outpass) return res.status(404).json({ message: 'Outpass request not found' });

      if (outpass.counsellorApprovalRequested && !outpass.counsellorApproval?.approved) {
        return res.status(400).json({ message: 'Counsellor must approve before requesting parent OTP' });
      }
      if (outpass.parentApproval?.approved) {
        return res.status(400).json({ message: 'Parent has already approved this outpass' });
      }

      let parentEmail = outpass.student?.parentDetails?.guardianEmail || null
      if (!parentEmail && outpass.student?.parentId) {
        const Parent = await import('../models/Parent.js').then(m => m.default)
        const parent = await Parent.findById(outpass.student.parentId)
        parentEmail = parent?.email || null
      }
      if (!parentEmail) return res.status(400).json({ message: 'Parent email not available' });

      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      outpass.parentApproval = outpass.parentApproval || {}
      outpass.parentApproval.otp = otp
      outpass.parentApproval.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000)
      outpass.parentApproval.parentEmail = parentEmail
      outpass.parentApproval.requestedAt = new Date()
      await outpass.save()

      let emailResult = { success: false }
      try {
        emailResult = await sendOtpEmail({
          to: parentEmail, otp,
          studentName: `${outpass.student.firstName} ${outpass.student.lastName}`,
          destination: outpass.destination?.place || String(outpass.destination || 'N/A'),
          leaveTime: outpass.leaveTime,
          expectedReturn: outpass.expectedReturnTime,
          hostelBlock: outpass.student?.hostelBlock || '?',
          room: outpass.student?.roomNumber || '?'
        })
      } catch (emailErr) {
        console.error('Failed to send parent OTP email:', emailErr?.message)
      }

      const sanitized = outpass.toObject ? outpass.toObject() : JSON.parse(JSON.stringify(outpass))
      if (sanitized.parentApproval) {
        delete sanitized.parentApproval.otp
        delete sanitized.parentApproval.otpExpiresAt
      }

      res.json({
        message: 'Parent verification requested',
        parentContact: parentEmail,
        otpSent: !!emailResult.success,
        outpass: sanitized
      })
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // ── Send to HOD ───────────────────────────────────────────────────────────
  async sendToHod(req, res) {
    try {
      if (!['warden', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied.' });
      }

      const { requestId } = req.params;
      const outpass = await OutpassRequest.findById(requestId)
        .populate('student', 'firstName lastName hodId');
      if (!outpass) return res.status(404).json({ message: 'Outpass request not found' });

      if (outpass.hodApprovalRequested) return res.json({ message: 'Already sent to HOD', outpass });

      outpass.hodApprovalRequested = true;
      if (outpass.student?.hodId) outpass.hod = outpass.student.hodId;
      await outpass.save();

      // ── Was emitOutpassApproved — fixed ──────────────────────────────────
      emitDashboardRefresh(['hod', 'warden', 'admin'])

      const sanitized = outpass.toObject ? outpass.toObject() : JSON.parse(JSON.stringify(outpass))
      if (sanitized.parentApproval) {
        delete sanitized.parentApproval.otp
        delete sanitized.parentApproval.otpExpiresAt
      }

      let smsResult = { success: false }
      try {
        if (outpass.hod) {
          const hodRecord = await Hod.findById(outpass.hod)
          if (hodRecord?.phone) {
            const studentName = outpass.student
              ? `${outpass.student.firstName || ''} ${outpass.student.lastName || ''}`.trim()
              : ''
            smsResult = await sendSms(
              hodRecord.phone,
              `Outpass requires your approval. Student: ${studentName}; Request: ${outpass.requestId || ''}. Leave: ${outpass.leaveTime ? new Date(outpass.leaveTime).toLocaleString() : 'N/A'}. Please review in the HOD portal.`
            )
          }
        }
      } catch (smsErr) {
        console.error('Failed to send HOD SMS:', smsErr?.message)
      }

      res.json({ message: 'Outpass sent to HOD for approval', outpass: sanitized, hodSmsSent: !!smsResult.success })
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // ── Send to counsellor ────────────────────────────────────────────────────
  async sendToCounsellor(req, res) {
    try {
      if (!['warden', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied.' });
      }

      const { requestId } = req.params;
      const outpass = await OutpassRequest.findById(requestId)
        .populate('student', 'firstName lastName counsellorId');
      if (!outpass) return res.status(404).json({ message: 'Outpass request not found' });

      if (outpass.status !== 'pending') {
        return res.status(400).json({ message: 'Only pending outpasses can be sent to counsellor' });
      }
      if (outpass.counsellorApprovalRequested) {
        return res.json({ message: 'Already sent to counsellor', outpass });
      }
      if (!outpass.student?.counsellorId) {
        return res.status(400).json({ message: 'No counsellor assigned to this student.' });
      }

      outpass.counsellorApprovalRequested = true;
      outpass.counsellor = outpass.student.counsellorId;
      outpass.status = 'counsellor_pending';
      await outpass.save();

      // ── Was emitOutpassApproved — fixed ──────────────────────────────────
      emitDashboardRefresh(['counsellor', 'warden', 'admin'])

      const sanitized = outpass.toObject();
      if (sanitized.parentApproval) {
        delete sanitized.parentApproval.otp
        delete sanitized.parentApproval.otpExpiresAt
      }

      res.json({ message: 'Outpass sent to counsellor for approval', outpass: sanitized });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // ── Parent OTP approval ───────────────────────────────────────────────────
  async parentApproveOutpass(req, res) {
    try {
      const { requestId } = req.params;
      const { otp, comments } = req.body;

      if (req.user && req.user.role && req.user.role !== 'warden') {
        return res.status(403).json({ message: 'Only wardens can submit parent OTP via this portal' });
      }

      const outpass = await OutpassRequest.findById(requestId);
      if (!outpass) return res.status(404).json({ message: 'Outpass request not found' });
      if (!outpass.parentApproval?.otp) {
        return res.status(400).json({ message: 'No parent approval request found' });
      }
      if (new Date() > new Date(outpass.parentApproval.otpExpiresAt)) {
        return res.status(400).json({ message: 'OTP expired' });
      }
      if (!otp || otp.toString() !== outpass.parentApproval.otp.toString()) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }

      outpass.parentApproval.approved = true
      outpass.parentApproval.approvedAt = new Date()
      outpass.parentApproval.comments = comments || ''
      delete outpass.parentApproval.otp
      delete outpass.parentApproval.otpExpiresAt

      if (outpass.wardenApproval?.approved) outpass.status = 'approved'
      await outpass.save()

      const student = await Student.findById(outpass.student)

      // ── Correct event for parent approval ────────────────────────────────
      emitParentApproved(outpass, student)

      const parentToken = jwt.sign(
        { sub: outpass._id.toString(), type: 'parent' },
        config.jwt.secret,
        { expiresIn: '15m' }
      )

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

  // ── Parent portal fetch ───────────────────────────────────────────────────
  async getOutpassForParentPortal(req, res) {
    try {
      const { requestId } = req.params
      let token = null
      const authHeader = req.headers.authorization
      if (authHeader?.startsWith('Bearer ')) token = authHeader.split(' ')[1]
      if (!token) token = req.query.token
      if (!token) return res.status(401).json({ message: 'Missing parent token' })

      let payload
      try { payload = jwt.verify(token, config.jwt.secret) }
      catch (_) { return res.status(401).json({ message: 'Invalid or expired token' }) }

      if (!payload || payload.type !== 'parent' || payload.sub !== requestId) {
        return res.status(403).json({ message: 'Token does not grant access to this outpass' })
      }

      const outpass = await OutpassRequest.findById(requestId)
        .populate('student', 'firstName lastName rollNumber email phoneNumber hostelBlock profilePicture')
      if (!outpass) return res.status(404).json({ message: 'Outpass not found' })
      if (!outpass.parentApproval?.approved) {
        return res.status(403).json({ message: 'Parent approval not completed' })
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