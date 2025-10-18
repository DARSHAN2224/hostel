import express from 'express'
import dotenv from 'dotenv'
import morgan from 'morgan'
import swaggerUi from 'swagger-ui-express'
import { config, validateConfig, logEnvironmentInfo } from './config/config.js'
import { connectDatabase, setupGracefulShutdown } from './db/database.js'
import { helmetConfig, corsConfig, additionalSecurityHeaders, trustProxy } from './config/security.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { morganMiddleware, detailedRequestLogger } from './middleware/requestLogger.js'
import { apiLimiter } from './middleware/rateLimiter.js'
import logger from './config/logger.js'
import { swaggerSpecs } from './config/swagger.js'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/auth.js'
import studentRoutes from './routes/students.js'
import usersRoutes from './routes/users.js'
import healthRoutes from './routes/health.js'
import hodRoutes from './routes/hods.js';
import outpassRoutes from './routes/outpass.js';

// Load environment variables
dotenv.config()

export function createApp() {
  const app = express()

  // Validate configuration on startup
  validateConfig()
  
  // Log environment info
  logEnvironmentInfo()

  // Trust proxy (for Heroku, AWS, etc.)
  app.set('trust proxy', trustProxy)

  // Security middleware (helmet for security headers)
  app.use(helmetConfig)
  
  // CORS middleware
  app.use(corsConfig)
  
  // Additional security headers
  app.use(additionalSecurityHeaders)

  // Parse JSON and cookies (before logging to capture body)
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))
  app.use(cookieParser())

  // HTTP request logging
  // Morgan for basic HTTP logging
  app.use(morganMiddleware)
  
  // Detailed request/response logging (only in development)
  if (config.nodeEnv === 'development') {
    app.use(detailedRequestLogger)
  }

  // API Documentation (Swagger)
  if (config.nodeEnv !== 'production') {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Hostel Management API Docs',
    }))
    logger.info(`📚 API Documentation available at: http://localhost:${config.port}/api-docs`)
  }

  // Health check routes (no rate limiting for monitoring)
  app.use('/api/health', healthRoutes)
  
  // Legacy health check endpoint
  app.get('/health', async (req, res) => {
    res.redirect(301, '/api/health')
  })

  // Rate limiting for API routes
  app.use('/api', apiLimiter)

  // API routes
  app.use('/api/v1/auth', authRoutes)
  app.use('/api/v1/students', studentRoutes)
  app.use('/api/v1/users', usersRoutes)
  app.use('/api/v1/outpass', outpassRoutes);
  app.use('/api/v1/hods', hodRoutes);

  // Handle 404 for undefined routes
  app.use(notFoundHandler)

  // Global error handling (must be last)
  app.use(errorHandler)

  return app
}

export async function startServer() {
  try {
    // Connect to database
    await connectDatabase()
    
    // Setup graceful shutdown
    setupGracefulShutdown()
    
    // Auto-create initial admin in development
    if (config.nodeEnv === 'development') {
      const { createInitialAdmin } = await import('./utils/createInitialAdmin.js')
      await createInitialAdmin()
    }
    
    // Create Express app
    const app = createApp()
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server running in ${config.nodeEnv} mode on port ${config.port}`)
      logger.info(`🌐 API available at: http://localhost:${config.port}`)
    })

    // Graceful shutdown for the server
    const gracefulShutdown = (signal) => {
      logger.info(`📤 Received ${signal}. Starting graceful shutdown...`)
      
      server.close((err) => {
        if (err) {
          logger.error('❌ Error during server shutdown:', err)
          process.exit(1)
        }
        
        logger.info('✅ Server closed successfully')
      })
    }

    process.on('SIGTERM', gracefulShutdown)
    process.on('SIGINT', gracefulShutdown)
    
    return { app, server }
    
  } catch (error) {
        console.error('FULL ERROR:', error); // <-- Add this line

    logger.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}
