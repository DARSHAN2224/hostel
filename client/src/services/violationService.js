import apiClient from './api'

/**
 * Violation Service
 * Handles all violation-related API calls
 */

// Create a new violation report
export const createViolation = async (violationData) => {
  const response = await apiClient.post('/violations', violationData)
  return response.data
}

// Get all violations with filters
export const getViolations = async (filters = {}) => {
  const response = await apiClient.get('/violations', { params: filters })
  return response.data
}

// Get pending violations
export const getPendingViolations = async () => {
  const response = await apiClient.get('/violations/pending')
  return response.data
}

// Get student violations
export const getStudentViolations = async (studentId) => {
  const response = await apiClient.get(`/violations/student/${studentId}`)
  return response.data
}

// Get violation statistics
export const getViolationStatistics = async (dateRange = {}) => {
  const response = await apiClient.get('/violations/statistics', { params: dateRange })
  return response.data
}

// Resolve a violation
export const resolveViolation = async (violationId, actionTaken) => {
  const response = await apiClient.put(`/violations/${violationId}/resolve`, { actionTaken })
  return response.data
}

// Dismiss a violation
export const dismissViolation = async (violationId, reason) => {
  const response = await apiClient.put(`/violations/${violationId}/dismiss`, { reason })
  return response.data
}

// Add note to violation
export const addViolationNote = async (violationId, text) => {
  const response = await apiClient.post(`/violations/${violationId}/notes`, { text })
  return response.data
}

export default {
  createViolation,
  getViolations,
  getPendingViolations,
  getStudentViolations,
  getViolationStatistics,
  resolveViolation,
  dismissViolation,
  addViolationNote,
}
