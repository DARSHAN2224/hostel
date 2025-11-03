import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import { store } from './store/store'

// Pages
import LandingPage from './pages/LandingPage'
import RoleLogin from './pages/auth/RoleLogin'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import StudentManagement from './pages/students/StudentManagement'
import StudentDashboard from './pages/students/StudentDashboard'
import OutpassManagement from './pages/outpass/OutpassManagement'
import AdminDashboard from './pages/admin/AdminDashboard'
import SecurityDashboard from './pages/security/SecurityDashboard'
import HODDashboard from './pages/hod/HODDashboard'
import Settings from './pages/settings/Settings'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import { ROUTES } from './constants'
import './App.css'

function App() {
  return (
    <Provider store={store}>
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
            
            {/* No signup routes - accounts are created by admins/wardens */}
            
            {/* Protected Routes */}
            <Route 
              path={ROUTES.DASHBOARD}
              element={
                <ProtectedRoute>
                  <Dashboard />
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
            
            {/* Catch all route - redirect to home */}
            <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
          </Routes>

          {/* Toast Notifications */}
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
    </Provider>
  )
}

export default App

