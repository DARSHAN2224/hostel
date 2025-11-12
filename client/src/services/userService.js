import apiClient from './api'

export const userService = {
  getAll: async (params = {}) => {
    return await apiClient.get('/users', { params })
  },
  getStats: async () => {
    return await apiClient.get('/users/stats')
  },
  create: async (data) => {
    return await apiClient.post('/users', data)
  },
  getCredential: async (role, id) => {
    return await apiClient.get(`/users/${role}/${id}/credential`)
  },
  update: async (role, id, data) => {
    return await apiClient.patch(`/users/${role}/${id}`, data)
  },
  remove: async (role, id) => {
    return await apiClient.delete(`/users/${role}/${id}`)
  }
}

export const { getAll: getUsers, getStats: getUserStats, create: createUser, getCredential, update: updateUser, remove: deleteUser } = userService

export default userService
