import { useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'
import { STORAGE_KEYS } from '../constants'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useSelector((state) => state.auth)
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
  return children
}

export default ProtectedRoute