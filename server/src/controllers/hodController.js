
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
  // Create HOD (Super Admin only)

  createHod: asyncHandler(async (req, res, next) => {
    // Only admins are allowed to create HODs. The system no longer
    // differentiates 'super_admin' — plain 'admin' is sufficient.
    if (req.user.role !== 'admin') {
      return next(new AppError('Forbidden', 403))
    }

    const { name, email, password, department, phone } = req.body
    const existing = await Hod.findOne({ email })
    if (existing) return next(new AppError('HOD already exists', 400))

    // Generate verification token
    const verificationCode = generateVerificationCode()
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000)

    // Password handling: if super_admin (creator) did not provide password, generate one
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

    // Send credentials email if generated
    if (generatedPassword) {
      const credText = `Your HOD account has been created.\nEmail: ${hod.email}\nPassword: ${generatedPassword}\nPlease verify your email using the verification code sent and change your password after login.`
      try {
        await sendNotificationEmail(hod.email, 'Your HOD account credentials - Hostel Management', credText, `<p>${credText.replace(/\n/g, '<br/>')}</p>`)
      } catch (e) {
        console.warn('Failed to send HOD credentials email:', e)
      }
      // Persist generated credential for admin retrieval and audit it.
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

    // Send verification email
    try {
      await sendVerificationEmail(hod.email, name, verificationCode)
    } catch (e) {
      console.warn('Failed to send verification email to HOD:', e)
    }

    return res.status(201).json(new ApiResponse(201, { hod: { id: hod._id, name: hod.name, email: hod.email, department: hod.department, phone: hod.phone }, verificationCode: config.nodeEnv === 'development' ? verificationCode : undefined }, 'HOD created'))
  }),

  // Edit HOD (Super Admin only)
  editHod: asyncHandler(async (req, res, next) => {
    // Allow regular admins to edit HODs
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

  // HOD login
  loginHod: asyncHandler(async (req, res, next) => {
    const { email, password } = req.body
    if (!email || !password) return next(new AppError('Email and password are required', 400))

    const hod = await Hod.findOne({ email }).select('+password')
    if (!hod) return next(new AppError('Invalid credentials', 401))

    // Require email verification for HODs. If not verified, generate and send
    // a verification code and instruct the user to verify first.
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

    const valid = await bcrypt.compare(password, hod.password)
    if (!valid) return next(new AppError('Invalid credentials', 401))

    // Generate JWT token
    const token = jwt.sign({ id: hod._id, role: 'hod', department: hod.department }, config.jwt.secret || config.jwtSecret || 'secret', { expiresIn: '1h' })

    // Respond with token and hod info; include mustChangePassword flag
    return res.json(new ApiResponse(200, { token, hod: { id: hod._id, name: hod.name, email: hod.email, department: hod.department, phone: hod.phone }, mustChangePassword: hod.mustChangePassword || false }, 'Login successful'))
  }),

  // Get HOD profile
  getHodProfile: asyncHandler(async (req, res, next) => {
    if (req.user.role !== 'hod') return next(new AppError('Access denied', 403))

  const hod = await Hod.findById(req.user.id).select('-password').populate('assignedStudentsCount')
    if (!hod) return next(new AppError('HOD not found', 404))

    return res.json(new ApiResponse(200, { hod }, 'HOD profile retrieved'))
  }),

  // Get all HODs (Super Admin only)
  getAllHods: asyncHandler(async (req, res, next) => {
    if (req.user.role !== 'admin') return next(new AppError('Forbidden', 403))

  let hods = await Hod.find().select('-password').populate('assignedStudentsCount')
    if (req.user?.role === 'admin' && Array.isArray(hods) && hods.length > 0) {
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

  // Delete HOD (Super Admin only)
  deleteHod: asyncHandler(async (req, res, next) => {
  // Allow regular admins to delete HODs
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
  })
};

export default hodController;
