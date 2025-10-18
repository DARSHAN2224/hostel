import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { config } from '../config/config.js'
import express from 'express'
/**
 * Security Middleware Setup
 * Configures various security measures for the Express application
 */

// Rate limiting configuration
export const createRateLimiter = (windowMs = config.rateLimit.windowMs, max = config.rateLimit.max) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests from this IP',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests (2xx and 3xx)
    skipSuccessfulRequests: false,
    // Skip failed requests
    skipFailedRequests: false
  })
}

// CORS configuration
export const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    const allowedOrigins = Array.isArray(config.cors.origin) 
      ? config.cors.origin 
      : [config.cors.origin]
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}

// Helmet configuration for security headers
export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: config.nodeEnv === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false // Disable for development
}

/**
 * Setup all security middleware
 * @param {Express} app - Express application instance
 */
export const setupSecurity = (app) => {
  // Trust proxy if behind reverse proxy (for rate limiting)
  if (config.nodeEnv === 'production') {
    app.set('trust proxy', 1)
  }

  // Helmet for security headers
  app.use(helmet(helmetOptions))

  // CORS
  app.use(cors(corsOptions))

  // General rate limiting
  app.use('/api/', createRateLimiter())

  // Stricter rate limiting for auth endpoints
  app.use('/api/auth/', createRateLimiter(15 * 60 * 1000, 20)) // 20 requests per 15 minutes

  // Body parser limits
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  console.log('🛡️  Security middleware configured')
}