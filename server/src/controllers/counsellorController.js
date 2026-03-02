import Counsellor from '../models/Counsellor.js'
import Student from '../models/Student.js'
import OutpassRequest from '../models/OutpassRequest.js'

const counsellorController = {

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  // GET /api/v1/counsellors/dashboard
  // Returns pending college-hours outpasses + stats for the counsellor's department
  async getDashboard(req, res) {
    try {
      if (req.user.role !== 'counsellor') {
        return res.status(403).json({ message: 'Access denied' })
      }

      const counsellorId = req.user.id
      const counsellor   = await Counsellor.findById(counsellorId)
      if (!counsellor) {
        return res.status(404).json({ message: 'Counsellor not found' })
      }
      const hostelFilter = counsellor.hostelType ? { hostelType: counsellor.hostelType } : {}
      // Pending college-hours outpasses waiting for this counsellor's approval
      const pendingOutpasses = await OutpassRequest.find({
        counsellor:              counsellorId,
        counsellorApprovalRequested: true,
        'counsellorApproval.approved': false,
        status: { $in: ['pending', 'counsellor_pending'] }
      }).populate('student', 'firstName lastName rollNumber email department')
        .sort({ createdAt: -1 })

      // Total students assigned to this counsellor
      const totalStudents = await Student.countDocuments({
  counsellorId: counsellorId,
  ...hostelFilter
})

      // Year-wise distribution of assigned students
      const yearAgg = await Student.aggregate([
        { $match: { counsellorId: counsellor._id, ...hostelFilter } },
        { $group: { _id: '$yearOfStudy', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
      const yearDistribution = yearAgg.map(y => ({ yearOfStudy: y._id, count: y.count }))

      // Count of approved outpasses by this counsellor
      const approvedCount = await OutpassRequest.countDocuments({
        counsellor: counsellorId,
        'counsellorApproval.approved': true
      })

      // Count of rejected outpasses by this counsellor
      const rejectedCount = await OutpassRequest.countDocuments({
        counsellor: counsellorId,
        status: 'rejected_by_counsellor'
      })

      res.json({
        department: counsellor.department,
        counsellor: counsellor.toJSON(),
        statistics: {
          totalStudents,
          pendingOutpasses:   pendingOutpasses.length,
          approvedOutpasses:  approvedCount,
          rejectedOutpasses:  rejectedCount,
          yearDistribution
        },
        pendingOutpasses
      })
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message })
    }
  },

  // ─── Outpass approval ──────────────────────────────────────────────────────

  // POST /api/v1/counsellors/approve/:requestId
  // Counsellor approves a college-hours outpass request
  async approveOutpass(req, res) {
    try {
      if (req.user.role !== 'counsellor') {
        return res.status(403).json({ message: 'Access denied. Only counsellors can approve via this endpoint.' })
      }

      const { requestId } = req.params
      const { comments }  = req.body

      const outpass = await OutpassRequest.findById(requestId)
      if (!outpass) {
        return res.status(404).json({ message: 'Outpass request not found' })
      }

      // Ensure the request actually belongs to this counsellor
      if (!outpass.counsellor || outpass.counsellor.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized for this outpass request' })
      }

      if (!outpass.counsellorApprovalRequested) {
        return res.status(400).json({ message: 'Counsellor approval was not requested for this outpass' })
      }

      if (outpass.counsellorApproval && outpass.counsellorApproval.approved) {
        return res.status(400).json({ message: 'Counsellor has already approved this outpass' })
      }

      outpass.counsellorApproval = {
        approved:   true,
        approvedAt: new Date(),
        approvedBy: req.user.id,
        comments:   comments || ''
      }
      // After counsellor approval, move to warden for final approval
      outpass.status = 'counsellor_approved'
      await outpass.save()

      // Update counsellor's own stats
      try {
        const counsellor = await Counsellor.findById(req.user.id)
        if (counsellor) await counsellor.processOutpass('approve')
      } catch (statsErr) {
        console.warn('Failed to update counsellor outpass stats:', statsErr.message)
      }

      res.json({ message: 'Outpass approved by counsellor', outpass })
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message })
    }
  },

  // POST /api/v1/counsellors/reject/:requestId
  // Counsellor rejects a college-hours outpass request
  async rejectOutpass(req, res) {
    try {
      if (req.user.role !== 'counsellor') {
        return res.status(403).json({ message: 'Access denied. Only counsellors can reject via this endpoint.' })
      }

      const { requestId } = req.params
      const { reason }    = req.body

      if (!reason) {
        return res.status(400).json({ message: 'Rejection reason is required' })
      }

      const outpass = await OutpassRequest.findById(requestId)
      if (!outpass) {
        return res.status(404).json({ message: 'Outpass request not found' })
      }

      if (!outpass.counsellor || outpass.counsellor.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized for this outpass request' })
      }

      outpass.counsellorApproval = {
        approved:   false,
        approvedAt: new Date(),
        approvedBy: req.user.id,
        comments:   reason
      }
      outpass.status          = 'rejected_by_counsellor'
      outpass.rejectionReason = reason
      outpass.rejectedAt      = new Date()
      outpass.rejectedBy      = req.user.id
      outpass.rejectedByModel = 'Counsellor'
      await outpass.save()

      // Decrement student's activeOutpasses
      try {
        const stud = await Student.findById(outpass.student)
        if (stud && stud.activeOutpasses > 0) {
          stud.activeOutpasses = Math.max(0, stud.activeOutpasses - 1)
          await stud.save({ validateBeforeSave: false })
        }
      } catch (decErr) {
        console.warn('Failed to decrement student.activeOutpasses on counsellor reject:', decErr.message)
      }

      // Update counsellor's own stats
      try {
        const counsellor = await Counsellor.findById(req.user.id)
        if (counsellor) await counsellor.processOutpass('reject')
      } catch (statsErr) {
        console.warn('Failed to update counsellor outpass stats:', statsErr.message)
      }

      res.json({ message: 'Outpass rejected by counsellor', outpass })
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message })
    }
  },

  // GET /api/v1/counsellors/outpasses
  // Returns all outpasses assigned to this counsellor (with optional status filter)
  async getOutpasses(req, res) {
    try {
      if (req.user.role !== 'counsellor') {
        return res.status(403).json({ message: 'Access denied' })
      }

      const query = { counsellor: req.user.id }
      if (req.query.status && req.query.status !== 'all') {
        query.status = req.query.status
      }

      const outpasses = await OutpassRequest.find(query)
        .populate('student', 'firstName lastName rollNumber email department hostelBlock')
        .sort({ createdAt: -1 })

      res.json({ outpasses, count: outpasses.length })
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message })
    }
  },

  // ─── Student management ────────────────────────────────────────────────────

  // GET /api/v1/counsellors/students
  // Returns all students assigned to this counsellor
  async getStudents(req, res) {
    try {
      if (req.user.role !== 'counsellor') {
        return res.status(403).json({ message: 'Access denied' })
      }

      const counsellor = await Counsellor.findById(req.user.id)
const hostelFilter = counsellor?.hostelType ? { hostelType: counsellor.hostelType } : {}
const students = await Student.find({ counsellorId: req.user.id, ...hostelFilter })
        .select('-password -passwordResetToken -emailVerificationToken')
        .sort({ firstName: 1 })

      res.json({ students, count: students.length })
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message })
    }
  },

  // ─── Profile ──────────────────────────────────────────────────────────────

  // GET /api/v1/counsellors/profile
  async getProfile(req, res) {
    try {
      const counsellor = await Counsellor.findById(req.user.id)
      if (!counsellor) {
        return res.status(404).json({ message: 'Counsellor not found' })
      }
      res.json({ counsellor: counsellor.toJSON() })
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message })
    }
  },

  // PATCH /api/v1/counsellors/profile
  async updateProfile(req, res) {
    try {
      const allowedFields = ['firstName', 'lastName', 'phone', 'collegeHoursStart', 'collegeHoursEnd']
      const updates = {}
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) updates[field] = req.body[field]
      })

      const counsellor = await Counsellor.findByIdAndUpdate(
        req.user.id,
        updates,
        { new: true, runValidators: true }
      )
      if (!counsellor) {
        return res.status(404).json({ message: 'Counsellor not found' })
      }
      res.json({ message: 'Profile updated successfully', counsellor: counsellor.toJSON() })
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message })
    }
  },

  // ─── Admin: CRUD for counsellors ──────────────────────────────────────────

  // GET /api/v1/counsellors   (admin only)
  async getAllCounsellors(req, res) {
    try {
      const query = {}
      if (req.query.department) query.department = req.query.department
      if (req.query.status)     query.status     = req.query.status
      if (req.query.hostelType) query.hostelType = req.query.hostelType

      const counsellors = await Counsellor.find(query).sort({ firstName: 1 })
      res.json({ counsellors, count: counsellors.length })
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message })
    }
  },

  // GET /api/v1/counsellors/:id   (admin only)
  async getCounsellorById(req, res) {
    try {
      const counsellor = await Counsellor.findById(req.params.id)
      if (!counsellor) {
        return res.status(404).json({ message: 'Counsellor not found' })
      }
      res.json({ counsellor: counsellor.toJSON() })
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message })
    }
  },

  // PATCH /api/v1/counsellors/:id   (admin only)
  async updateCounsellor(req, res) {
    try {
      const allowedFields = [
  'firstName', 'lastName', 'phone', 'department',
  'hostelType', 'status', 'collegeHoursStart', 'collegeHoursEnd'
]
      const updates = {}
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) updates[field] = req.body[field]
      })
      updates.updatedBy = req.user.id

      const counsellor = await Counsellor.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true }
      )
      if (!counsellor) {
        return res.status(404).json({ message: 'Counsellor not found' })
      }
      res.json({ message: 'Counsellor updated successfully', counsellor: counsellor.toJSON() })
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message })
    }
  },

  // DELETE /api/v1/counsellors/:id   (admin only)
  async deleteCounsellor(req, res) {
    try {
      const counsellor = await Counsellor.findByIdAndDelete(req.params.id)
      if (!counsellor) {
        return res.status(404).json({ message: 'Counsellor not found' })
      }
      // Remove counsellorId reference from assigned students
      await Student.updateMany(
        { counsellorId: req.params.id },
        { $unset: { counsellorId: '' } }
      )
      res.json({ message: 'Counsellor deleted successfully' })
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message })
    }
  },

  // GET /api/v1/counsellors/stats   (admin only)
  async getStats(req, res) {
    try {
      const stats = await Counsellor.getStats()
      res.json({ stats })
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message })
    }
  }
}

export default counsellorController