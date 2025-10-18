/**
 * Custom Error Classes for the Application
 * 
 * OOP Concept: Inheritance - All custom errors extend the base AppError class
 * Benefits:
 * - Consistent error handling
 * - Automatic HTTP status codes
 * - Better error messages
 * - Easy to catch and handle specific error types
 */

// Base Error Class - Parent of all custom errors
class AppError extends Error {
  constructor(message, statusCode) {
    super(message) // Call parent (Error) constructor
    this.statusCode = statusCode
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'
    this.isOperational = true // Distinguishes operational errors from programming errors
    
    // Capture stack trace for debugging
    Error.captureStackTrace(this, this.constructor)
  }
}

// 400 - Bad Request Errors
class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400)
    this.name = 'ValidationError'
  }
}

// 401 - Authentication Errors
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed. Please login again.') {
    super(message, 401)
    this.name = 'AuthenticationError'
  }
}

// Alias for AuthenticationError
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized - Please login to access this resource') {
    super(message, 401)
    this.name = 'UnauthorizedError'
  }
}

// 403 - Authorization/Permission Errors
class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403)
    this.name = 'AuthorizationError'
  }
}

// Alias for AuthorizationError
class ForbiddenError extends AppError {
  constructor(message = 'Forbidden - You do not have permission to access this resource') {
    super(message, 403)
    this.name = 'ForbiddenError'
  }
}

// 404 - Not Found Errors
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404)
    this.name = 'NotFoundError'
  }
}

// 409 - Conflict Errors (duplicate data, etc.)
class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409)
    this.name = 'ConflictError'
  }
}

// 422 - Unprocessable Entity (invalid data format)
class UnprocessableEntityError extends AppError {
  constructor(message = 'Invalid data provided') {
    super(message, 422)
    this.name = 'UnprocessableEntityError'
  }
}

// 429 - Too Many Requests
class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message, 429)
    this.name = 'RateLimitError'
  }
}

// 500 - Internal Server Errors
class InternalServerError extends AppError {
  constructor(message = 'Internal server error. Please try again later.') {
    super(message, 500)
    this.name = 'InternalServerError'
  }
}

// Database-specific errors
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500)
    this.name = 'DatabaseError'
  }
}

// Token/JWT errors
class TokenError extends AppError {
  constructor(message = 'Invalid or expired token') {
    super(message, 401)
    this.name = 'TokenError'
  }
}

export {
  AppError,
  ValidationError,
  AuthenticationError,
  UnauthorizedError,
  AuthorizationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  RateLimitError,
  InternalServerError,
  DatabaseError,
  TokenError
}
