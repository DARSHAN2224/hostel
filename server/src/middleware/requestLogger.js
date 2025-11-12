import morgan from 'morgan';
import logger, { morganStream } from '../config/logger.js';
import util from 'util';

/**
 * Morgan middleware for HTTP request logging
 * Logs: method, URL, status, response time, content length
 */
export const morganMiddleware = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  { stream: morganStream }
);

/**
 * Detailed request/response logger middleware
 * Logs comprehensive details about each request in development mode
 */
export const detailedRequestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Skip logging for health check endpoints
  if (req.originalUrl === '/health' || req.originalUrl === '/api/health') {
    return next();
  }

  // Log request details
  const requestDetails = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
  };

  // Add body for non-GET requests (mask sensitive data)
  if (req.method !== 'GET' && req.body) {
    const bodyToLog = { ...req.body };
    
    // Mask sensitive fields
    if (bodyToLog.password) bodyToLog.password = '***MASKED***';
    if (bodyToLog.currentPassword) bodyToLog.currentPassword = '***MASKED***';
    if (bodyToLog.newPassword) bodyToLog.newPassword = '***MASKED***';
    if (bodyToLog.confirmPassword) bodyToLog.confirmPassword = '***MASKED***';
    
    requestDetails.body = bodyToLog;
  }

  // Add query params if present
  if (Object.keys(req.query).length > 0) {
    requestDetails.query = req.query;
  }

  // Add route params if present
  if (Object.keys(req.params).length > 0) {
    requestDetails.params = req.params;
  }

  // Add user info if authenticated
  if (req.user) {
    requestDetails.user = {
      id: req.user.id || req.user._id,
      email: req.user.email,
      role: req.user.role,
    };
  }

  // Log incoming request
  logger.http('Incoming Request', requestDetails);

  // Capture original response methods
  const originalSend = res.send;
  const originalJson = res.json;

  // Override res.json to capture response data
  res.json = function (data) {
    const responseTime = Date.now() - startTime;
    
    // Log response details
    const responseDetails = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
    };

  // Add response body for errors or in development
  if (res.statusCode >= 400 || (globalThis.process && globalThis.process.env && globalThis.process.env.NODE_ENV === 'development')) {
      // Truncate large responses and avoid crashing on circular structures
      let responseDataStr;
      try {
        responseDataStr = JSON.stringify(data);
      } catch {
        // Fallback: use util.inspect which can handle circular structures
        try {
          responseDataStr = util.inspect(data, { depth: 2, maxArrayLength: 50 });
        } catch {
          responseDataStr = '[unserializable response]';
        }
      }

      responseDetails.response = responseDataStr.length > 1000
        ? responseDataStr.substring(0, 1000) + '... (truncated)'
        : responseDataStr;
    }

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error('Response Error (5xx)', responseDetails);
    } else if (res.statusCode >= 400) {
      logger.warn('Response Error (4xx)', responseDetails);
    } else {
      logger.http('Response Success', responseDetails);
    }

    // Call original json method
    return originalJson.call(this, data);
  };

  // Override res.send to capture non-JSON responses
  res.send = function (data) {
    const responseTime = Date.now() - startTime;
    
    logger.http('Response Sent', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
    });

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Error request logger - logs failed requests with full context
 * This is called by the error handler to provide detailed error logging
 */
export const logErrorRequest = (err, req) => {
  const errorContext = {
    error: {
      name: err.name,
      message: err.message,
      statusCode: err.statusCode || 500,
      isOperational: err.isOperational || false,
  stack: (globalThis.process && globalThis.process.env && globalThis.process.env.NODE_ENV === 'development') ? err.stack : undefined,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    },
  };

  // Add request body (masked)
  if (req.body && Object.keys(req.body).length > 0) {
    const bodyToLog = { ...req.body };
    if (bodyToLog.password) bodyToLog.password = '***MASKED***';
    if (bodyToLog.currentPassword) bodyToLog.currentPassword = '***MASKED***';
    if (bodyToLog.newPassword) bodyToLog.newPassword = '***MASKED***';
    if (bodyToLog.confirmPassword) bodyToLog.confirmPassword = '***MASKED***';
    errorContext.request.body = bodyToLog;
  }

  // Add query params
  if (req.query && Object.keys(req.query).length > 0) {
    errorContext.request.query = req.query;
  }

  // Add route params
  if (req.params && Object.keys(req.params).length > 0) {
    errorContext.request.params = req.params;
  }

  // Add user info if authenticated
  if (req.user) {
    errorContext.request.user = {
      id: req.user.id || req.user._id,
      email: req.user.email,
      role: req.user.role,
    };
  }

  // Add validation errors if present
  if (err.details) {
    errorContext.error.details = err.details;
  }

  // Log error with full context
  logger.error('Request Failed', errorContext);
};
