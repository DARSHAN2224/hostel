/**
 * Student Service
 * 
 * OOP Concept: Encapsulation & Single Responsibility
 * - Contains all business logic related to students
 * - Uses StudentRepository for database operations
 * - Controller calls Service, Service calls Repository
 * 
 * Flow: Controller -> Service -> Repository -> Database
 * 
 * Benefits:
 * - Business logic separated from HTTP handling (controllers)
 * - Business logic separated from database queries (repositories)
 * - Easy to test
 * - Reusable across different controllers or APIs
 */

import StudentRepository from '../repositories/StudentRepository.js'
import { 
  NotFoundError, 
  ValidationError, 
  ConflictError,
  AuthenticationError 
} from '../utils/customErrors.js'
import { USER_STATUS } from '../utils/constants.js'
import jwt from 'jsonwebtoken'
import { config } from '../config/config.js'
import logger from '../utils/logger.js'

class StudentService {
  /**
   * Register a new student
   * @param {Object} studentData - Student registration data
   * @returns {Promise<Object>} - Created student and token
   */
  async register(studentData) {
    logger.info('StudentService: Starting student registration')

    // Check if email already exists
    const existingStudent = await StudentRepository.findByEmail(studentData.email)
    if (existingStudent) {
      throw new ConflictError('Email already registered')
    }

    // Check if roll number already exists
    if (studentData.rollNumber) {
      const existingRollNumber = await StudentRepository.findByRollNumber(studentData.rollNumber)
      if (existingRollNumber) {
        throw new ConflictError('Roll number already exists')
      }
    }

    // Create student (password will be hashed by model pre-save hook)
    const student = await StudentRepository.create(studentData)

    // Generate auth token
    const token = this.generateAuthToken(student)

    logger.info(`StudentService: Student registered successfully - ${student.studentId}`)

    return {
      student: this.sanitizeStudent(student),
      token
    }
  }

  /**
   * Login student
   * @param {String} email - Student email
   * @param {String} password - Student password
   * @returns {Promise<Object>} - Student and token
   */
  async login(email, password) {
    logger.info(`StudentService: Login attempt for ${email}`)

    // Find student by email (include password)
    const student = await StudentRepository.findByEmail(email, true)
    
    if (!student) {
      throw new AuthenticationError('Invalid email or password')
    }

    // Check if account is active
    if (student.status !== USER_STATUS.ACTIVE) {
      throw new AuthenticationError(`Account is ${student.status}. Please contact admin.`)
    }

    // Verify password
    const isPasswordCorrect = await student.correctPassword(password, student.password)
    if (!isPasswordCorrect) {
      throw new AuthenticationError('Invalid email or password')
    }

    // Update last login
    await StudentRepository.updateLastLogin(student._id)

    // Generate token
    const token = this.generateAuthToken(student)

    logger.info(`StudentService: Student logged in successfully - ${student.studentId}`)

    return {
      student: this.sanitizeStudent(student),
      token
    }
  }

  /**
   * Get student by ID
   * @param {String} id - Student ID
   * @returns {Promise<Object>} - Student document
   */
  async getStudentById(id) {
  const { default: Student } = await import('../models/Student.js')
  const student = await Student.findById(id)
    .populate('wardenId', 'firstName lastName email phone')
    .populate('hodId', 'name email department')
    .populate('counsellorId', 'firstName lastName email department')

  if (!student) throw new NotFoundError('Student not found')

  return this.sanitizeStudent(student)
}

  /**
   * Get student by student ID
   * @param {String} studentId - Student ID
   * @returns {Promise<Object>} - Student document
   */
  async getStudentByStudentId(studentId) {
    const student = await StudentRepository.findByStudentId(studentId)
    
    if (!student) {
      throw new NotFoundError('Student not found')
    }

    return this.sanitizeStudent(student)
  }

  /**
   * Get all students with filters
   * @param {Object} filters - Filter options
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Paginated students
   */
  async getAllStudents(filters = {}, options = {}) {
    const query = {}

    // Apply filters
    if (filters.hostelBlock) {
      query.hostelBlock = filters.hostelBlock
    }

    if (filters.course) {
      query.course = filters.course
    }

    if (filters.year) {
      query.year = filters.year
    }

    if (filters.yearOfStudy) {
      query.yearOfStudy = filters.yearOfStudy
    }

    if (filters.status) {
      query.status = filters.status
    } else {
      query.status = USER_STATUS.ACTIVE // Default: only active
    }

    // Pagination
    const page = parseInt(options.page) || 1
    const limit = parseInt(options.limit) || 20

    const result = await StudentRepository.paginate(query, {
      page,
      limit,
      sort: options.sort || { createdAt: -1 },
      select: '-password'
    })

    return {
      students: result.documents.map(s => this.sanitizeStudent(s)),
      pagination: result.pagination
    }
  }

  /**
   * Update student profile
   * @param {String} id - Student ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated student
   */
  async updateProfile(id, updateData) {
    // Prevent updating sensitive fields
    const forbiddenFields = ['password', 'email', 'studentId', 'rollNumber', 'role', 'parentDetails', 'parentId']
    forbiddenFields.forEach(field => delete updateData[field])

    const student = await StudentRepository.update(id, updateData)
    
    logger.info(`StudentService: Profile updated for student ${student.studentId}`)

    return this.sanitizeStudent(student)
  }

  /**
   * Change student password
   * @param {String} id - Student ID
   * @param {String} currentPassword - Current password
   * @param {String} newPassword - New password
   * @returns {Promise<Object>} - Success message
   */
  async changePassword(id, currentPassword, newPassword) {
    const student = await StudentRepository.findById(id)
    
    // Get student with password
    const studentWithPassword = await StudentRepository.findByEmail(student.email, true)

    // Verify current password
    const isPasswordCorrect = await studentWithPassword.correctPassword(
      currentPassword, 
      studentWithPassword.password
    )

    if (!isPasswordCorrect) {
      throw new AuthenticationError('Current password is incorrect')
    }

    // Update password (will be hashed by model pre-save hook)
    studentWithPassword.password = newPassword
    // Clear forced-change flag if present (parity with authController.changePassword)
    if (studentWithPassword.mustChangePassword) studentWithPassword.mustChangePassword = false
    await studentWithPassword.save()

    logger.info(`StudentService: Password changed for student ${student.studentId}`)

    // Remove any stored generated credentials for this student to avoid showing stale plaintext
    try {
      const { Credential, AuditLog } = await import('../models/index.js')
      await Credential.deleteMany({ userId: studentWithPassword._id })
      try {
        await AuditLog.logAction({
          user: studentWithPassword._id,
          userModel: 'Student',
          action: 'update',
          resource: 'password',
          resourceId: studentWithPassword._id,
          details: { reason: 'student_changed_password' },
          status: 'success'
        })
      } catch (auditErr) {
        console.warn('Failed to write audit log for student password change:', auditErr)
      }
    } catch (err) {
      console.warn('Failed to delete stored credentials for student password change:', err)
    }

    // Return sanitized updated student so callers can respond with fresh data
    return { message: 'Password changed successfully', student: this.sanitizeStudent(studentWithPassword) }
  }

  /**
   * Suspend student account
   * @param {String} id - Student ID
   * @param {String} reason - Suspension reason
   * @returns {Promise<Object>} - Updated student
   */
  async suspendStudent(id, reason) {
    const student = await StudentRepository.updateStatus(id, USER_STATUS.SUSPENDED)

    logger.warn(`StudentService: Student suspended - ${student.studentId} - Reason: ${reason}`)

    return this.sanitizeStudent(student)
  }

  /**
   * Activate student account
   * @param {String} id - Student ID
   * @returns {Promise<Object>} - Updated student
   */
  async activateStudent(id) {
    const student = await StudentRepository.updateStatus(id, USER_STATUS.ACTIVE)

    logger.info(`StudentService: Student activated - ${student.studentId}`)

    return this.sanitizeStudent(student)
  }

  /**
   * Search students
   * @param {String} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Array of students
   */
  async searchStudents(searchTerm, options = {}) {
    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new ValidationError('Search term must be at least 2 characters')
    }

    const students = await StudentRepository.search(searchTerm, {
      limit: options.limit || 20,
      sort: { firstName: 1 }
    })

    return students.map(s => this.sanitizeStudent(s))
  }

  /**
   * Get statistics
   * @returns {Promise<Object>} - Statistics data
   */
  async getStatistics() {
    const [
      totalStudents,
      activeStudents,
      byHostelBlock,
      byYear,
      withActiveOutpasses
    ] = await Promise.all([
      StudentRepository.count(),
      StudentRepository.count({ status: USER_STATUS.ACTIVE }),
      StudentRepository.getStatsByHostelBlock(),
      StudentRepository.getStatsByYear(),
      StudentRepository.count({ activeOutpasses: { $gt: 0 } })
    ])

    return {
      total: totalStudents,
      active: activeStudents,
      suspended: await StudentRepository.count({ status: USER_STATUS.SUSPENDED }),
      withActiveOutpasses,
      byHostelBlock,
      byYear
    }
  }

  /**
   * Check if student can request outpass
   * @param {String} id - Student ID
   * @returns {Promise<Object>} - Eligibility status
   */
  async canRequestOutpass(id) {
    const student = await StudentRepository.findById(id)

    // Use dynamic profile completion computation to avoid relying on stale stored flags
    const profileInfo = typeof student.getProfileCompletion === 'function'
      ? student.getProfileCompletion()
      : { ratio: student.profileCompleted ? 1 : 0, isComplete: !!student.profileCompleted }

    const canRequest = student.status === USER_STATUS.ACTIVE && profileInfo.isComplete && student.activeOutpasses < 3

    const reasons = []
    if (student.status !== USER_STATUS.ACTIVE) reasons.push('Account is not active')
    if (!profileInfo.isComplete) reasons.push('Profile is incomplete')
    if (student.activeOutpasses >= 3) reasons.push('Maximum active outpasses limit reached')

    return {
      canRequest,
      activeOutpasses: student.activeOutpasses,
      maxAllowed: 3,
      profileCompletion: { ratio: profileInfo.ratio, filled: profileInfo.filled, total: profileInfo.total },
      reasons: canRequest ? [] : reasons
    }
  }

  /**
   * Update student parent details (Admin/Warden only)
   * Also creates/updates Parent model record
   * @param {String} studentId - Student ID
   * @param {Object} parentDetails - Parent details to update
   * @param {String} updatedBy - ID of admin/warden making the update
   * @param {String} updatedByRole - Role of updater (admin/warden)
   * @returns {Promise<Object>} - Update result
   */
  async updateParentDetails(studentId, parentDetails, updatedBy, updatedByRole) {
    const { Parent } = await import('../models/index.js')
    
    // Get student
    const student = await StudentRepository.findById(studentId)
    
    // Update student's parentDetails
    student.parentDetails = {
      ...student.parentDetails,
      ...parentDetails
    }
    
    const { guardianPhone, guardianEmail, fatherName, motherName } = student.parentDetails
    
    let parentRecord = null
    
    // Create or update Parent model
    if (guardianPhone) {
      // Check if parent already exists
      parentRecord = await Parent.findByPhone(guardianPhone)
      
      if (!parentRecord) {
        // Create new parent
        const parentData = {
          firstName: fatherName || motherName || 'Guardian',
          lastName: student.lastName,
          primaryPhone: guardianPhone,
          email: guardianEmail || undefined,
          relationshipToStudent: fatherName ? 'father' : (motherName ? 'mother' : 'guardian'),
          address: {
            city: student.permanentAddress?.city || 'To be updated',
            state: student.permanentAddress?.state || 'To be updated',
            zipCode: student.permanentAddress?.zipCode || '000000',
            street: student.permanentAddress?.street || undefined,
          },
          students: [{
            student: student._id,
            studentId: student.studentId,
            rollNumber: student.rollNumber,
            relationship: fatherName ? 'father' : (motherName ? 'mother' : 'guardian'),
            isPrimaryContact: true,
            canApproveOutpass: true,
          }],
          verification: {
            verifiedBy: updatedBy,
            verificationModel: updatedByRole === 'admin' ? 'Admin' : 'Warden',
            verificationDate: new Date(),
          },
        }
        
        parentRecord = await Parent.create(parentData)
      } else {
        // Update existing parent
        parentRecord.firstName = fatherName || motherName || parentRecord.firstName
        if (guardianEmail) parentRecord.email = guardianEmail
        
        // Check if this student is already linked
        const existingStudent = parentRecord.students.find(
          s => s.studentId === student.studentId
        )
        
        if (!existingStudent) {
          parentRecord.students.push({
            student: student._id,
            studentId: student.studentId,
            rollNumber: student.rollNumber,
            relationship: fatherName ? 'father' : (motherName ? 'mother' : 'guardian'),
            isPrimaryContact: parentRecord.students.length === 0,
            canApproveOutpass: true,
          })
        }
        
        await parentRecord.save()
      }
      
      // Link parent to student
      student.parentId = parentRecord._id
    }
    
    await student.save()
    
    logger.info(`StudentService: Parent details updated for student ${student.studentId} by ${updatedByRole}`)
    
    return {
      student: this.sanitizeStudent(student),
      parent: parentRecord ? {
        _id: parentRecord._id,
        fullName: parentRecord.fullName,
        primaryPhone: parentRecord.primaryPhone,
        email: parentRecord.email,
      } : null
    }
  }

  // ============================================
  // HELPER METHODS (Private-like methods)
  // ============================================

  /**
   * Generate JWT authentication token
   * @param {Object} student - Student document
   * @returns {String} - JWT token
   */
  generateAuthToken(student) {
    return jwt.sign(
      {
        id: student._id,
        email: student.email,
        role: student.role,
        studentId: student.studentId
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.expiresIn
      }
    )
  }

  /**
   * Remove sensitive data from student object
   * @param {Object} student - Student document
   * @returns {Object} - Sanitized student
   */
  sanitizeStudent(student) {
    if (!student) return null

    const studentObj = student.toObject ? student.toObject() : student
    
    // Remove sensitive fields
    delete studentObj.password
    delete studentObj.passwordResetToken
    delete studentObj.passwordResetExpires
    delete studentObj.emailVerificationToken
    delete studentObj.emailVerificationExpires
    delete studentObj.__v

    return studentObj
  }
}

// Export as singleton
export default new StudentService()
