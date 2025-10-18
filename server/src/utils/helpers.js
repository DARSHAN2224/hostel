/**
 * Utility Helper Functions
 * Common utility functions used throughout the application
 */

import crypto from 'crypto'
import { PAGINATION, DATE_FORMATS, REGEX } from './constants.js'

/**
 * Generate random string
 * @param {number} length - Length of the string
 * @returns {string} Random string
 */
export const generateRandomString = (length = 32) => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length)
}

/**
 * Generate random number
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random number
 */
export const generateRandomNumber = (min = 0, max = 100) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export const capitalize = (str) => {
  if (!str || typeof str !== 'string') return str
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Convert string to title case
 * @param {string} str - String to convert
 * @returns {string} Title case string
 */
export const toTitleCase = (str) => {
  if (!str || typeof str !== 'string') return str
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  )
}

/**
 * Generate slug from string
 * @param {string} str - String to convert to slug
 * @returns {string} Slug
 */
export const generateSlug = (str) => {
  if (!str || typeof str !== 'string') return ''
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime())
  if (obj instanceof Array) return obj.map(item => deepClone(item))
  if (typeof obj === 'object') {
    const clonedObj = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
}

/**
 * Remove empty fields from object
 * @param {Object} obj - Object to clean
 * @returns {Object} Cleaned object
 */
export const removeEmptyFields = (obj) => {
  const cleaned = {}
  for (const key in obj) {
    if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        const nested = removeEmptyFields(obj[key])
        if (Object.keys(nested).length > 0) {
          cleaned[key] = nested
        }
      } else {
        cleaned[key] = obj[key]
      }
    }
  }
  return cleaned
}

/**
 * Pick specific fields from object
 * @param {Object} obj - Source object
 * @param {Array} fields - Fields to pick
 * @returns {Object} Object with picked fields
 */
export const pick = (obj, fields) => {
  const result = {}
  fields.forEach(field => {
    if (obj.hasOwnProperty(field)) {
      result[field] = obj[field]
    }
  })
  return result
}

/**
 * Omit specific fields from object
 * @param {Object} obj - Source object
 * @param {Array} fields - Fields to omit
 * @returns {Object} Object without omitted fields
 */
export const omit = (obj, fields) => {
  const result = { ...obj }
  fields.forEach(field => {
    delete result[field]
  })
  return result
}

/**
 * Pagination helper
 * @param {Object} options - Pagination options
 * @returns {Object} Pagination object
 */
export const getPagination = (options = {}) => {
  const page = Math.max(1, parseInt(options.page) || PAGINATION.DEFAULT_PAGE)
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(options.limit) || PAGINATION.DEFAULT_LIMIT)
  )
  const skip = (page - 1) * limit

  return {
    page,
    limit,
    skip,
    offset: skip
  }
}

/**
 * Generate pagination metadata
 * @param {number} total - Total items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
export const getPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit)
  const hasNext = page < totalPages
  const hasPrev = page > 1

  return {
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null
  }
}

/**
 * Format date
 * @param {Date|string} date - Date to format
 * @param {string} format - Format string
 * @returns {string} Formatted date
 */
export const formatDate = (date, format = DATE_FORMATS.DISPLAY) => {
  if (!date) return null
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return null
  
  // Simple format implementation
  const formats = {
    'DD/MM/YYYY': () => {
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()
      return `${day}/${month}/${year}`
    },
    'YYYY-MM-DD': () => d.toISOString().split('T')[0],
    'DD/MM/YYYY HH:mm': () => {
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()
      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')
      return `${day}/${month}/${year} ${hours}:${minutes}`
    }
  }
  
  return formats[format] ? formats[format]() : d.toISOString()
}

/**
 * Validation helpers
 */
export const validators = {
  isEmail: (email) => REGEX.EMAIL.test(email),
  isPhone: (phone) => REGEX.PHONE.test(phone),
  isPassword: (password) => REGEX.PASSWORD.test(password),
  isUsername: (username) => REGEX.USERNAME.test(username),
  isName: (name) => REGEX.NAME.test(name),
  isStudentId: (studentId) => REGEX.STUDENT_ID.test(studentId),
  
  isUrl: (url) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  },
  
  isDate: (date) => {
    const d = new Date(date)
    return !isNaN(d.getTime())
  },
  
  isArray: (value) => Array.isArray(value),
  
  isObject: (value) => {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
  },
  
  isEmpty: (value) => {
    if (value === null || value === undefined) return true
    if (typeof value === 'string') return value.trim().length === 0
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'object') return Object.keys(value).length === 0
    return false
  }
}

/**
 * Array helpers
 */
export const arrayHelpers = {
  unique: (arr) => [...new Set(arr)],
  
  groupBy: (arr, key) => {
    return arr.reduce((groups, item) => {
      const group = item[key]
      groups[group] = groups[group] || []
      groups[group].push(item)
      return groups
    }, {})
  },
  
  sortBy: (arr, key, direction = 'asc') => {
    return arr.sort((a, b) => {
      if (direction === 'asc') {
        return a[key] > b[key] ? 1 : -1
      }
      return a[key] < b[key] ? 1 : -1
    })
  },
  
  chunk: (arr, size) => {
    const chunks = []
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size))
    }
    return chunks
  }
}

/**
 * File helpers
 */
export const fileHelpers = {
  getFileExtension: (filename) => {
    return filename.split('.').pop().toLowerCase()
  },
  
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },
  
  generateFileName: (originalName, prefix = '') => {
    const ext = fileHelpers.getFileExtension(originalName)
    const timestamp = Date.now()
    const random = generateRandomString(8)
    return `${prefix}${timestamp}_${random}.${ext}`
  }
}

/**
 * Response helpers
 */
export const responseHelpers = {
  success: (data = null, message = 'Success', meta = {}) => ({
    success: true,
    message,
    data,
    ...meta
  }),
  
  error: (message = 'Error', details = null) => ({
    success: false,
    error: message,
    ...(details && { details })
  }),
  
  paginated: (data, meta, message = 'Data retrieved successfully') => ({
    success: true,
    message,
    data,
    pagination: meta
  })
}