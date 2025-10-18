/**
 * ApiResponse - Standardized API Response Class
 * 
 * Ensures consistent response structure across all API endpoints.
 * 
 * Usage:
 * res.json(new ApiResponse(200, { user }, 'Success'))
 * res.json(new ApiResponse(201, { id: newId }, 'Created'))
 * res.json(new ApiResponse(200, null, 'Done'))
 */

class ApiResponse {
  constructor(statusCode, data = null, message = 'Success') {
    this.statusCode = statusCode
    this.success = statusCode < 400
    this.message = typeof message === 'string' ? message : 'Success'
    this.data = data !== undefined ? data : null
  }
}

export { ApiResponse }
