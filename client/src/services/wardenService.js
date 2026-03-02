/**
 * Warden API Service
 */

import apiClient from './api'
import { API_ENDPOINTS } from '../constants'

export const wardenService = {
  // ============ Warden CRUD Operations (Admin) ============
  
  /**
   * Get all wardens with optional filters
   * @param {Object} filters - { hostelType, hostelBlock, search }
   * @returns {Promise} - List of wardens
   */
  getWardens: async (filters = {}) => {
    try {
      const params = {
        role: 'warden',
        limit: 100,
        ...filters
      }
      
      // Remove empty filter values
      for (const key of Object.keys(params)) {
        if (params[key] === '' || params[key] === undefined || params[key] === null) {
          delete params[key]
        }
      }
      
  const response = await apiClient.get(API_ENDPOINTS.USERS, { params })
  // Robustly extract users array regardless of axios response structure
  const users = response?.data?.users || response?.data?.data?.users || response?.users || [];
  return users;
    } catch (error) {
      console.error('Failed to fetch wardens:', error)
      throw error
    }
  },

  /**
   * Create a new warden
   * @param {Object} wardenData - Warden information
   * @returns {Promise} - Created warden
   */
  create: async (wardenData) => {
    try {
      // Use explicit firstName / lastName from form
      const firstName = wardenData.firstName || 'Warden'
      const lastName = wardenData.lastName || ''
      const payload = {
        role: 'warden',
        email: wardenData.email,
        // If password is not provided, let the backend generate one (admin-created flows)
        ...(wardenData.password ? { password: wardenData.password } : {}),
  firstName,
  lastName,
        phone: wardenData.phone,
        hostelType: wardenData.hostelType,
        assignedHostelBlocks: [
          {
            blockName: wardenData.hostelBlock,
            isPrimary: true,
            floors: [],
            totalRooms: 0,
            currentOccupancy: 0
          }
        ]
      };
      // Include emergency contact if provided
      if (wardenData.emergencyContact) payload.emergencyContact = wardenData.emergencyContact
      const response = await apiClient.post(API_ENDPOINTS.USERS, payload);
      return response.data;
    } catch (error) {
      console.error('Failed to create warden:', error);
      throw error;
    }
  },

  /**
   * Update warden information
   * @param {String} id - Warden ID
   * @param {Object} updates - Updated fields
   * @returns {Promise} - Updated warden
   */
  update: async (id, updates) => {
    try {
      const payload = {}
      
      // Map frontend fields to backend fields
      if (updates.firstName || updates.lastName) {
        payload.firstName = updates.firstName || (updates.name ? updates.name.split(' ')[0] : undefined)
        payload.lastName = updates.lastName || (updates.name ? updates.name.split(' ').slice(1).join(' ') : undefined)
      }
      if (updates.email) payload.email = updates.email
      if (updates.phone) payload.phone = updates.phone
      if (updates.status) payload.status = updates.status
      // Emergency contact can be updated as a nested object
      if (updates.emergencyContact) payload.emergencyContact = updates.emergencyContact
      // assignedHostelBlocks may be provided directly from admin UI
      // If a simple `hostelBlock` string was provided (common in the edit form),
      // translate it into the expected `assignedHostelBlocks` array shape for the API.
      if (updates.assignedHostelBlocks) payload.assignedHostelBlocks = updates.assignedHostelBlocks
      else if (updates.hostelBlock) payload.assignedHostelBlocks = [{ blockName: updates.hostelBlock, isPrimary: true }]
      
      const response = await apiClient.patch(`${API_ENDPOINTS.USERS}/warden/${id}`, payload)
      return response.data
    } catch (error) {
      console.error('Failed to update warden:', error)
      throw error
    }
  },

  /**
   * Delete a warden
   * @param {String} id - Warden ID
   * @returns {Promise}
   */
  delete: async (id) => {
    try {
      const response = await apiClient.delete(`${API_ENDPOINTS.USERS}/warden/${id}`)
      return response.data
    } catch (error) {
      console.error('Failed to delete warden:', error)
      throw error
    }
  },

  /**
   * Get warden by ID
   * @param {String} id - Warden ID
   * @returns {Promise} - Warden details
   */
  getById: async (id) => {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.USERS}/warden/${id}`)
      return response.data?.data
    } catch (error) {
      console.error('Failed to fetch warden:', error)
      throw error
    }
  },

  /**
   * Get wardens by hostel type
   * @param {String} hostelType - 'boys' or 'girls'
   * @returns {Promise} - List of wardens
   */
  getByHostelType: async (hostelType) => {
    return wardenService.getWardens({ hostelType })
  },

  /**
   * Get wardens by hostel block
   * @param {String} hostelBlock - Block name (A, B, C, D)
   * @returns {Promise} - List of wardens
   */
  getByHostelBlock: async (hostelBlock) => {
    return wardenService.getWardens({ hostelBlock })
  },

  // ============ Warden Dashboard Operations ============
  
  /**
   * Get warden dashboard statistics
   * @returns {Promise}
   */
  getDashboardStats: async () => {
    return await apiClient.get('/wardens/dashboard/stats')
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
    return await apiClient.get('/students/statistics')
},

  /**
   * Contact parent
   * @param {string} studentId
   * @param {Object} message
   * @returns {Promise}
   */
  contactParent: async (requestId, message) => {
    return await apiClient.post(`/outpass/parent/request-otp/${requestId}`, message)
  },

  /**
   * Get activity feed
   * @param {Object} params
   * @returns {Promise}
   */
  getActivityFeed: async (params = {}) => {
    return await apiClient.get('/outpass/warden/all', { params })
  },

  /**
   * Get recent activities
   * @param {number} limit
   * @returns {Promise}
   */
  getRecentActivities: async (limit = 10) => {
    return await apiClient.get('/outpass/warden/all', { params: { limit } })
  },
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
