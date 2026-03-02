// server/src/middleware/socketAuth.js
import jwt from 'jsonwebtoken'
import { config } from '../config/config.js'
import logger from '../config/logger.js'
import Student from '../models/Student.js'
import Warden from '../models/Warden.js'
import Admin from '../models/Admin.js'
import Security from '../models/Security.js'
import Hod from '../models/Hod.js'
import Counsellor from '../models/Counsellor.js'

// Same list as authController — keep in sync when new roles are added
const AUTH_MODELS = [Student, Warden, Admin, Security, Hod, Counsellor]

/**
 * Finds a user document by id across all authentication models.
 * Returns the first match or null.
 */
async function findUserById(id) {
  for (const Model of AUTH_MODELS) {
    try {
      const user = await Model.findById(id).select('-password')
      if (user) return user
    } catch (_) {
      // Model may not have this id — continue
    }
  }
  return null
}

/**
 * Socket.io authentication middleware.
 *
 * Clients must send the JWT access token in ONE of these ways:
 *   1. socket.auth.token = '<jwt>'          (recommended — sent during connect)
 *   2. socket.handshake.auth.token          (same as above, Socket.io v4 style)
 *   3. socket.handshake.headers.authorization = 'Bearer <jwt>'
 *   4. socket.handshake.query.token         (fallback — avoid in production)
 *
 * On success: attaches socket.user = { id, email, role, ... }
 * On failure: calls next(new Error('Authentication error'))
 */
export async function socketAuthMiddleware(socket, next) {
  try {
    // Extract token from whichever location the client used
    let token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      null

    // Also accept Bearer header (useful for Postman/testing)
    if (!token) {
      const authHeader = socket.handshake.headers?.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1]
      }
    }
    // Read from httpOnly cookie (browser sends this automatically with withCredentials: true)
      if (!token) {
        const cookieHeader = socket.handshake.headers?.cookie || ''
        const match = cookieHeader
          .split('; ')
          .find(c => c.startsWith('access_token='))
        if (match) token = match.split('=')[1]
      }

    if (!token) {
      logger.warn(`[Socket] Connection rejected — no token. id=${socket.id}`)
      return next(new Error('Authentication error: token required'))
    }

    // Verify the JWT
    let decoded
    try {
      decoded = jwt.verify(token, config.jwt.secret)
    } catch (err) {
      logger.warn(`[Socket] Invalid token. id=${socket.id} err=${err.message}`)
      return next(new Error('Authentication error: invalid or expired token'))
    }

    // Load full user document to get role and status
    const user = await findUserById(decoded.id)
    if (!user) {
      logger.warn(`[Socket] User not found for token. userId=${decoded.id}`)
      return next(new Error('Authentication error: user not found'))
    }

    // Block inactive / suspended accounts
    if (user.status && user.status !== 'active') {
      logger.warn(`[Socket] Inactive account tried to connect. userId=${user._id} status=${user.status}`)
      return next(new Error('Authentication error: account is not active'))
    }

    // Attach a lean user object to the socket for use in event handlers
    socket.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      // Include role-specific fields used for room routing
      studentId: user.studentId || null,
      hostelBlock: user.hostelBlock || null,
      department: user.department || null,
      hostelType: user.hostelType || null,
      adminRole: user.adminRole || null,
    }

    logger.info(`[Socket] Authenticated: userId=${socket.user.id} role=${socket.user.role} socketId=${socket.id}`)
    next()
  } catch (err) {
    logger.error(`[Socket] Auth middleware error: ${err.message}`)
    next(new Error('Authentication error: server error'))
  }
}