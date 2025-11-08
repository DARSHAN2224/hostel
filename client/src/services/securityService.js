/**
 * Security API Service
 */

import apiClient from './api'

export const securityService = {
  /**
   * Get security dashboard statistics
   * @returns {Promise}
   */
  getDashboardStats: async () => {
    return await apiClient.get('/security/dashboard/stats')
  },

  /**
   * Get active outpasses (approved and ready for gate verification)
   * @param {Object} filters - search, limit, skip
   * @returns {Promise}
   */
  getActiveOutpasses: async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.search) params.append('search', filters.search)
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.skip) params.append('skip', filters.skip)
    
    return await apiClient.get(`/security/active-outpasses?${params.toString()}`)
  },

  /**
   * Verify outpass by QR code or manual code
   * @param {string} code - QR code or outpass ID
   * @returns {Promise}
   */
  verifyOutpass: async (code) => {
    return await apiClient.post('/security/verify-outpass', { code })
  },

  /**
   * Record student exit
   * @param {string} outpassId
   * @param {Object} data - { remarks }
   * @returns {Promise}
   */
  recordExit: async (outpassId, data = {}) => {
    return await apiClient.post(`/security/record-exit/${outpassId}`, data)
  },

  /**
   * Record student return
   * @param {string} outpassId
   * @param {Object} data - { remarks }
   * @returns {Promise}
   */
  recordReturn: async (outpassId, data = {}) => {
    return await apiClient.post(`/security/record-return/${outpassId}`, data)
  },

  /**
   * Get students currently out
   * @param {Object} filters - limit, skip
   * @returns {Promise}
   */
  getStudentsOut: async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.skip) params.append('skip', filters.skip)
    
    return await apiClient.get(`/security/students-out?${params.toString()}`)
  },

  /**
   * Get recent gate activity (exits/returns)
   * @param {Object} filters - limit, skip, hours
   * @returns {Promise}
   */
  getRecentActivity: async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.skip) params.append('skip', filters.skip)
    if (filters.hours) params.append('hours', filters.hours)
    
    return await apiClient.get(`/security/recent-activity?${params.toString()}`)
  },

  /**
   * Get overdue returns (students who haven't returned on time)
   * @param {Object} filters - limit, skip
   * @returns {Promise}
   */
  getOverdueReturns: async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.skip) params.append('skip', filters.skip)
    
    return await apiClient.get(`/security/overdue-returns?${params.toString()}`)
  },

  // Legacy methods for backward compatibility
  getDashboardData: async () => {
    return await apiClient.get('/security/dashboard/stats')
  },

  verifyByQR: async (qrCode) => {
    return await apiClient.post('/security/verify-outpass', { code: qrCode })
  },

  getTodayStats: async () => {
    return await apiClient.get('/security/dashboard/stats')
  },

  getOverdueStudents: async () => {
    return await apiClient.get('/security/overdue-returns')
  }
}

export const {
  getDashboardStats,
  getActiveOutpasses,
  verifyOutpass,
  recordExit,
  recordReturn,
  getStudentsOut,
  getRecentActivity,
  getOverdueReturns,
  getDashboardData,
  verifyByQR,
  getTodayStats,
  getOverdueStudents
} = securityService

export default securityService
