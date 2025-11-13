import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider, useSelector } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import { store } from './store/store'
import ServerValidationToaster from './components/ServerValidationToaster'

// Pages
import LandingPage from './pages/LandingPage'
import RoleLogin from './pages/auth/RoleLogin'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import VerifyEmail from './pages/auth/VerifyEmail'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import StudentManagement from './pages/students/StudentManagement'
import WardenManagement from './pages/wardens/WardenManagement'
import HODManagement from './pages/hods/HODManagement'
import ParentManagement from './pages/parents/ParentManagement'
import StudentDashboard from './pages/students/StudentDashboard'
import OutpassManagement from './pages/outpass/OutpassManagement'
import AdminDashboard from './pages/admin/AdminDashboard'
import SecurityDashboard from './pages/security/SecurityDashboard'
import SecurityManagement from './pages/security/SecurityManagement'
import SecurityScanner from './pages/security/SecurityScanner'
import HODDashboard from './pages/hod/HODDashboard'
import Settings from './pages/settings/Settings'
import OutpassHistory from './pages/history/OutpassHistory'
import Reports from './pages/reports/Reports'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import RoleBasedRoute from './components/RoleBasedRoute'
import { ROUTES } from './constants'
import { ThemeProvider } from './context/ThemeContext'
import { selectUser } from './store/authSlice'
import './App.css'

// Role-based dashboard router: redirects /dashboard based on the logged-in user's role
function DashboardRouter() {
  const user = useSelector(selectUser)

  const role = user?.role
  if (!role) return <Dashboard />

  // Redirect to role-specific dashboards
  if (role === 'admin') return <Navigate to="/admin/dashboard" replace />
  if (role === 'student') return <Navigate to="/student/dashboard" replace />
  if (role === 'security') return <Navigate to="/security/dashboard" replace />
  if (role === 'hod') return <Navigate to="/hod/dashboard" replace />

  // Default: warden and any other roles use the unified dashboard
  return <Dashboard />
}

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path={ROUTES.HOME} element={<LandingPage />} />
            
            {/* Role-based Login Routes - Protected from authenticated users */}
            <Route 
              path={ROUTES.STUDENT_LOGIN} 
              element={
                <PublicRoute>
                  <RoleLogin />
                </PublicRoute>
              } 
            />
            <Route 
              path={ROUTES.WARDEN_LOGIN} 
              element={
                <PublicRoute>
                  <RoleLogin />
                </PublicRoute>
              } 
            />
            <Route 
              path={ROUTES.ADMIN_LOGIN} 
              element={
                <PublicRoute>
                  <RoleLogin />
                </PublicRoute>
              } 
            />
            <Route 
              path={ROUTES.SECURITY_LOGIN} 
              element={
                <PublicRoute>
                  <RoleLogin />
                </PublicRoute>
              } 
            />
            <Route 
              path={ROUTES.HOD_LOGIN} 
              element={
                <PublicRoute>
                  <RoleLogin />
                </PublicRoute>
              } 
            />
            
            {/* Generic login route - redirects to student login */}
            <Route path={ROUTES.LOGIN} element={<Navigate to={ROUTES.STUDENT_LOGIN} replace />} />

            {/* Auth helpers: forgot/reset/verify */}
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <PublicRoute>
                  <ResetPassword />
                </PublicRoute>
              }
            />
            <Route
              path="/verify-email"
              element={
                <PublicRoute>
                  <VerifyEmail />
                </PublicRoute>
              }
            />
            
            {/* No signup routes - accounts are created by admins/wardens */}
            
            {/* Protected Routes */}
            <Route 
              path={ROUTES.DASHBOARD}
              element={
                <ProtectedRoute>
                  <DashboardRouter />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/home" 
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/dashboard"
              element={
                <ProtectedRoute>
                  <StudentDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path={ROUTES.STUDENTS}
              element={
                <ProtectedRoute>
                  <StudentManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path={ROUTES.WARDENS}
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['admin']}>
                    <WardenManagement />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } 
            />
            <Route 
              path={ROUTES.HODS}
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['admin']}>
                    <HODManagement />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/parents"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['admin', 'warden']}>
                    <ParentManagement />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } 
            />
            <Route 
              path={ROUTES.OUTPASS_REQUESTS}
              element={
                <ProtectedRoute>
                  <OutpassManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/security/dashboard"
              element={
                <ProtectedRoute>
                  <SecurityDashboard />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/security/scan"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={[ 'security' , 'admin']}>
                    <SecurityScanner />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/security"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['admin']}>
                    <SecurityManagement />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/hod/dashboard"
              element={
                <ProtectedRoute>
                  <HODDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path={ROUTES.SETTINGS}
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path={ROUTES.PROFILE}
              element={
                <ProtectedRoute>
                  <Settings initialTab="profile" />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/history"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['admin', 'warden', 'hod']}>
                    <OutpassHistory />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } 
            />
            <Route
              path="/student/history"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['student']}>
                    <OutpassHistory />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/reports"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['admin', 'warden', 'hod']}>
                    <Reports />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } 
            />
            
            {/* Catch all route - redirect to home */}
            <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
          </Routes>

          {/* Toast Notifications */}
          <ServerValidationToaster />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#2ECC71',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#E74C3C',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
      </ThemeProvider>
    </Provider>
  )
}

export default App

