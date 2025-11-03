/**
 * Security API Service
 */

import apiClient from './api'

export const securityService = {
  /**
   * Get security dashboard data
   * @returns {Promise}
   */
  getDashboardData: async () => {
    return await apiClient.get('/security/dashboard')
  },

  /**
   * Get active outpasses
   * @returns {Promise}
   */
  getActiveOutpasses: async () => {
    return await apiClient.get('/outpass/warden/all', {
      params: { status: 'approved' }
    })
  },

  /**
   * Verify outpass by QR code
   * @param {string} qrCode
   * @returns {Promise}
   */
  verifyByQR: async (qrCode) => {
    return await apiClient.post('/security/verify-qr', { qrCode })
  },

  /**
   * Verify outpass by student ID
   * @param {string} studentId
   * @returns {Promise}
   */
  verifyByStudentId: async (studentId) => {
    return await apiClient.get(`/students/by-student-id/${studentId}`)
  },

  /**
   * Record student exit
   * @param {string} outpassId
   * @param {Object} data
   * @returns {Promise}
   */
  recordExit: async (outpassId, data = {}) => {
    return await apiClient.post(`/security/exit/${outpassId}`, data)
  },

  /**
   * Record student return
   * @param {string} outpassId
   * @param {Object} data
   * @returns {Promise}
   */
  recordReturn: async (outpassId, data = {}) => {
    return await apiClient.post(`/security/return/${outpassId}`, data)
  },

  /**
   * Get today's gate statistics
   * @returns {Promise}
   */
  getTodayStats: async () => {
    return await apiClient.get('/security/stats/today')
  },

  /**
   * Get overdue students
   * @returns {Promise}
   */
  getOverdueStudents: async () => {
    return await apiClient.get('/security/overdue')
  },

  /**
   * Report violation
   * @param {string} outpassId
   * @param {Object} violationData
   * @returns {Promise}
   */
  reportViolation: async (outpassId, violationData) => {
    return await apiClient.post(`/security/violation/${outpassId}`, violationData)
  }
}

export const {
  getDashboardData,
  getActiveOutpasses,
  verifyByQR,
  verifyByStudentId,
  recordExit,
  recordReturn,
  getTodayStats,
  getOverdueStudents,
  reportViolation
} = securityService

export default securityService
