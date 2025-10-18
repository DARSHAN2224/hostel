
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
      const hodId = req.user._id;
      const outpasses = await OutpassRequest.find({ hod: hodId, hodApprovalRequested: true, 'hodApproval.approved': false, status: { $in: ['pending', 'approved_by_warden'] } }).populate('student');
      res.json({ outpasses });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
};

export default outpassController;
