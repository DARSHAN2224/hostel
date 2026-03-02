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
   * HOD dashboard data
   * @returns {Promise}
   */
  getHodDashboard: async () => {
    return await apiClient.get('/outpass/hod/dashboard')
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
    return await apiClient.delete(`/outpass/${requestId}/cancel`, { data: { reason } })
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
   * Get overdue outpasses.
   * Backend route: GET /security/overdue-returns (requires auth, security/warden/admin role).
   * @returns {Promise}
   */
  getOverdue: async () => {
    return await apiClient.get('/security/overdue-returns')
  },

  /**
   * Get expiring outpasses.
   * No dedicated backend endpoint exists. Falls back to fetching all approved
   * outpasses and filtering client-side by expectedReturnTime within `hours`.
   * @param {number} hours - Hours threshold (default 24)
   * @returns {Promise<{data: {outpasses: Array}}>}
   */
  getExpiring: async (hours = 24) => {
    const response = await apiClient.get(API_ENDPOINTS.OUTPASS_LIST, {
      params: { status: 'approved' }
    })
    const payload = response?.data || response
    const list = payload?.outpasses || payload?.requests || (Array.isArray(payload) ? payload : [])
    const cutoff = new Date(Date.now() + hours * 60 * 60 * 1000)
    const expiring = list.filter(o => {
      const ret = o.expectedReturnTime || o.returnDateTime
      return ret && new Date(ret) <= cutoff && new Date(ret) > new Date()
    })
    // Return same shape as a real API response so callers don't need to change
    return { data: { outpasses: expiring } }
  },

  /**
   * Bulk approve outpasses
   * @param {Array<string>} outpassIds - Array of outpass IDs
   * @param {string} comments - Optional comments
   * @returns {Promise}
   */
  bulkApprove: async (outpassIds, comments = '') => {
    return await apiClient.post('/outpass/bulk/approve', { outpassIds, comments })
  },

  /**
   * Get outpass history with filters (admin/warden view)
   * @param {Object} params - Query parameters (status, search, page, limit, etc.)
   * @returns {Promise}
   */
  getHistory: async (params = {}) => {
    return await apiClient.get(API_ENDPOINTS.OUTPASS_LIST, { params })
  },

  /**
   * Get my outpass history (student).
   * Backend route: GET /outpass/student/my-outpasses
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getMyHistory: async (params = {}) => {
    return await apiClient.get('/outpass/student/my-outpasses', { params })
  },

  /**
   * Get complete history with analytics
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getCompleteHistory: async (params = {}) => {
    return await apiClient.get(API_ENDPOINTS.OUTPASS_LIST, {
      params: { ...params, includeAnalytics: true }
    })
  },

  /**
   * Bulk reject outpasses
   * @param {Array<string>} outpassIds - Array of outpass IDs
   * @param {string} reason - Rejection reason
   * @returns {Promise}
   */
  bulkReject: async (outpassIds, reason) => {
    return await apiClient.post('/outpass/bulk/reject', { outpassIds, reason })
  }
}

// Parent-related actions
outpassService.requestParentOtp = async (requestId) => {
  return await apiClient.post(`/outpass/parent/request-otp/${requestId}`)
}

outpassService.parentApprove = async (requestId, otp, comments = '') => {
  return await apiClient.post(`/outpass/parent/approve/${requestId}`, { otp, comments })
}

outpassService.sendToHod = async (requestId) => {
  return await apiClient.post(`/outpass/warden/send-to-hod/${requestId}`)
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
  getHodDashboard,
  cancel: cancelOutpass,
  recordExit,
  recordReturn,
  getStatistics: getOutpassStatistics,
  getOverdue,
  getExpiring,
  bulkApprove,
  bulkReject,
  getHistory,
  getMyHistory,
  getCompleteHistory
} = outpassService

export default outpassService