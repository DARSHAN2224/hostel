import { useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'
import { STORAGE_KEYS, ROUTES } from '../constants'
import { selectUser } from '../store/authSlice'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useSelector((state) => state.auth)
  const user = useSelector(selectUser)
  const location = useLocation()

  // Check for tokens in localStorage
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
  const hasValidTokens = accessToken && refreshToken

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  // If not authenticated and no valid tokens, redirect to login with return url
  if (!isAuthenticated && !hasValidTokens) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If authenticated or has valid tokens, render the protected component
  // Enforce forced password change: if user's mustChangePassword flag is set,
  // redirect to settings unless the user is already on the settings page
  // (prevents a redirect loop which causes a blank page)
  if (user?.mustChangePassword) {
    // Debug: log user and localStorage state to help trace unexpected redirects
    try {
      console.log('[ProtectedRoute] user.mustChangePassword:', user?.mustChangePassword, 'user:', user)
      const stored = localStorage.getItem(STORAGE_KEYS.USER_DATA)
      console.log('[ProtectedRoute] localStorage userData:', stored)
    } catch {
      // ignore
    }

    const currentPath = location?.pathname || ''
    // allow access to settings page so the user can change their password
    if (currentPath !== ROUTES.SETTINGS && currentPath !== (ROUTES.PROFILE || '/profile')) {
      console.log('[ProtectedRoute] redirecting to SETTINGS from', currentPath)
      return <Navigate to={ROUTES.SETTINGS} replace />
    }
  }

  return children
}

export default ProtectedRoute