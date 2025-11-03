/**
 * Admin Dashboard - Ultra Modern System Overview
 * Complete system management with user overview, statistics, and analytics
 */

import { useState, useEffect, useCallback } from 'react'
import { motion as Motion } from 'framer-motion'
import {
  UsersIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  UserPlusIcon,
  TrashIcon,
  PencilIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'
import DashboardLayout from '../../layouts/DashboardLayout'
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { LoadingCard } from '../../components/ui/Loading'
import EmptyState from '../../components/ui/EmptyState'
import { USER_ROLES, USER_STATUS } from '../../constants'

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalOutpasses: 0,
    pendingOutpasses: 0,
    studentsCount: 0,
    wardensCount: 0,
    securityCount: 0,
    hodCount: 0
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [_selectedUser, setSelectedUser] = useState(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      // TODO: Implement API calls
      // Simulated data for now
      setTimeout(() => {
        setStats({
          totalUsers: 245,
          activeUsers: 238,
          totalOutpasses: 1247,
          pendingOutpasses: 23,
          studentsCount: 200,
          wardensCount: 15,
          securityCount: 10,
          hodCount: 20
        })
        setUsers([
          {
            _id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@college.edu',
            role: USER_ROLES.STUDENT,
            status: USER_STATUS.ACTIVE,
            createdAt: new Date().toISOString()
          },
          {
            _id: '2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@college.edu',
            role: USER_ROLES.WARDEN,
            status: USER_STATUS.ACTIVE,
            createdAt: new Date().toISOString()
          }
        ])
        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter

    return matchesSearch && matchesRole
  })

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: UsersIcon,
      gradient: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      trend: '+12%',
      trendUp: true
    },
    {
      title: 'Active Users',
      value: stats.activeUsers,
      icon: CheckCircleIcon,
      gradient: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      trend: '+5%',
      trendUp: true
    },
    {
      title: 'Total Outpasses',
      value: stats.totalOutpasses,
      icon: DocumentTextIcon,
      gradient: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      trend: '+18%',
      trendUp: true
    },
    {
      title: 'Pending Requests',
      value: stats.pendingOutpasses,
      icon: ClockIcon,
      gradient: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      trend: '-3%',
      trendUp: false
    }
  ]

  const roleDistribution = [
    { role: 'Students', count: stats.studentsCount, color: 'from-blue-500 to-cyan-500' },
    { role: 'Wardens', count: stats.wardensCount, color: 'from-green-500 to-emerald-500' },
    { role: 'Security', count: stats.securityCount, color: 'from-orange-500 to-red-500' },
    { role: 'HODs', count: stats.hodCount, color: 'from-indigo-500 to-purple-500' }
  ]

  return (
    <DashboardLayout>
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header */}
        <Motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 p-8 shadow-2xl"
        >
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-float" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          </div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SparklesIcon className="h-12 w-12 text-white animate-pulse" />
              <div>
                <h1 className="text-3xl font-display font-bold text-white">
                  Admin Dashboard
                </h1>
                <p className="mt-1 text-lg text-white/90">
                  Complete system overview and management 🎯
                </p>
              </div>
            </div>
            <Button
              variant="glass"
              icon={UserPlusIcon}
              onClick={() => setShowCreateModal(true)}
            >
              Create User
            </Button>
          </div>
        </Motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <Motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card glassmorphic hover className="h-full">
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                        {stat.title}
                      </p>
                      <h3 className={`text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-2`}>
                        {stat.value}
                      </h3>
                      <div className="flex items-center gap-1">
                        {stat.trendUp ? (
                          <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
                        )}
                        <span className={`text-sm font-medium ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                          {stat.trend}
                        </span>
                        <span className="text-xs text-slate-500">vs last month</span>
                      </div>
                    </div>
                    <Motion.div
                      className={`p-3 rounded-xl ${stat.bgColor}`}
                      whileHover={{ scale: 1.1, rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <stat.icon className={`h-6 w-6 bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`} style={{ stroke: 'url(#gradient)' }} />
                    </Motion.div>
                  </div>
                </CardContent>
              </Card>
            </Motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Role Distribution */}
          <Motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card glassmorphic gradient>
              <CardHeader>
                <CardTitle gradient icon={ChartBarIcon}>Role Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {roleDistribution.map((item, index) => (
                    <Motion.div
                      key={item.role}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{item.role}</span>
                        <span className={`font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                          {item.count}
                        </span>
                      </div>
                      <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <Motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${stats.totalUsers > 0 ? (item.count / stats.totalUsers) * 100 : 0}%` }}
                          transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                          className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                        />
                      </div>
                    </Motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Motion.div>

          {/* User Management */}
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2"
          >
            <Card glassmorphic gradient>
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <CardTitle gradient icon={UsersIcon}>User Management</CardTitle>
                  <Button icon={UserPlusIcon} onClick={() => setShowCreateModal(true)}>
                    Add User
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    glassmorphic
                  />
                  <Select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    glassmorphic
                  >
                    <option value="all">All Roles</option>
                    <option value={USER_ROLES.STUDENT}>Students</option>
                    <option value={USER_ROLES.WARDEN}>Wardens</option>
                    <option value={USER_ROLES.SECURITY}>Security</option>
                    <option value={USER_ROLES.HOD}>HODs</option>
                    <option value={USER_ROLES.ADMIN}>Admins</option>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <LoadingCard key={i} />)}
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <EmptyState
                    icon={UsersIcon}
                    title="No users found"
                    description="Try adjusting your search or filters"
                  />
                ) : (
                  <div className="space-y-3">
                    {filteredUsers.map((user, index) => (
                      <Motion.div
                        key={user._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ x: 4, scale: 1.01 }}
                        className="flex items-center justify-between p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200"
                      >
                        <div className="flex items-center gap-4">
                          <Motion.div
                            className="relative"
                            whileHover={{ scale: 1.1, rotate: 360 }}
                            transition={{ duration: 0.5 }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur opacity-50" />
                            <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                              <span className="text-lg font-bold text-white">
                                {user.firstName.charAt(0)}
                              </span>
                            </div>
                          </Motion.div>
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white">
                              {user.firstName} {user.lastName}
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="default">{user.role}</Badge>
                          <Badge variant={user.status === USER_STATUS.ACTIVE ? 'success' : 'danger'}>
                            {user.status}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              icon={PencilIcon}
                              onClick={() => setSelectedUser(user)}
                            />
                            <Button
                              variant="ghost"
                              icon={TrashIcon}
                            />
                          </div>
                        </div>
                      </Motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </Motion.div>
        </div>

        {/* Create User Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New User"
          gradient
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" glassmorphic required />
              <Input label="Last Name" glassmorphic required />
            </div>
            <Input label="Email" type="email" glassmorphic required />
            <Select label="Role" glassmorphic required>
              <option value="">Select Role</option>
              <option value={USER_ROLES.STUDENT}>Student</option>
              <option value={USER_ROLES.WARDEN}>Warden</option>
              <option value={USER_ROLES.SECURITY}>Security</option>
              <option value={USER_ROLES.HOD}>HOD</option>
              <option value={USER_ROLES.ADMIN}>Admin</option>
            </Select>
            <Input label="Password" type="password" glassmorphic required />
            <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <ShieldCheckIcon className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <p className="text-sm text-purple-900 dark:text-purple-100">
                User will receive an email with login credentials and instructions.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => setShowCreateModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                icon={UserPlusIcon}
                className="flex-1"
                onClick={() => setShowCreateModal(false)}
              >
                Create User
              </Button>
            </div>
          </div>
        </Modal>
      </Motion.div>
    </DashboardLayout>
  )
}
