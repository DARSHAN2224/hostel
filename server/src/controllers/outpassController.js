
import OutpassRequest from '../models/OutpassRequest.js';
import Student from '../models/Student.js';
import Hod from '../models/Hod.js';
import { AppError } from '../middleware/errorHandler.js';


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
      if (req.user.role !== 'warden') {
        return res.status(403).json({ message: 'Access denied' });
      }
      const outpasses = await OutpassRequest.find({ warden: req.user._id })
        .populate('student', 'firstName lastName rollNumber email department')
        .sort({ createdAt: -1 });
      res.json({ outpasses, count: outpasses.length });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Warden: Approve outpass request
  async wardenApproveOutpass(req, res) {
    try {
      if (req.user.role !== 'warden') {
        return res.status(403).json({ message: 'Access denied' });
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
      
      // If HOD approval is not requested, mark as approved
      if (!outpass.hodApprovalRequested) {
        outpass.status = 'approved';
      } else {
        outpass.status = 'approved_by_warden';
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
      if (req.user.role !== 'warden') {
        return res.status(403).json({ message: 'Access denied' });
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
  }
};

export default outpassController;
