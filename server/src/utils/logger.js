
import winston from 'winston'
import { config } from '../config/config.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import util from 'util'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Always resolve logs directory relative to this file (server/logs)
const logsDir = path.resolve(__dirname, '..', '..', 'logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`
    }
    
    // Add metadata if present (use safe stringify to avoid circular errors)
    if (Object.keys(meta).length > 0) {
      try {
        log += `\n${JSON.stringify(meta, null, 2)}`
      } catch {
        try {
          log += `\n${util.inspect(meta, { depth: 2, colors: false })}`
        } catch {
          log += '\n[unserializable meta]'
        }
      }
    }
    
    return log
  })
)

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.simple(),
  winston.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`
  })
)

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { 
    service: 'hostel-management-api',
    environment: config.nodeEnv 
  },
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Write error logs to error.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  
  // Handle exceptions
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions.log') 
    })
  ],
  
  // Handle promise rejections
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log') 
    })
  ]
})

// Add console transport for development
if (config.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }))
}

/**
 * Request logging middleware
 * Logs all HTTP requests
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now()
  
  // Log request
  logger.info(`${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start
    const statusCode = res.statusCode
    
    const logLevel = statusCode >= 400 ? 'warn' : 'info'
    
    logger[logLevel](`${req.method} ${req.url} ${statusCode} - ${duration}ms`, {
      method: req.method,
      url: req.url,
      statusCode,
      duration,
      ip: req.ip
    })
  })
  
  next()
}

/**
 * Stream for Morgan HTTP logger (if you want to use Morgan)
 */
export const morganStream = {
  write: (message) => {
    logger.info(message.trim())
  }
}

/**
 * Helper functions for structured logging
 */
export const logHelpers = {
  // Log user actions
  logUserAction: (userId, action, details = {}) => {
    logger.info(`User action: ${action}`, {
      userId,
      action,
      ...details
    })
  },
  
  // Log database operations
  logDbOperation: (operation, collection, details = {}) => {
    logger.info(`Database operation: ${operation} on ${collection}`, {
      operation,
      collection,
      ...details
    })
  },
  
  // Log authentication events
  logAuth: (event, userId, details = {}) => {
    logger.info(`Auth event: ${event}`, {
      event,
      userId,
      ...details
    })
  },
  
  // Log errors with context
  logError: (error, context = {}) => {
    logger.error(error.message, {
      error: error.name,
      stack: error.stack,
      ...context
    })
  }
}

// Log startup message
logger.info('📝 Logger initialized', {
  level: config.logging.level,
  environment: config.nodeEnv
})

export default logger