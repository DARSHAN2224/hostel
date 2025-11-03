/**
 * Dashboard Home Page - Ultra Modern with Animations
 * Main dashboard with statistics and recent activity
 */

import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { 
  UserGroupIcon, 
  ClipboardDocumentCheckIcon, 
  ClockIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  SparklesIcon
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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut'
    }
  }
}

const StatCard = ({ title, value, icon, trend, trendText, gradient, delay = 0 }) => {
  const IconComponent = icon
  
  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300"
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5`} />
      
      <div className="relative p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
            <Motion.p 
              className="mt-2 text-4xl font-bold bg-gradient-to-br bg-clip-text text-transparent"
              style={{ 
                backgroundImage: `linear-gradient(135deg, ${gradient.includes('blue') ? '#3b82f6, #06b6d4' : gradient.includes('amber') ? '#f59e0b, #f97316' : gradient.includes('green') ? '#10b981, #059669' : '#8b5cf6, #ec4899'})`
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: delay + 0.2 }}
            >
              {value}
            </Motion.p>
            {trend && (
              <Motion.div 
                className={`mt-2 flex items-center text-sm ${trend === 'up' ? 'text-green-600' : 'text-amber-600'}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: delay + 0.3 }}
              >
                {trend === 'up' ? (
                  <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                ) : (
                  <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                )}
                {trendText}
              </Motion.div>
            )}
          </div>
          
          <Motion.div 
            className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.6 }}
          >
            {IconComponent && <IconComponent className="w-8 h-8 text-white" />}
          </Motion.div>
        </div>
      </div>

      {/* Shimmer effect */}
      <Motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{
          duration: 2,
          delay: delay + 0.5,
          ease: 'easeInOut'
        }}
      />
    </Motion.div>
  )
}

export default function Dashboard() {
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
      
      // Fetch outpass data from warden endpoint
      const outpassesRes = await getOutpasses({ limit: 10, sort: '-createdAt' })
      
      // Extract outpasses array from response - handle different response structures
      let outpasses = []
      if (Array.isArray(outpassesRes)) {
        outpasses = outpassesRes
      } else if (outpassesRes?.data?.outpasses && Array.isArray(outpassesRes.data.outpasses)) {
        outpasses = outpassesRes.data.outpasses
      } else if (outpassesRes?.outpasses && Array.isArray(outpassesRes.outpasses)) {
        outpasses = outpassesRes.outpasses
      }

      // Calculate stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const pending = outpasses.filter(o => 
        o.status === 'pending' || 
        o.status === 'approved_by_warden'
      )
      
      const approvedToday = outpasses.filter(o => 
        (o.status === 'approved' || o.status === 'approved_by_hod') && 
        new Date(o.updatedAt) >= today
      )

      const rejectedToday = outpasses.filter(o => 
        (o.status === 'rejected' || o.status === 'rejected_by_hod') && 
        new Date(o.updatedAt) >= today
      )

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const expiring = outpasses.filter(o => 
        (o.status === 'approved' || o.status === 'approved_by_hod') && 
        o.expectedReturnTime &&
        new Date(o.expectedReturnTime) <= tomorrow &&
        new Date(o.expectedReturnTime) >= new Date()
      )

      setStats({
        totalStudents: 0, // Will be fetched from student endpoint if needed
        activeStudents: 0,
        pendingRequests: pending.length,
        approvedToday: approvedToday.length,
        rejectedToday: rejectedToday.length,
        expiringSoon: expiring.length
      })

      setRecentOutpasses(outpasses)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      // Set empty data on error
      setStats({
        totalStudents: 0,
        activeStudents: 0,
        pendingRequests: 0,
        approvedToday: 0,
        rejectedToday: 0,
        expiringSoon: 0
      })
      setRecentOutpasses([])
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
    <DashboardLayout>
      <Motion.div 
        className="space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Welcome Section with Gradient */}
        <Motion.div 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-8 shadow-2xl"
        >
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-float" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          </div>

          <div className="relative">
            <Motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3"
            >
              <SparklesIcon className="w-10 h-10 text-white animate-pulse" />
              <h1 className="text-4xl font-bold text-white">
                Welcome back, {user?.name || 'User'}!
              </h1>
            </Motion.div>
            <Motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-2 text-lg text-white/90"
            >
              Here's what's happening with your hostel today.
            </Motion.p>
          </div>
        </Motion.div>

        {/* Stats Grid */}
        <Motion.div 
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {/* Total Students */}
          {(isWarden || isAdmin) && (
            <StatCard
              title="Total Students"
              value={stats.totalStudents}
              icon={UserGroupIcon}
              gradient="from-blue-500 to-cyan-500"
              delay={0}
            />
          )}

          {/* Pending Requests */}
          <StatCard
            title="Pending Requests"
            value={stats.pendingRequests}
            icon={ClockIcon}
            trend={stats.pendingRequests > 0 ? 'warning' : null}
            trendText={stats.pendingRequests > 0 ? 'Needs attention' : null}
            gradient="from-amber-500 to-orange-500"
            delay={0.1}
          />

          {/* Approved Today */}
          <StatCard
            title="Approved Today"
            value={stats.approvedToday}
            icon={CheckCircleIcon}
            trend={stats.approvedToday > 0 ? 'up' : null}
            trendText={stats.approvedToday > 0 ? 'Today' : null}
            gradient="from-green-500 to-emerald-500"
            delay={0.2}
          />

          {/* Expiring Soon */}
          <StatCard
            title="Expiring Soon"
            value={stats.expiringSoon}
            icon={ClockIcon}
            trend={stats.expiringSoon > 0 ? 'warning' : null}
            trendText={stats.expiringSoon > 0 ? 'Within 24h' : null}
            gradient="from-purple-500 to-pink-500"
            delay={0.3}
          />
        </Motion.div>

        {/* Recent Outpass Requests */}
        <Motion.div 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg"
        >
          {/* Gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-10" />
          
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Recent Outpass Requests
              </h2>
              <Link to={ROUTES.OUTPASS_REQUESTS}>
                <Motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  View All
                </Motion.button>
              </Link>
            </div>

            {recentOutpasses.length === 0 ? (
              <EmptyState
                icon={ClipboardDocumentCheckIcon}
                title="No outpass requests"
                description="There are no recent outpass requests to display."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Submitted
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {recentOutpasses.map((outpass, index) => {
                      const StatusIcon = getStatusIcon(outpass.status)
                      return (
                        <Motion.tr 
                          key={outpass._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', scale: 1.01 }}
                          className="transition-all duration-200"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Motion.div 
                                className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg"
                                whileHover={{ rotate: 360 }}
                                transition={{ duration: 0.6 }}
                              >
                                <span className="text-white font-bold text-lg">
                                  {outpass.student?.name?.charAt(0) || 'S'}
                                </span>
                              </Motion.div>
                              <div className="ml-4">
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {outpass.student?.name || 'Unknown Student'}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {outpass.student?.registerNumber || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                              {outpass.reason}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {formatDate(outpass.departureDateTime, 'MMM dd, yyyy')}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(outpass.departureDateTime, 'HH:mm')} - {formatDate(outpass.returnDateTime, 'HH:mm')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge status={outpass.status} icon={StatusIcon} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatRelativeTime(outpass.createdAt)}
                          </td>
                        </Motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Motion.div>
      </Motion.div>
    </DashboardLayout>
  )
}
