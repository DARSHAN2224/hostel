/**
 * Axios Instance Configuration
 * Centralized HTTP client with interceptors
 */

import axios from 'axios'
import { API_BASE_URL, STORAGE_KEYS, ROUTES } from '../constants'
import { store } from '../store/store'
import { setValidationErrors } from '../store/uiSlice'
import { normalizeServerErrors } from '../utils/errorUtils'

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Send cookies with requests
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  (error) => {
    throw error
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Return data directly
    return response.data
  },
  async (error) => {
    const originalRequest = error.config
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Try to refresh token
        const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
        
        if (refreshToken) {
          const response = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            { refreshToken },
            { withCredentials: true }
          )

          const { accessToken } = response.data.data

          // Update token in storage
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken)

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return apiClient(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
        localStorage.removeItem(STORAGE_KEYS.USER_DATA)

        // Redirect to login
        globalThis.location.href = ROUTES.LOGIN
        throw refreshError
      }
    }

    // Handle 429 Too Many Requests with simple retry/backoff
    try {
      const status = error.response?.status
      const maxRetries = 3

      if (status === 429) {
        originalRequest._retryCount = originalRequest._retryCount || 0

        if (originalRequest._retryCount < maxRetries) {
          originalRequest._retryCount += 1

          // Use Retry-After header if provided (seconds), otherwise exponential backoff
          const retryAfterHeader = error.response?.headers?.['retry-after']
          const retryAfter = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : null
          const delay = retryAfter ? retryAfter * 1000 : 1000 * Math.pow(2, originalRequest._retryCount)

          await new Promise((res) => setTimeout(res, delay))
          return apiClient(originalRequest)
        }
      }
    } catch (e) {
      // If retry handling itself fails, fall through to error formatting
      console.warn('Retry-on-429 handler error', e)
    }

    // Format error response
    // Normalize validation errors from different server shapes
    const payload = error.response?.data || {}
    const normalized = normalizeServerErrors(payload)

    // Dispatch normalized validation errors to the ui store so forms/components
    // can subscribe and render server-side validation messages automatically.
    if (normalized && Array.isArray(normalized) && normalized.length > 0) {
      try {
        store.dispatch(setValidationErrors(normalized))
      } catch (e) {
        // swallow dispatch errors to avoid masking the original API error
        console.warn('Failed to dispatch validation errors to store', e)
      }
    }

    const errorMessage = payload.message || error.message || 'An error occurred'
    const err = new Error(errorMessage)
    err.status = error.response?.status
    err.data = payload
    if (normalized) err.normalizedErrors = normalized

    throw err
  }
)

export default apiClient
