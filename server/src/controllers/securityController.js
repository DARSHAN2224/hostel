import asyncHandler from 'express-async-handler'
import { OutpassRequest, Student, Violation, OutpassLog } from '../models/index.js'
import { OUTPASS_STATUS } from '../utils/constants.js'
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

  // Students currently out (have an exit recorded and not yet returned)
  const studentsOut = await OutpassRequest.countDocuments({
    'gateEntry.exitTime': { $exists: true },
    'gateEntry.isReturned': false,
  })

  // Exits today
  const exitsToday = await OutpassRequest.countDocuments({
    'gateEntry.exitTime': { $gte: today, $lt: tomorrow },
  })

  // Returns today
  const returnsToday = await OutpassRequest.countDocuments({
    'gateEntry.returnTime': { $gte: today, $lt: tomorrow },
  })

  // Overdue returns
  const now = new Date()
  const overdueReturns = await OutpassRequest.countDocuments({
    'gateEntry.exitTime': { $exists: true },
    'gateEntry.isReturned': false,
    expectedReturnTime: { $lt: now },
    status: { $in: [OUTPASS_STATUS.OUT, OUTPASS_STATUS.APPROVED, 'approved_by_warden', 'approved_by_hod'] },
  })

  // Pending outpasses (approved but not exited yet)
  const pendingExits = await OutpassRequest.countDocuments({
    status: { $in: [OUTPASS_STATUS.APPROVED, 'approved_by_warden', 'approved_by_hod'] },
    'gateEntry.exitTime': { $exists: false },
    leaveTime: { $lte: tomorrow },
  })

  // Recent activity
  const recentActivity = await OutpassRequest.find({
    $or: [
      { 'gateEntry.exitTime': { $gte: today } },
      { 'gateEntry.returnTime': { $gte: today } }
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

  const APPROVED_STATUSES = [OUTPASS_STATUS.APPROVED, OUTPASS_STATUS.OUT, 'approved_by_warden', 'approved_by_hod']

  const query = {
    status: { $in: APPROVED_STATUSES },
    leaveTime: { $lte: new Date() },
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
    .sort({ leaveTime: -1 })

  const total = await OutpassRequest.countDocuments(query)

  // Map to legacy frontend-friendly shape (aliases expected by SecurityDashboard)
  const mapped = outpasses.map(o => {
    const obj = o.toObject({ virtuals: true })
    return {
      ...obj,
      departureDateTime: obj.leaveTime,
      returnDateTime: obj.expectedReturnTime,
      exitTime: obj.gateEntry?.exitTime || null,
      returnTime: obj.gateEntry?.returnTime || null,
      // Ensure frontend expects registerNumber alias
      student: {
        ...obj.student,
        registerNumber: obj.student?.rollNumber || obj.student?.registerNumber || null,
      }
    }
  })

  res.json(
    new ApiResponse(
      200,
      {
        outpasses: mapped,
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
  // Normalize input and attempt multiple strategies to locate the outpass
  const raw = (typeof code === 'string' ? code : String(code)).trim()
  const lookupAttempts = []

  // 1) Try to interpret as base64-encoded JSON payload
  try {
    if (/^[A-Za-z0-9+/=\s]+$/.test(raw)) {
      // Try decoding; ignore errors
      const decoded = Buffer.from(raw, 'base64').toString('utf8')
      try {
        const payload = JSON.parse(decoded)
        if (payload && (payload.requestId || payload.outpassId)) {
          const rid = payload.requestId || payload.outpassId
          lookupAttempts.push({ method: 'decodedPayload', rid })
          outpass = await OutpassRequest.findOne({ $or: [{ requestId: rid }, { _id: rid }] }).populate('student', 'firstName lastName rollNumber hostelBlock phoneNumber profilePicture')
        }
      } catch (e) {
        // decoded content not JSON, continue
      }
    }
  } catch (err) {
    // ignore base64 decode errors and continue
  }

  // 2) If not found yet, try treating raw string as direct id or requestId
  if (!outpass) {
    lookupAttempts.push({ method: 'direct', raw })
    outpass = await OutpassRequest.findOne({ $or: [{ _id: raw }, { requestId: raw }] }).populate('student', 'firstName lastName rollNumber hostelBlock phoneNumber profilePicture')
  }

  if (!outpass) {
    // Log attempts for debugging (development only)
    console.debug('verifyOutpass: lookupAttempts=', JSON.stringify(lookupAttempts))
    return res.status(404).json(new ApiResponse(404, null, 'Outpass not found'))
  }

  console.debug('verifyOutpass: matchedOutpass=', `${outpass._id.toString()} requestId=${outpass.requestId}`)

  // Check if outpass is in an approved state
  const APPROVED_STATUSES = [OUTPASS_STATUS.APPROVED, 'approved_by_warden', 'approved_by_hod']

  if (!APPROVED_STATUSES.includes(outpass.status)) {
    return res.status(400).json(new ApiResponse(400, null, 'Outpass is not approved'))
  }

  // Check if outpass is within valid date range
  const now = new Date()
  // If leaveTime is in the future, don't block verification for security —
  // return the outpass but mark it so the client can warn the user.
  if (outpass.leaveTime && now < outpass.leaveTime) {
    console.warn(`verifyOutpass: outpass ${outpass._id} not yet valid (leaveTime=${outpass.leaveTime})`)
    try {
      // attach a transient flag for the client
      outpass = outpass.toObject ? outpass.toObject() : outpass
    } catch (e) {
      // ignore
    }
    outpass.__notYetValid = true
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

  const APPROVED_STATUSES = [OUTPASS_STATUS.APPROVED, 'approved_by_warden', 'approved_by_hod']

  if (!APPROVED_STATUSES.includes(outpass.status)) {
    return res.status(400).json(new ApiResponse(400, null, 'Outpass is not approved'))
  }

  if (outpass.gateEntry && outpass.gateEntry.exitTime) {
    return res.status(400).json(new ApiResponse(400, null, 'Exit already recorded'))
  }

  outpass.gateEntry = outpass.gateEntry || {}
  outpass.gateEntry.exitTime = new Date()
  outpass.gateEntry.exitRecordedBy = req.user.id
  if (remarks) outpass.gateEntry.exitRemarks = remarks
  outpass.status = OUTPASS_STATUS.OUT

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

  if (!outpass.gateEntry || !outpass.gateEntry.exitTime) {
    return res.status(400).json(new ApiResponse(400, null, 'Exit not yet recorded'))
  }

  if (outpass.gateEntry && outpass.gateEntry.returnTime) {
    return res.status(400).json(new ApiResponse(400, null, 'Return already recorded'))
  }

  const now = new Date()
  outpass.gateEntry.returnTime = now
  outpass.gateEntry.returnRecordedBy = req.user.id
  if (remarks) outpass.gateEntry.returnRemarks = remarks

  // Check if return is late
  if (outpass.expectedReturnTime && now > outpass.expectedReturnTime) {
    outpass.isLateReturn = true
    outpass.lateReturnMinutes = Math.floor((now - outpass.expectedReturnTime) / 60000)

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

  outpass.status = OUTPASS_STATUS.COMPLETED
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
    'gateEntry.exitTime': { $exists: true },
    'gateEntry.isReturned': false,
  })
    .populate('student', 'firstName lastName rollNumber hostelBlock phoneNumber profilePicture')
    .limit(Number.parseInt(limit))
    .skip(Number.parseInt(skip))
    .sort({ 'gateEntry.exitTime': -1 })

  const total = await OutpassRequest.countDocuments({
    'gateEntry.exitTime': { $exists: true },
    'gateEntry.isReturned': false,
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
    'gateEntry.exitTime': { $exists: true },
    'gateEntry.isReturned': false,
    expectedReturnTime: { $lt: now },
    status: { $in: [OUTPASS_STATUS.OUT, OUTPASS_STATUS.APPROVED, 'approved_by_warden', 'approved_by_hod'] },
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
    overdueMinutes: Math.floor((now - outpass.expectedReturnTime) / 60000),
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


/**
 * @desc    Get returned outpass logs (students who have come back)
 * @route   GET /api/v1/security/returned-logs
 * @access  Private (security, admin, warden, hod)
 */
export const getReturnedLogs = asyncHandler(async (req, res) => {
  const { limit = 50, skip = 0 } = req.query

  // Look into OutpassLog for entries marked as returned
  const query = { isReturned: true }

  const logs = await OutpassLog.find(query)
    .populate('student', 'firstName lastName rollNumber hostelBlock phoneNumber profilePicture')
    .limit(Number.parseInt(limit))
    .skip(Number.parseInt(skip))
    .sort({ actualReturnTime: -1 })

  const total = await OutpassLog.countDocuments(query)

  res.json(
    new ApiResponse(
      200,
      {
        logs,
        total,
        pagination: {
          total,
          limit: Number.parseInt(limit),
          skip: Number.parseInt(skip),
          hasMore: total > Number.parseInt(skip) + Number.parseInt(limit),
        },
      },
      'Returned outpass logs fetched successfully'
    )
  )
})

/**
 * @desc Debug - get raw outpass by id or requestId (development only)
 * @route GET /api/v1/security/debug/outpass/:id
 * @access Private (security, admin)
 */
export const debugGetOutpass = asyncHandler(async (req, res) => {
  const { id } = req.params

  if (!id) return res.status(400).json(new ApiResponse(400, null, 'id is required'))

  // Try both ObjectId and requestId
  let outpass = null
  try {
    outpass = await OutpassRequest.findOne({ $or: [{ _id: id }, { requestId: id }] }).lean()
  } catch (err) {
    // If _id lookup failed (invalid ObjectId), try requestId only
    outpass = await OutpassRequest.findOne({ requestId: id }).lean()
  }

  if (!outpass) return res.status(404).json(new ApiResponse(404, null, 'Outpass not found'))

  // Normalize gateEntry keys for clarity
  outpass._id = outpass._id && outpass._id.toString ? outpass._id.toString() : outpass._id

  res.json(new ApiResponse(200, outpass, 'Debug outpass fetched'))
})
