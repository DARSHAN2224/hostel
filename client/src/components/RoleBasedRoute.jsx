import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { selectUser } from '../store/authSlice'

const RoleBasedRoute = ({ allowedRoles = [], children, redirectTo = '/dashboard' }) => {
  const user = useSelector(selectUser)
  
  // If no user, redirect to login (ProtectedRoute should handle this)
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If no roles specified, allow all authenticated users
  if (allowedRoles.length === 0) {
    return children
  }

  // Check if user's role is in the allowed roles
  const hasPermission = allowedRoles.includes(user.role)

  if (!hasPermission) {
    // Redirect to their appropriate dashboard or specified route
    return <Navigate to={redirectTo} replace />
  }

  return children
}

RoleBasedRoute.propTypes = {
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  children: PropTypes.node.isRequired,
  redirectTo: PropTypes.string,
}

export default RoleBasedRoute
