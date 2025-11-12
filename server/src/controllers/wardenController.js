import asyncHandler from 'express-async-handler'
import { Warden, Student, OutpassRequest } from '../models/index.js'
import { ApiResponse } from '../utils/ApiResponse.js'

/**
 * @desc    Get all wardens
 * @route   GET /api/v1/wardens
 * @access  Private (Admin, Warden)
 */
export const getAllWardens = asyncHandler(async (req, res) => {
  const { hostelType, hostelBlock, search, limit = 50, skip = 0 } = req.query

  const query = {}
  if (hostelType) query.hostelType = hostelType
  if (hostelBlock) query.assignedHostelBlocks = hostelBlock
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
    ]
  }

  const wardens = await Warden.find(query)
    .select('-password -refreshToken')
    .limit(Number.parseInt(limit))
    .skip(Number.parseInt(skip))
    .sort({ createdAt: -1 })

  const total = await Warden.countDocuments(query)

  let enhancedWardens = wardens
  if (req.user?.role === 'admin' && Array.isArray(wardens) && wardens.length > 0) {
    try {
      const ids = wardens.map(w => w._id)
      const { default: Credential } = await import('../models/Credential.js')
      const creds = await Credential.find({ userId: { $in: ids } })
      const credMap = {}
      creds.forEach(c => { credMap[String(c.userId)] = c.password })
      enhancedWardens = wardens.map(w => ({ ...w.toObject ? w.toObject() : w, generatedPassword: credMap[w._id] || undefined }))
    } catch (e) {
      console.warn('Failed to attach credentials to wardens:', e)
    }
  }

  res.json(
    new ApiResponse(
      200,
      {
        wardens: enhancedWardens,
        pagination: {
          total,
          limit: Number.parseInt(limit),
          skip: Number.parseInt(skip),
          hasMore: total > Number.parseInt(skip) + Number.parseInt(limit),
        },
      },
      'Wardens fetched successfully'
    )
  )
})

/**
 * @desc    Get warden by ID
 * @route   GET /api/v1/wardens/:id
 * @access  Private (Admin, Warden)
 */
export const getWardenById = asyncHandler(async (req, res) => {
  const warden = await Warden.findById(req.params.id).select('-password -refreshToken')

  if (!warden) {
    return res.status(404).json(new ApiResponse(404, null, 'Warden not found'))
  }

  res.json(new ApiResponse(200, warden, 'Warden fetched successfully'))
})

/**
 * @desc    Get warden dashboard statistics
 * @route   GET /api/v1/wardens/dashboard/stats
 * @access  Private (Warden)
 */
export const getWardenDashboardStats = asyncHandler(async (req, res) => {
  const wardenId = req.user.id

  // Get warden details
  const warden = await Warden.findById(wardenId)
  if (!warden) {
    return res.status(404).json(new ApiResponse(404, null, 'Warden not found'))
  }

  // Get total students in assigned blocks
  const totalStudents = await Student.countDocuments({
    hostelBlock: { $in: warden.assignedHostelBlocks },
  })

  // Get pending outpass requests
  const pendingOutpasses = await OutpassRequest.countDocuments({
    student: { $in: await Student.find({ hostelBlock: { $in: warden.assignedHostelBlocks } }).distinct('_id') },
    wardenApprovalStatus: 'pending',
  })

  // Get approved today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const approvedToday = await OutpassRequest.countDocuments({
    student: { $in: await Student.find({ hostelBlock: { $in: warden.assignedHostelBlocks } }).distinct('_id') },
    wardenApprovalStatus: 'approved',
    wardenApprovalDate: { $gte: today },
  })

  // Get students currently out
  const studentsOut = await OutpassRequest.countDocuments({
    student: { $in: await Student.find({ hostelBlock: { $in: warden.assignedHostelBlocks } }).distinct('_id') },
    status: 'approved_by_warden',
    exitTime: { $exists: true },
    returnTime: { $exists: false },
  })

  // Get recent outpass requests
  const recentOutpasses = await OutpassRequest.find({
    student: { $in: await Student.find({ hostelBlock: { $in: warden.assignedHostelBlocks } }).distinct('_id') },
  })
    .populate('student', 'firstName lastName rollNumber hostelBlock')
    .sort({ createdAt: -1 })
    .limit(10)

  res.json(
    new ApiResponse(
      200,
      {
        totalStudents,
        pendingOutpasses,
        approvedToday,
        studentsOut,
        assignedBlocks: warden.assignedHostelBlocks,
        hostelType: warden.hostelType,
        recentOutpasses,
      },
      'Dashboard statistics fetched successfully'
    )
  )
})

/**
 * @desc    Get wardens by hostel type
 * @route   GET /api/v1/wardens/hostel/:hostelType
 * @access  Private (Admin, Warden)
 */
export const getWardensByHostelType = asyncHandler(async (req, res) => {
  const { hostelType } = req.params

  const wardens = await Warden.find({ hostelType }).select('-password -refreshToken')

  res.json(new ApiResponse(200, wardens, `Wardens for ${hostelType} hostel fetched successfully`))
})

/**
 * @desc    Update warden details
 * @route   PATCH /api/v1/wardens/:id
 * @access  Private (Admin)
 */
export const updateWarden = asyncHandler(async (req, res) => {
  const { id } = req.params
  const updates = req.body

  // Don't allow password updates through this endpoint
  delete updates.password
  delete updates.refreshToken

  const warden = await Warden.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  }).select('-password -refreshToken')

  if (!warden) {
    return res.status(404).json(new ApiResponse(404, null, 'Warden not found'))
  }

  res.json(new ApiResponse(200, warden, 'Warden updated successfully'))
})

/**
 * @desc    Delete warden
 * @route   DELETE /api/v1/wardens/:id
 * @access  Private (Admin)
 */
export const deleteWarden = asyncHandler(async (req, res) => {
  const warden = await Warden.findByIdAndDelete(req.params.id)

  if (!warden) {
    return res.status(404).json(new ApiResponse(404, null, 'Warden not found'))
  }

  res.json(new ApiResponse(200, null, 'Warden deleted successfully'))
})

/**
 * @desc    Get students under warden's hostel blocks
 * @route   GET /api/v1/wardens/:id/students
 * @access  Private (Warden)
 */
export const getWardenStudents = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { limit = 50, skip = 0, search } = req.query

  const warden = await Warden.findById(id)
  if (!warden) {
    return res.status(404).json(new ApiResponse(404, null, 'Warden not found'))
  }

  const query = { hostelBlock: { $in: warden.assignedHostelBlocks } }
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { rollNumber: { $regex: search, $options: 'i' } },
    ]
  }

  const students = await Student.find(query)
    .select('-password -refreshToken')
    .limit(Number.parseInt(limit))
    .skip(Number.parseInt(skip))
    .sort({ rollNumber: 1 })

  const total = await Student.countDocuments(query)

  res.json(
    new ApiResponse(
      200,
      {
        students,
        pagination: {
          total,
          limit: Number.parseInt(limit),
          skip: Number.parseInt(skip),
          hasMore: total > Number.parseInt(skip) + Number.parseInt(limit),
        },
      },
      'Students fetched successfully'
    )
  )
})

/**
 * @desc    Get outpasses for warden's hostel blocks
 * @route   GET /api/v1/wardens/:id/outpasses
 * @access  Private (Warden)
 */
export const getWardenOutpasses = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { status, limit = 50, skip = 0 } = req.query

  const warden = await Warden.findById(id)
  if (!warden) {
    return res.status(404).json(new ApiResponse(404, null, 'Warden not found'))
  }

  const studentIds = await Student.find({ hostelBlock: { $in: warden.assignedHostelBlocks } }).distinct('_id')

  const query = { student: { $in: studentIds } }
  if (status) query.wardenApprovalStatus = status

  const outpasses = await OutpassRequest.find(query)
    .populate('student', 'firstName lastName rollNumber hostelBlock')
    .limit(Number.parseInt(limit))
    .skip(Number.parseInt(skip))
    .sort({ createdAt: -1 })

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
      'Outpasses fetched successfully'
    )
  )
})
