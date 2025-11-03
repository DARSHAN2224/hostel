/**
 * Student API Service
 */

import apiClient from './api'
import { API_ENDPOINTS } from '../constants'

export const studentService = {
  /**
   * Get all students (admin/warden)
   * @param {Object} params - Query parameters (page, limit, search, etc.)
   * @returns {Promise}
   */
  getAll: async (params = {}) => {
    return await apiClient.get(API_ENDPOINTS.STUDENTS, { params })
  },

  /**
   * Search students
   * @param {Object} searchParams
   * @returns {Promise}
   */
  search: async (searchParams) => {
    return await apiClient.get(API_ENDPOINTS.STUDENT_SEARCH, { params: searchParams })
  },

  /**
   * Get student statistics
   * @returns {Promise}
   */
  getStatistics: async () => {
    return await apiClient.get(API_ENDPOINTS.STUDENT_STATISTICS)
  },

  /**
   * Get student by ID
   * @param {string} id
   * @returns {Promise}
   */
  getById: async (id) => {
    return await apiClient.get(`${API_ENDPOINTS.STUDENTS}/${id}`)
  },

  /**
   * Get student by student ID
   * @param {string} studentId
   * @returns {Promise}
   */
  getByStudentId: async (studentId) => {
    return await apiClient.get(`${API_ENDPOINTS.STUDENTS}/by-student-id/${studentId}`)
  },

  /**
   * Get student profile (self)
   * @returns {Promise}
   */
  getProfile: async () => {
    return await apiClient.get(API_ENDPOINTS.STUDENT_PROFILE)
  },

  /**
   * Update student profile (self)
   * @param {Object} data
   * @returns {Promise}
   */
  updateProfile: async (data) => {
    return await apiClient.patch(API_ENDPOINTS.STUDENT_PROFILE, data)
  },

  /**
   * Change password (self)
   * @param {Object} passwordData - { currentPassword, newPassword }
   * @returns {Promise}
   */
  changePassword: async (passwordData) => {
    return await apiClient.post(API_ENDPOINTS.STUDENT_CHANGE_PASSWORD, passwordData)
  },

  /**
   * Create student (managed - admin/warden)
   * @param {Object} studentData
   * @returns {Promise}
   */
  create: async (studentData) => {
    return await apiClient.post(API_ENDPOINTS.USERS, { ...studentData, role: 'student' })
  },

  /**
   * Update student (admin/warden)
   * @param {string} id
   * @param {Object} data
   * @returns {Promise}
   */
  update: async (id, data) => {
    return await apiClient.patch(`${API_ENDPOINTS.STUDENTS}/${id}`, data)
  },

  /**
   * Suspend student
   * @param {string} id
   * @param {string} reason
   * @returns {Promise}
   */
  suspend: async (id, reason) => {
    return await apiClient.post(`${API_ENDPOINTS.STUDENTS}/${id}/suspend`, { reason })
  },

  /**
   * Activate student
   * @param {string} id
   * @returns {Promise}
   */
  activate: async (id) => {
    return await apiClient.post(`${API_ENDPOINTS.STUDENTS}/${id}/activate`)
  },

  /**
   * Update parent details
   * @param {string} id
   * @param {Object} parentData
   * @returns {Promise}
   */
  updateParentDetails: async (id, parentData) => {
    return await apiClient.patch(`${API_ENDPOINTS.STUDENTS}/${id}/parent-details`, parentData)
  },

  /**
   * Check if student can request outpass
   * @returns {Promise}
   */
  canRequestOutpass: async () => {
    return await apiClient.get('/students/can-request-outpass')
  },

  /**
   * Delete student
   * @param {string} id
   * @returns {Promise}
   */
  delete: async (id) => {
    return await apiClient.delete(`${API_ENDPOINTS.STUDENTS}/${id}`)
  }
}

// Named exports for convenience
export const {
  getAll: getStudents,
  search: searchStudents,
  getStatistics: getStudentStatistics,
  getById: getStudentById,
  getByStudentId,
  getProfile: getStudentProfile,
  updateProfile: updateStudentProfile,
  changePassword: changeStudentPassword,
  create: createStudent,
  update: updateStudent,
  suspend: suspendStudent,
  activate: activateStudent,
  updateParentDetails,
  canRequestOutpass,
  delete: deleteStudent
} = studentService

export default studentService
