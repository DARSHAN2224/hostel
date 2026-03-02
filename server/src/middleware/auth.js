import jwt from 'jsonwebtoken'
import { config } from '../config/config.js'
import { UnauthorizedError } from '../utils/customErrors.js'
import { Student, Warden, Admin, Security, Hod, Counsellor } from '../models/index.js'
/**
 * Auth middleware to verify JWT tokens from cookies or Authorization header
 */
export const authenticateToken = async (req, res, next) => {
  try {
    // Try to get token from Authorization header first, then from cookies
    let token = null

    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else if (req.cookies?.access_token || req.cookies?.accessToken) {
      token = req.cookies.access_token || req.cookies.accessToken
    }

    if (!token) {
      throw new UnauthorizedError('Access token required')
    }

    // Verify the token
    const decoded = jwt.verify(token, config.jwt.secret)

    // Add user info to request object. Preserve additional fields present
    // in the token (e.g. adminRole, permissions, reportAccess, department)
    // so controllers can make fine-grained authorization decisions.
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      ...(decoded.adminRole ? { adminRole: decoded.adminRole } : {}),
      ...(decoded.permissions ? { permissions: decoded.permissions } : {}),
      ...(decoded.reportAccess ? { reportAccess: decoded.reportAccess } : {}),
      ...(decoded.department ? { department: decoded.department } : {})
    }

    // Enforce mustChangePassword: if the user is required to change password
    // on first login (admin-generated password), block access to application
    // routes until they change password. Allow only a small set of auth routes.
    const allowedPathsWhileMustChange = [
      '/api/v1/auth/change-password',
      '/api/v1/auth/verify-email',
      '/api/v1/auth/logout',
      '/api/v1/auth/refresh',
      '/api/v1/auth/reset-password'
    ]

    // Find the user document across possible models to check mustChangePassword
    const id = decoded.id
    const Models = [Student, Warden, Admin, Security, Hod, Counsellor]
    let found = null
    for (const M of Models) {
      try {
        // select only necessary fields
        const doc = await M.findById(id).select('mustChangePassword isEmailVerified status')
        if (doc) { found = doc; break }
      } catch {
        // ignore and continue
      }
    }

    if (found) {
      // Block inactive accounts
      if (typeof found.status !== 'undefined' && found.status !== 'active') {
        return res.status(403).json({ success: false, statusCode: 403, message: 'Account is not active', data: null })
      }

      if (found.mustChangePassword) {
        // When routes are mounted (e.g. /api/v1/auth), req.path may be
        // the path relative to the mount point (e.g. '/change-password').
        // Use originalUrl when available so allowedPaths with full prefixes
        // (like '/api/v1/auth/change-password') match correctly.
        const pathToCheck = req.originalUrl || req.path || ''
        const isAllowed = allowedPathsWhileMustChange.some(p => pathToCheck.startsWith(p) || (req.path || '').startsWith(p))
        if (!isAllowed) {
          return res.status(403).json({ success: false, statusCode: 403, message: 'Password change required. Please change your password before accessing the application.', data: null })
        }
      }
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
  } catch {
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
