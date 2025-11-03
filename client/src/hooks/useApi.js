/**
 * Custom Hooks for API Data Fetching
 * React hooks for common API operations with loading and error states
 */

import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { selectUser } from '../store/authSlice'
import toast from 'react-hot-toast'

/**
 * Generic API hook
 * @param {Function} apiFunction - API service function
 * @param {Array} dependencies - Dependencies for useEffect
 * @param {boolean} immediate - Whether to call API immediately
 * @returns {Object} { data, loading, error, refetch }
 */
export const useApi = (apiFunction, dependencies = [], immediate = true) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async (...args) => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiFunction(...args)
      setData(result.data || result)
      return result
    } catch (err) {
      setError(err.message || 'An error occurred')
      toast.error(err.message || 'Failed to fetch data')
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiFunction])

  useEffect(() => {
    if (immediate) {
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  return { data, loading, error, refetch: fetchData }
}

/**
 * Hook for paginated data
 */
export const usePaginatedApi = (apiFunction, initialParams = {}) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [params, setParams] = useState(initialParams)

  const fetchData = useCallback(async (newParams = {}) => {
    try {
      setLoading(true)
      setError(null)
      
      const queryParams = { ...params, ...newParams, page: pagination.page, limit: pagination.limit }
      const result = await apiFunction(queryParams)
      
      setData(result.data || result.results || [])
      
      if (result.pagination) {
        setPagination(prev => ({
          ...prev,
          ...result.pagination
        }))
      }
      
      return result
    } catch (err) {
      setError(err.message || 'An error occurred')
      toast.error(err.message || 'Failed to fetch data')
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiFunction, params, pagination.page, pagination.limit])

  const goToPage = useCallback((page) => {
    setPagination(prev => ({ ...prev, page }))
  }, [])

  const changeLimit = useCallback((limit) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }))
  }, [])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit])

  return {
    data,
    loading,
    error,
    pagination,
    refetch: fetchData,
    goToPage,
    changeLimit,
    setParams
  }
}

/**
 * Hook for mutations (POST, PUT, DELETE)
 */
export const useMutation = (apiFunction) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(async (...args) => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiFunction(...args)
      return result
    } catch (err) {
      setError(err.message || 'An error occurred')
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiFunction])

  return { mutate, loading, error }
}

/**
 * Hook to check user role
 */
export const useUserRole = () => {
  const user = useSelector(selectUser)
  
  return {
    isStudent: user?.role === 'student',
    isWarden: user?.role === 'warden',
    isAdmin: user?.role === 'admin',
    isSecurity: user?.role === 'security',
    isHOD: user?.role === 'hod',
    role: user?.role,
    user
  }
}

/**
 * Hook to check permissions
 */
export const usePermissions = () => {
  const user = useSelector(selectUser)
  
  const hasPermission = useCallback((permission) => {
    if (!user) return false
    
    // Super admin has all permissions
    if (user.role === 'admin' && user.adminRole === 'super_admin') {
      return true
    }
    
    // Check if user has specific permission
    return user.permissions?.includes(permission) || false
  }, [user])

  const canAccess = useCallback((roles) => {
    if (!user) return false
    return roles.includes(user.role)
  }, [user])

  return { hasPermission, canAccess, permissions: user?.permissions || [] }
}

/**
 * Hook for toast notifications with API calls
 */
export const useApiWithToast = (apiFunction, options = {}) => {
  const { mutate, loading, error } = useMutation(apiFunction)
  
  const {
    successMessage = 'Operation successful',
    errorMessage = 'Operation failed',
    loadingMessage = 'Processing...'
  } = options

  const execute = useCallback(async (...args) => {
    const toastId = toast.loading(loadingMessage)
    
    try {
      const result = await mutate(...args)
      toast.success(successMessage, { id: toastId })
      return result
    } catch (err) {
      toast.error(err.message || errorMessage, { id: toastId })
      throw err
    }
  }, [mutate, successMessage, errorMessage, loadingMessage])

  return { execute, loading, error }
}

export default {
  useApi,
  usePaginatedApi,
  useMutation,
  useUserRole,
  usePermissions,
  useApiWithToast
}
