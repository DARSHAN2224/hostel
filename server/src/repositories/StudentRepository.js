/**
 * Student Repository
 * 
 * OOP Concept: Inheritance
 * - Extends BaseRepository to get common database operations
 * - Adds Student-specific database queries
 * 
 * Benefits:
 * - All Student database operations in one place
 * - Easy to test (can mock the repository)
 * - Clean separation from business logic
 */

import BaseRepository from './BaseRepository.js'
import Student from '../models/Student.js'
import { ConflictError } from '../utils/customErrors.js'
import { USER_STATUS } from '../utils/constants.js'

class StudentRepository extends BaseRepository {
  constructor() {
    super(Student) // Pass Student model to BaseRepository
  }

  /**
   * Find student by email
   * @param {String} email - Student email
   * @param {Boolean} includePassword - Include password in result
   * @returns {Promise<Object|null>} - Student document or null
   */
  async findByEmail(email, includePassword = false) {
    let query = this.model.findOne({ email: email.toLowerCase() })
    
    if (includePassword) {
      query = query.select('+password') // Password is excluded by default
    }
    
    return await query.exec()
  }

  /**
   * Find student by student ID
   * @param {String} studentId - Student ID
   * @returns {Promise<Object|null>} - Student document or null
   */
  async findByStudentId(studentId) {
    return await this.findOne({ studentId: studentId.toUpperCase() })
  }

  /**
   * Find student by roll number
   * @param {String} rollNumber - Roll number
   * @returns {Promise<Object|null>} - Student document or null
   */
  async findByRollNumber(rollNumber) {
    return await this.findOne({ rollNumber: rollNumber.toUpperCase() })
  }

  /**
   * Find all students in a hostel block
   * @param {String} hostelBlock - Hostel block name
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of students
   */
  async findByHostelBlock(hostelBlock, options = {}) {
    return await this.findAll(
      { 
        hostelBlock,
        status: USER_STATUS.ACTIVE 
      },
      options
    )
  }

  /**
   * Find all students by course and year
   * @param {String} course - Course name
   * @param {Number} year - Academic year (e.g., 2025)
   * @param {Number} yearOfStudy - Year of study (1..6)
   * @returns {Promise<Array>} - Array of students
   */
  async findByCourseAndYear(course, year, yearOfStudy) {
    const query = { course, status: USER_STATUS.ACTIVE }
    if (typeof year !== 'undefined' && year !== null) query.year = year
    if (typeof yearOfStudy !== 'undefined' && yearOfStudy !== null) query.yearOfStudy = yearOfStudy

    return await this.findAll(query)
  }

  /**
   * Get students with incomplete profiles
   * @returns {Promise<Array>} - Array of students
   */
  async findIncompleteProfiles() {
    return await this.findAll({ 
      profileCompleted: false,
      status: USER_STATUS.ACTIVE 
    })
  }

  /**
   * Get students with active outpasses
   * @returns {Promise<Array>} - Array of students
   */
  async findWithActiveOutpasses() {
    return await this.findAll({ 
      activeOutpasses: { $gt: 0 },
      status: USER_STATUS.ACTIVE 
    })
  }

  /**
   * Update student status
   * @param {String} id - Student ID
   * @param {String} status - New status
   * @returns {Promise<Object>} - Updated student
   */
  async updateStatus(id, status) {
    return await this.update(id, { status })
  }

  /**
   * Increment active outpasses count
   * @param {String} id - Student ID
   * @returns {Promise<Object>} - Updated student
   */
  async incrementActiveOutpasses(id) {
    const student = await this.findById(id)
    
    if (student.activeOutpasses >= 3) {
      throw new ConflictError('Student already has maximum active outpasses')
    }
    
    return await this.model.findByIdAndUpdate(
      id,
      { $inc: { activeOutpasses: 1 } },
      { new: true }
    )
  }

  /**
   * Decrement active outpasses count
   * @param {String} id - Student ID
   * @returns {Promise<Object>} - Updated student
   */
  async decrementActiveOutpasses(id) {
    return await this.model.findByIdAndUpdate(
      id,
      { $inc: { activeOutpasses: -1 } },
      { new: true }
    )
  }

  /**
   * Update last login
   * @param {String} id - Student ID
   * @returns {Promise<Object>} - Updated student
   */
  async updateLastLogin(id) {
    return await this.update(id, {
      lastLogin: new Date(),
      $inc: { loginCount: 1 }
    })
  }

  /**
   * Get statistics by hostel block
   * @returns {Promise<Array>} - Statistics array
   */
  async getStatsByHostelBlock() {
    return await this.model.aggregate([
      {
        $group: {
          _id: '$hostelBlock',
          totalStudents: { $sum: 1 },
          activeStudents: {
            $sum: { $cond: [{ $eq: ['$status', USER_STATUS.ACTIVE] }, 1, 0] }
          },
          studentsWithOutpasses: {
            $sum: { $cond: [{ $gt: ['$activeOutpasses', 0] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ])
  }

  /**
   * Get statistics by year
   * @returns {Promise<Array>} - Statistics array
   */
  async getStatsByYear() {
    return await this.model.aggregate([
      {
        $group: {
          _id: '$year',
          totalStudents: { $sum: 1 },
          activeStudents: {
            $sum: { $cond: [{ $eq: ['$status', USER_STATUS.ACTIVE] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ])
  }

  /**
   * Search students by name, studentId, or rollNumber
   * @param {String} searchTerm - Search term
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of students
   */
  async search(searchTerm, options = {}) {
    const searchRegex = new RegExp(searchTerm, 'i') // Case-insensitive
    
    return await this.findAll(
      {
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { studentId: searchRegex },
          { rollNumber: searchRegex },
          { email: searchRegex }
        ],
        status: USER_STATUS.ACTIVE
      },
      options
    )
  }
}

// Export as singleton (single instance used throughout the app)
export default new StudentRepository()
