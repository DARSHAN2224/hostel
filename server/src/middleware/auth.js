import jwt from 'jsonwebtoken'
import { config } from '../config/config.js'
import { UnauthorizedError, ForbiddenError } from '../utils/customErrors.js'

/**
 * Auth middleware to verify JWT tokens from cookies or Authorization header
 */
export const authenticateToken = (req, res, next) => {
  try {
    // Try to get token from Authorization header first, then from cookies
    let token = null
    
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else if (req.cookies?.access_token) {
      token = req.cookies.access_token
    }

    if (!token) {
      throw new UnauthorizedError('Access token required')
    }

    // Verify the token
    const decoded = jwt.verify(token, config.jwt.secret)
    
    // Add user info to request object
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    }

    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        statusCode: 401,
        message: 'Token expired',
        data: null
      })
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        statusCode: 401,
        message: 'Invalid token',
        data: null
      })
    }

    return res.status(401).json({ 
      success: false,
      statusCode: 401,
      message: error.message || 'Token verification failed',
      data: null
    })
  }
}

export default authenticateToken;

/**
 * Optional auth middleware - doesn't fail if no token
 */
export const optionalAuth = (req, res, next) => {
  try {
    let token = null
    
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else if (req.cookies?.access_token) {
      token = req.cookies.access_token
    }

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret)
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      }
    }

    next()
  } catch (error) {
    // Continue without user if token is invalid
    next()
  }
}

/**
 * Role-based access control middleware
 * Usage: authorize('admin', 'warden')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        statusCode: 401,
        message: 'Authentication required',
        data: null
      })
    }

    const userRole = req.user.role
    const allowedRoles = roles

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        success: false,
        statusCode: 403,
        message: 'You do not have permission to access this resource',
        data: null
      })
    }

    next()
  }
}

/**
 * Legacy - Role-based access control middleware (array version)
 */
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      })
    }

    const userRole = req.user.role
    const allowedRoles = Array.isArray(roles) ? roles : [roles]

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      })
    }

    next()
  }
}

/**
 * Admin only middleware
 */
export const requireAdmin = requireRole(['admin'])

/**
 * Staff or Admin middleware
 */
export const requireStaff = requireRole(['admin', 'staff'])
