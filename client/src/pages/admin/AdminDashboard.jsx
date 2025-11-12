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
import { EyeIcon } from '@heroicons/react/24/outline'
import DashboardLayout from '../../layouts/DashboardLayout'
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { LoadingCard } from '../../components/ui/Loading'
import EmptyState from '../../components/ui/EmptyState'
import { USER_ROLES, USER_STATUS, HOSTEL_TYPES, DEPARTMENTS, HOSTEL_BLOCKS, VALIDATION, COURSES } from '../../constants'
import { getUserStats, getUsers, createUser, updateUser, deleteUser } from '../../services/userService'
import toast from 'react-hot-toast'
// no direct auth selector needed in this dashboard (role-specific pages handle credential display)

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
    const [showEditModal, setShowEditModal] = useState(false)
    const [selectedUser, setSelectedUser] = useState(null)
    const [editFormData, setEditFormData] = useState(null)
  const departmentsList = DEPARTMENTS || []
  const [hostelBlocksList, setHostelBlocksList] = useState(HOSTEL_BLOCKS || [])
  

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      // Fetch stats
      const statsRes = await getUserStats()
      const s = statsRes?.data || statsRes
      setStats((prev) => ({
        ...prev,
        totalUsers: s.totalUsers || 0,
        studentsCount: s.studentsCount || 0,
        wardensCount: s.wardensCount || 0,
        securityCount: s.securityCount || 0,
        hodCount: s.hodCount || 0,
      }))

      // Fetch users list with role filtering and search
      const params = {
        role: roleFilter === 'all' ? 'all' : roleFilter,
        search: searchQuery || ''
      }
      const usersRes = await getUsers(params)
      const list = usersRes?.data?.users || usersRes?.users || []
      setUsers(Array.isArray(list) ? list : [])
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error(error?.message || 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }, [roleFilter, searchQuery])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Try to fetch departments/hostel-blocks from backend if endpoints exist.
  // Fall back to constants if the calls fail or endpoints are not present.
  useEffect(() => {
    let mounted = true
    const loadMeta = async () => {
      try {
        // Fetch hostel blocks from the server route: /api/v1/auth/hostel-blocks
        // The server responds with ApiResponse { data: { types, blocks } }
        const hbRes = await fetch('/api/v1/auth/hostel-blocks')
        if (mounted && hbRes.ok) {
          const json = await hbRes.json()
          const blocksObj = json?.data?.blocks || json?.blocks || null
          if (blocksObj && typeof blocksObj === 'object') {
            // Flatten all block arrays into a single list (unique)
            const all = Object.values(blocksObj).flat()
            const unique = Array.from(new Set(all))
            if (unique.length) setHostelBlocksList(unique)
          }
        }
      } catch {
        // ignore - fallback to constants already set
      } finally {
        // nothing else to do; lists already fall back to constants
      }
    }

    loadMeta()
    return () => { mounted = false }
  }, [])

  const handleDeleteUser = async (u) => {
    try {
      const loading = toast.loading('Deleting user...')
      await deleteUser(u.role, u._id)
      toast.success('User deleted', { id: loading })
      fetchDashboardData()
    } catch (err) {
      toast.error(err?.message || 'Failed to delete user')
    }
  }

  const handleCreateUser = async (payload) => {
    try {
      const loading = toast.loading('Creating user...')
      const resp = await createUser(payload)
      // Extract generated password and created user from response (common shapes)
      const genPwd = resp?.data?.data?.generatedPassword || resp?.data?.generatedPassword
  // const createdUser = resp?.data?.data?.user || resp?.data?.user || resp?.data

      if (genPwd) {
        toast.success(`User created — password: ${genPwd}`, { id: loading })
      } else {
        toast.success('User created', { id: loading })
      }

      setShowCreateModal(false)
      setSelectedUser(null)

      // Refresh stats and users
      await fetchDashboardData()
    } catch (err) {
      toast.error(err?.message || 'Failed to create user')
    }
  }

  const handleEditUser = async (payload) => {
    try {
      const loading = toast.loading('Updating user...')
      await updateUser(selectedUser.role, selectedUser._id, payload)
      toast.success('User updated successfully', { id: loading })
      setShowEditModal(false)
      setSelectedUser(null)
      setEditFormData(null)
      fetchDashboardData()
    } catch (err) {
      toast.error(err?.message || 'Failed to update user')
    }
  }

  // Note: credential retrieval moved to per-role management pages (Student, HOD, Warden)

  const openEditModal = (user) => {
    setSelectedUser(user)
    setEditFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      status: user.status || 'active'
    })
    setShowEditModal(true)
  }

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
              onClick={() => { setSelectedUser({ student: { year: new Date().getFullYear(), yearOfStudy: 1 } }); setShowCreateModal(true) }}
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
                  <Button icon={UserPlusIcon} onClick={() => { setSelectedUser({ student: { year: new Date().getFullYear(), yearOfStudy: 1 } }); setShowCreateModal(true) }}>
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
                {(() => {
                  if (loading) {
                    return (
                      <div className="space-y-4">
                        {[1, 2, 3].map(i => <LoadingCard key={i} />)}
                      </div>
                    )
                  }
                  
                  if (filteredUsers.length === 0) {
                    return (
                      <EmptyState
                        icon={UsersIcon}
                        title="No users found"
                        description="Try adjusting your search or filters"
                      />
                    )
                  }
                  
                  return (
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
                              {/* Passwords are not shown on the admin dashboard (view them in role-specific management pages) */}
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
                        onClick={() => openEditModal(user)}
                              />
                              <Button
                                variant="ghost"
                                icon={TrashIcon}
                                onClick={() => handleDeleteUser(user)}
                              />
                              {/* Admin-only: show stored generated password */}
                              {/* password viewing removed from admin dashboard; use role-specific management pages */}
                            </div>
                          </div>
                        </Motion.div>
                      ))}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </Motion.div>
        </div>

        {/* Create User Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => { setShowCreateModal(false); setSelectedUser(null); }}
          title="Create New User"
          gradient
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" glassmorphic required onChange={(e)=>setSelectedUser(prev=>({...(prev||{}), firstName:e.target.value}))} />
              <Input label="Last Name" glassmorphic required onChange={(e)=>setSelectedUser(prev=>({...(prev||{}), lastName:e.target.value}))} />
            </div>
            <Input label="Email" type="email" glassmorphic required onChange={(e)=>setSelectedUser(prev=>({...(prev||{}), email:e.target.value}))} />
            <Select label="Role" glassmorphic required onChange={(e)=>{
                const role = e.target.value
                if (role === USER_ROLES.STUDENT) {
                  setSelectedUser(prev => ({ ...(prev || {}), role, student: { ...(prev?.student || {}), year: prev?.student?.year || new Date().getFullYear(), yearOfStudy: prev?.student?.yearOfStudy || 1 } }))
                } else {
                  setSelectedUser(prev => ({ ...(prev || {}), role }))
                }
              }}>
              <option value="">Select Role</option>
              <option value={USER_ROLES.STUDENT}>Student</option>
              <option value={USER_ROLES.WARDEN}>Warden</option>
              <option value={USER_ROLES.SECURITY}>Security</option>
              <option value={USER_ROLES.ADMIN}>Admin</option>
              <option value={USER_ROLES.HOD}>HOD</option>
            </Select>
            {/* Password is generated by the system for admin-created users. Leave blank to auto-generate and email credentials. */}
            <p className="text-sm text-slate-500 dark:text-slate-400">Leave password blank to generate a secure password automatically and email it to the user. They will be required to change it on first login.</p>

            {/* Student-specific fields */}
            {selectedUser?.role === USER_ROLES.STUDENT && (
              <Motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700"
              >
                <h4 className="font-semibold text-slate-900 dark:text-white">Student Details</h4>
                <Input 
                  label="Roll Number" 
                  glassmorphic 
                  required 
                  placeholder="e.g. 2021-CS-101"
                  onChange={(e)=>setSelectedUser(prev=>({...(prev||{}), student: {...(prev?.student||{}), rollNumber:e.target.value}}))} 
                />
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Course"
                    glassmorphic
                    required
                    value={selectedUser?.student?.course || ''}
                    onChange={(e) => setSelectedUser(prev => ({ ...(prev || {}), student: { ...(prev?.student || {}), course: e.target.value } }))}
                  >
                    <option value="">Select Course</option>
                    {COURSES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                  <Input
                    label="Academic Year"
                    type="number"
                    glassmorphic
                    required
                    value={selectedUser?.student?.year || new Date().getFullYear()}
                    onChange={(e) => setSelectedUser(prev => ({ ...(prev || {}), student: { ...(prev?.student || {}), year: Number(e.target.value) } }))}
                  />
                  <Select
                    label="Year of Study"
                    glassmorphic
                    required
                    value={selectedUser?.student?.yearOfStudy || 1}
                    onChange={(e) => setSelectedUser(prev => ({ ...(prev || {}), student: { ...(prev?.student || {}), yearOfStudy: Number(e.target.value) } }))}
                  >
                    <option value="">Select Year of Study</option>
                    {[1,2,3,4,5,6].map(y => (
                      <option key={y} value={y}>{`${y}${y===1? 'st': y===2? 'nd': y===3? 'rd':'th'} Year`}</option>
                    ))}
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select 
                    label="Semester" 
                    glassmorphic 
                    required 
                    onChange={(e)=>setSelectedUser(prev=>({...(prev||{}), student: {...(prev?.student||{}), semester:Number.parseInt(e.target.value)}}))}
                  >
                    <option value="">Select Semester</option>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </Select>
                  {/* department input removed - we use the select below (keeps UI consistent) */}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select 
                    label="Department" 
                    glassmorphic 
                    required 
                    value={selectedUser?.student?.department || ''}
                    onChange={(e)=>setSelectedUser(prev=>({...(prev||{}), student: {...(prev?.student||{}), department:e.target.value}}))} 
                  >
                    <option value="">Select Department</option>
                    {departmentsList.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </Select>
                  <Select 
                    label="Hostel Type" 
                    glassmorphic 
                    required 
                    value={selectedUser?.student?.hostelType || ''}
                    onChange={(e)=>setSelectedUser(prev=>({...(prev||{}), student: {...(prev?.student||{}), hostelType:e.target.value}}))}
                  >
                    <option value="">Select Type</option>
                    <option value={HOSTEL_TYPES.BOYS}>Boys Hostel</option>
                    <option value={HOSTEL_TYPES.GIRLS}>Girls Hostel</option>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Hostel Block"
                    glassmorphic
                    required
                    value={selectedUser?.student?.hostelBlock || ''}
                    onChange={(e)=>setSelectedUser(prev=>({...(prev||{}), student: {...(prev?.student||{}), hostelBlock:e.target.value}}))}
                  >
                    <option value="">Select Block</option>
                    {hostelBlocksList.map(b => (
                      <option key={b} value={b}>{`Block ${b}`}</option>
                    ))}
                  </Select>
                  <Input 
                    label="Room Number" 
                    glassmorphic 
                    required 
                    placeholder="e.g. 101, 201"
                    value={selectedUser?.student?.roomNumber || ''}
                    onChange={(e)=>setSelectedUser(prev=>({...(prev||{}), student: {...(prev?.student||{}), roomNumber:e.target.value}}))} 
                  />
                </div>
                {/* Parent / Guardian Details for Admin create modal */}
                <div className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Parent / Guardian Details</div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Father's Name"
                    glassmorphic
                    value={selectedUser?.student?.parentDetails?.fatherName || ''}
                    onChange={(e)=>setSelectedUser(prev=>({...(prev||{}), student: {...(prev?.student||{}), parentDetails: {...(prev?.student?.parentDetails||{}), fatherName: e.target.value}}}))}
                  />
                  <Input
                    label="Mother's Name"
                    glassmorphic
                    value={selectedUser?.student?.parentDetails?.motherName || ''}
                    onChange={(e)=>setSelectedUser(prev=>({...(prev||{}), student: {...(prev?.student||{}), parentDetails: {...(prev?.student?.parentDetails||{}), motherName: e.target.value}}}))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Guardian Phone"
                    glassmorphic
                    value={selectedUser?.student?.parentDetails?.guardianPhone || ''}
                    onChange={(e)=>setSelectedUser(prev=>({...(prev||{}), student: {...(prev?.student||{}), parentDetails: {...(prev?.student?.parentDetails||{}), guardianPhone: e.target.value}}}))}
                  />
                  <Input
                    label="Guardian Email"
                    glassmorphic
                    value={selectedUser?.student?.parentDetails?.guardianEmail || ''}
                    onChange={(e)=>setSelectedUser(prev=>({...(prev||{}), student: {...(prev?.student||{}), parentDetails: {...(prev?.student?.parentDetails||{}), guardianEmail: e.target.value}}}))}
                  />
                </div>
              </Motion.div>
            )}

            {/* Warden-specific fields */}
            {selectedUser?.role === USER_ROLES.WARDEN && (
              <Motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700"
              >
                <h4 className="font-semibold text-slate-900 dark:text-white">Warden Details</h4>
                <Input
                  label="Phone"
                  glassmorphic
                  required
                  value={selectedUser?.phone || ''}
                  onChange={(e) => setSelectedUser(prev => ({ ...(prev || {}), phone: e.target.value }))}
                />
                <Select 
                  label="Hostel Type" 
                  glassmorphic 
                  required 
                  onChange={(e)=>setSelectedUser(prev=>({...(prev||{}), warden: {...(prev?.warden||{}), hostelType:e.target.value}}))}
                >
                  <option value="">Select Type</option>
                  <option value={HOSTEL_TYPES.BOYS}>Boys Hostel</option>
                  <option value={HOSTEL_TYPES.GIRLS}>Girls Hostel</option>
                </Select>
                <Select
                  label="Hostel Block"
                  glassmorphic
                  required
                  value={selectedUser?.warden?.hostelBlock || ''}
                  onChange={(e)=>setSelectedUser(prev=>({...(prev||{}), warden: {...(prev?.warden||{}), hostelBlock:e.target.value}}))}
                >
                  <option value="">Select Block</option>
                  {hostelBlocksList.map(b => (
                    <option key={b} value={b}>{`Block ${b}`}</option>
                  ))}
                </Select>
              </Motion.div>
            )}

            {/* HOD-specific fields */}
            {selectedUser?.role === USER_ROLES.HOD && (
              <Motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700"
              >
                <h4 className="font-semibold text-slate-900 dark:text-white">HOD Details</h4>
                <Select
                  label="Department"
                  glassmorphic
                  required
                  value={selectedUser?.hod?.department || ''}
                  onChange={(e)=>setSelectedUser(prev=>({...(prev||{}), hod: {...(prev?.hod||{}), department:e.target.value}}))}
                >
                  <option value="">Select Department</option>
                  {departmentsList.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </Select>
              </Motion.div>
            )}

            <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <ShieldCheckIcon className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <p className="text-sm text-purple-900 dark:text-purple-100">
                User will receive an email with login credentials and instructions.
              </p>
            </div>
                <div className="flex items-center gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => { setShowCreateModal(false); setSelectedUser(null); }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                icon={UserPlusIcon}
                className="flex-1"
                    onClick={() => {
                      if (!selectedUser?.role || !selectedUser?.email) {
                        toast.error('Fill all required fields')
                        return
                      }
                      if (selectedUser.role === USER_ROLES.STUDENT) {
                        const s = selectedUser.student || {}
                        if (!s?.rollNumber || !s?.course || !s?.year || !s?.yearOfStudy || !s?.semester || !s?.department || !s?.hostelType || !s?.hostelBlock || !s?.roomNumber) {
                          toast.error('Fill all student details')
                          return
                        }

                        // Validate optional parent contact fields (if provided)
                        const guardianPhone = s?.parentDetails?.guardianPhone?.trim()
                        const guardianEmail = s?.parentDetails?.guardianEmail?.trim()
                        if (guardianPhone && !VALIDATION.PHONE_PATTERN.test(guardianPhone)) {
                          toast.error('Guardian phone must be 10-15 digits')
                          return
                        }
                        if (guardianEmail && !VALIDATION.EMAIL_PATTERN.test(guardianEmail)) {
                          toast.error('Guardian email is invalid')
                          return
                        }

                        // Coerce numeric fields to numbers before sending
                        const payload = {
                          ...selectedUser,
                          student: {
                            ...s,
                            year: Number(s.year),
                            yearOfStudy: Number(s.yearOfStudy),
                            semester: Number(s.semester)
                          }
                        }

                        handleCreateUser(payload)
                        return
                      }

                      handleCreateUser(selectedUser)
                    }}
              >
                Create User
              </Button>
            </div>
          </div>
        </Modal>

          {/* Edit User Modal */}
          <Modal
            isOpen={showEditModal}
            onClose={() => { setShowEditModal(false); setSelectedUser(null); setEditFormData(null); }}
            title="Edit User"
            gradient
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  glassmorphic
                  required
                  value={editFormData?.firstName || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...(prev || {}), firstName: e.target.value }))}
                />
                <Input
                  label="Last Name"
                  glassmorphic
                  required
                  value={editFormData?.lastName || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...(prev || {}), lastName: e.target.value }))}
                />
              </div>

              <Input
                label="Email"
                type="email"
                glassmorphic
                required
                value={editFormData?.email || ''}
                onChange={(e) => setEditFormData(prev => ({ ...(prev || {}), email: e.target.value }))}
              />

              <Select
                label="Status"
                glassmorphic
                required
                value={editFormData?.status || 'active'}
                onChange={(e) => setEditFormData(prev => ({ ...(prev || {}), status: e.target.value }))}
              >
                <option value={USER_STATUS.ACTIVE}>Active</option>
                <option value={USER_STATUS.INACTIVE}>Inactive</option>
                <option value={USER_STATUS.SUSPENDED}>Suspended</option>
                <option value={USER_STATUS.PENDING}>Pending</option>
              </Select>

              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <ShieldCheckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  User role: <strong>{selectedUser?.role}</strong>. Role cannot be changed after creation.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => { setShowEditModal(false); setSelectedUser(null); setEditFormData(null); }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  icon={PencilIcon}
                  className="flex-1"
                  onClick={() => {
                    if (!editFormData?.firstName || !editFormData?.lastName || !editFormData?.email) {
                      toast.error('Fill all required fields')
                      return
                    }
                    handleEditUser(editFormData)
                  }}
                >
                  Update User
                </Button>
              </div>
            </div>
          </Modal>
      </Motion.div>
    </DashboardLayout>
  )
}
