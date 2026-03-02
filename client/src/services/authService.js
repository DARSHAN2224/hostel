import apiClient from './api'
import { API_ENDPOINTS } from '../constants'

const authService = {
  login: async (credentials) => {
    return await apiClient.post(API_ENDPOINTS.LOGIN, credentials)
  },
  register: async (userData) => {
    return await apiClient.post('/auth/register', userData)
  },

  /**
   * Logout the current user.
   * For students, also calls POST /students/logout first to invalidate
   * the student session server-side, then falls through to the unified
   * auth logout which clears cookies.
   * @param {string} [role] - The current user's role (from Redux store)
   */
  logout: async (role) => {
    if (role === 'student') {
      try {
        await apiClient.post('/students/logout')
      } catch {
        // Non-fatal — proceed to auth logout regardless
      }
    }
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
  resetPassword: async (token, password, confirmPassword) => {
    return await apiClient.post(API_ENDPOINTS.RESET_PASSWORD, { 
      token, 
      newPassword: password,
      confirmPassword 
    })
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

export const {
  login,
  register,
  logout,
  refreshToken,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  changePassword,
  updateProfile,
  verifyEmail,
  resendVerification,
  registerAdmin,
  getHostelBlocks
} = authService

export default authService