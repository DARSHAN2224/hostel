/**
 * Student Controller
 * 
 * OOP Flow: HTTP Request -> Controller -> Service -> Repository -> Database
 * 
 * Controller Responsibilities:
 * - Handle HTTP requests and responses
 * - Validate request data (basic validation)
 * - Call appropriate Service methods
 * - Send formatted responses
 * - Handle errors (pass to error middleware)
 * 
 * Controller should NOT:
 * - Contain business logic (that's in Service)
 * - Access database directly (that's in Repository)
 * - Have complex calculations (that's in Service)
 */

import StudentService from '../services/StudentService.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { ValidationError } from '../utils/customErrors.js'
import { ApiResponse } from '../utils/ApiResponse.js'

class StudentController {
  // Note: Registration and login are handled by unified auth endpoints.
  // This controller now focuses on student profile and admin/warden operations.

  /**
   * Logout student
   * POST /api/v1/students/logout
   */
  logout = asyncHandler(async (req, res) => {
    res.clearCookie('token')

    res.json(
      new ApiResponse(200, null, 'Logged out successfully')
    )
  })

  /**
   * Get current student profile
   * GET /api/v1/students/profile
   */
  getProfile = asyncHandler(async (req, res) => {
    // req.user.id is set by auth middleware
    const student = await StudentService.getStudentById(req.user.id)

    res.json(
      new ApiResponse(200, student, 'Profile retrieved successfully')
    )
  })

  /**
   * Get profile completion status
   * GET /api/v1/students/profile/completion-status
   */
  getProfileCompletionStatus = asyncHandler(async (req, res) => {
    const student = await StudentService.getStudentById(req.user.id)
    
    const completionStatus = {
      isCompleted: student.profileCompleted,
      missingFields: [],
      completedFields: [],
      adminManagedFields: {
        parentDetailsAdded: !!(student.parentDetails?.guardianPhone),
      },
    }

    // Check optional fields (excluding parent details - admin managed)
    const optionalFields = {
      dateOfBirth: 'Date of Birth',
      gender: 'Gender',
      bloodGroup: 'Blood Group',
      'permanentAddress.city': 'City',
      'permanentAddress.state': 'State',
      'permanentAddress.zipCode': 'ZIP Code',
      'emergencyContact.name': 'Emergency Contact Name',
      'emergencyContact.phone': 'Emergency Contact Phone',
    }

    Object.entries(optionalFields).forEach(([field, label]) => {
      const keys = field.split('.')
      let value = student
      for (const key of keys) {
        value = value?.[key]
      }
      
      if (value) {
        completionStatus.completedFields.push(label)
      } else {
        completionStatus.missingFields.push(label)
      }
    })

    res.json(
      new ApiResponse(200, completionStatus, 'Profile completion status retrieved')
    )
  })

  /**
   * Get student by ID (Admin/Warden only)
   * GET /api/v1/students/:id
   */
  getStudentById = asyncHandler(async (req, res) => {
    const student = await StudentService.getStudentById(req.params.id)

    res.json(
      new ApiResponse(200, student, 'Student retrieved successfully')
    )
  })

  /**
   * Get student by student ID (Admin/Warden only)
   * GET /api/v1/students/by-student-id/:studentId
   */
  getStudentByStudentId = asyncHandler(async (req, res) => {
    const student = await StudentService.getStudentByStudentId(req.params.studentId)

    res.json(
      new ApiResponse(200, student, 'Student retrieved successfully')
    )
  })

  /**
   * Get all students with filters (Admin/Warden only)
   * GET /api/v1/students?hostelBlock=A&course=CSE&year=2&page=1&limit=20
   */
  getAllStudents = asyncHandler(async (req, res) => {
    const role = req.user?.role
const filters = {
  hostelBlock: req.query.hostelBlock,
  course: req.query.course,
  year: req.query.year ? parseInt(req.query.year) : undefined,
  yearOfStudy: req.query.yearOfStudy ? parseInt(req.query.yearOfStudy) : undefined,
  status: req.query.status
}

if (role === 'warden') {
  // Warden only sees students assigned to them (set during student creation)
  filters.wardenId = req.user.id
} else if (role === 'counsellor') {
  // Counsellor only sees students assigned to them
  filters.counsellorId = req.user.id
} else if (role === 'hod') {
  // HOD sees students in their department + hostelType
  const { default: Hod } = await import('../models/Hod.js')
  const hod = await Hod.findById(req.user.id)
  if (hod) {
    filters.department = hod.department
    if (hod.hostelType) filters.hostelType = hod.hostelType
  }
}

    const options = {
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort
    }

    const result = await StudentService.getAllStudents(filters, options)
      let students = result.students
      // If requester is admin, attach any stored generated passwords for students
      if (req.user?.role === 'admin' && Array.isArray(students) && students.length > 0) {
        try {
          const ids = students.map(s => s._id)
          const { default: Credential } = await import('../models/Credential.js')
          const creds = await Credential.find({ userId: { $in: ids } })
          const credMap = {}
          creds.forEach(c => { credMap[String(c.userId)] = c.password })
          students = students.map(s => ({ ...s.toObject ? s.toObject() : s, generatedPassword: credMap[s._id] || undefined }))
        } catch (attachErr) {
          console.warn('Failed to attach student credentials:', attachErr)
        }
      }

      res.json(
        new ApiResponse(200, { students, pagination: result.pagination }, 'Students retrieved successfully')
      )
  })

  /**
   * Update student profile
   * PATCH /api/v1/students/profile
   */
  updateProfile = asyncHandler(async (req, res) => {
    const student = await StudentService.updateProfile(req.user.id, req.body)

    res.json(
      new ApiResponse(200, student, 'Profile updated successfully')
    )
  })

  /**
   * Change password
   * POST /api/v1/students/change-password
   */
  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      throw new ValidationError('Please provide current password and new password')
    }

    if (newPassword.length < 6) {
      throw new ValidationError('New password must be at least 6 characters')
    }

    const result = await StudentService.changePassword(req.user.id, currentPassword, newPassword)

    // If service returned updated student, include it so clients can refresh
    res.json(
      new ApiResponse(200, { user: result?.student || null, mustChangePassword: false }, 'Password changed successfully')
    )
  })

  /**
   * Suspend student (Admin/Warden only)
   * POST /api/v1/students/:id/suspend
   */
  suspendStudent = asyncHandler(async (req, res) => {
    const { reason } = req.body

    if (!reason) {
      throw new ValidationError('Please provide suspension reason')
    }

    const student = await StudentService.suspendStudent(req.params.id, reason)

    res.json(
      new ApiResponse(200, student, 'Student suspended successfully')
    )
  })

  /**
   * Activate student (Admin/Warden only)
   * POST /api/v1/students/:id/activate
   */
  activateStudent = asyncHandler(async (req, res) => {
    const student = await StudentService.activateStudent(req.params.id)

    res.json(
      new ApiResponse(200, student, 'Student activated successfully')
    )
  })

  /**
   * Search students (Admin/Warden only)
   * GET /api/v1/students/search?q=john&limit=10
   */
  searchStudents = asyncHandler(async (req, res) => {
    const { q, limit } = req.query

    if (!q) {
      throw new ValidationError('Please provide search term')
    }

    const students = await StudentService.searchStudents(q, { limit })

    res.json(
      new ApiResponse(200, { count: students.length, students }, 'Students found')
    )
  })

  /**
   * Get statistics (Admin/Warden only)
   * GET /api/v1/students/statistics
   */
  getStatistics = asyncHandler(async (req, res) => {
    const stats = await StudentService.getStatistics()

    res.json(
      new ApiResponse(200, stats, 'Statistics retrieved successfully')
    )
  })

  /**
   * Check if student can request outpass
   * GET /api/v1/students/can-request-outpass
   */
  canRequestOutpass = asyncHandler(async (req, res) => {
    const eligibility = await StudentService.canRequestOutpass(req.user.id)

    res.json(
      new ApiResponse(200, eligibility, 'Eligibility checked successfully')
    )
  })

  /**
   * Update student parent details (Admin/Warden only)
   * PATCH /api/v1/students/:id/parent-details
   */
  updateParentDetails = asyncHandler(async (req, res) => {
    const { id } = req.params
    const { parentDetails } = req.body

    const result = await StudentService.updateParentDetails(
      id, 
      parentDetails,
      req.user.id,
      req.user.role
    )

    res.json(
      new ApiResponse(200, result, 'Parent details updated successfully')
    )
  })
  /**
 * Assign counsellor to student (Admin only)
 * POST /api/v1/students/:id/assign-counsellor
 */
assignCounsellor = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { counsellorId } = req.body

  const student = await (await import('../models/Student.js')).default.findById(id)
  if (!student) throw new ValidationError('Student not found')

  if (counsellorId) {
    const counsellor = await (await import('../models/Counsellor.js')).default.findById(counsellorId)
    if (!counsellor) throw new ValidationError('Counsellor not found')
  }

  student.counsellorId = counsellorId || undefined
  await student.save({ validateBeforeSave: false })

  res.json(new ApiResponse(200, student, 'Counsellor assigned successfully'))
})

/**
 * Assign HOD to student (Admin only)
 * POST /api/v1/students/:id/assign-hod
 */
assignHod = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { hodId } = req.body

  const student = await (await import('../models/Student.js')).default.findById(id)
  if (!student) throw new ValidationError('Student not found')

  if (hodId) {
    const hod = await (await import('../models/Hod.js')).default.findById(hodId)
    if (!hod) throw new ValidationError('HOD not found')
  }

  student.hodId = hodId || undefined
  await student.save({ validateBeforeSave: false })

  res.json(new ApiResponse(200, student, 'HOD assigned successfully'))
})

/**
 * Assign Warden to student (Admin only)
 * POST /api/v1/students/:id/assign-warden
 */
assignWarden = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { wardenId } = req.body

  const student = await (await import('../models/Student.js')).default.findById(id)
  if (!student) throw new ValidationError('Student not found')

  if (wardenId) {
    const warden = await (await import('../models/Warden.js')).default.findById(wardenId)
    if (!warden) throw new ValidationError('Warden not found')
  }

  student.wardenId = wardenId || undefined
  await student.save({ validateBeforeSave: false })

  res.json(new ApiResponse(200, student, 'Warden assigned successfully'))
})
}

// Export as singleton
export default new StudentController()
