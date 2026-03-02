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
   * PRIMARY scan — auto-records exit on 1st scan, return on 2nd (after 10 min cooldown).
   * Handles plain JSON QR  {"type":"outpass","outpassId":"..."}  as well as raw IDs.
   * @param {string} code - QR text, plain JSON string, or outpass ID
   * @param {Object} extra - optional { gateName, remarks }
   * @returns {Promise} { action: 'exit'|'return'|'too_soon'|'already_completed', outpass, message }
   */
  scanOutpass: async (code, extra = {}) => {
    return await apiClient.post('/security/scan', { code, ...extra })
  },

  /**
   * Verify outpass by QR code or manual code (no recording)
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

  /**
   * Get returned outpass logs (students who have returned)
   */
  getReturnedLogs: async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.skip) params.append('skip', filters.skip)

    return await apiClient.get(`/security/returned-logs?${params.toString()}`)
  },
  /**
   * Get all students who exited today (returned or not)
   */
  getExitedToday: async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.skip) params.append('skip', filters.skip)
    if (filters.hostelBlock) params.append('hostelBlock', filters.hostelBlock)
    return await apiClient.get(`/security/exited-today?${params.toString()}`)
  },

  /**
   * Get active students currently in hostel (not out)
   */
  getCurrentlyIn: async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.skip) params.append('skip', filters.skip)
    if (filters.hostelBlock) params.append('hostelBlock', filters.hostelBlock)
    return await apiClient.get(`/security/currently-in?${params.toString()}`)
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
  scanOutpass,
  verifyOutpass,
  recordExit,
  recordReturn,
  getStudentsOut,
  getRecentActivity,
  getOverdueReturns,
  getReturnedLogs,
  getExitedToday,
  getCurrentlyIn,
  getDashboardData,
  verifyByQR,
  getTodayStats,
  getOverdueStudents
} = securityService

export default securityService