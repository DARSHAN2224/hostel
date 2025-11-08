import api from './api'

const PARENT_BASE_URL = '/parents'

export const parentService = {
  /**
   * Get all parents with search and filters
   */
  async getAllParents(params = {}) {
    const response = await api.get(PARENT_BASE_URL, { params })
    return response.data
  },

  /**
   * Get parent by ID
   */
  async getParentById(id) {
    const response = await api.get(`${PARENT_BASE_URL}/${id}`)
    return response.data
  },

  /**
   * Create new parent
   */
  async createParent(parentData) {
    const response = await api.post(PARENT_BASE_URL, parentData)
    return response.data
  },

  /**
   * Update parent
   */
  async updateParent(id, parentData) {
    const response = await api.patch(`${PARENT_BASE_URL}/${id}`, parentData)
    return response.data
  },

  /**
   * Delete parent
   */
  async deleteParent(id) {
    const response = await api.delete(`${PARENT_BASE_URL}/${id}`)
    return response.data
  },

  /**
   * Add student to parent
   */
  async addStudent(parentId, studentData) {
    const response = await api.post(
      `${PARENT_BASE_URL}/${parentId}/students`,
      studentData
    )
    return response.data
  },

  /**
   * Remove student from parent
   */
  async removeStudent(parentId, studentId) {
    const response = await api.delete(
      `${PARENT_BASE_URL}/${parentId}/students/${studentId}`
    )
    return response.data
  },

  /**
   * Get parent statistics
   */
  async getStats() {
    const response = await api.get(`${PARENT_BASE_URL}/stats`)
    return response.data
  }
}

export default parentService
