/**
 * Student Dashboard - Ultra Modern Personal View
 * Student's personal dashboard with profile, request form, and history
 */

import { useState, useEffect, useCallback } from 'react'
import { motion as Motion } from 'framer-motion'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  UserCircleIcon,
  CalendarDaysIcon,
  ClockIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  HomeIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'
import DashboardLayout from '../../layouts/DashboardLayout'
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Textarea from '../../components/ui/Textarea'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import { LoadingCard } from '../../components/ui/Loading'
import EmptyState from '../../components/ui/EmptyState'
import { selectUser } from '../../store/authSlice'
import { outpassService } from '../../services'
import { studentService } from '../../services'
import { formatDate, formatRelativeTime } from '../../utils/helpers'
import { OUTPASS_STATUS, OUTPASS_TYPES } from '../../constants'

export default function StudentDashboard() {
  const user = useSelector(selectUser)
  const [profile, setProfile] = useState(null)
  const [recentOutpasses, setRecentOutpasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [canRequestOutpass, setCanRequestOutpass] = useState(true)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [formData, setFormData] = useState({
    outpassType: 'local',
    reason: '',
    destination: '',
    departureDate: '',
    departureTime: '',
    returnDate: '',
    returnTime: '',
    hodApprovalRequested: false
  })

  // Fetch student profile
  const fetchProfile = useCallback(async () => {
    try {
      const response = await studentService.getProfile()
      setProfile(response.data)
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      toast.error('Failed to load profile')
    }
  }, [])

  // Fetch recent outpasses
  const fetchRecentOutpasses = useCallback(async () => {
    try {
      setLoading(true)
      const response = await outpassService.getMyOutpasses({ limit: 5, sort: '-createdAt' })
      setRecentOutpasses(response.data?.outpasses || response.data || [])
    } catch (error) {
      console.error('Failed to fetch outpasses:', error)
      toast.error('Failed to load outpass history')
    } finally {
      setLoading(false)
    }
  }, [])

  // Check if student can request outpass
  const checkEligibility = useCallback(async () => {
    try {
      const response = await studentService.canRequestOutpass()
      setCanRequestOutpass(response.data?.canRequest || response.canRequest || true)
      
      if (!response.data?.canRequest && response.data?.reason) {
        toast.error(response.data.reason)
      }
    } catch (error) {
      console.error('Failed to check eligibility:', error)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
    fetchRecentOutpasses()
    checkEligibility()
  }, [fetchProfile, fetchRecentOutpasses, checkEligibility])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmitRequest = async (e) => {
    e.preventDefault()
    
    if (!canRequestOutpass) {
      toast.error('You are not eligible to request an outpass at this time')
      return
    }

    setSubmitting(true)
    const loadingToast = toast.loading('Submitting outpass request...')

    try {
      // Combine date and time
      const leaveTime = new Date(`${formData.departureDate}T${formData.departureTime}`)
      const expectedReturnTime = new Date(`${formData.returnDate}T${formData.returnTime}`)

      const requestData = {
        outpassType: formData.outpassType,
        reason: formData.reason,
        destination: formData.destination,
        leaveTime: leaveTime.toISOString(),
        expectedReturnTime: expectedReturnTime.toISOString(),
        hodApprovalRequested: formData.hodApprovalRequested
      }

      await outpassService.create(requestData)
      
      toast.success('Outpass request submitted successfully!', {
        id: loadingToast,
        icon: '✅'
      })

      // Reset form and refresh data
      setShowRequestForm(false)
      setFormData({
        outpassType: 'local',
        reason: '',
        destination: '',
        departureDate: '',
        departureTime: '',
        returnDate: '',
        returnTime: '',
        hodApprovalRequested: false
      })
      
      fetchRecentOutpasses()
      checkEligibility()
    } catch (error) {
      toast.error(error.message || 'Failed to submit outpass request', {
        id: loadingToast
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case OUTPASS_STATUS.APPROVED:
      case OUTPASS_STATUS.APPROVED_BY_WARDEN:
      case OUTPASS_STATUS.APPROVED_BY_HOD:
      case OUTPASS_STATUS.COMPLETED:
        return 'success'
      case OUTPASS_STATUS.REJECTED:
      case OUTPASS_STATUS.REJECTED_BY_HOD:
      case OUTPASS_STATUS.EXPIRED:
        return 'danger'
      case OUTPASS_STATUS.PENDING:
      case OUTPASS_STATUS.OVERDUE:
        return 'warning'
      default:
        return 'default'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case OUTPASS_STATUS.APPROVED:
      case OUTPASS_STATUS.APPROVED_BY_WARDEN:
      case OUTPASS_STATUS.APPROVED_BY_HOD:
      case OUTPASS_STATUS.COMPLETED:
        return CheckCircleIcon
      case OUTPASS_STATUS.REJECTED:
      case OUTPASS_STATUS.REJECTED_BY_HOD:
      case OUTPASS_STATUS.EXPIRED:
        return XCircleIcon
      default:
        return ClockIcon
    }
  }

  return (
    <DashboardLayout>
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Welcome Banner */}
        <Motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-8 shadow-2xl"
        >
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-float" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          </div>
          <div className="relative flex items-center gap-4">
            <SparklesIcon className="h-12 w-12 text-white animate-pulse" />
            <div>
              <h1 className="text-3xl font-display font-bold text-white">
                Welcome back, {user?.firstName || 'Student'}!
              </h1>
              <p className="mt-1 text-lg text-white/90">
                Ready to manage your outpasses? ✨
              </p>
            </div>
          </div>
        </Motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card glassmorphic gradient className="h-full">
              <CardHeader>
                <CardTitle gradient>My Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Avatar */}
                  <div className="flex justify-center">
                    <Motion.div
                      className="relative"
                      whileHover={{ scale: 1.05, rotate: 5 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full blur-xl opacity-50" />
                      <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-2xl">
                        <span className="text-4xl font-bold text-white">
                          {user?.firstName?.charAt(0) || 'S'}
                        </span>
                      </div>
                    </Motion.div>
                  </div>

                  {/* Info */}
                  <div className="space-y-3 text-center">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {profile?.firstName || user?.firstName} {profile?.lastName || user?.lastName}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <UserCircleIcon className="h-4 w-4" />
                        <span>{profile?.registerNumber || user?.registerNumber || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <EnvelopeIcon className="h-4 w-4" />
                        <span>{profile?.email || user?.email}</span>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <PhoneIcon className="h-4 w-4" />
                        <span>{profile?.phone || user?.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <HomeIcon className="h-4 w-4" />
                        <span>Block {profile?.hostelBlock || user?.hostelBlock || 'N/A'}</span>
                      </div>
                      {profile?.department && (
                        <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <span className="font-medium">{profile.department}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        {recentOutpasses.filter(o => [OUTPASS_STATUS.APPROVED, OUTPASS_STATUS.APPROVED_BY_WARDEN, OUTPASS_STATUS.APPROVED_BY_HOD].includes(o.status)).length}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Approved</p>
                    </div>
                    <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                      <p className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                        {recentOutpasses.filter(o => o.status === OUTPASS_STATUS.PENDING).length}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Pending</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Motion.div>

          {/* Request Form / Recent Outpasses */}
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            {!showRequestForm ? (
              <Card glassmorphic gradient>
                <div className="flex items-center justify-between mb-6">
                  <CardTitle gradient>Recent Outpasses</CardTitle>
                  <Button
                    icon={PaperAirplaneIcon}
                    onClick={() => setShowRequestForm(true)}
                  >
                    New Request
                  </Button>
                </div>

                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <LoadingCard key={i} />)}
                  </div>
                ) : recentOutpasses.length === 0 ? (
                  <EmptyState
                    icon={CalendarDaysIcon}
                    title="No outpass requests yet"
                    description="Click 'New Request' to submit your first outpass request"
                    action={
                      <Button icon={PaperAirplaneIcon} onClick={() => setShowRequestForm(true)}>
                        Create Request
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-4">
                    {recentOutpasses.map((outpass, index) => {
                      const StatusIcon = getStatusIcon(outpass.status)
                      return (
                        <Motion.div
                          key={outpass._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ x: 4, scale: 1.01 }}
                          className="relative p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={getStatusColor(outpass.status)} icon={StatusIcon} pulse>
                                  {outpass.status}
                                </Badge>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {formatRelativeTime(outpass.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm text-slate-900 dark:text-white font-medium mb-2">
                                {outpass.reason}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                                <div className="flex items-center gap-1">
                                  <CalendarDaysIcon className="h-3.5 w-3.5" />
                                  <span>{formatDate(outpass.departureDateTime, 'MMM dd')}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <ClockIcon className="h-3.5 w-3.5" />
                                  <span>
                                    {formatDate(outpass.departureDateTime, 'HH:mm')} - {formatDate(outpass.returnDateTime, 'HH:mm')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Motion.div>
                      )
                    })}
                  </div>
                )}
              </Card>
            ) : (
              <Card glassmorphic gradient>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle gradient>New Outpass Request</CardTitle>
                    <Button
                      variant="ghost"
                      onClick={() => setShowRequestForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitRequest} className="space-y-4">
                    <Select
                      label="Outpass Type"
                      name="outpassType"
                      value={formData.outpassType}
                      onChange={(value) => handleSelectChange('outpassType', value)}
                      options={[
                        { value: 'local', label: 'Local (Within City)' },
                        { value: 'home', label: 'Home Visit' },
                        { value: 'medical', label: 'Medical Emergency' },
                        { value: 'special', label: 'Special Permission' }
                      ]}
                      required
                      glassmorphic
                    />

                    <Textarea
                      label="Reason for Outpass"
                      name="reason"
                      value={formData.reason}
                      onChange={handleInputChange}
                      placeholder="Enter the reason for your outpass request..."
                      rows={3}
                      required
                      glassmorphic
                    />

                    <Input
                      label="Destination"
                      name="destination"
                      value={formData.destination}
                      onChange={handleInputChange}
                      placeholder="Where are you going?"
                      required
                      glassmorphic
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Departure Date"
                        name="departureDate"
                        type="date"
                        value={formData.departureDate}
                        onChange={handleInputChange}
                        required
                        glassmorphic
                      />
                      <Input
                        label="Departure Time"
                        name="departureTime"
                        type="time"
                        value={formData.departureTime}
                        onChange={handleInputChange}
                        required
                        glassmorphic
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Return Date"
                        name="returnDate"
                        type="date"
                        value={formData.returnDate}
                        onChange={handleInputChange}
                        required
                        glassmorphic
                      />
                      <Input
                        label="Return Time"
                        name="returnTime"
                        type="time"
                        value={formData.returnTime}
                        onChange={handleInputChange}
                        required
                        glassmorphic
                      />
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        Your request will be sent to the warden for approval. You'll be notified once it's reviewed.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowRequestForm(false)}
                        className="flex-1"
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        icon={PaperAirplaneIcon}
                        className="flex-1"
                        loading={submitting}
                        disabled={submitting}
                      >
                        {submitting ? 'Submitting...' : 'Submit Request'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </Motion.div>
        </div>
      </Motion.div>
    </DashboardLayout>
  )
}
