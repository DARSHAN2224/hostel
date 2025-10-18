import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format (colorized for development)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    let log = `${timestamp} ${level}: ${message}`;
    
    // Add metadata if present (errors, request context, etc.)
    if (Object.keys(meta).length > 0) {
      // Remove internal winston properties
      delete meta[Symbol.for('level')];
      delete meta[Symbol.for('splat')];
      
      // Format metadata as JSON with nice indentation
      if (Object.keys(meta).length > 0) {
        log += '\n' + JSON.stringify(meta, null, 2);
      }
    }
    
    return log;
  })
);

// Define log directory
const logsDir = path.join(__dirname, '../../logs');

// Define transports
const transports = [
  // Console transport (always enabled)
  new winston.transports.Console({
    format: consoleFormat,
  }),
  
  // Error log file (only errors)
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // Combined log file (all logs)
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // HTTP log file (HTTP requests)
  new winston.transports.File({
    filename: path.join(logsDir, 'http.log'),
    level: 'http',
    format,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Create logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exitOnError: false,
});

/**
 * Morgan stream configuration
 * Pipes morgan HTTP logs to winston
 */
export const morganStream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

/**
 * Log HTTP request details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} responseTime - Response time in milliseconds
 */
export const logRequest = (req, res, responseTime) => {
  const { method, originalUrl, ip, headers } = req;
  const { statusCode } = res;
  
  logger.http('HTTP Request', {
    method,
    url: originalUrl,
    statusCode,
    ip,
    userAgent: headers['user-agent'],
    responseTime: `${responseTime}ms`,
  });
};

/**
 * Log error with context
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
export const logError = (error, context = {}) => {
  logger.error(error.message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...context,
  });
};

/**
 * Log info message
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
export const logInfo = (message, meta = {}) => {
  logger.info(message, meta);
};

/**
 * Log warning message
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
export const logWarn = (message, meta = {}) => {
  logger.warn(message, meta);
};

/**
 * Log debug message
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
export const logDebug = (message, meta = {}) => {
  logger.debug(message, meta);
};

export default logger;
