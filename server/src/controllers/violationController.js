import Violation from '../models/Violation.js'
import Student from '../models/Student.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'

/**
 * @desc    Create a new violation report
 * @route   POST /api/v1/violations
 * @access  Private (Security, Warden, Admin, HOD)
 */
export const createViolation = asyncHandler(async (req, res) => {
  const { studentId, outpassId, violationType, severity, description, evidence } = req.body

  // Validate student exists
  const student = await Student.findById(studentId)
  if (!student) {
    return res.status(404).json(new ApiResponse(404, null, 'Student not found'))
  }

  // Determine reporter model based on user role
  const reporterModelMap = {
    security: 'Security',
    warden: 'Warden',
    admin: 'Admin',
    hod: 'Hod',
  }

  const violation = await Violation.create({
    student: studentId,
    outpass: outpassId,
    violationType,
    severity: severity || 'medium',
    description,
    reportedBy: req.user.id,
    reporterModel: reporterModelMap[req.user.role],
    evidence: evidence || [],
  })

  await violation.populate('student', 'name rollNumber email')
  await violation.populate('reportedBy')

  res.status(201).json(new ApiResponse(201, violation, 'Violation reported successfully'))
})

/**
 * @desc    Get all violations (with filters)
 * @route   GET /api/v1/violations
 * @access  Private (Warden, Admin, HOD)
 */
export const getViolations = asyncHandler(async (req, res) => {
  const { status, severity, studentId, violationType, limit = 50, skip = 0 } = req.query

  const query = {}
  if (status) query.status = status
  if (severity) query.severity = severity
  if (studentId) query.student = studentId
  if (violationType) query.violationType = violationType

  const violations = await Violation.find(query)
    .populate('student', 'name rollNumber email phoneNumber hostelType roomNumber')
    .populate('reportedBy')
    .populate('resolvedBy')
    .populate('outpass', 'outpassType fromDate toDate status')
    .sort({ createdAt: -1 })
    .limit(Number.parseInt(limit))
    .skip(Number.parseInt(skip))

  const total = await Violation.countDocuments(query)

  res.json(
    new ApiResponse(
      200,
      {
        violations,
        pagination: {
          total,
          limit: Number.parseInt(limit),
          skip: Number.parseInt(skip),
          hasMore: total > Number.parseInt(skip) + Number.parseInt(limit),
        },
      },
      'Violations fetched successfully'
    )
  )
})

/**
 * @desc    Get pending violations
 * @route   GET /api/v1/violations/pending
 * @access  Private (Warden, Admin, HOD)
 */
export const getPendingViolations = asyncHandler(async (req, res) => {
  const violations = await Violation.getPendingViolations()

  res.json(new ApiResponse(200, violations, 'Pending violations fetched successfully'))
})

/**
 * @desc    Get student violations
 * @route   GET /api/v1/violations/student/:studentId
 * @access  Private (Student can view own, others restricted)
 */
export const getStudentViolations = asyncHandler(async (req, res) => {
  const { studentId } = req.params

  // Students can only view their own violations
  if (req.user.role === 'student' && req.user.id !== studentId) {
    return res.status(403).json(new ApiResponse(403, null, 'Access denied'))
  }

  const violations = await Violation.getStudentViolations(studentId)

  res.json(new ApiResponse(200, violations, 'Student violations fetched successfully'))
})

/**
 * @desc    Get violation statistics
 * @route   GET /api/v1/violations/statistics
 * @access  Private (Warden, Admin, HOD)
 */
export const getViolationStatistics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query

  const stats = await Violation.getViolationStats({ startDate, endDate })

  const result = stats[0] || {
    total: 0,
    pending: 0,
    resolved: 0,
    dismissed: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  }

  res.json(new ApiResponse(200, result, 'Violation statistics fetched successfully'))
})

/**
 * @desc    Resolve a violation
 * @route   PUT /api/v1/violations/:id/resolve
 * @access  Private (Warden, Admin, HOD)
 */
export const resolveViolation = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { actionTaken } = req.body

  const violation = await Violation.findById(id)
  if (!violation) {
    return res.status(404).json(new ApiResponse(404, null, 'Violation not found'))
  }

  const resolverModelMap = {
    warden: 'Warden',
    admin: 'Admin',
    hod: 'Hod',
  }

  await violation.resolve(req.user.id, resolverModelMap[req.user.role], actionTaken)

  await violation.populate('student', 'name rollNumber email')
  await violation.populate('reportedBy')
  await violation.populate('resolvedBy')

  res.json(new ApiResponse(200, violation, 'Violation resolved successfully'))
})

/**
 * @desc    Dismiss a violation
 * @route   PUT /api/v1/violations/:id/dismiss
 * @access  Private (Warden, Admin, HOD)
 */
export const dismissViolation = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { reason } = req.body

  const violation = await Violation.findById(id)
  if (!violation) {
    return res.status(404).json(new ApiResponse(404, null, 'Violation not found'))
  }

  const resolverModelMap = {
    warden: 'Warden',
    admin: 'Admin',
    hod: 'Hod',
  }

  await violation.dismiss(req.user.id, resolverModelMap[req.user.role], reason)

  await violation.populate('student', 'name rollNumber email')
  await violation.populate('reportedBy')
  await violation.populate('resolvedBy')

  res.json(new ApiResponse(200, violation, 'Violation dismissed successfully'))
})

/**
 * @desc    Add note to violation
 * @route   POST /api/v1/violations/:id/notes
 * @access  Private (Security, Warden, Admin, HOD)
 */
export const addViolationNote = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { text } = req.body

  const violation = await Violation.findById(id)
  if (!violation) {
    return res.status(404).json(new ApiResponse(404, null, 'Violation not found'))
  }

  const noteModelMap = {
    security: 'Security',
    warden: 'Warden',
    admin: 'Admin',
    hod: 'Hod',
  }

  await violation.addNote(text, req.user.id, noteModelMap[req.user.role])

  res.json(new ApiResponse(200, violation, 'Note added successfully'))
})
