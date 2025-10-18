import { Student, Warden, Admin, Security, Parent } from '../models/index.js'
import Hod from '../models/Hod.js';
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../middleware/errorHandler.js'
import generateVerificationCode from '../utils/generateVerificationCode.js'
import { sendVerificationEmail } from '../services/emailService.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { config } from '../config/config.js'

const ModelMap = {
  student: Student,
  warden: Warden,
  admin: Admin,
  security: Security,
  parent: Parent,
}

export const createUserManaged = asyncHandler(async (req, res, next) => {
  const creatorRole = req.user?.role
  const { role, email, password, ...rest } = req.body

  if (!role || !email || !password) {
    return next(new AppError('role, email, and password are required', 400))
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

  let parentDetails;
  if (role === 'student') {
    const { firstName, lastName, phone, student } = rest;
    const {
      rollNumber,
      course,
      year,
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

    userData = {
      ...userData,
      firstName,
      lastName,
      phone,
      rollNumber,
      course,
      year,
      semester,
      department,
      hostelType,
      hostelBlock,
      roomNumber,
      hodId,
    };

    // Add optional fields only if provided
    if (dateOfBirth) userData.dateOfBirth = dateOfBirth;
    if (gender) userData.gender = gender;
    if (bloodGroup) userData.bloodGroup = bloodGroup;
    if (parentDetails) userData.parentDetails = parentDetails;
    if (permanentAddress) userData.permanentAddress = permanentAddress;
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
    const { firstName, lastName, phone, adminRole, employeeId, dateOfBirth, gender, joiningDate, designation, currentShift, address, emergencyContact } = rest
    userData = { ...userData, firstName, lastName, phone }

    if (role === 'admin') {
      userData.adminRole = adminRole
    }

    if (role === 'security') {
      Object.assign(userData, { employeeId, dateOfBirth, gender, joiningDate, designation, currentShift, address, emergencyContact })
    }
  }

  const user = await UserModel.create(userData)

  // Automatically create parent record if student has parent details
  let parentRecord = null
  if (role === 'student' && parentDetails) {
    try {
      // Extract parent information from parentDetails
      const { guardianPhone, guardianEmail, fatherName, motherName } = parentDetails
      
      if (guardianPhone) {
        // Check if parent already exists by phone
        let parent = await Parent.findByPhone(guardianPhone)
        
        if (!parent) {
          // Create new parent record
          const parentData = {
            firstName: fatherName || 'Guardian',
            lastName: user.lastName,
            primaryPhone: guardianPhone,
            email: guardianEmail || undefined,
            relationshipToStudent: fatherName ? 'father' : 'guardian',
            address: {
              city: permanentAddress?.city || 'To be updated',
              state: permanentAddress?.state || 'To be updated',
              zipCode: permanentAddress?.zipCode || '000000',
              street: permanentAddress?.street || undefined,
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
          
          parent = await Parent.create(parentData)
        } else {
          // Parent exists, add this student to their record
          await parent.addStudent({
            student: user._id,
            studentId: user.studentId,
            rollNumber: user.rollNumber,
            relationship: fatherName ? 'father' : 'guardian',
            isPrimaryContact: parent.students.length === 0,
            canApproveOutpass: true,
          })
        }
        
        parentRecord = parent
        
        // Update student with parent reference
        user.parentId = parent._id
        await user.save({ validateBeforeSave: false })
      }
    } catch (parentError) {
      // Log parent creation error but don't fail student creation
      console.error('Failed to create parent record:', parentError)
    }
  }

  try {
    const displayName = user.name || user.firstName || 'User'
    await sendVerificationEmail(user.email, displayName, verificationCode)
    
    const responseData = config.nodeEnv === 'development' ? { verificationCode } : null
    if (parentRecord && config.nodeEnv === 'development') {
      responseData.parentCreated = true
      responseData.parentId = parentRecord._id
    }
    
    return res.status(201).json(
      new ApiResponse(201, responseData, `User created${parentRecord ? ' and parent record created/updated' : ''} and verification email sent`)
    )
  } catch (err) {
    if (config.nodeEnv === 'development') {
      const responseData = { verificationCode }
      if (parentRecord) {
        responseData.parentCreated = true
        responseData.parentId = parentRecord._id
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

export default { createUserManaged }
