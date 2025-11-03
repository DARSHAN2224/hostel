/**
 * Utility Functions
 * Common helper functions used throughout the application
 */

import { format, formatDistanceToNow, isPast, isFuture, differenceInHours } from 'date-fns'
import { DATE_FORMATS } from '../constants'
import clsx from 'clsx'

/**
 * Format date for display
 * @param {Date|string} date
 * @param {string} formatStr
 * @returns {string}
 */
export const formatDate = (date, formatStr = DATE_FORMATS.DISPLAY) => {
  if (!date) return '-'
  try {
    return format(new Date(date), formatStr)
  } catch (error) {
    console.error('Date formatting error:', error)
    return '-'
  }
}

/**
 * Format date with time
 * @param {Date|string} date
 * @returns {string}
 */
export const formatDateTime = (date) => {
  return formatDate(date, DATE_FORMATS.DISPLAY_TIME)
}

/**
 * Get relative time (e.g., "2 hours ago")
 * @param {Date|string} date
 * @returns {string}
 */
export const getRelativeTime = (date) => {
  if (!date) return '-'
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  } catch (error) {
    console.error('Relative time error:', error)
    return '-'
  }
}

/**
 * Format relative time - alias for getRelativeTime
 * @param {Date|string} date
 * @returns {string}
 */
export const formatRelativeTime = getRelativeTime

/**
 * Check if date is in the past
 * @param {Date|string} date
 * @returns {boolean}
 */
export const isDatePast = (date) => {
  if (!date) return false
  return isPast(new Date(date))
}

/**
 * Check if date is in the future
 * @param {Date|string} date
 * @returns {boolean}
 */
export const isDateFuture = (date) => {
  if (!date) return false
  return isFuture(new Date(date))
}

/**
 * Get hours until date
 * @param {Date|string} date
 * @returns {number}
 */
export const getHoursUntil = (date) => {
  if (!date) return 0
  return differenceInHours(new Date(date), new Date())
}

/**
 * Combine CSS classes
 * @param  {...any} classes
 * @returns {string}
 */
export const cn = (...classes) => {
  return clsx(classes)
}

/**
 * Capitalize first letter
 * @param {string} str
 * @returns {string}
 */
export const capitalize = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Format status for display
 * @param {string} status
 * @returns {string}
 */
export const formatStatus = (status) => {
  if (!status) return '-'
  return status
    .split('_')
    .map(word => capitalize(word))
    .join(' ')
}

/**
 * Truncate text
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export const truncate = (text, maxLength = 50) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Validate email
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number
 * @param {string} phone
 * @returns {boolean}
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^[0-9]{10,15}$/
  return phoneRegex.test(phone)
}

/**
 * Format phone number for display
 * @param {string} phone
 * @returns {string}
 */
export const formatPhone = (phone) => {
  if (!phone) return '-'
  // Format as: +91 98765 43210
  if (phone.length === 10) {
    return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`
  }
  return phone
}

/**
 * Get initials from name
 * @param {string} firstName
 * @param {string} lastName
 * @returns {string}
 */
export const getInitials = (firstName, lastName) => {
  const first = firstName?.charAt(0)?.toUpperCase() || ''
  const last = lastName?.charAt(0)?.toUpperCase() || ''
  return `${first}${last}`
}

/**
 * Get full name
 * @param {string} firstName
 * @param {string} lastName
 * @returns {string}
 */
export const getFullName = (firstName, lastName) => {
  return `${firstName || ''} ${lastName || ''}`.trim()
}

/**
 * Download file
 * @param {string} url
 * @param {string} filename
 */
export const downloadFile = (url, filename) => {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Copy to clipboard
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Copy to clipboard failed:', error)
    return false
  }
}

/**
 * Debounce function
 * @param {Function} func
 * @param {number} wait
 * @returns {Function}
 */
export const debounce = (func, wait = 300) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Parse query string
 * @param {string} search
 * @returns {Object}
 */
export const parseQueryString = (search) => {
  const params = new URLSearchParams(search)
  const result = {}
  for (const [key, value] of params) {
    result[key] = value
  }
  return result
}

/**
 * Build query string
 * @param {Object} params
 * @returns {string}
 */
export const buildQueryString = (params) => {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.append(key, value)
    }
  })
  return searchParams.toString()
}

/**
 * Get error message from error object
 * @param {Error|Object} error
 * @returns {string}
 */
export const getErrorMessage = (error) => {
  if (typeof error === 'string') return error
  if (error?.message) return error.message
  if (error?.response?.data?.message) return error.response.data.message
  return 'An error occurred'
}

/**
 * Check if user has role
 * @param {Object} user
 * @param {string|string[]} roles
 * @returns {boolean}
 */
export const hasRole = (user, roles) => {
  if (!user || !user.role) return false
  const roleArray = Array.isArray(roles) ? roles : [roles]
  return roleArray.includes(user.role)
}

/**
 * Check if user has permission
 * @param {Object} user
 * @param {string} permission
 * @returns {boolean}
 */
export const hasPermission = (user, permission) => {
  if (!user || !user.permissions) return false
  return user.permissions[permission] === true
}

/**
 * Filter object by keys
 * @param {Object} obj
 * @param {string[]} keys
 * @returns {Object}
 */
export const filterObjectByKeys = (obj, keys) => {
  return keys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      acc[key] = obj[key]
    }
    return acc
  }, {})
}

/**
 * Remove empty values from object
 * @param {Object} obj
 * @returns {Object}
 */
export const removeEmptyValues = (obj) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      acc[key] = value
    }
    return acc
  }, {})
}

/**
 * Sort array of objects
 * @param {Array} array
 * @param {string} key
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array}
 */
export const sortByKey = (array, key, order = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1
    if (aVal > bVal) return order === 'asc' ? 1 : -1
    return 0
  })
}

/**
 * Group array by key
 * @param {Array} array
 * @param {string} key
 * @returns {Object}
 */
export const groupBy = (array, key) => {
  return array.reduce((acc, item) => {
    const groupKey = item[key]
    if (!acc[groupKey]) {
      acc[groupKey] = []
    }
    acc[groupKey].push(item)
    return acc
  }, {})
}
