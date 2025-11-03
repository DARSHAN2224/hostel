/**
 * Dashboard Home Page
 * Main dashboard with statistics and recent activity
 */

import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { 
  UserGroupIcon, 
  ClipboardDocumentCheckIcon, 
  ClockIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'
import DashboardLayout from '../layouts/DashboardLayout'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { LoadingCard } from '../components/ui/Loading'
import EmptyState from '../components/ui/EmptyState'
import { selectUser } from '../store/authSlice'
import { formatDate, formatRelativeTime, hasRole } from '../utils/helpers'
import { USER_ROLES, OUTPASS_STATUS, ROUTES } from '../constants'
import { getOutpasses } from '../services/outpassService'
import { getStudents } from '../services/studentService'

const Home = () => {
  const user = useSelector(selectUser)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    pendingRequests: 0,
    approvedToday: 0,
    rejectedToday: 0,
    expiringSoon: 0
  })
  const [recentOutpasses, setRecentOutpasses] = useState([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch statistics
      const [outpassesRes, studentsRes] = await Promise.all([
        getOutpasses({ limit: 10, sort: '-createdAt' }),
        getStudents({ limit: 1 }) // Just to get total count
      ])

      // Calculate stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const pending = outpassesRes.data.filter(o => o.status === OUTPASS_STATUS.PENDING_WARDEN_APPROVAL)
      const approvedToday = outpassesRes.data.filter(o => 
        o.status === OUTPASS_STATUS.APPROVED && 
        new Date(o.updatedAt) >= today
      )
      const rejectedToday = outpassesRes.data.filter(o => 
        o.status === OUTPASS_STATUS.REJECTED && 
        new Date(o.updatedAt) >= today
      )

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const expiring = outpassesRes.data.filter(o => 
        o.status === OUTPASS_STATUS.APPROVED && 
        new Date(o.returnDateTime) <= tomorrow &&
        new Date(o.returnDateTime) >= new Date()
      )

      setStats({
        totalStudents: studentsRes.pagination?.total || 0,
        activeStudents: studentsRes.pagination?.total || 0,
        pendingRequests: pending.length,
        approvedToday: approvedToday.length,
        rejectedToday: rejectedToday.length,
        expiringSoon: expiring.length
      })

      setRecentOutpasses(outpassesRes.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case OUTPASS_STATUS.APPROVED:
        return CheckCircleIcon
      case OUTPASS_STATUS.REJECTED:
        return XCircleIcon
      case OUTPASS_STATUS.PENDING_WARDEN_APPROVAL:
      case OUTPASS_STATUS.PENDING_HOD_APPROVAL:
      case OUTPASS_STATUS.PENDING_PARENT_APPROVAL:
        return ClockIcon
      default:
        return ClipboardDocumentCheckIcon
    }
  }

  const isWarden = hasRole(user, USER_ROLES.WARDEN)
  const isAdmin = hasRole(user, USER_ROLES.ADMIN)

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <LoadingCard key={i} />
            ))}
          </div>
          <LoadingCard />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-primary text-white p-2 rounded-md">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">Hostel Management</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <img
                  className="h-8 w-8 rounded-full bg-gray-300"
                  src={`https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=2563eb&color=fff`}
                  alt="Profile"
                />
                <span className="ml-3 text-gray-700 text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome back, {user?.firstName}! 👋
              </h2>
              <p className="text-gray-600">
                You're successfully authenticated and viewing the protected dashboard.
              </p>
            </div>
          </div>

          {/* User Info Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                User Information
              </h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user?.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Role</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {user?.role || 'Student'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </dd>
                </div>
                {user?.studentId && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Student ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.studentId}</dd>
                  </div>
                )}
                {user?.phone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.phone}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Outpass Requests
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Coming Soon
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Room Management
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Coming Soon
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Profile Settings
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Coming Soon
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Token Info (for demo purposes) */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">🔐 Authentication Status</h4>
            <p className="text-sm text-blue-700">
              You are successfully authenticated with JWT tokens. Your session is being managed 
              automatically with access and refresh tokens.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Home