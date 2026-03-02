/**
 * Admin API Service
 *
 * All methods use real backend routes — there is no /api/v1/admin prefix.
 * Existing endpoints:
 *   /users              → userManagementController  (create, list, stats)
 *   /users/:role/:id    → userManagementController  (get, update, delete)
 *   /reports/...        → reportController           (dashboard stats)
 *   /audit-logs         → auditLogController         (activity logs)
 *   /wardens            → wardenController           (warden list)
 */

import apiClient from './api'

export const adminService = {
  /**
   * Get dashboard statistics (outpass counts, student counts, etc.)
   * Backend: GET /api/v1/reports/dashboard-stats
   */
  getDashboardStats: async () => {
    return await apiClient.get('/reports/dashboard-stats')
  },

  /**
   * Get all users, optionally filtered by role.
   * Backend: GET /api/v1/users?role=:role&...params
   *
   * Changed from: GET /admin/users/:role
   * Reason: no /admin prefix exists; /users accepts a role query param.
   *
   * @param {string} role - 'student' | 'warden' | 'admin' | 'security' | 'hod' | 'all'
   * @param {Object} params - additional query params (page, limit, search, etc.)
   */
  getUsersByRole: async (role, params = {}) => {
    const query = role && role !== 'all' ? { role, ...params } : params
    return await apiClient.get('/users', { params: query })
  },

  /**
   * Create a managed user (student, warden, security, admin, hod).
   * Backend: POST /api/v1/users
   * (unchanged — was already correct)
   *
   * @param {Object} userData
   */
  createUser: async (userData) => {
    return await apiClient.post('/users', userData)
  },

  /**
   * Update a user.
   * Backend: PATCH /api/v1/users/:role/:id
   *
   * Changed from: PUT /admin/users/:userId  (no role, no /admin prefix)
   * Reason: backend route is /users/:role/:id via PATCH.
   * Signature updated to include role to match backend requirement.
   *
   * @param {string} role  - user's role (student | warden | admin | security | hod)
   * @param {string} id    - user's _id
   * @param {Object} data  - fields to update
   */
  updateUser: async (role, id, data) => {
    return await apiClient.patch(`/users/${role}/${id}`, data)
  },

  /**
   * Delete a user.
   * Backend: DELETE /api/v1/users/:role/:id
   *
   * Changed from: DELETE /admin/users/:userId  (no role, no /admin prefix)
   * Reason: backend requires role in the path.
   * Signature updated to include role.
   *
   * @param {string} role - user's role
   * @param {string} id   - user's _id
   */
  deleteUser: async (role, id) => {
    return await apiClient.delete(`/users/${role}/${id}`)
  },

  /**
   * Get aggregated system / user statistics.
   * Backend: GET /api/v1/users/stats
   *
   * Changed from: GET /admin/statistics
   * Reason: no /admin prefix; stats live at /users/stats.
   */
  getSystemStats: async () => {
    return await apiClient.get('/users/stats')
  },

  /**
   * Get activity / audit logs.
   * Backend: GET /api/v1/audit-logs
   *
   * Changed from: GET /admin/activity-logs
   * Reason: the audit log route is mounted at /audit-logs, not /admin/activity-logs.
   *
   * @param {Object} params - filters: action, resource, startDate, endDate, page, limit
   */
  getActivityLogs: async (params = {}) => {
    return await apiClient.get('/audit-logs', { params })
  },

  /**
   * Get all wardens.
   * Backend: GET /api/v1/wardens
   *
   * Changed from: GET /admin/wardens
   * Reason: wardens are mounted at /wardens, not under /admin.
   *
   * @param {Object} params - optional filters (hostelType, status, etc.)
   */
  getWardens: async (params = {}) => {
    return await apiClient.get('/wardens', { params })
  },

  /**
   * Get all security personnel.
   * Backend: GET /api/v1/users?role=security
   *
   * Changed from: GET /admin/security
   * Reason: no /admin/security route; security staff are fetched via /users with role filter.
   *
   * @param {Object} params - additional query params
   */
  getSecurityPersonnel: async (params = {}) => {
    return await apiClient.get('/users', { params: { role: 'security', ...params } })
  },

  /**
   * Update system settings.
   *
   * NOTE: No backend endpoint exists for this yet (no /admin/settings route is mounted).
   * This stub throws a clear error so callers fail visibly rather than hitting a 404.
   * Implement the backend route before wiring this up.
   *
   * @param {Object} _settings
   */
  // eslint-disable-next-line no-unused-vars
  updateSettings: async (_settings) => {
    throw new Error(
      'updateSettings is not yet implemented on the backend. ' +
      'Add POST/PUT /api/v1/settings and mount it in app.js first.'
    )
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