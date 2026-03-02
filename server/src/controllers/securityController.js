import asyncHandler from 'express-async-handler'
import { OutpassRequest, Student, Violation, OutpassLog } from '../models/index.js'
import { OUTPASS_STATUS } from '../utils/constants.js'
import { ApiResponse } from '../utils/ApiResponse.js'

const APPROVED_STATUSES = [
  OUTPASS_STATUS.APPROVED,
  OUTPASS_STATUS.OUT,
  'approved_by_warden',
  'approved_by_hod',
]

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Parse a QR code string into { outpassId } or null.
 * Handles three formats:
 *   1. Plain JSON   → {"type":"outpass","outpassId":"..."}
 *   2. Base64 JSON  → base64 of the above
 *   3. Raw id/requestId string
 */
function parseQRCode(raw) {
  if (!raw) return null
  const str = typeof raw === 'string' ? raw.trim() : String(raw).trim()

  // 1) Plain JSON
  if (str.startsWith('{')) {
    try {
      const p = JSON.parse(str)
      const id = p.outpassId || p.requestId || p._id
      if (id) return id
    } catch (_) { /* fall through */ }
  }

  // 2) Base64 JSON
  try {
    const decoded = Buffer.from(str, 'base64').toString('utf8')
    if (decoded.startsWith('{')) {
      const p = JSON.parse(decoded)
      const id = p.outpassId || p.requestId || p._id
      if (id) return id
    }
  } catch (_) { /* fall through */ }

  // 3) Raw id / requestId
  return str
}

async function findOutpassByCode(code) {
  const id = parseQRCode(code)
  if (!id) return null
  return OutpassRequest.findOne({ $or: [{ _id: id }, { requestId: id }] })
    .populate('student', 'firstName lastName rollNumber hostelBlock phoneNumber profilePicture')
}

function mapOutpassForFrontend(o) {
  const obj = typeof o.toObject === 'function' ? o.toObject({ virtuals: true }) : { ...o }
  return {
    ...obj,
    departureDateTime: obj.leaveTime,
    returnDateTime: obj.expectedReturnTime,
    exitTime: obj.gateEntry?.exitTime || null,
    returnTime: obj.gateEntry?.returnTime || null,
    student: {
      ...obj.student,
      registerNumber: obj.student?.rollNumber || obj.student?.registerNumber || null,
    },
  }
}

async function upsertOutpassLog(outpass) {
  try {
    let log = await OutpassLog.findOne({ outpassRequest: outpass._id })
    if (!log) log = await OutpassLog.createFromOutpassRequest(outpass)
    return log
  } catch (err) {
    console.warn('OutpassLog upsert failed:', err?.message)
    return null
  }
}

// ─── controllers ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/security/dashboard/stats
 */
export const getSecurityDashboardStats = asyncHandler(async (req, res) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const now = new Date()

  const [studentsOut, exitsToday, returnsToday, overdueReturns, pendingExits] =
    await Promise.all([
      OutpassRequest.countDocuments({
        'gateEntry.exitTime': { $exists: true },
        'gateEntry.returnTime': { $exists: false },
      }),
      OutpassRequest.countDocuments({
        'gateEntry.exitTime': { $gte: today, $lt: tomorrow },
      }),
      OutpassRequest.countDocuments({
        'gateEntry.returnTime': { $gte: today, $lt: tomorrow },
      }),
      OutpassRequest.countDocuments({
        'gateEntry.exitTime': { $exists: true },
        'gateEntry.returnTime': { $exists: false },
        expectedReturnTime: { $lt: now },
        status: { $in: [OUTPASS_STATUS.OUT, ...APPROVED_STATUSES] },
      }),
      OutpassRequest.countDocuments({
        status: { $in: APPROVED_STATUSES },
        'gateEntry.exitTime': { $exists: false },
        leaveTime: { $lte: tomorrow },
      }),
    ])

  const recentActivity = await OutpassRequest.find({
    $or: [
      { 'gateEntry.exitTime': { $gte: today } },
      { 'gateEntry.returnTime': { $gte: today } },
    ],
  })
    .populate('student', 'firstName lastName rollNumber hostelBlock profilePicture')
    .sort({ updatedAt: -1 })
    .limit(10)

  res.json(
    new ApiResponse(
      200,
      { studentsOut, exitsToday, returnsToday, overdueReturns, pendingExits, recentActivity },
      'Security dashboard statistics fetched successfully'
    )
  )
})

/**
 * GET /api/v1/security/active-outpasses
 */
export const getActiveOutpasses = asyncHandler(async (req, res) => {
  const { search, limit = 50, skip = 0 } = req.query

  const query = {
    status: { $in: APPROVED_STATUSES },
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

  const [outpasses, total] = await Promise.all([
    OutpassRequest.find(query)
      .populate('student', 'firstName lastName rollNumber hostelBlock phoneNumber profilePicture')
      .limit(Number(limit))
      .skip(Number(skip))
      .sort({ leaveTime: -1 }),
    OutpassRequest.countDocuments(query),
  ])

  res.json(
    new ApiResponse(
      200,
      {
        outpasses: outpasses.map(mapOutpassForFrontend),
        pagination: { total, limit: Number(limit), skip: Number(skip), hasMore: total > Number(skip) + Number(limit) },
      },
      'Active outpasses fetched successfully'
    )
  )
})

/**
 * POST /api/v1/security/verify-outpass
 * Verify without recording — just returns outpass data.
 */
export const verifyOutpass = asyncHandler(async (req, res) => {
  const { code } = req.body
  if (!code) return res.status(400).json(new ApiResponse(400, null, 'Verification code is required'))

  const outpass = await findOutpassByCode(code)
  if (!outpass) return res.status(404).json(new ApiResponse(404, null, 'Outpass not found'))

  if (!APPROVED_STATUSES.includes(outpass.status) && outpass.status !== OUTPASS_STATUS.OUT) {
    return res.status(400).json(new ApiResponse(400, null, `Outpass is not approved (status: ${outpass.status})`))
  }

  // Upsert log for tracking
  const log = await upsertOutpassLog(outpass)
  if (log) {
    log.qrCodeUsed = true
    await log.save().catch(() => {})
  }

  res.json(new ApiResponse(200, mapOutpassForFrontend(outpass), 'Outpass verified successfully'))
})

/**
 * POST /api/v1/security/scan
 * ─── PRIMARY scan endpoint ───
 * Automatically records exit on first scan, return on subsequent scans
 * (enforces 10-minute minimum between exit and return).
 *
 * Body: { code: "<qr string or outpass id>", gateName?: string, remarks?: string }
 * Returns: { action: 'exit'|'return'|'already_completed'|'too_soon', outpass, message }
 */
export const scanOutpass = asyncHandler(async (req, res) => {
  const { code, gateName = 'Main Gate', remarks = '' } = req.body
  if (!code) return res.status(400).json(new ApiResponse(400, null, 'QR code or outpass id is required'))

  const outpass = await findOutpassByCode(code)
  if (!outpass) return res.status(404).json(new ApiResponse(404, null, 'Outpass not found'))

  const now = new Date()

  // ── Case 1: Already completed ──────────────────────────────────────────────
  if (outpass.status === OUTPASS_STATUS.COMPLETED && outpass.gateEntry?.returnTime) {
    return res.json(
      new ApiResponse(200, { action: 'already_completed', outpass: mapOutpassForFrontend(outpass) }, 'Outpass is already completed')
    )
  }

  // ── Case 2: No exit yet → record exit ─────────────────────────────────────
  if (!outpass.gateEntry?.exitTime) {
    if (!APPROVED_STATUSES.includes(outpass.status)) {
      return res.status(400).json(new ApiResponse(400, null, `Outpass not approved (status: ${outpass.status})`))
    }

    outpass.gateEntry = outpass.gateEntry || {}
    outpass.gateEntry.exitTime = now
    outpass.gateEntry.exitRecordedBy = req.user.id
    if (remarks) outpass.gateEntry.exitRemarks = remarks
    outpass.status = OUTPASS_STATUS.OUT
    await outpass.save()

    const log = await upsertOutpassLog(outpass)
    if (log) {
      await log.recordExit(
        { securityId: req.user.id, securityName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() },
        { gateName, notes: remarks, qrCodeUsed: true }
      ).catch(() => {})
    }

    return res.json(
      new ApiResponse(200, { action: 'exit', outpass: mapOutpassForFrontend(outpass) }, `Exit recorded for ${outpass.student?.firstName}`)
    )
  }

  // ── Case 3: Exit recorded, check 10-min cooldown ──────────────────────────
  const exitTime = new Date(outpass.gateEntry.exitTime)
  const minsSinceExit = (now - exitTime) / 60000

  if (minsSinceExit < 10) {
    const remaining = Math.ceil(10 - minsSinceExit)
    return res.status(400).json(
      new ApiResponse(400, {
        action: 'too_soon',
        remainingMinutes: remaining,
        exitTime: outpass.gateEntry.exitTime,
        outpass: mapOutpassForFrontend(outpass),
      }, `Return scan too soon — ${remaining} min remaining before return can be recorded`)
    )
  }

  // ── Case 4: Record return ──────────────────────────────────────────────────
  if (outpass.gateEntry?.returnTime) {
    return res.json(
      new ApiResponse(200, { action: 'already_completed', outpass: mapOutpassForFrontend(outpass) }, 'Return already recorded')
    )
  }

  outpass.gateEntry.returnTime = now
  outpass.gateEntry.returnRecordedBy = req.user.id
  if (remarks) outpass.gateEntry.returnRemarks = remarks

  // Late return check
  if (outpass.expectedReturnTime && now > outpass.expectedReturnTime) {
    outpass.isLateReturn = true
    outpass.lateReturnMinutes = Math.floor((now - outpass.expectedReturnTime) / 60000)
    const severity = outpass.lateReturnMinutes > 120 ? 'high' : outpass.lateReturnMinutes > 60 ? 'medium' : 'low'
    await Violation.create({
      student: outpass.student._id,
      outpass: outpass._id,
      violationType: 'late_return',
      description: `Student returned ${outpass.lateReturnMinutes} minutes late`,
      severity,
      reportedBy: req.user.id,
      status: 'pending',
    }).catch(() => {})
  }

  outpass.status = OUTPASS_STATUS.COMPLETED
  await outpass.save()

  const log2 = await upsertOutpassLog(outpass)
  if (log2) {
    await log2.recordReturn(
      { securityId: req.user.id, securityName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() },
      { gateName, notes: remarks }
    ).catch(() => {})
  }

  res.json(
    new ApiResponse(200, { action: 'return', outpass: mapOutpassForFrontend(outpass) }, `Return recorded for ${outpass.student?.firstName}`)
  )
})

/**
 * POST /api/v1/security/record-exit/:outpassId
 */
export const recordExit = asyncHandler(async (req, res) => {
  const { outpassId } = req.params
  const { remarks, gateName = 'Main Gate' } = req.body

  const outpass = await OutpassRequest.findById(outpassId)
    .populate('student', 'firstName lastName rollNumber')

  if (!outpass) return res.status(404).json(new ApiResponse(404, null, 'Outpass not found'))
  if (!APPROVED_STATUSES.includes(outpass.status))
    return res.status(400).json(new ApiResponse(400, null, 'Outpass is not approved'))
  if (outpass.gateEntry?.exitTime)
    return res.status(400).json(new ApiResponse(400, null, 'Exit already recorded'))

  outpass.gateEntry = outpass.gateEntry || {}
  outpass.gateEntry.exitTime = new Date()
  outpass.gateEntry.exitRecordedBy = req.user.id
  if (remarks) outpass.gateEntry.exitRemarks = remarks
  outpass.status = OUTPASS_STATUS.OUT
  await outpass.save()

  const log = await upsertOutpassLog(outpass)
  if (log) {
    await log.recordExit(
      { securityId: req.user.id, securityName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() },
      { gateName, notes: remarks || '', qrCodeUsed: !!req.body.qrCode }
    ).catch(() => {})
  }

  res.json(new ApiResponse(200, mapOutpassForFrontend(outpass), 'Exit recorded successfully'))
})

/**
 * POST /api/v1/security/record-return/:outpassId
 */
export const recordReturn = asyncHandler(async (req, res) => {
  const { outpassId } = req.params
  const { remarks, gateName = 'Main Gate' } = req.body

  const outpass = await OutpassRequest.findById(outpassId)
    .populate('student', 'firstName lastName rollNumber')

  if (!outpass) return res.status(404).json(new ApiResponse(404, null, 'Outpass not found'))
  if (!outpass.gateEntry?.exitTime)
    return res.status(400).json(new ApiResponse(400, null, 'Exit not yet recorded'))
  if (outpass.gateEntry?.returnTime)
    return res.status(400).json(new ApiResponse(400, null, 'Return already recorded'))

  const now = new Date()
  outpass.gateEntry.returnTime = now
  outpass.gateEntry.returnRecordedBy = req.user.id
  if (remarks) outpass.gateEntry.returnRemarks = remarks

  if (outpass.expectedReturnTime && now > outpass.expectedReturnTime) {
    outpass.isLateReturn = true
    outpass.lateReturnMinutes = Math.floor((now - outpass.expectedReturnTime) / 60000)
    const severity = outpass.lateReturnMinutes > 120 ? 'high' : outpass.lateReturnMinutes > 60 ? 'medium' : 'low'
    await Violation.create({
      student: outpass.student._id,
      outpass: outpass._id,
      violationType: 'late_return',
      description: `Student returned ${outpass.lateReturnMinutes} minutes late`,
      severity,
      reportedBy: req.user.id,
      status: 'pending',
    }).catch(() => {})
  }

  outpass.status = OUTPASS_STATUS.COMPLETED
  await outpass.save()

  const log = await upsertOutpassLog(outpass)
  if (log) {
    await log.recordReturn(
      { securityId: req.user.id, securityName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() },
      { gateName, notes: remarks || '' }
    ).catch(() => {})
  }

  res.json(new ApiResponse(200, mapOutpassForFrontend(outpass), 'Return recorded successfully'))
})

/**
 * GET /api/v1/security/students-out
 */
export const getStudentsOut = asyncHandler(async (req, res) => {
  const { limit = 50, skip = 0 } = req.query
  const query = {
    'gateEntry.exitTime': { $exists: true },
    'gateEntry.returnTime': { $exists: false },
  }
  const [outpasses, total] = await Promise.all([
    OutpassRequest.find(query)
      .populate('student', 'firstName lastName rollNumber hostelBlock phoneNumber profilePicture')
      .limit(Number(limit)).skip(Number(skip)).sort({ 'gateEntry.exitTime': -1 }),
    OutpassRequest.countDocuments(query),
  ])
  res.json(new ApiResponse(200, { outpasses: outpasses.map(mapOutpassForFrontend), total, pagination: { total, limit: Number(limit), skip: Number(skip) } }, 'Students currently out'))
})

/**
 * GET /api/v1/security/recent-activity
 */
export const getRecentActivity = asyncHandler(async (req, res) => {
  const { limit = 20, skip = 0, hours = 24 } = req.query
  const since = new Date(Date.now() - Number(hours) * 3600000)
  const activity = await OutpassRequest.find({
    $or: [{ 'gateEntry.exitTime': { $gte: since } }, { 'gateEntry.returnTime': { $gte: since } }],
  })
    .populate('student', 'firstName lastName rollNumber hostelBlock profilePicture')
    .limit(Number(limit)).skip(Number(skip)).sort({ updatedAt: -1 })
  res.json(new ApiResponse(200, activity.map(mapOutpassForFrontend), 'Recent activity'))
})

/**
 * GET /api/v1/security/overdue-returns
 */
export const getOverdueReturns = asyncHandler(async (req, res) => {
  const { limit = 50, skip = 0 } = req.query
  const now = new Date()
  const query = {
    'gateEntry.exitTime': { $exists: true },
    'gateEntry.returnTime': { $exists: false },
    expectedReturnTime: { $lt: now },
    status: { $in: [OUTPASS_STATUS.OUT, ...APPROVED_STATUSES] },
  }
  const [overdueOutpasses, total] = await Promise.all([
    OutpassRequest.find(query)
      .populate('student', 'firstName lastName rollNumber hostelBlock phoneNumber profilePicture')
      .limit(Number(limit)).skip(Number(skip)).sort({ expectedReturnTime: 1 }),
    OutpassRequest.countDocuments(query),
  ])
  const result = overdueOutpasses.map(o => ({
    ...mapOutpassForFrontend(o),
    overdueMinutes: Math.floor((now - o.expectedReturnTime) / 60000),
  }))
  res.json(new ApiResponse(200, { outpasses: result, total, pagination: { total, limit: Number(limit), skip: Number(skip) } }, 'Overdue returns'))
})

/**
 * GET /api/v1/security/returned-logs
 */
export const getReturnedLogs = asyncHandler(async (req, res) => {
  const { limit = 50, skip = 0 } = req.query
  const query = { isReturned: true }
  const [logs, total] = await Promise.all([
    OutpassLog.find(query)
      .populate('student', 'firstName lastName rollNumber hostelBlock phoneNumber profilePicture')
      .limit(Number(limit)).skip(Number(skip)).sort({ actualReturnTime: -1 }),
    OutpassLog.countDocuments(query),
  ])
  res.json(new ApiResponse(200, { logs, total, pagination: { total, limit: Number(limit), skip: Number(skip) } }, 'Returned logs'))
})

/**
 * GET /api/v1/security/debug/outpass/:id  (dev only)
 */
export const getExitedToday = asyncHandler(async (req, res) => {
  const { limit = 200, skip = 0, hostelBlock } = req.query

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const query = {
    'gateEntry.exitTime': { $gte: today, $lt: tomorrow },
  }

  const [outpasses, total] = await Promise.all([
    OutpassRequest.find(query)
      .populate('student', 'firstName lastName rollNumber hostelBlock roomNumber phoneNumber profilePicture email')
      .limit(Number(limit))
      .skip(Number(skip))
      .sort({ 'gateEntry.exitTime': -1 }),
    OutpassRequest.countDocuments(query),
  ])

  // Optional block filter after populate (since hostelBlock lives on student)
  const filtered = hostelBlock
    ? outpasses.filter(o => o.student?.hostelBlock === hostelBlock)
    : outpasses

  res.json(
    new ApiResponse(
      200,
      {
        outpasses: filtered.map(mapOutpassForFrontend),
        total: filtered.length,
        pagination: { total: filtered.length, limit: Number(limit), skip: Number(skip) },
      },
      'Exited today fetched successfully'
    )
  )
})

/**
 * GET /api/v1/security/currently-in
 * All active students who are NOT currently out
 */
export const getCurrentlyIn = asyncHandler(async (req, res) => {
  const { limit = 200, skip = 0, hostelBlock } = req.query

  // Get IDs of students currently out (exited, not returned)
  const currentlyOutDocs = await OutpassRequest.find({
    'gateEntry.exitTime': { $exists: true },
    'gateEntry.returnTime': { $exists: false },
  }).distinct('student')

  // Build student query
  const studentQuery = {
    status: 'active',
    _id: { $nin: currentlyOutDocs },
  }
  if (hostelBlock) studentQuery.hostelBlock = hostelBlock

  const [students, total] = await Promise.all([
    Student.find(studentQuery)
      .select('firstName lastName rollNumber hostelBlock roomNumber phoneNumber email profilePicture department year yearOfStudy')
      .limit(Number(limit))
      .skip(Number(skip))
      .sort({ hostelBlock: 1, roomNumber: 1 }),
    Student.countDocuments(studentQuery),
  ])

  res.json(
    new ApiResponse(
      200,
      {
        students,
        total,
        pagination: { total, limit: Number(limit), skip: Number(skip) },
      },
      'Currently in students fetched successfully'
    )
  )
})

export const debugGetOutpass = asyncHandler(async (req, res) => {
  const { id } = req.params
  let outpass = await findOutpassByCode(id)
  if (!outpass) return res.status(404).json(new ApiResponse(404, null, 'Outpass not found'))
  res.json(new ApiResponse(200, outpass.toObject(), 'Debug outpass fetched'))
})