import { Student, Warden, Admin, Security, Parent, Credential, AuditLog } from '../models/index.js'
import Hod from '../models/Hod.js'
import mongoose from 'mongoose'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../middleware/errorHandler.js'
import generateVerificationCode from '../utils/generateVerificationCode.js'
import { sendVerificationEmail, sendNotificationEmail } from '../services/emailService.js'
import { CREDENTIALS_EMAIL_TEMPLATE } from '../utils/emailTemplates.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { config } from '../config/config.js'
import { deleteOldProfilePicture } from '../middleware/upload.js'

const ModelMap = {
  student: Student,
  warden: Warden,
  hod: Hod,
  admin: Admin,
  security: Security,
  parent: Parent,
}

export const createUserManaged = asyncHandler(async (req, res, next) => {
  const creatorRole = req.user?.role
  const { role, email, password, ...rest } = req.body

  // role and email are always required. Password may be omitted when an admin
  // creates the user (the server will generate a compliant password).
  if (!role || !email) {
    return next(new AppError('role and email are required', 400))
  }

  // Authorization: who can create what
  const allowedByCreator = {
    admin: ['student', 'parent', 'warden', 'security', 'admin'],
    warden: ['student', 'parent'],
  }
  const allowed = allowedByCreator[creatorRole] || []
  if (!allowed.includes(role)) {
    return next(new AppError(`You are not allowed to create ${role} accounts`, 403))
  }

  const UserModel = ModelMap[role]
  if (!UserModel) return next(new AppError('Invalid role', 400))

  // Check email uniqueness across all models
  const exists = await Promise.all([
    Student.findOne({ email }),
    Warden.findOne({ email }),
    Admin.findOne({ email }),
    Security.findOne({ email }),
    Parent.findOne({ email }),
  ])
  if (exists.some(Boolean)) {
    return next(new AppError('User already exists with this email', 409))
  }

  const verificationCode = generateVerificationCode()
  const verificationExpires = new Date(Date.now() + 10 * 60 * 1000)

  let userData = {
    email,
    password,
    role,
    isEmailVerified: false,
    emailVerificationToken: verificationCode,
    emailVerificationExpires: verificationExpires,
  }

  // If admin is creating the user and didn't provide a password, generate one that conforms to password rules
  const generateRandomPassword = (len = 10) => {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lower = 'abcdefghijklmnopqrstuvwxyz'
    const digits = '0123456789'
    const all = upper + lower + digits
    // Ensure at least one of each required character class
    let pw = ''
    pw += upper[Math.floor(Math.random() * upper.length)]
    pw += lower[Math.floor(Math.random() * lower.length)]
    pw += digits[Math.floor(Math.random() * digits.length)]
    for (let i = 3; i < len; i++) pw += all[Math.floor(Math.random() * all.length)]
    return pw.split('').sort(() => 0.5 - Math.random()).join('')
  }

  let parentDetails;
  if (role === 'student') {
    const { firstName, lastName, phone, student } = rest;
    const {
      rollNumber,
      course,
      year,
      // Year of study (1..6)
      yearOfStudy,
      semester,
      department,
      hostelType,
      hostelBlock,
      roomNumber,
      // Optional fields
      dateOfBirth,
      gender,
      bloodGroup,
      permanentAddress,
      parentDetails: pd
    } = student;
    parentDetails = pd;
    // Find HOD for department
    let hod = await Hod.findOne({ department });
    let hodId = hod ? hod._id : undefined;

    // Find a warden responsible for this hostel block and type.
    // Prefer a warden assigned to the specific block (primary if available), otherwise any active warden for the block.
    let warden = null;
    if (hostelBlock) {
      // Try to find a primary warden for this block first
      warden = await Warden.findOne({ hostelType, 'assignedHostelBlocks.blockName': hostelBlock, status: 'active', 'assignedHostelBlocks.isPrimary': true });
      if (!warden) {
        // Fallback: any warden assigned to the block
        warden = await Warden.findOne({ hostelType, 'assignedHostelBlocks.blockName': hostelBlock, status: 'active' });
      }
    }

    // If either HOD or Warden is missing, refuse to create the student and instruct to contact admin
    if (!hodId) {
      return next(new AppError(`No HOD assigned for department '${department}'. Please contact the administrator to assign an HOD before creating students in this department.`, 400));
    }

    if (!warden) {
      return next(new AppError(`No warden assigned for hostel block '${hostelBlock}'. Please contact the administrator to assign a warden before creating students in this block.`, 400));
    }

    userData = {
      ...userData,
      firstName,
      lastName,
      phone,
      rollNumber,
      course,
      year,
      yearOfStudy,
      semester,
      department,
      hostelType,
      hostelBlock,
      roomNumber,
      hodId,
      wardenId: warden._id,
    };

    // Add optional fields only if provided
    if (dateOfBirth) userData.dateOfBirth = dateOfBirth;
    if (gender) userData.gender = gender;
    if (bloodGroup) userData.bloodGroup = bloodGroup;
    if (parentDetails) userData.parentDetails = parentDetails;
    if (permanentAddress) userData.permanentAddress = permanentAddress;
    if (typeof yearOfStudy !== 'undefined') userData.yearOfStudy = yearOfStudy;
  }

  if (role === 'warden') {
    const { firstName, lastName, phone, hostelType, block, emergencyContact } = rest
    userData = {
      ...userData,
      firstName,
      lastName,
      phone,
      hostelType,
      assignedHostelBlocks: block
        ? [{ blockName: block, isPrimary: true, floors: [], totalRooms: 0, currentOccupancy: 0 }]
        : [],
      emergencyContact: emergencyContact || { name: 'To be updated', phone: '0000000000', relationship: 'To be updated' },
    }
  }

  if (role === 'admin' || role === 'security' || role === 'parent') {
    const { firstName, lastName, phone, adminRole, dateOfBirth, gender, joiningDate, address, emergencyContact } = rest
    userData = { ...userData, firstName, lastName, phone }

    if (role === 'admin') {
      userData.adminRole = adminRole
    }

    if (role === 'security') {
      // employeeId, designation and shift were removed from the security profile as requested.
      Object.assign(userData, { dateOfBirth, gender, joiningDate, address, emergencyContact })
    }
  }

  // Enforce password presence for non-admin creators (warden must supply password)
  if (req.user?.role !== 'admin' && !userData.password) {
    return next(new AppError('Password is required when creating users (unless created by admin)', 400))
  }

  // If creator is admin and no password provided, generate one and force password change on first login
  let generatedPassword = null
  if (req.user?.role === 'admin' && !userData.password) {
    generatedPassword = generateRandomPassword(10)
    userData.password = generatedPassword
    userData.mustChangePassword = true
  }

  // Use a transaction for user + parent creation to ensure atomicity where possible.
  let user = null
  let parentRecord = null
  const session = await mongoose.startSession()
  try {
    session.startTransaction()

    // Create user within the session
    user = await new UserModel(userData).save({ session })

    // Automatically create parent record if student has parent details
    if (role === 'student' && parentDetails) {
      try {
        const { guardianPhone, guardianEmail, fatherName } = parentDetails
        if (guardianPhone) {
          // Check if parent already exists by phone (within session-aware query)
          let parent = await Parent.findOne({ $or: [{ primaryPhone: guardianPhone }, { secondaryPhone: guardianPhone }] }).session(session)

          if (!parent) {
            const addr = userData?.permanentAddress || {}
            const parentData = {
              firstName: fatherName || 'Guardian',
              lastName: user.lastName,
              primaryPhone: guardianPhone,
              email: guardianEmail || undefined,
              relationshipToStudent: fatherName ? 'father' : 'guardian',
              address: {
                city: addr.city || 'To be updated',
                state: addr.state || 'To be updated',
                zipCode: addr.zipCode || '000000',
                street: addr.street || undefined,
              },
              students: [{
                student: user._id,
                studentId: user.studentId,
                rollNumber: user.rollNumber,
                relationship: fatherName ? 'father' : 'guardian',
                isPrimaryContact: true,
                canApproveOutpass: true,
              }],
              verification: {
                verifiedBy: req.user.id,
                verificationModel: creatorRole === 'admin' ? 'Admin' : 'Warden',
                verificationDate: new Date(),
              },
            }

            parent = await new Parent(parentData).save({ session })
          } else {
            // Parent exists, add this student to their record using instance method (session-aware)
            parent.students.push({
              student: user._id,
              studentId: user.studentId,
              rollNumber: user.rollNumber,
              relationship: fatherName ? 'father' : 'guardian',
              isPrimaryContact: parent.students.length === 0,
              canApproveOutpass: true,
            })
            await parent.save({ session })
          }

          parentRecord = parent

          // Update student with parent reference
          user.parentId = parent._id
          await user.save({ session, validateBeforeSave: false })
        }
      } catch (parentError) {
        // If parent creation fails, abort the transaction so no partial records persist
        await session.abortTransaction()
        session.endSession()
        console.error('Failed to create parent record inside transaction:', parentError)
        throw parentError
      }
    }

    // Commit transaction
    await session.commitTransaction()
    session.endSession()
  } catch (txErr) {
    // Ensure session is cleaned up
    try {
      await session.abortTransaction()
    } catch (abortErr) {
      console.warn('Failed to abort transaction:', abortErr)
    }
    session.endSession()
    // Re-throw so outer error handling applies
    throw txErr
  }

  try {
    const displayName = user.name || user.firstName || 'User'
    // If admin generated a password, email the credentials to the user (non-critical)
    if (generatedPassword) {
      const credText = `Your account has been created.\nEmail: ${user.email}\nPassword: ${generatedPassword}\nPlease verify your email using the verification code sent to you and change your password after login.`
      const clientUrl = config.app?.clientUrl || 'http://localhost:5173'
      const html = CREDENTIALS_EMAIL_TEMPLATE
        .replace('{username}', user.firstName || user.name || 'User')
        .replace('{email}', user.email)
        .replace('{password}', generatedPassword)
        .replace('{clientUrl}', clientUrl)
      // Send a notification with credentials (non-critical; don't throw on failure)
      try {
        await sendNotificationEmail(user.email, 'Your account credentials - Hostel Management', credText, html)
      } catch (emailErr) {
        console.warn('Failed to send credentials email:', emailErr)
      }
    }

    // Only send verification email automatically when the creator is NOT an admin.
    // Admin-created accounts should receive verification only when the user attempts first login.
    if (req.user?.role !== 'admin') {
      try {
        await sendVerificationEmail(user.email, displayName, verificationCode)
      } catch (emailErr) {
        console.warn('Failed to send verification email for managed creation:', emailErr)
      }
    }
    
    // Persist generated password for admin retrieval if it was generated
    if (generatedPassword) {
      try {
        await Credential.create({ userId: user._id, role, password: generatedPassword })
      } catch (credErr) {
        console.warn('Failed to persist generated credential:', credErr)
      }
    }

    // Prepare response data with created student and parent info (safe to return)
    const responseData = {
      verificationCode: config.nodeEnv === 'development' ? verificationCode : undefined,
      generatedPassword: generatedPassword || undefined,
      student: user ? (typeof user.toJSON === 'function' ? user.toJSON() : user) : null,
      parent: parentRecord ? (typeof parentRecord.toJSON === 'function' ? parentRecord.toJSON() : parentRecord) : null
    }

    return res.status(201).json(
      new ApiResponse(201, responseData, `User created${parentRecord ? ' and parent record created/updated' : ''} and verification email sent`)
    )
  } catch (err) {
    if (config.nodeEnv === 'development') {
      const responseData = {
        verificationCode,
        student: user ? (typeof user.toJSON === 'function' ? user.toJSON() : user) : null,
        parent: parentRecord ? (typeof parentRecord.toJSON === 'function' ? parentRecord.toJSON() : parentRecord) : null
      }
      return res.status(201).json(
        new ApiResponse(201, responseData, `User created${parentRecord ? ' and parent record created/updated' : ''}. Email unavailable - verification code returned in response.`)
      )
    }
    await UserModel.findByIdAndDelete(user._id)
    if (parentRecord && parentRecord.students.length === 1) {
      // Only delete parent if this was the only student
      await Parent.findByIdAndDelete(parentRecord._id)
    }
    throw err
  }
})

// Helper to normalize user documents across models
const toUserDTO = (u, roleOverride) => ({
  _id: u._id,
  firstName: u.firstName || u.name || '',
  lastName: u.lastName || '',
  email: u.email,
  phone: u.phone,
  role: roleOverride || u.role,
  status: u.status || (u.isActive ? 'active' : undefined) || 'active',
  hostelType: u.hostelType, // For wardens and students
  hostelBlock: u.hostelBlock, // For students
  assignedHostelBlocks: u.assignedHostelBlocks, // For wardens
  // assignedStudents: prefer virtual populated count; fallback to occupancy if present
  assignedStudents: typeof u.assignedStudentsCount === 'number'
    ? u.assignedStudentsCount
    : (Array.isArray(u.assignedHostelBlocks) && u.assignedHostelBlocks.length > 0 ? (u.assignedHostelBlocks[0].currentOccupancy || 0) : undefined),
  createdAt: u.createdAt,
})

// GET /users - list users with role/search/pagination
export const listUsers = asyncHandler(async (req, res) => {
  const { role = 'all', search = '', hostelType, hostelBlock, /* page = 1, */ limit = 20 } = req.query
  const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)

  const buildQuery = () => {
    const query = {}
    
    // Search filter
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    }
    
    // Hostel type filter (for wardens and students)
    if (hostelType) {
      query.hostelType = hostelType
    }
    
    // Hostel block filter (for wardens via assignedHostelBlocks array, students via hostelBlock field)
    if (hostelBlock) {
      query.$or = query.$or || []
      query.$or.push(
        { hostelBlock: hostelBlock }, // For students
        { 'assignedHostelBlocks.blockName': hostelBlock } // For wardens
      )
    }
    
    return query
  }

  const fetchByRole = async (r, skip = 0, take = l) => {
    const Model = ModelMap[r]
    if (!Model) return { items: [], total: 0 }
    const query = buildQuery()
    if (r === 'warden') {
      console.log('Warden fetch query:', JSON.stringify(query))
    }
    // For wardens/hods populate the virtual assignedStudentsCount so we can show counts
    const findQuery = (r === 'warden' || r === 'hod') ? Model.find(query).populate('assignedStudentsCount') : Model.find(query)
    const [items, total] = await Promise.all([
      findQuery.sort({ createdAt: -1 }).skip(skip).limit(take),
      Model.countDocuments(query),
    ])
    if (r === 'warden') {
      console.log('Wardens found:', items.length)
    }
    return { items: items.map(u => toUserDTO(u, r)), total }
  }

  let data = []
  let total = 0

  if (role !== 'all') {
    const { items, total: t } = await fetchByRole(role)
    data = items
    total = t
  } else {
    // Combine across roles (simple approach without global pagination)
    const roles = ['student', 'warden', 'security', 'admin']
    const perRoleLimit = Math.ceil(l / roles.length)
    const results = await Promise.all(roles.map(r => fetchByRole(r, 0, perRoleLimit)))
    data = results.flatMap(r => r.items)
    total = results.reduce((sum, r) => sum + r.total, 0)
  }

  // If requester is admin, attach any stored generated passwords for users
  if (req.user?.role === 'admin' && Array.isArray(data) && data.length > 0) {
    try {
      const ids = data.map(d => d._id)
      // Explicitly select the stored generated password for admin-only attachment.
      // This is intentional but sensitive; keep this admin-only and audit access.
      const creds = await Credential.find({ userId: { $in: ids } }).select('+password')
      const credMap = {}
      creds.forEach(c => { credMap[String(c.userId)] = c.password })
      data = data.map(d => ({ ...d, generatedPassword: credMap[d._id] || undefined }))
    } catch (attachErr) {
      console.warn('Failed to attach generated credentials to user list:', attachErr)
    }
  }

  res.json(new ApiResponse(200, { users: data, total }, 'Users retrieved'))
})

// GET /users/:role/:id/credential - admin-only: retrieve stored generated password for a user
export const getCredential = asyncHandler(async (req, res, next) => {
  if (req.user?.role !== 'admin') return next(new AppError('Forbidden', 403))
  const { role, id } = req.params
  if (!role || !id) return next(new AppError('role and id are required', 400))

  // Only admins can retrieve stored generated credentials. Explicitly select the password field.
  const cred = await Credential.findOne({ userId: id, role }).select('+password')
  if (!cred) return next(new AppError('Credential not found', 404))

  // Create an audit log entry for credential retrieval
  try {
    await AuditLog.logAction({
      user: req.user?.id,
      userModel: req.user?.role ? (req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1)) : 'Admin',
      action: 'view',
      resource: 'password',
      resourceId: id,
      details: { roleRequested: role },
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'] || undefined,
      status: 'success'
    })
  } catch (auditErr) {
    // do not block the main flow if audit logging fails
    console.warn('Failed to write audit log for credential retrieval:', auditErr)
  }

  res.json(new ApiResponse(200, { password: cred.password }, 'Credential retrieved'))
})

// GET /users/:role/:id - fetch a single user by role and id, include assignedStudentsCount for wardens/hods when possible
export const getUserById = asyncHandler(async (req, res, next) => {
  const { role, id } = req.params
  const Model = ModelMap[role]
  if (!Model) return next(new AppError('Invalid role', 400))

  let query = Model.findById(id)
  // Populate counts for warden/hod
  if (role === 'warden' || role === 'hod') {
    query = query.populate('assignedStudentsCount')
  }

  const user = await query.exec()
  if (!user) return next(new AppError('User not found', 404))

  // Return full sanitized object for admins/wardens/hods; otherwise limited DTO
  if (req.user?.role === 'admin') {
    return res.json(new ApiResponse(200, { user: typeof user.toJSON === 'function' ? user.toJSON() : user }, 'User retrieved'))
  }

  // Fallback DTO
  return res.json(new ApiResponse(200, { user: toUserDTO(user, role) }, 'User retrieved'))
})

// POST /users/:role/:id/reset-password - admin-only: generate reset token and notify user (do not return plaintext)
export const resetPassword = asyncHandler(async (req, res, next) => {
  if (req.user?.role !== 'admin') return next(new AppError('Forbidden', 403))
  const { role, id } = req.params
  if (!role || !id) return next(new AppError('role and id are required', 400))

  const Model = ModelMap[role]
  if (!Model) return next(new AppError('Invalid role', 400))

  const user = await Model.findById(id)
  if (!user) return next(new AppError('User not found', 404))

  // Create a password reset token using the model instance method if available
  if (typeof user.createPasswordResetToken !== 'function') {
    return next(new AppError('Password reset not supported for this user type', 400))
  }

  const resetToken = user.createPasswordResetToken()
  await user.save({ validateBeforeSave: false })

  // Build a frontend link for reset (do not return token in API response)
  const clientUrl = config.app?.clientUrl || 'http://localhost:5173'
  const resetLink = `${clientUrl}/auth/reset-password?token=${resetToken}&id=${user._id}`

  // Notify user via email (best-effort)
  try {
    const subject = 'Password reset request'
    const text = `An administrator has requested a password reset for your account. Use the following link to reset your password: ${resetLink}. The link expires shortly.`
    await sendNotificationEmail(user.email, subject, text)
  } catch (emailErr) {
    console.warn('Failed to send reset notification email:', emailErr)
  }

  // Invalidate any previously stored generated credentials for this user so the old
  // plaintext (if persisted) is not shown in admin UIs after a reset has been requested.
  try {
    await Credential.deleteMany({ userId: id })
    // Log the invalidation in audit logs
    try {
      await AuditLog.logAction({
        user: req.user?.id,
        userModel: req.user?.role ? (req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1)) : 'Admin',
        action: 'update',
        resource: 'password',
        resourceId: id,
        details: { reason: 'admin_requested_reset_and_invalidated_stored_credential' },
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'] || undefined,
        status: 'success'
      })
    } catch (auditErr) {
      console.warn('Failed to write audit log for credential invalidation:', auditErr)
    }
  } catch (delErr) {
    console.warn('Failed to delete stored credentials during reset flow:', delErr)
  }

  res.json(new ApiResponse(200, null, 'Password reset requested and user notified'))
})

// GET /users/stats - counts per role and totals
export const getUserStats = asyncHandler(async (req, res) => {
  const [students, wardens, security, admins] = await Promise.all([
    Student.countDocuments({}),
    Warden.countDocuments({}),
    Security.countDocuments({}),
    Admin.countDocuments({}),
  ])

  const totalUsers = students + wardens + security + admins
  res.json(new ApiResponse(200, {
    totalUsers,
    studentsCount: students,
    wardensCount: wardens,
    securityCount: security,
    hodCount: 0, // HODs managed separately
  }, 'User stats'))
})

// PATCH /users/:role/:id - minimal updates
export const updateUser = asyncHandler(async (req, res, next) => {
  const { role, id } = req.params
  const Model = ModelMap[role]
  if (!Model) return next(new AppError('Invalid role', 400))
  // Allow role-specific updatable fields so admin edit forms can match registration
  const updates = {}

  const setIfPresent = (key) => { if (req.body[key] !== undefined) updates[key] = req.body[key] }

  // Common fields across roles
  ['firstName', 'lastName', 'name', 'email', 'phone', 'status', 'profileCompleted', 'mustChangePassword'].forEach(setIfPresent)

  if (role === 'student') {
    // Student-specific fields (flattened on Student model)
    ['rollNumber', 'registerNumber', 'course', 'year', 'yearOfStudy', 'semester', 'department', 'hostelType', 'hostelBlock', 'roomNumber', 'permanentAddress', 'parentDetails', 'emergencyContact', 'wardenId', 'hodId'].forEach(setIfPresent)
    // parentDetails may be an object; allow full replacement
    if (req.body.parentDetails) updates.parentDetails = req.body.parentDetails
  }

  if (role === 'warden') {
    ['hostelType', 'assignedHostelBlocks', 'emergencyContact', 'workingHours', 'permissions'].forEach(setIfPresent)
    if (req.body.assignedHostelBlocks) updates.assignedHostelBlocks = req.body.assignedHostelBlocks
    if (req.body.emergencyContact) updates.emergencyContact = req.body.emergencyContact
  }

  if (role === 'hod') {
    ['department', 'phone', 'name', 'firstName', 'lastName'].forEach(setIfPresent)
  }

  if (role === 'admin' || role === 'security' || role === 'parent') {
    ['address', 'emergencyContact', 'adminRole'].forEach(setIfPresent)
  }

  // If no updatable fields were provided, return bad request
  if (Object.keys(updates).length === 0) return next(new AppError('No valid fields provided for update', 400))

  const user = await Model.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
  if (!user) return next(new AppError('User not found', 404))

  res.json(new ApiResponse(200, { user: toUserDTO(user, role) }, 'User updated'))
})

// DELETE /users/:role/:id
export const deleteUser = asyncHandler(async (req, res, next) => {
  const { role, id } = req.params
  const Model = ModelMap[role]
  if (!Model) return next(new AppError('Invalid role', 400))

  const user = await Model.findByIdAndDelete(id)
  if (!user) return next(new AppError('User not found', 404))

  // Delete profile picture if exists
  if (user.profilePicture) {
    deleteOldProfilePicture(user.profilePicture)
  }

  res.json(new ApiResponse(200, null, 'User deleted'))
})

// POST /users/profile-picture - Upload profile picture
export const uploadProfilePicture = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No file uploaded', 400))
  }

  const userRole = req.user.role
  const userId = req.user.id
  
  const Model = ModelMap[userRole] || (userRole === 'hod' ? Hod : null)
  if (!Model) return next(new AppError('Invalid user role', 400))

  const user = await Model.findById(userId)
  if (!user) return next(new AppError('User not found', 404))

  // Delete old profile picture if exists
  if (user.profilePicture) {
    deleteOldProfilePicture(user.profilePicture)
  }

  // Save new profile picture path
  const profilePicturePath = `/uploads/profiles/${req.file.filename}`
  user.profilePicture = profilePicturePath
  await user.save()

  res.json(new ApiResponse(200, { profilePicture: profilePicturePath }, 'Profile picture uploaded successfully'))
})

export default { createUserManaged, getCredential, getUserById, resetPassword }
