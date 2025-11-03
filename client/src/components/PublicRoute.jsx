import { Navigate, useLocation } from 'react-router-dom'
import { STORAGE_KEYS, USER_ROLES } from '../constants'

/**
 * PublicRoute - Prevents authenticated users from accessing login/register pages
 * If user has valid tokens, redirect them to their role-specific dashboard
 */
const PublicRoute = ({ children }) => {
  const location = useLocation()
  
  // Check for tokens in localStorage
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
  const hasValidTokens = accessToken && refreshToken

  // If user has valid tokens, redirect to dashboard
  if (hasValidTokens) {
    // Try to get user data to determine role
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA)
    let userRole = null
    
    try {
      if (userData) {
        const user = JSON.parse(userData)
        userRole = user.role
      }
    } catch (error) {
      console.error('Failed to parse user data:', error)
    }

    // Extract role from current path if available
    const pathRole = location.pathname.split('/')[1]
    const role = userRole || pathRole

    // Redirect to appropriate dashboard based on role
    switch (role) {
      case USER_ROLES.STUDENT:
        return <Navigate to="/student/dashboard" replace />
      case USER_ROLES.WARDEN:
        return <Navigate to="/dashboard" replace />
      case USER_ROLES.ADMIN:
        return <Navigate to="/admin/dashboard" replace />
      case USER_ROLES.SECURITY:
        return <Navigate to="/security/dashboard" replace />
      case USER_ROLES.HOD:
        return <Navigate to="/hod/dashboard" replace />
      default:
        return <Navigate to="/dashboard" replace />
    }
  }

  // If no tokens, allow access to public route (login/register)
  return children
}

export default PublicRoute
