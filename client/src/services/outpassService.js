/**
 * Outpass API Service
 */

import apiClient from './api'
import { API_ENDPOINTS } from '../constants'

export const outpassService = {
  /**
   * Create outpass request (warden)
   * @param {Object} outpassData
   * @returns {Promise}
   */
  create: async (outpassData) => {
    return await apiClient.post(API_ENDPOINTS.OUTPASS_CREATE, outpassData)
  },

  /**
   * Get all outpass requests (warden)
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getAll: async (params = {}) => {
    return await apiClient.get(API_ENDPOINTS.OUTPASS_LIST, { params })
  },

  /**
   * Get my outpasses (student)
   * @param {Object} params
   * @returns {Promise}
   */
  getMyOutpasses: async (params = {}) => {
    return await apiClient.get(API_ENDPOINTS.OUTPASS_MY, { params })
  },

  /**
   * Get outpass by ID
   * @param {string} id
   * @returns {Promise}
   */
  getById: async (id) => {
    return await apiClient.get(`/outpass/${id}`)
  },

  /**
   * Approve outpass (warden)
   * @param {string} requestId
   * @param {string} comments
   * @returns {Promise}
   */
  approve: async (requestId, comments = '') => {
    return await apiClient.post(`${API_ENDPOINTS.OUTPASS_APPROVE}/${requestId}`, { comments })
  },

  /**
   * Reject outpass (warden)
   * @param {string} requestId
   * @param {string} reason
   * @returns {Promise}
   */
  reject: async (requestId, reason) => {
    return await apiClient.post(`${API_ENDPOINTS.OUTPASS_REJECT}/${requestId}`, { reason })
  },

  /**
   * Get warden dashboard data
   * @returns {Promise}
   */
  getWardenDashboard: async () => {
    return await apiClient.get(API_ENDPOINTS.OUTPASS_DASHBOARD)
  },

  /**
   * HOD approve outpass
   * @param {string} requestId
   * @param {string} comments
   * @returns {Promise}
   */
  hodApprove: async (requestId, comments = '') => {
    return await apiClient.post(`/outpass/hod/approve/${requestId}`, { comments })
  },

  /**
   * HOD reject outpass
   * @param {string} requestId
   * @param {string} reason
   * @returns {Promise}
   */
  hodReject: async (requestId, reason) => {
    return await apiClient.post(`/outpass/hod/reject/${requestId}`, { reason })
  },

  /**
   * Cancel outpass
   * @param {string} requestId
   * @param {string} reason
   * @returns {Promise}
   */
  cancel: async (requestId, reason) => {
    return await apiClient.post(`/outpass/${requestId}/cancel`, { reason })
  },

  /**
   * Record exit (security)
   * @param {string} requestId
   * @returns {Promise}
   */
  recordExit: async (requestId) => {
    return await apiClient.post(`/outpass/${requestId}/exit`)
  },

  /**
   * Record return (security)
   * @param {string} requestId
   * @returns {Promise}
   */
  recordReturn: async (requestId) => {
    return await apiClient.post(`/outpass/${requestId}/return`)
  },

  /**
   * Get outpass statistics
   * @param {Object} dateRange
   * @returns {Promise}
   */
  getStatistics: async (dateRange = {}) => {
    return await apiClient.get('/outpass/statistics', { params: dateRange })
  },

  /**
   * Get overdue outpasses
   * @returns {Promise}
   */
  getOverdue: async () => {
    return await apiClient.get('/outpass/overdue')
  },

  /**
   * Get expiring outpasses
   * @param {number} hours - Hours threshold (default 24)
   * @returns {Promise}
   */
  getExpiring: async (hours = 24) => {
    return await apiClient.get(`/outpass/expiring?hours=${hours}`)
  }
}

// Named exports for convenience
export const {
  create: createOutpass,
  getAll: getOutpasses,
  getMyOutpasses,
  getById: getOutpassById,
  approve: approveOutpass,
  reject: rejectOutpass,
  getWardenDashboard,
  hodApprove,
  hodReject,
  cancel: cancelOutpass,
  recordExit,
  recordReturn,
  getStatistics: getOutpassStatistics,
  getOverdue,
  getExpiring
} = outpassService

export default outpassService
