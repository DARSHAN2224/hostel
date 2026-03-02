import apiClient from './api.js'

// ─── Counsellor self-service ──────────────────────────────────────────────────

// GET /api/v1/counsellors/dashboard
const getDashboard = async () => {
  const response = await apiClient.get('/counsellors/dashboard')
  return response.data
}

// GET /api/v1/counsellors/profile
const getProfile = async () => {
  const response = await apiClient.get('/counsellors/profile')
  return response.data
}

// PATCH /api/v1/counsellors/profile
const updateProfile = async (profileData) => {
  const response = await apiClient.patch('/counsellors/profile', profileData)
  return response.data
}

// GET /api/v1/counsellors/outpasses?status=<status>
const getOutpasses = async (params = {}) => {
  const response = await apiClient.get('/counsellors/outpasses', { params })
  return response.data
}

// GET /api/v1/counsellors/students
const getStudents = async () => {
  const response = await apiClient.get('/counsellors/students')
  return response.data
}

// POST /api/v1/counsellors/approve/:requestId
const approveOutpass = async (requestId, comments = '') => {
  const response = await apiClient.post(`/counsellors/approve/${requestId}`, { comments })
  return response.data
}

// POST /api/v1/counsellors/reject/:requestId
const rejectOutpass = async (requestId, reason) => {
  const response = await apiClient.post(`/counsellors/reject/${requestId}`, { reason })
  return response.data
}

// ─── Admin: counsellor management ────────────────────────────────────────────

// GET /api/v1/counsellors
const getAllCounsellors = async (params = {}) => {
  const response = await apiClient.get('/counsellors', { params })
  return response.data
}

// GET /api/v1/counsellors/stats
const getStats = async () => {
  const response = await apiClient.get('/counsellors/stats')
  return response.data
}

// GET /api/v1/counsellors/:id
const getCounsellorById = async (id) => {
  const response = await apiClient.get(`/counsellors/${id}`)
  return response.data
}

// PATCH /api/v1/counsellors/:id
const updateCounsellor = async (id, data) => {
  const response = await apiClient.patch(`/counsellors/${id}`, data)
  return response.data
}

// DELETE /api/v1/counsellors/:id
const deleteCounsellor = async (id) => {
  const response = await apiClient.delete(`/counsellors/${id}`)
  return response.data
}

const counsellorService = {
  getDashboard,
  getProfile,
  updateProfile,
  getOutpasses,
  getStudents,
  approveOutpass,
  rejectOutpass,
  getAllCounsellors,
  getStats,
  getCounsellorById,
  updateCounsellor,
  deleteCounsellor
}

export default counsellorService