import asyncHandler from 'express-async-handler'
import { OutpassRequest, Student, Violation, OutpassLog } from '../models/index.js'
import { ApiResponse } from '../utils/ApiResponse.js'

/**
 * @desc    Get security dashboard statistics
 * @route   GET /api/v1/security/dashboard/stats
 * @access  Private (Security)
 */
export const getSecurityDashboardStats = asyncHandler(async (req, res) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Students currently out
  const studentsOut = await OutpassRequest.countDocuments({
    exitTime: { $exists: true },
    returnTime: { $exists: false },
    status: { $in: ['approved_by_warden', 'approved_by_hod'] },
  })

  // Exits today
  const exitsToday = await OutpassRequest.countDocuments({
    exitTime: { $gte: today, $lt: tomorrow },
  })

  // Returns today
  const returnsToday = await OutpassRequest.countDocuments({
    returnTime: { $gte: today, $lt: tomorrow },
  })

  // Overdue returns
  const now = new Date()
  const overdueReturns = await OutpassRequest.countDocuments({
    exitTime: { $exists: true },
    returnTime: { $exists: false },
    toDate: { $lt: now },
    status: { $in: ['approved_by_warden', 'approved_by_hod'] },
  })

  // Pending outpasses (approved but not exited yet)
  const pendingExits = await OutpassRequest.countDocuments({
    status: { $in: ['approved_by_warden', 'approved_by_hod'] },
    exitTime: { $exists: false },
    fromDate: { $lte: tomorrow },
  })

  // Recent activity
  const recentActivity = await OutpassRequest.find({
    $or: [
      { exitTime: { $gte: today } },
      { returnTime: { $gte: today } }
    ]
  })
    .populate('student', 'firstName lastName rollNumber hostelBlock profilePicture')
    .sort({ updatedAt: -1 })
    .limit(10)

  res.json(
    new ApiResponse(
      200,
      {
        studentsOut,
        exitsToday,
        returnsToday,
        overdueReturns,
        pendingExits,
        recentActivity,
      },
      'Security dashboard statistics fetched successfully'
    )
  )
})

/**
 * @desc    Get active/approved outpasses for gate verification
 * @route   GET /api/v1/security/active-outpasses
 * @access  Private (Security)
 */
export const getActiveOutpasses = asyncHandler(async (req, res) => {
  const { search, limit = 50, skip = 0 } = req.query

  const query = {
    status: { $in: ['approved_by_warden', 'approved_by_hod'] },
    fromDate: { $lte: new Date() },
  }

  if (search) {
    const students = await Student.find({
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
      ],
    }).distinct('_id')

    query.student = { $in: students }
  }

  const outpasses = await OutpassRequest.find(query)
    .populate('student', 'firstName lastName rollNumber hostelBlock phoneNumber profilePicture')
    .limit(Number.parseInt(limit))
    .skip(Number.parseInt(skip))
    .sort({ fromDate: -1 })

  const total = await OutpassRequest.countDocuments(query)

  res.json(
    new ApiResponse(
      200,
      {
        outpasses,
        pagination: {
          total,
          limit: Number.parseInt(limit),
          skip: Number.parseInt(skip),
          hasMore: total > Number.parseInt(skip) + Number.parseInt(limit),
        },
      },
      'Active outpasses fetched successfully'
    )
  )
})

/**
 * @desc    Verify outpass by QR code or manual code
 * @route   POST /api/v1/security/verify-outpass
 * @access  Private (Security)
 */
export const verifyOutpass = asyncHandler(async (req, res) => {
  const { code } = req.body

  if (!code) {
    return res.status(400).json(new ApiResponse(400, null, 'Verification code is required'))
  }

  // Accept either direct outpassId/requestId or a QR code (base64 JSON)
  let outpass = null
  // Try to parse as base64 QR payload
  if (typeof code === 'string' && code.includes('==')) {
    try {
      const decoded = Buffer.from(code, 'base64').toString('utf8')
      const payload = JSON.parse(decoded)
      // payload may contain requestId or outpassId
      if (payload.requestId) {
        outpass = await OutpassRequest.findOne({ requestId: payload.requestId }).populate('student', 'firstName lastName rollNumber hostelBlock phoneNumber profilePicture')
      }
    } catch (err) {
      // not a JSON base64, continue
    }
  }

  // Fallback: try by id or requestId
  if (!outpass) {
    outpass = await OutpassRequest.findOne({ $or: [{ _id: code }, { requestId: code }] }).populate('student', 'firstName lastName rollNumber hostelBlock phoneNumber profilePicture')
  }

  if (!outpass) {
    return res.status(404).json(new ApiResponse(404, null, 'Outpass not found'))
  }

  // Check if outpass is approved
  if (!['approved_by_warden', 'approved_by_hod'].includes(outpass.status)) {
    return res.status(400).json(new ApiResponse(400, null, 'Outpass is not approved'))
  }

  // Check if outpass is within valid date range
  const now = new Date()
  if (outpass.fromDate && now < outpass.fromDate) {
    return res.status(400).json(new ApiResponse(400, null, 'Outpass is not yet valid'))
  }

  // Create or update an OutpassLog record for security tracking
  try {
    let log = await OutpassLog.findOne({ outpassRequest: outpass._id })
    if (!log) {
      log = await OutpassLog.createFromOutpassRequest(outpass)
    }
    log.qrCodeUsed = true
    await log.save()
  } catch (logErr) {
    console.warn('Failed to create/update OutpassLog on verify:', logErr && logErr.message ? logErr.message : logErr)
  }

  res.json(new ApiResponse(200, outpass, 'Outpass verified successfully'))
})

/**
 * @desc    Record student exit
 * @route   POST /api/v1/security/record-exit/:outpassId
 * @access  Private (Security)
 */
export const recordExit = asyncHandler(async (req, res) => {
  const { outpassId } = req.params
  const { remarks } = req.body

  const outpass = await OutpassRequest.findById(outpassId).populate('student', 'firstName lastName rollNumber')

  if (!outpass) {
    return res.status(404).json(new ApiResponse(404, null, 'Outpass not found'))
  }

  if (!['approved_by_warden', 'approved_by_hod'].includes(outpass.status)) {
    return res.status(400).json(new ApiResponse(400, null, 'Outpass is not approved'))
  }

  if (outpass.exitTime) {
    return res.status(400).json(new ApiResponse(400, null, 'Exit already recorded'))
  }

  outpass.exitTime = new Date()
  outpass.exitRecordedBy = req.user.id
  if (remarks) outpass.exitRemarks = remarks

  await outpass.save()

  // Create or update outpass log
  try {
    let log = await OutpassLog.findOne({ outpassRequest: outpass._id })
    if (!log) log = await OutpassLog.createFromOutpassRequest(outpass)
    await log.recordExit({ securityId: req.user.id, securityName: req.user.firstName + ' ' + (req.user.lastName || '') }, { gateName: req.body.gateName || 'Main Gate', notes: remarks || '', qrCodeUsed: !!req.body.qrCode })
  } catch (logErr) {
    console.warn('Failed to create/update OutpassLog on exit:', logErr && logErr.message ? logErr.message : logErr)
  }

  res.json(new ApiResponse(200, outpass, 'Exit recorded successfully'))
})

/**
 * @desc    Record student return
 * @route   POST /api/v1/security/record-return/:outpassId
 * @access  Private (Security)
 */
export const recordReturn = asyncHandler(async (req, res) => {
  const { outpassId } = req.params
  const { remarks } = req.body

  const outpass = await OutpassRequest.findById(outpassId).populate('student', 'firstName lastName rollNumber')

  if (!outpass) {
    return res.status(404).json(new ApiResponse(404, null, 'Outpass not found'))
  }

  if (!outpass.exitTime) {
    return res.status(400).json(new ApiResponse(400, null, 'Exit not yet recorded'))
  }

  if (outpass.returnTime) {
    return res.status(400).json(new ApiResponse(400, null, 'Return already recorded'))
  }

  const now = new Date()
  outpass.returnTime = now
  outpass.returnRecordedBy = req.user.id
  if (remarks) outpass.returnRemarks = remarks

  // Check if return is late
  if (now > outpass.toDate) {
    outpass.isLateReturn = true
    outpass.lateReturnMinutes = Math.floor((now - outpass.toDate) / 60000)

    // Determine severity based on how late the return is
    let severity = 'low'
    if (outpass.lateReturnMinutes > 120) {
      severity = 'high'
    } else if (outpass.lateReturnMinutes > 60) {
      severity = 'medium'
    }

    // Create a violation for late return
    await Violation.create({
      student: outpass.student._id,
      outpass: outpass._id,
      violationType: 'late_return',
      description: `Student returned ${outpass.lateReturnMinutes} minutes late`,
      severity,
      reportedBy: req.user.id,
      status: 'pending',
    })
  }

  outpass.status = 'completed'
  await outpass.save()

  // Update outpass log with return info
  try {
    let log = await OutpassLog.findOne({ outpassRequest: outpass._id })
    if (!log) log = await OutpassLog.createFromOutpassRequest(outpass)
    await log.recordReturn({ securityId: req.user.id, securityName: req.user.firstName + ' ' + (req.user.lastName || '') }, { gateName: req.body.gateName || 'Main Gate', notes: remarks || '' })
  } catch (logErr) {
    console.warn('Failed to create/update OutpassLog on return:', logErr && logErr.message ? logErr.message : logErr)
  }

  res.json(new ApiResponse(200, outpass, 'Return recorded successfully'))
})

/**
 * @desc    Get list of students currently out
 * @route   GET /api/v1/security/students-out
 * @access  Private (Security)
 */
export const getStudentsOut = asyncHandler(async (req, res) => {
  const { limit = 50, skip = 0 } = req.query

  const outpasses = await OutpassRequest.find({
    exitTime: { $exists: true },
    returnTime: { $exists: false },
    status: { $in: ['approved_by_warden', 'approved_by_hod'] },
  })
    .populate('student', 'firstName lastName rollNumber hostelBlock phoneNumber profilePicture')
    .limit(Number.parseInt(limit))
    .skip(Number.parseInt(skip))
    .sort({ exitTime: -1 })

  const total = await OutpassRequest.countDocuments({
    exitTime: { $exists: true },
    returnTime: { $exists: false },
    status: { $in: ['approved_by_warden', 'approved_by_hod'] },
  })

  res.json(
    new ApiResponse(
      200,
      {
        outpasses,
        total,
        pagination: {
          total,
          limit: Number.parseInt(limit),
          skip: Number.parseInt(skip),
          hasMore: total > Number.parseInt(skip) + Number.parseInt(limit),
        },
      },
      'Students currently out fetched successfully'
    )
  )
})

/**
 * @desc    Get recent gate activity (exits/returns)
 * @route   GET /api/v1/security/recent-activity
 * @access  Private (Security)
 */
export const getRecentActivity = asyncHandler(async (req, res) => {
  const { limit = 20, skip = 0, hours = 24 } = req.query

  const since = new Date()
  since.setHours(since.getHours() - Number.parseInt(hours))

  const activity = await OutpassRequest.find({
    $or: [
      { exitTime: { $gte: since } },
      { returnTime: { $gte: since } }
    ]
  })
    .populate('student', 'firstName lastName rollNumber hostelBlock profilePicture')
    .limit(Number.parseInt(limit))
    .skip(Number.parseInt(skip))
    .sort({ updatedAt: -1 })

  res.json(new ApiResponse(200, activity, 'Recent activity fetched successfully'))
})

/**
 * @desc    Get students who haven't returned on time
 * @route   GET /api/v1/security/overdue-returns
 * @access  Private (Security)
 */
export const getOverdueReturns = asyncHandler(async (req, res) => {
  const { limit = 50, skip = 0 } = req.query

  const now = new Date()

  const overdueOutpasses = await OutpassRequest.find({
    exitTime: { $exists: true },
    returnTime: { $exists: false },
    toDate: { $lt: now },
    status: { $in: ['approved_by_warden', 'approved_by_hod'] },
  })
    .populate('student', 'firstName lastName rollNumber hostelBlock phoneNumber profilePicture')
    .limit(Number.parseInt(limit))
    .skip(Number.parseInt(skip))
    .sort({ toDate: 1 })

  const total = await OutpassRequest.countDocuments({
    exitTime: { $exists: true },
    returnTime: { $exists: false },
    toDate: { $lt: now },
    status: { $in: ['approved_by_warden', 'approved_by_hod'] },
  })

  // Calculate how overdue each is
  const overdueWithMinutes = overdueOutpasses.map(outpass => ({
    ...outpass.toObject(),
    overdueMinutes: Math.floor((now - outpass.toDate) / 60000),
  }))

  res.json(
    new ApiResponse(
      200,
      {
        outpasses: overdueWithMinutes,
        total,
        pagination: {
          total,
          limit: Number.parseInt(limit),
          skip: Number.parseInt(skip),
          hasMore: total > Number.parseInt(skip) + Number.parseInt(limit),
        },
      },
      'Overdue returns fetched successfully'
    )
  )
})
