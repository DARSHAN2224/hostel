/**
 * Custom Error Classes and Error Handling Middleware
 */
/* global process */

import { ApiResponse } from '../utils/ApiResponse.js';
import { logErrorRequest } from './requestLogger.js';

/**
 * Custom Application Error Class
 * Use this for operational errors that can be handled gracefully
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'
    
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Validation Error Class
 * Use this for input validation errors
 */
export class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400)
    this.details = details
    this.type = 'validation'
  }
}

/**
 * Authentication Error Class
 * Use this for authentication-related errors
 */
export class AuthError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401)
    this.type = 'authentication'
  }
}

/**
 * Authorization Error Class
 * Use this for authorization-related errors
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403)
    this.type = 'authorization'
  }
}

/**
 * Not Found Error Class
 * Use this for resource not found errors
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404)
    this.type = 'not_found'
  }
}

/**
 * Async Handler Wrapper
 * Catches async errors and passes them to error handling middleware
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Handle Mongoose Validation Errors
 */
const handleValidationError = (err) => {
  // If this is a Mongoose ValidationError it has an `errors` object
  if (err && err.errors && typeof err.errors === 'object') {
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message,
      value: error.value
    }))

    return new ValidationError('Validation failed', errors)
  }

  // If the incoming error already has structured details (e.g. thrown programmatically), reuse them
  if (err && Array.isArray(err.details) && err.details.length > 0) {
    return new ValidationError(err.message || 'Validation failed', err.details)
  }

  // Generic fallback
  return new ValidationError(err.message || 'Validation failed')
}

/**
 * Handle Mongoose Duplicate Key Errors
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0]
  const value = err.keyValue[field]
  const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`
  
  return new ValidationError(message)
}

/**
 * Handle Mongoose Cast Errors
 */
const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`
  return new ValidationError(message)
}

/**
 * Handle JWT Errors
 */
const handleJWTError = () => {
  return new AuthError('Invalid token. Please log in again.')
}

const handleJWTExpiredError = () => {
  return new AuthError('Your token has expired. Please log in again.')
}

/**
 * Send Error Response for Development
 */
const sendErrorDev = (err, req, res) => {
  const response = new ApiResponse(err.statusCode, null, err.message);
  response.stack = err.stack;
  response.details = err.details || undefined;
  
  // Add request context for debugging
  response.request = {
    method: req.method,
    url: req.originalUrl,
    body: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    params: Object.keys(req.params).length > 0 ? req.params : undefined,
  };
  
  res.status(err.statusCode).json(response);
}

/**
 * Send Error Response for Production
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    const response = new ApiResponse(err.statusCode, null, err.message)
    if (err.details) {
      response.details = err.details
    }
    
    res.status(err.statusCode).json(response)
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err)
    
    res.status(500).json(
      new ApiResponse(500, null, 'Something went wrong!')
    )
  }
}

/**
 * Global Error Handling Middleware
 * This should be the last middleware in your app
 */
export const errorHandler = (err, req, res, next) => {
  // reference `next` so linters/static analyzers don't complain about unused args
  void next
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;
  error.isOperational = err.isOperational !== undefined ? err.isOperational : false;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error = handleCastError(err);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    error = handleDuplicateKeyError(err);
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }

  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // Log error with full request context
  logErrorRequest(error, req, res);

  // Send error response
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, res);
  }
}

/**
 * Handle 404 errors for undefined routes
 */
export const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`)
  next(error)
}