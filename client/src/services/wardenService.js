/**
 * Warden API Service
 */

import apiClient from './api'

export const wardenService = {
  /**
   * Get warden dashboard statistics
   * @returns {Promise}
   */
  getDashboardStats: async () => {
    return await apiClient.get('/warden/dashboard/stats')
  },

  /**
   * Get assigned students
   * @param {Object} params
   * @returns {Promise}
   */
  getAssignedStudents: async (params = {}) => {
    return await apiClient.get('/students', { params })
  },

  /**
   * Get all outpass requests
   * @param {Object} params
   * @returns {Promise}
   */
  getOutpassRequests: async (params = {}) => {
    return await apiClient.get('/outpass/warden/all', { params })
  },

  /**
   * Approve outpass
   * @param {string} requestId
   * @param {string} comments
   * @returns {Promise}
   */
  approveOutpass: async (requestId, comments = '') => {
    return await apiClient.post(`/outpass/warden/approve/${requestId}`, { comments })
  },

  /**
   * Reject outpass
   * @param {string} requestId
   * @param {string} reason
   * @returns {Promise}
   */
  rejectOutpass: async (requestId, reason) => {
    return await apiClient.post(`/outpass/warden/reject/${requestId}`, { reason })
  },

  /**
   * Create outpass request
   * @param {Object} outpassData
   * @returns {Promise}
   */
  createOutpass: async (outpassData) => {
    return await apiClient.post('/outpass/create', outpassData)
  },

  /**
   * Get hostel block statistics
   * @returns {Promise}
   */
  getBlockStats: async () => {
    return await apiClient.get('/warden/block-stats')
  },

  /**
   * Contact parent
   * @param {string} studentId
   * @param {Object} message
   * @returns {Promise}
   */
  contactParent: async (studentId, message) => {
    return await apiClient.post(`/warden/contact-parent/${studentId}`, message)
  },

  /**
   * Get activity feed
   * @param {Object} params
   * @returns {Promise}
   */
  getActivityFeed: async (params = {}) => {
    return await apiClient.get('/warden/activity', { params })
  },

  /**
   * Get recent activities
   * @param {number} limit
   * @returns {Promise}
   */
  getRecentActivities: async (limit = 10) => {
    return await apiClient.get('/warden/recent-activities', { params: { limit } })
  }
}

export const {
  getDashboardStats,
  getAssignedStudents,
  getOutpassRequests,
  approveOutpass: wardenApproveOutpass,
  rejectOutpass: wardenRejectOutpass,
  createOutpass,
  getBlockStats,
  contactParent,
  getActivityFeed,
  getRecentActivities
} = wardenService

export default wardenService
