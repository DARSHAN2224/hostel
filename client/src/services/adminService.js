/**
 * Admin API Service
 */

import apiClient from './api'

export const adminService = {
  /**
   * Get dashboard statistics
   * @returns {Promise}
   */
  getDashboardStats: async () => {
    return await apiClient.get('/admin/dashboard/stats')
  },

  /**
   * Get all users by role
   * @param {string} role - User role
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getUsersByRole: async (role, params = {}) => {
    return await apiClient.get(`/admin/users/${role}`, { params })
  },

  /**
   * Create managed user (student, warden, security, admin)
   * @param {Object} userData
   * @returns {Promise}
   */
  createUser: async (userData) => {
    return await apiClient.post('/users', userData)
  },

  /**
   * Update user
   * @param {string} userId
   * @param {Object} data
   * @returns {Promise}
   */
  updateUser: async (userId, data) => {
    return await apiClient.put(`/admin/users/${userId}`, data)
  },

  /**
   * Delete user
   * @param {string} userId
   * @returns {Promise}
   */
  deleteUser: async (userId) => {
    return await apiClient.delete(`/admin/users/${userId}`)
  },

  /**
   * Get system statistics
   * @returns {Promise}
   */
  getSystemStats: async () => {
    return await apiClient.get('/admin/statistics')
  },

  /**
   * Get activity logs
   * @param {Object} params
   * @returns {Promise}
   */
  getActivityLogs: async (params = {}) => {
    return await apiClient.get('/admin/activity-logs', { params })
  },

  /**
   * Get all wardens
   * @returns {Promise}
   */
  getWardens: async () => {
    return await apiClient.get('/admin/wardens')
  },

  /**
   * Get all security personnel
   * @returns {Promise}
   */
  getSecurityPersonnel: async () => {
    return await apiClient.get('/admin/security')
  },

  /**
   * Update system settings
   * @param {Object} settings
   * @returns {Promise}
   */
  updateSettings: async (settings) => {
    return await apiClient.put('/admin/settings', settings)
  }
}

export const {
  getDashboardStats,
  getUsersByRole,
  createUser,
  updateUser,
  deleteUser,
  getSystemStats,
  getActivityLogs,
  getWardens,
  getSecurityPersonnel,
  updateSettings
} = adminService

export default adminService
