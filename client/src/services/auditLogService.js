import apiClient from './api'

/**
 * Audit Log Service
 * Handles all audit log-related API calls
 */

// Get audit logs
export const getAuditLogs = async (filters = {}) => {
  const response = await apiClient.get('/audit-logs', { params: filters })
  return response.data
}

// Get user activity logs
export const getUserActivityLogs = async (userId, pagination = {}) => {
  const response = await apiClient.get(`/audit-logs/user/${userId}`, { params: pagination })
  return response.data
}

// Get audit statistics
export const getAuditStatistics = async (dateRange = {}) => {
  const response = await apiClient.get('/audit-logs/statistics', { params: dateRange })
  return response.data
}

export default {
  getAuditLogs,
  getUserActivityLogs,
  getAuditStatistics,
}
