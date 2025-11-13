/**
 * HOD API Service
 */

import apiClient from './api'

export const hodService = {
  /**
   * Get all HODs (admin/super admin)
   * @returns {Promise}
   */
  getAll: async () => {
    return await apiClient.get('/hods/all');
  },
  /**
   * HOD login
   * @param {Object} credentials - { email, password }
   * @returns {Promise}
   */
  login: async (credentials) => {
    return await apiClient.post('/hods/login', credentials)
  },

  /**
   * Create a new HOD (admin)
   * @param {Object} hodData
   */
  create: async (hodData) => {
    return await apiClient.post('/hods/create', hodData)
  },

  /**
   * Get HOD profile
   * @returns {Promise}
   */
  getProfile: async () => {
    return await apiClient.get('/hods/profile')
  },

  /**
   * Get HOD dashboard data
   * @returns {Promise}
   */
  getDashboard: async () => {
    return await apiClient.get('/outpass/hod/dashboard')
  },

  /**
   * Get students by department
   * @returns {Promise}
   */
  getStudents: async () => {
    return await apiClient.get('/hods/students')
  },

  /**
   * Get pending outpass approvals
   * @returns {Promise}
   */
  getPendingApprovals: async () => {
    return await apiClient.get('/outpass/hod/dashboard')
  },

  /**
   * Approve outpass
   * @param {string} requestId
   * @param {string} comments
   * @returns {Promise}
   */
  approveOutpass: async (requestId, comments = '') => {
    return await apiClient.post(`/outpass/hod/approve/${requestId}`, { comments })
  },

  /**
   * Reject outpass
   * @param {string} requestId
   * @param {string} reason
   * @returns {Promise}
   */
  rejectOutpass: async (requestId, reason) => {
    return await apiClient.post(`/outpass/hod/reject/${requestId}`, { reason })
  },

  /**
   * Get department statistics
   * @returns {Promise}
   */
  getDepartmentStats: async () => {
    return await apiClient.get('/hods/statistics')
  },

  /**
   * Update HOD profile
   * @param {Object} data
   * @returns {Promise}
   */
  updateProfile: async (data) => {
    return await apiClient.put('/hods/profile', data)
  }
  ,
  /**
   * Delete a HOD (admin)
   * @param {string} hodId
   */
  delete: async (hodId) => {
    return await apiClient.delete(`/hods/delete/${hodId}`)
  }
}

export const {
  login: hodLogin,
  getProfile: getHODProfile,
  getDashboard: getHODDashboard,
  getStudents: getHODStudents,
  getPendingApprovals,
  approveOutpass: hodApproveOutpass,
  rejectOutpass: hodRejectOutpass,
  getDepartmentStats,
  updateProfile: updateHODProfile
} = hodService

export default hodService
