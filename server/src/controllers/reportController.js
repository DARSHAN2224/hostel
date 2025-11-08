import {asyncHandler} from '../utils/asyncHandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import OutpassRequest from '../models/OutpassRequest.js'
import Student from '../models/Student.js'
import Violation from '../models/Violation.js'
import AuditLog from '../models/AuditLog.js'

/**
 * @desc    Get outpass report with filters
 * @route   GET /api/v1/reports/outpass
 * @access  Private (Admin, HOD, Warden)
 */
export const getOutpassReport = asyncHandler(async (req, res) => {
  const {
    startDate,
    endDate,
    status,
    hostel,
    department,
    year,
    outpassType
    // format = 'json' // Reserved for future PDF/Excel export
  } = req.query

  const query = {}

  // Date range filter
  if (startDate || endDate) {
    query.createdAt = {}
    if (startDate) query.createdAt.$gte = new Date(startDate)
    if (endDate) query.createdAt.$lte = new Date(endDate)
  }

  // Status filter
  if (status) {
    query.status = status
  }

  // Outpass type filter
  if (outpassType) {
    query.outpassType = outpassType
  }

  const outpasses = await OutpassRequest.find(query)
    .populate('student', 'firstName lastName rollNumber department year hostel')
    .populate('hodApproval.approvedBy', 'name')
    .populate('wardenApproval.approvedBy', 'name')
    .sort({ createdAt: -1 })
    .lean()

  // Additional filtering
  let filteredOutpasses = outpasses

  if (hostel) {
    filteredOutpasses = filteredOutpasses.filter(
      o => o.student?.hostel === hostel
    )
  }

  if (department) {
    filteredOutpasses = filteredOutpasses.filter(
      o => o.student?.department === department
    )
  }

  if (year) {
    filteredOutpasses = filteredOutpasses.filter(
      o => o.student?.year === Number.parseInt(year, 10)
    )
  }

  // Calculate statistics
  const stats = {
    total: filteredOutpasses.length,
    byStatus: {
      pending: filteredOutpasses.filter(o => o.status === 'pending').length,
      approved: filteredOutpasses.filter(o => o.status === 'approved').length,
      rejected: filteredOutpasses.filter(o => o.status === 'rejected').length,
      cancelled: filteredOutpasses.filter(o => o.status === 'cancelled').length
    },
    byType: {
      local: filteredOutpasses.filter(o => o.outpassType === 'local').length,
      onDuty: filteredOutpasses.filter(o => o.outpassType === 'onDuty').length,
      homeVisit: filteredOutpasses.filter(o => o.outpassType === 'homeVisit').length,
      medical: filteredOutpasses.filter(o => o.outpassType === 'medical').length,
      other: filteredOutpasses.filter(o => o.outpassType === 'other').length
    }
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, {
        outpasses: filteredOutpasses,
        stats,
        filters: {
          startDate,
          endDate,
          status,
          hostel,
          department,
          year,
          outpassType
        }
      }, 'Outpass report generated successfully')
    )
})

/**
 * @desc    Get violation report with filters
 * @route   GET /api/v1/reports/violations
 * @access  Private (Admin, Warden, Security)
 */
export const getViolationReport = asyncHandler(async (req, res) => {
  const {
    startDate,
    endDate,
    severity,
    status,
    hostel,
    department
    // format = 'json' // Reserved for future PDF/Excel export
  } = req.query

  const query = {}

  // Date range filter
  if (startDate || endDate) {
    query.createdAt = {}
    if (startDate) query.createdAt.$gte = new Date(startDate)
    if (endDate) query.createdAt.$lte = new Date(endDate)
  }

  // Severity filter
  if (severity) {
    query.severity = severity
  }

  // Status filter
  if (status) {
    query.status = status
  }

  const violations = await Violation.find(query)
    .populate('student', 'firstName lastName rollNumber department year hostel')
    .populate('reportedBy', 'name role')
    .populate('resolvedBy', 'name')
    .sort({ createdAt: -1 })
    .lean()

  // Additional filtering
  let filteredViolations = violations

  if (hostel) {
    filteredViolations = filteredViolations.filter(
      v => v.student?.hostel === hostel
    )
  }

  if (department) {
    filteredViolations = filteredViolations.filter(
      v => v.student?.department === department
    )
  }

  // Calculate statistics
  const stats = {
    total: filteredViolations.length,
    bySeverity: {
      low: filteredViolations.filter(v => v.severity === 'low').length,
      medium: filteredViolations.filter(v => v.severity === 'medium').length,
      high: filteredViolations.filter(v => v.severity === 'high').length,
      critical: filteredViolations.filter(v => v.severity === 'critical').length
    },
    byStatus: {
      pending: filteredViolations.filter(v => v.status === 'pending').length,
      acknowledged: filteredViolations.filter(v => v.status === 'acknowledged').length,
      resolved: filteredViolations.filter(v => v.status === 'resolved').length,
      escalated: filteredViolations.filter(v => v.status === 'escalated').length
    }
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, {
        violations: filteredViolations,
        stats,
        filters: {
          startDate,
          endDate,
          severity,
          status,
          hostel,
          department
        }
      }, 'Violation report generated successfully')
    )
})

/**
 * @desc    Get student activity report
 * @route   GET /api/v1/reports/student-activity
 * @access  Private (Admin, Warden)
 */
export const getStudentActivityReport = asyncHandler(async (req, res) => {
  const {
    startDate,
    endDate,
    hostel,
    department,
    year
    // format = 'json' // Reserved for future PDF/Excel export
  } = req.query

  const dateFilter = {}
  if (startDate || endDate) {
    dateFilter.createdAt = {}
    if (startDate) dateFilter.createdAt.$gte = new Date(startDate)
    if (endDate) dateFilter.createdAt.$lte = new Date(endDate)
  }

  const studentQuery = {}
  if (hostel) studentQuery.hostel = hostel
  if (department) studentQuery.department = department
  if (year) studentQuery.year = Number.parseInt(year, 10)

  const students = await Student.find(studentQuery)
    .select('firstName lastName rollNumber department year hostel')
    .lean()

  const studentIds = students.map(s => s._id)

  // Get outpass counts
  const outpassCounts = await OutpassRequest.aggregate([
    {
      $match: {
        student: { $in: studentIds },
        ...dateFilter
      }
    },
    {
      $group: {
        _id: '$student',
        total: { $sum: 1 },
        approved: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        rejected: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        }
      }
    }
  ])

  // Get violation counts
  const violationCounts = await Violation.aggregate([
    {
      $match: {
        student: { $in: studentIds },
        ...dateFilter
      }
    },
    {
      $group: {
        _id: '$student',
        total: { $sum: 1 },
        low: {
          $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] }
        },
        medium: {
          $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] }
        },
        high: {
          $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
        },
        critical: {
          $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
        }
      }
    }
  ])

  // Create maps for quick lookup
  const outpassMap = new Map(
    outpassCounts.map(o => [o._id.toString(), o])
  )
  const violationMap = new Map(
    violationCounts.map(v => [v._id.toString(), v])
  )

  // Combine data
  const report = students.map(student => {
    const studentIdStr = student._id.toString()
    const outpassData = outpassMap.get(studentIdStr) || {
      total: 0,
      approved: 0,
      rejected: 0,
      pending: 0
    }
    const violationData = violationMap.get(studentIdStr) || {
      total: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    }

    return {
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        rollNumber: student.rollNumber,
        department: student.department,
        year: student.year,
        hostel: student.hostel
      },
      outpasses: outpassData,
      violations: violationData
    }
  })

  res
    .status(200)
    .json(
      new ApiResponse(200, {
        report,
        filters: {
          startDate,
          endDate,
          hostel,
          department,
          year
        }
      }, 'Student activity report generated successfully')
    )
})

/**
 * @desc    Get audit log report
 * @route   GET /api/v1/reports/audit-logs
 * @access  Private (Admin)
 */
export const getAuditLogReport = asyncHandler(async (req, res) => {
  const {
    startDate,
    endDate,
    action,
    entity,
    userId
    // format = 'json' // Reserved for future PDF/Excel export
  } = req.query

  const query = {}

  // Date range filter
  if (startDate || endDate) {
    query.timestamp = {}
    if (startDate) query.timestamp.$gte = new Date(startDate)
    if (endDate) query.timestamp.$lte = new Date(endDate)
  }

  // Action filter
  if (action) {
    query.action = action
  }

  // Entity filter
  if (entity) {
    query.entity = entity
  }

  // User filter
  if (userId) {
    query.userId = userId
  }

  const auditLogs = await AuditLog.find(query)
    .populate('userId', 'name email role')
    .sort({ timestamp: -1 })
    .lean()

  // Calculate statistics
  const stats = {
    total: auditLogs.length,
    byAction: {},
    byEntity: {},
    byUser: {}
  }

  for (const log of auditLogs) {
    // Count by action
    stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1
    
    // Count by entity
    stats.byEntity[log.entity] = (stats.byEntity[log.entity] || 0) + 1
    
    // Count by user
    const userName = log.userId?.name || 'Unknown'
    stats.byUser[userName] = (stats.byUser[userName] || 0) + 1
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, {
        auditLogs,
        stats,
        filters: {
          startDate,
          endDate,
          action,
          entity,
          userId
        }
      }, 'Audit log report generated successfully')
    )
})

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/v1/reports/dashboard-stats
 * @access  Private (Admin, HOD, Warden)
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query

  const dateFilter = {}
  if (startDate || endDate) {
    dateFilter.createdAt = {}
    if (startDate) dateFilter.createdAt.$gte = new Date(startDate)
    if (endDate) dateFilter.createdAt.$lte = new Date(endDate)
  }

  const [
    totalStudents,
    totalOutpasses,
    activeOutpasses,
    totalViolations,
    unresolvedViolations,
    outpassByStatus,
    violationBySeverity,
    recentActivity
  ] = await Promise.all([
    Student.countDocuments({ status: 'active' }),
    OutpassRequest.countDocuments(dateFilter),
    OutpassRequest.countDocuments({
      status: 'approved',
      'exit.exitTime': { $exists: true },
      'return.returnTime': { $exists: false }
    }),
    Violation.countDocuments(dateFilter),
    Violation.countDocuments({ status: { $ne: 'resolved' } }),
    OutpassRequest.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Violation.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]),
    AuditLog.find(dateFilter)
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('userId', 'name role')
      .lean()
  ])

  res
    .status(200)
    .json(
      new ApiResponse(200, {
        overview: {
          totalStudents,
          totalOutpasses,
          activeOutpasses,
          totalViolations,
          unresolvedViolations
        },
        outpassByStatus,
        violationBySeverity,
        recentActivity,
        filters: { startDate, endDate }
      }, 'Dashboard statistics retrieved successfully')
    )
})
