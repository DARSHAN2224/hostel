import mongoose from 'mongoose'
import { config } from '../config/config.js'
import logger from '../utils/logger.js'

/**
 * Database Connection Setup with Error Handling and Monitoring
 */

// Connection options
const connectionOptions = {
  ...config.database.options,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
}

/**
 * Connect to MongoDB
 */
export const connectDatabase = async () => {
  try {
    logger.info('🔄 Connecting to MongoDB...')
    
    const conn = await mongoose.connect(config.database.url, connectionOptions)
    
    logger.info(`✅ MongoDB Connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`)
    
    // Set up connection event listeners
    setupConnectionEventListeners()
    
    return conn
    
  } catch (error) {
    logger.error(`❌ Database connection failed: ${error.message}`, {
      stack: error.stack,
      url: config.database.url
    })
    
    // Exit process with failure
    process.exit(1)
  }
}

/**
 * Setup connection event listeners
 */
const setupConnectionEventListeners = () => {
  const db = mongoose.connection
  
  // Connection events
  db.on('connected', () => {
    logger.info('🟢 Mongoose connected to MongoDB')
  })
  
  db.on('error', (err) => {
    logger.error('❌ Mongoose connection error:', {
      error: err.message,
      stack: err.stack
    })
  })
  
  db.on('disconnected', () => {
    logger.warn('⚠️ Mongoose disconnected from MongoDB')
  })
  
  db.on('reconnected', () => {
    logger.info('🔄 Mongoose reconnected to MongoDB')
  })
  
  db.on('timeout', () => {
    logger.error('⏰ Database connection timeout')
  })
  
  db.on('close', () => {
    logger.info('🔒 Database connection closed')
  })
}

/**
 * Graceful shutdown handler
 */
export const setupGracefulShutdown = () => {
  const gracefulExit = async (signal) => {
    logger.info(`📤 Received ${signal}. Starting graceful shutdown...`)
    
    try {
      await mongoose.connection.close()
      logger.info('✅ Database connection closed successfully')
      process.exit(0)
    } catch (error) {
      logger.error('❌ Error during database shutdown:', {
        error: error.message,
        stack: error.stack
      })
      process.exit(1)
    }
  }
  
  // Listen for termination signals
  process.on('SIGINT', () => gracefulExit('SIGINT'))
  process.on('SIGTERM', () => gracefulExit('SIGTERM'))
  process.on('SIGUSR2', () => gracefulExit('SIGUSR2')) // Nodemon restart
}

/**
 * Check database health
 */
export const checkDatabaseHealth = async () => {
  try {
    // Check if connected
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected')
    }
    
    // Ping the database
    await mongoose.connection.db.admin().ping()
    
    return {
      status: 'healthy',
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    }
    
  } catch (error) {
    logger.error('❌ Database health check failed:', {
      error: error.message
    })
    
    return {
      status: 'unhealthy',
      error: error.message,
      readyState: mongoose.connection.readyState
    }
  }
}

/**
 * Database utility functions
 */
export const dbUtils = {
  /**
   * Get database statistics
   */
  getStats: async () => {
    try {
      const stats = await mongoose.connection.db.stats()
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes
      }
    } catch (error) {
      logger.error('Error getting database stats:', error)
      throw error
    }
  },
  
  /**
   * List all collections
   */
  getCollections: async () => {
    try {
      const collections = await mongoose.connection.db.listCollections().toArray()
      return collections.map(col => col.name)
    } catch (error) {
      logger.error('Error listing collections:', error)
      throw error
    }
  },
  
  /**
   * Drop database (use with caution!)
   */
  dropDatabase: async () => {
    if (config.nodeEnv === 'production') {
      throw new Error('Cannot drop database in production!')
    }
    
    try {
      await mongoose.connection.db.dropDatabase()
      logger.warn('⚠️ Database dropped!')
    } catch (error) {
      logger.error('Error dropping database:', error)
      throw error
    }
  }
}

// Set mongoose debugging in development
if (config.nodeEnv === 'development') {
  mongoose.set('debug', (collectionName, method, query, doc) => {
    logger.debug(`Mongoose: ${collectionName}.${method}`, {
      collection: collectionName,
      method,
      query: JSON.stringify(query),
      doc: JSON.stringify(doc)
    })
  })
}