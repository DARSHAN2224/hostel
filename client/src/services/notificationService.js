import api from './api'

const notificationService = {
  /**
   * Get user's notifications
   */
  getNotifications: async (filters = {}, config = {}) => {
    const params = new URLSearchParams()
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.skip) params.append('skip', filters.skip)
    if (filters.isRead !== undefined) params.append('isRead', filters.isRead)
    if (filters.type) params.append('type', filters.type)
    if (filters.priority) params.append('priority', filters.priority)

    const response = await api.get(`/notifications?${params.toString()}`, config)
    return response
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (config = {}) => {
    const response = await api.get('/notifications/unread-count', config)
    return response
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/read`)
    return response.data
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async () => {
    const response = await api.patch('/notifications/mark-all-read')
    return response.data
  },

  /**
   * Delete notification
   */
  deleteNotification: async (id) => {
    const response = await api.delete(`/notifications/${id}`)
    return response.data
  },

  /**
   * Clear all notifications
   */
  clearAll: async () => {
    const response = await api.delete('/notifications/clear-all')
    return response.data
  },
}

export default notificationService
