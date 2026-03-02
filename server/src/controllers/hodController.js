import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import Hod from '../models/Hod.js';
import bcrypt from 'bcryptjs';
import generateVerificationCode from '../utils/generateVerificationCode.js'
import { sendVerificationEmail, sendNotificationEmail } from '../services/emailService.js'
import { Credential, AuditLog } from '../models/index.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../middleware/errorHandler.js'

const hodController = {
  // Create HOD (Admin only)
  createHod: asyncHandler(async (req, res, next) => {
    if (req.user.role !== 'admin') {
      return next(new AppError('Forbidden', 403))
    }

    const { name, email, password, department, phone } = req.body
    const existing = await Hod.findOne({ email })
    if (existing) return next(new AppError('HOD already exists', 400))

    const verificationCode = generateVerificationCode()
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000)

    const generateRandomPassword = (len = 10) => {
      const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      const lower = 'abcdefghijklmnopqrstuvwxyz'
      const digits = '0123456789'
      const all = upper + lower + digits
      let pw = ''
      pw += upper[Math.floor(Math.random() * upper.length)]
      pw += lower[Math.floor(Math.random() * lower.length)]
      pw += digits[Math.floor(Math.random() * digits.length)]
      for (let i = 3; i < len; i++) pw += all[Math.floor(Math.random() * all.length)]
      return pw.split('').sort(() => 0.5 - Math.random()).join('')
    }

    let generatedPassword = null
    let plainPassword = password
    if (!plainPassword) {
      generatedPassword = generateRandomPassword(10)
      plainPassword = generatedPassword
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10)

    const hod = new Hod({
      name,
      email,
      password: hashedPassword,
      department,
      phone,
      createdBy: req.user._id,
      isEmailVerified: false,
      emailVerificationToken: verificationCode,
      emailVerificationExpires: verificationExpires,
      mustChangePassword: !!generatedPassword
    })

    await hod.save()

    if (generatedPassword) {
      const credText = `Your HOD account has been created.\nEmail: ${hod.email}\nPassword: ${generatedPassword}\nPlease verify your email using the verification code sent and change your password after login.`
      try {
        await sendNotificationEmail(hod.email, 'Your HOD account credentials - Hostel Management', credText, `<p>${credText.replace(/\n/g, '<br/>')}</p>`)
      } catch (e) {
        console.warn('Failed to send HOD credentials email:', e)
      }
      try {
        const cred = await Credential.create({ userId: hod._id, role: 'hod', password: generatedPassword })
        try {
          await AuditLog.logAction({
            user: req.user?.id,
            userModel: req.user?.role ? (req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1)) : 'Admin',
            action: 'create',
            resource: 'credential',
            resourceId: String(cred._id),
            details: { targetUserId: String(hod._id), role: 'hod' },
            ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent'] || undefined,
            status: 'success'
          })
        } catch (auditErr) {
          console.warn('Failed to write audit log for HOD credential persistence:', auditErr)
        }
      } catch (credErr) {
        console.warn('Failed to persist generated credential for HOD:', credErr)
      }
    }

    try {
      await sendVerificationEmail(hod.email, name, verificationCode)
    } catch (e) {
      console.warn('Failed to send verification email to HOD:', e)
    }

    return res.status(201).json(new ApiResponse(201, { hod: { id: hod._id, name: hod.name, email: hod.email, department: hod.department, phone: hod.phone }, verificationCode: config.nodeEnv === 'development' ? verificationCode : undefined }, 'HOD created'))
  }),

  // Edit HOD by ID (Admin only)
  editHod: asyncHandler(async (req, res, next) => {
    if (req.user.role !== 'admin') {
      return next(new AppError('Forbidden', 403))
    }

    const { hodId } = req.params
    const { name, email, department, phone } = req.body

    const hod = await Hod.findById(hodId)
    if (!hod) return next(new AppError('HOD not found', 404))

    hod.name = name || hod.name
    hod.email = email || hod.email
    hod.department = department || hod.department
    hod.phone = phone || hod.phone
    hod.updatedBy = req.user._id
    hod.updatedAt = Date.now()
    await hod.save()

    return res.json(new ApiResponse(200, { hod: { id: hod._id, name: hod.name, email: hod.email, department: hod.department, phone: hod.phone } }, 'HOD updated'))
  }),

  // FIX 5: HOD updates their own profile via PUT /hods/profile
  // Uses req.user.id so the HOD doesn't need to supply their own hodId
  updateHodProfile: asyncHandler(async (req, res, next) => {
    if (req.user.role !== 'hod') {
      return next(new AppError('Access denied', 403))
    }

    const { name, phone } = req.body

    const hod = await Hod.findById(req.user.id)
    if (!hod) return next(new AppError('HOD not found', 404))

    if (name !== undefined) hod.name = name
    if (phone !== undefined) hod.phone = phone
    hod.updatedAt = Date.now()
    await hod.save()

    return res.json(new ApiResponse(200, { hod: { id: hod._id, name: hod.name, email: hod.email, department: hod.department, phone: hod.phone } }, 'Profile updated'))
  }),

  // HOD login
  loginHod: asyncHandler(async (req, res, next) => {
    const { email, password } = req.body
    if (!email || !password) return next(new AppError('Email and password are required', 400))

    const hod = await Hod.findOne({ email }).select('+password')
    if (!hod) return next(new AppError('Invalid credentials', 401))

    if (!hod.isEmailVerified) {
      const verificationCode = generateVerificationCode()
      const verificationExpires = new Date(Date.now() + 10 * 60 * 1000)
      hod.emailVerificationToken = verificationCode
      hod.emailVerificationExpires = verificationExpires
      await hod.save({ validateBeforeSave: false })

      try {
        await sendVerificationEmail(hod.email, hod.name || hod.firstName || 'HOD', verificationCode)
      } catch (emailErr) {
        console.warn('Failed to send verification email to HOD during login attempt:', emailErr)
      }

      return next(new AppError('Please verify your email to continue. A verification email has been sent.', 403))
    }

    let valid = false
    try {
      valid = await bcrypt.compare(password, hod.password)
    } catch {
      valid = hod.password === password
    }

    if (!valid && hod.password === password) {
      try {
        const hashed = await bcrypt.hash(password, 12)
        hod.password = hashed
        await hod.save({ validateBeforeSave: false })
        valid = true
      } catch (upgradeErr) {
        console.warn('Failed to upgrade plain-text password to hashed form for HOD:', upgradeErr)
      }
    }

    if (!valid) return next(new AppError('Invalid credentials', 401))

    const token = jwt.sign({ id: hod._id, role: 'hod', department: hod.department }, config.jwt.secret || config.jwtSecret || 'secret', { expiresIn: '1h' })

    return res.json(new ApiResponse(200, { token, hod: { id: hod._id, name: hod.name, email: hod.email, department: hod.department, phone: hod.phone }, mustChangePassword: hod.mustChangePassword || false }, 'Login successful'))
  }),

  // Get HOD's own profile
  getHodProfile: asyncHandler(async (req, res, next) => {
    if (req.user.role !== 'hod') return next(new AppError('Access denied', 403))

    const hod = await Hod.findById(req.user.id).select('-password').populate('assignedStudentsCount')
    if (!hod) return next(new AppError('HOD not found', 404))

    return res.json(new ApiResponse(200, { hod }, 'HOD profile retrieved'))
  }),

  // Get all HODs (Admin only)
  getAllHods: asyncHandler(async (req, res, next) => {
    if (req.user.role !== 'admin') return next(new AppError('Forbidden', 403))

    let hods = await Hod.find().select('-password').populate('assignedStudentsCount')
    if (Array.isArray(hods) && hods.length > 0) {
      try {
        const ids = hods.map(h => h._id)
        const { default: Credential } = await import('../models/Credential.js')
        const creds = await Credential.find({ userId: { $in: ids } })
        const credMap = {}
        creds.forEach(c => { credMap[String(c.userId)] = c.password })
        hods = hods.map(h => ({ ...h.toObject ? h.toObject() : h, generatedPassword: credMap[h._id] || undefined }))
      } catch (e) {
        console.warn('Failed to attach credentials to HODs:', e)
      }
    }

    return res.json(new ApiResponse(200, { hods, count: hods.length }, 'HODs retrieved'))
  }),

  // Delete HOD (Admin only)
  deleteHod: asyncHandler(async (req, res, next) => {
    if (req.user.role !== 'admin') return next(new AppError('Forbidden', 403))

    const { hodId } = req.params
    const hod = await Hod.findByIdAndDelete(hodId)
    if (!hod) return next(new AppError('HOD not found', 404))

    return res.json(new ApiResponse(200, null, 'HOD deleted successfully'))
  }),

  // Get students by department (HOD only)
  getStudentsByDepartment: asyncHandler(async (req, res, next) => {
    if (req.user.role !== 'hod') return next(new AppError('Access denied', 403))

    const hod = await Hod.findById(req.user.id)
    if (!hod) return next(new AppError('HOD not found', 404))

    const Student = (await import('../models/Student.js')).default
    const students = await Student.find({ department: hod.department, hodId: hod._id }).select('-password')

    return res.json(new ApiResponse(200, { students, count: students.length, department: hod.department }, 'Students retrieved'))
  }),

  // FIX 6: GET /hods/statistics — department-level stats for HOD dashboard
  getDepartmentStatistics: asyncHandler(async (req, res, next) => {
    if (req.user.role !== 'hod') return next(new AppError('Access denied', 403))

    const hod = await Hod.findById(req.user.id)
    if (!hod) return next(new AppError('HOD not found', 404))

    const Student = (await import('../models/Student.js')).default
    const OutpassRequest = (await import('../models/OutpassRequest.js')).default

    // Run student counts in parallel
    const [totalStudents, activeStudents, studentsByYear] = await Promise.all([
      Student.countDocuments({ department: hod.department }),
      Student.countDocuments({ department: hod.department, status: 'active' }),
      Student.aggregate([
        { $match: { department: hod.department } },
        { $group: { _id: '$yearOfStudy', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ])

    // Get IDs of all students in this department for outpass queries
    const departmentStudentIds = await Student.find(
      { department: hod.department },
      '_id'
    ).lean().then(docs => docs.map(d => d._id))

    // Run outpass counts in parallel
    const [pendingOutpasses, approvedOutpasses, outpassesByType] = await Promise.all([
      OutpassRequest.countDocuments({ student: { $in: departmentStudentIds }, status: 'pending' }),
      OutpassRequest.countDocuments({
        student: { $in: departmentStudentIds },
        status: { $in: ['approved', 'approved_by_warden', 'APPROVED', 'APPROVED_BY_WARDEN'] }
      }),
      OutpassRequest.aggregate([
        { $match: { student: { $in: departmentStudentIds } } },
        { $group: { _id: '$outpassType', count: { $sum: 1 } } }
      ])
    ])

    return res.json(new ApiResponse(200, {
      department: hod.department,
      students: {
        total: totalStudents,
        active: activeStudents,
        inactive: totalStudents - activeStudents,
        byYear: studentsByYear.map(y => ({ year: y._id, count: y.count }))
      },
      outpasses: {
        pending: pendingOutpasses,
        approved: approvedOutpasses,
        byType: outpassesByType.map(t => ({ type: t._id, count: t.count }))
      }
    }, 'Department statistics retrieved'))
  })
}

export default hodController;