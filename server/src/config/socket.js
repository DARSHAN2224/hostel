// server/src/config/socket.js
import { Server } from 'socket.io'
import logger from './logger.js'
import { config } from './config.js'

let io = null

/**
 * Initialize Socket.io server attached to an existing HTTP server.
 * Call this once from startServer() in app.js after creating the http server.
 *
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
export function initSocket(httpServer) {
  // Derive allowed origins from config (same as CORS config)
  const allowedOrigins = [
    config.app?.clientUrl || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ]

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, curl)
        if (!origin) return callback(null, true)

        if (
          allowedOrigins.includes(origin) ||
          (config.nodeEnv === 'development' &&
            (origin.includes('localhost') || origin.includes('127.0.0.1')))
        ) {
          callback(null, true)
        } else {
          logger.warn(`Socket.io CORS blocked origin: ${origin}`)
          callback(new Error('Not allowed by CORS'))
        }
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    // Ping/pong to detect stale connections
    pingTimeout: 60000,
    pingInterval: 25000,
    // Allow both websocket and long-polling transports
    transports: ['websocket', 'polling'],
  })

  logger.info('🔌 Socket.io server initialized')

  return io
}

/**
 * Get the Socket.io server instance.
 * Throws if initSocket() has not been called yet.
 *
 * @returns {import('socket.io').Server}
 */
export function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initSocket(httpServer) first.')
  }
  return io
}

/**
 * Safely get the Socket.io instance — returns null instead of throwing.
 * Use this inside controllers where socket is optional (graceful degradation).
 *
 * @returns {import('socket.io').Server | null}
 */
export function getIOSafe() {
  return io
}