import apiClient from './api'
import { API_ENDPOINTS } from '../constants'

const authService = {
  login: async (credentials) => {
    return await apiClient.post(API_ENDPOINTS.LOGIN, credentials)
  },
  register: async (userData) => {
    return await apiClient.post('/auth/register', userData)
  },
  logout: async () => {
    return await apiClient.post(API_ENDPOINTS.LOGOUT)
  },
  refreshToken: async (refreshToken) => {
    return await apiClient.post(API_ENDPOINTS.REFRESH, { refreshToken })
  },
  getCurrentUser: async () => {
    return await apiClient.get('/auth/me')
  },
  forgotPassword: async (email) => {
    return await apiClient.post(API_ENDPOINTS.FORGOT_PASSWORD, { email })
  },
  resetPassword: async (token, password) => {
    // Backend expects token and newPassword in body
    return await apiClient.post(API_ENDPOINTS.RESET_PASSWORD, { token, newPassword: password })
  },
  changePassword: async (passwordData) => {
    return await apiClient.put('/auth/change-password', passwordData)
  },
  updateProfile: async (userData) => {
    return await apiClient.put('/auth/profile', userData)
  },
  verifyEmail: async (email, verificationCode) => {
    return await apiClient.post(API_ENDPOINTS.VERIFY_EMAIL, { email, verificationCode })
  },
  resendVerification: async (email) => {
    return await apiClient.post(API_ENDPOINTS.RESEND_VERIFICATION, { email })
  },
  registerAdmin: async (adminData) => {
    return await apiClient.post(API_ENDPOINTS.REGISTER_ADMIN, adminData)
  },
  getHostelBlocks: async () => {
    return await apiClient.get('/auth/hostel-blocks')
  }
}

export const { login, register, logout, refreshToken, getCurrentUser, forgotPassword, resetPassword, changePassword, updateProfile, verifyEmail, resendVerification, registerAdmin, getHostelBlocks } = authService

export default authService
