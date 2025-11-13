/**
 * Outpass Management Page - Ultra Modern
 * Manage outpass requests with tabs, filters, and approval workflows
 */

import { useState, useEffect, useCallback } from 'react'
import { motion as Motion } from 'framer-motion'
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import DashboardLayout from '../../layouts/DashboardLayout'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal, { ModalFooter } from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { LoadingCard } from '../../components/ui/Loading'
import EmptyState from '../../components/ui/EmptyState'
import Textarea from '../../components/ui/Textarea'
import { getOutpasses, approveOutpass, rejectOutpass } from '../../services/outpassService'
import { formatDate, formatRelativeTime } from '../../utils/helpers'
import { OUTPASS_STATUS } from '../../constants'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { selectUser } from '../../store/authSlice'

const TABS = [
  { id: 'pending', label: 'Pending', icon: ClockIcon, gradient: 'from-amber-500 to-orange-500' },
  { id: 'approved', label: 'Approved', icon: CheckCircleIcon, gradient: 'from-green-500 to-emerald-500' },
  { id: 'rejected', label: 'Rejected', icon: XCircleIcon, gradient: 'from-red-500 to-pink-500' },
  { id: 'all', label: 'All Requests', icon: FunnelIcon, gradient: 'from-blue-500 to-purple-500' }
]

export default function OutpassManagement() {
  const [activeTab, setActiveTab] = useState('pending')
  const [outpasses, setOutpasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('outpass_view') || 'list'
    } catch {
      return 'list'
    }
  })
  const [selectedOutpass, setSelectedOutpass] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [otpValue, setOtpValue] = useState('')
  const [showOtpModal, setShowOtpModal] = useState(false)
  const currentUser = useSelector(selectUser)

  const fetchOutpasses = useCallback(async () => {
    try {
      setLoading(true)
      const response = await getOutpasses({ status: activeTab === 'all' ? '' : activeTab })
      
      // Handle different response structures and ensure we get an array
      let outpassList = []
      if (Array.isArray(response)) {
        outpassList = response
      } else if (response?.data?.outpasses && Array.isArray(response.data.outpasses)) {
        outpassList = response.data.outpasses
      } else if (response?.outpasses && Array.isArray(response.outpasses)) {
        outpassList = response.outpasses
      } else if (response?.data && Array.isArray(response.data)) {
        outpassList = response.data
      }
      
      // Normalize server-side field names to client-friendly names
      const normalized = (Array.isArray(outpassList) ? outpassList : []).map(o => ({
        ...o,
        departureDateTime: o.leaveTime || o.departureDateTime || o.leave_time || null,
        returnDateTime: o.expectedReturnTime || o.returnDateTime || o.return_time || null,
        destination: typeof o.destination === 'object' ? (o.destination.place || '') : (o.destination || ''),
        studentName: o.student?.firstName ? `${o.student.firstName} ${o.student.lastName || ''}` : (o.studentName || o.student?.fullName || null),
        // Warden / HOD display names (may be populated objects or ids)
        wardenName: o.warden && typeof o.warden === 'object' ? (o.warden.firstName ? `${o.warden.firstName} ${o.warden.lastName || ''}` : (o.warden.fullName || '')) : (o.warden || ''),
        hodName: o.hod && typeof o.hod === 'object' ? (o.hod.name || `${o.hod.firstName || ''} ${o.hod.lastName || ''}`.trim()) : (o.hod || '')
      }))

      setOutpasses(normalized)
    } catch (error) {
      console.error('Failed to fetch outpasses:', error)
      setOutpasses([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    fetchOutpasses()
  }, [fetchOutpasses])

  // Persist view mode selection
  useEffect(() => {
    try {
      localStorage.setItem('outpass_view', viewMode)
    } catch (err) { console.debug && console.debug('persist viewMode failed', err) }
  }, [viewMode])

  const filteredOutpasses = Array.isArray(outpasses) ? outpasses.filter(outpass =>
    (outpass.studentName || `${outpass.student?.firstName || ''} ${outpass.student?.lastName || ''}` || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    outpass.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : []

  const handleView = async (outpass) => {
    // Lazy-fetch approver details (assignedStudentsCount) if not already present
    try {
      let enriched = outpass
      // If warden is populated object but missing assignedStudentsCount, fetch it
      if (outpass?.warden && typeof outpass.warden === 'object' && outpass.warden._id && outpass.warden.assignedStudentsCount === undefined) {
        try {
          const svc = await import('../../services/userService')
          const fn = svc.getById || svc.default.getById
          const resp = await fn('warden', outpass.warden._id)
          const w = resp?.data?.data?.user || resp?.data?.user || resp?.user || resp?.data
          if (w) {
            enriched = { ...enriched, warden: { ...outpass.warden, ...w }, wardenName: w.firstName ? `${w.firstName} ${w.lastName || ''}` : (w.fullName || outpass.wardenName) }
          }
        } catch (err) {
          console.debug('Failed to lazy fetch warden details', err)
        }
      }

      // If HOD is populated object but missing assignedStudentsCount, fetch it
      if (enriched?.hod && typeof enriched.hod === 'object' && enriched.hod._id && enriched.hod.assignedStudentsCount === undefined) {
        try {
          const svc = await import('../../services/userService')
          const fn = svc.getById || svc.default.getById
          const resp = await fn('hod', enriched.hod._id)
          const h = resp?.data?.data?.user || resp?.data?.user || resp?.user || resp?.data
          if (h) {
            enriched = { ...enriched, hod: { ...enriched.hod, ...h }, hodName: h.name || (h.firstName ? `${h.firstName} ${h.lastName || ''}` : enriched.hodName) }
          }
        } catch (err) {
          console.debug('Failed to lazy fetch hod details', err)
        }
      }

      setSelectedOutpass(enriched)
    } catch (err) {
      console.error('Error enriching outpass details', err)
      setSelectedOutpass(outpass)
    } finally {
      setShowViewModal(true)
    }
  }

  const handleApprove = (outpass) => {
    setSelectedOutpass(outpass)
    setShowApproveModal(true)
  }

  const handleReject = (outpass) => {
    setSelectedOutpass(outpass)
    setShowRejectModal(true)
  }

  const handleRequestParentOtp = async (outpass) => {
    try {
      // Prevent requesting again if already approved
      if (outpass.parentApproval?.approved) {
        toast.error('Parent has already approved this outpass')
        return
      }
      const svc = await import('../../services/outpassService')
      const fn = svc.requestParentOtp || svc.default.requestParentOtp
      const resp = await fn(outpass._id)
      toast.success('Parent OTP requested')
      // Open OTP entry modal so admin/warden can paste the OTP immediately
      setSelectedOutpass(resp?.data?.outpass || resp?.outpass || outpass)
      setOtpValue('')
      setShowOtpModal(true)
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to request parent OTP')
    }
  }

  // Resend OTP while the OTP modal is open
  const resendOtp = async () => {
    if (!selectedOutpass) {
      toast.error('No outpass selected')
      return
    }

    try {
      const svc = await import('../../services/outpassService')
      const fn = svc.requestParentOtp || svc.default.requestParentOtp
      const resp = await fn(selectedOutpass._id)
      toast.success('OTP resent')
      setSelectedOutpass(resp?.data?.outpass || resp?.outpass || selectedOutpass)
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to resend OTP')
    }
  }

  const handleSendToHod = async (outpass) => {
    try {
      const svc = await import('../../services/outpassService')
      const fn = svc.sendToHod || svc.default.sendToHod
      const resp = await fn(outpass._id)
      const returnedOutpass = resp?.data?.outpass || resp?.outpass || outpass
      setSelectedOutpass(returnedOutpass)
      // Notify user about SMS to HOD if available
      const hodSmsSent = resp?.data?.hodSmsSent ?? resp?.hodSmsSent
      if (hodSmsSent === true) {
        toast.success('Sent to HOD for approval — HOD notified via SMS')
      } else if (hodSmsSent === false) {
        toast('Sent to HOD for approval — HOD notification failed. Please notify HOD manually.', { icon: '⚠️' })
      } else {
        toast.success('Sent to HOD for approval')
      }
      fetchOutpasses()
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to send to HOD')
    }
  }

  const submitOtp = async () => {
    if (!otpValue.trim()) {
      toast.error('Please enter the OTP')
      return
    }

    try {
      if (currentUser?.role !== 'warden') {
        toast.error('Only wardens may submit the parent OTP via this portal. Ask the parent to use the parent portal or use the public approval flow.')
        return
      }

      const svc = await import('../../services/outpassService')
      const fn = svc.parentApprove || svc.default.parentApprove
      await fn(selectedOutpass._id, otpValue.trim(), '')
      toast.success('Parent OTP accepted — outpass verified')
      setShowOtpModal(false)
      setOtpValue('')
      fetchOutpasses()
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to verify OTP')
    }
  }

  const confirmApprove = async () => {
    try {
      const loadingToast = toast.loading('Approving outpass request...')
      await approveOutpass(selectedOutpass._id, '')
      toast.success('Outpass request approved successfully!', { id: loadingToast })
      setShowApproveModal(false)
      fetchOutpasses()
    } catch (error) {
      toast.error(error?.message || 'Failed to approve outpass request')
      console.error('Failed to approve outpass:', error)
    }
  }

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }
    
    try {
      const loadingToast = toast.loading('Rejecting outpass request...')
      await rejectOutpass(selectedOutpass._id, rejectReason)
      toast.success('Outpass request rejected', { id: loadingToast })
      setShowRejectModal(false)
      setRejectReason('')
      fetchOutpasses()
    } catch (error) {
      toast.error(error?.message || 'Failed to reject outpass request')
      console.error('Failed to reject outpass:', error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case OUTPASS_STATUS.APPROVED:
        return 'success'
      case OUTPASS_STATUS.REJECTED:
        return 'danger'
      case OUTPASS_STATUS.PENDING_WARDEN_APPROVAL:
      case OUTPASS_STATUS.PENDING_HOD_APPROVAL:
      case OUTPASS_STATUS.PENDING_PARENT_APPROVAL:
        return 'warning'
      default:
        return 'default'
    }
  }

  return (
    <DashboardLayout>
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Outpass Management
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Review and approve student outpass requests
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={viewMode === 'list' ? 'success' : 'ghost'} size="sm" onClick={() => setViewMode('list')}>List</Button>
            <Button variant={viewMode === 'cards' ? 'success' : 'ghost'} size="sm" onClick={() => setViewMode('cards')}>Cards</Button>
          </div>
        </div>

        {/* Tabs */}
        <Card glassmorphic>
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <Motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 whitespace-nowrap"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Active background */}
                  {isActive && (
                    <Motion.div
                      layoutId="activeTabBg"
                      className={`absolute inset-0 bg-gradient-to-r ${tab.gradient} rounded-xl shadow-lg`}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  
                  {/* Content */}
                  <div className={`relative flex items-center gap-2 ${
                    isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </div>
                </Motion.button>
              )
            })}
          </div>
        </Card>

        {/* Search */}
        <Card glassmorphic>
          <Input
            placeholder="Search by student name or reason..."
            icon={MagnifyingGlassIcon}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            glassmorphic
            className="bg-white dark:bg-slate-900"
          />
        </Card>

        {/* Outpass List / Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <LoadingCard key={i} />
            ))}
          </div>
        ) : filteredOutpasses.length === 0 ? (
          <Card glassmorphic>
            <EmptyState
              icon={ClockIcon}
              title="No outpass requests"
              description="There are no outpass requests in this category"
            />
          </Card>
        ) : viewMode === 'list' ? (
          <Card glassmorphic>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Destination</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Date Range</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Submitted</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredOutpasses.map((outpass) => (
                    <tr key={outpass._id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                      <td className="px-6 py-4">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{outpass.studentName || (outpass.student?.firstName ? `${outpass.student.firstName} ${outpass.student.lastName || ''}` : 'Unknown')}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{outpass.student?.rollNumber || outpass.studentId || 'N/A'}</div>
                          {/* Assigned approvers */}
                          <div className="text-xs text-gray-400 mt-1 truncate">
                            <span className="mr-2">Warden: <strong className="text-gray-600 dark:text-gray-200">{outpass.wardenName || (outpass.warden && outpass.warden.firstName ? `${outpass.warden.firstName} ${outpass.warden.lastName || ''}` : (typeof outpass.warden === 'string' ? outpass.warden : (outpass.warden?.email || '-')))}</strong></span>
                            <span>HOD: <strong className="text-gray-600 dark:text-gray-200">{outpass.hodName || (outpass.hod && outpass.hod.name ? outpass.hod.name : (typeof outpass.hod === 'string' ? outpass.hod : (outpass.hod?.email || '-')))}</strong></span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><div className="text-sm text-gray-900 dark:text-white max-w-[18rem] truncate">{outpass.reason}</div></td>
                      <td className="px-6 py-4"><div className="text-sm text-gray-900 dark:text-white max-w-[12rem] truncate">{outpass.destination || '-'}</div></td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900 dark:text-white">{formatDate(outpass.departureDateTime || outpass.leaveTime, 'MMM dd')}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{formatDate(outpass.departureDateTime || outpass.leaveTime, 'HH:mm')} - {formatDate(outpass.returnDateTime || outpass.expectedReturnTime, 'HH:mm')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatRelativeTime(outpass.createdAt)}</td>
                      <td className="px-6 py-4"><Badge status={outpass.status}>{outpass.status}</Badge></td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleView(outpass)}>View</Button>
                          {(outpass.status === OUTPASS_STATUS.PENDING_WARDEN_APPROVAL || outpass.status === 'pending') && (
                            <>
                              <Button
                                variant="success"
                                size="sm"
                                icon={CheckCircleIcon}
                                onClick={() => handleApprove(outpass)}
                                    disabled={
                                      // Parent OTP requested but not yet approved -> disable
                                      (outpass.parentApproval?.requestedAt && !outpass.parentApproval?.approved) ||
                                      // If parent has approved, only warden can approve (disable for non-wardens)
                                      (outpass.parentApproval?.approved && currentUser?.role !== 'warden') ||
                                      (outpass.hodApprovalRequested && !outpass.hodApproval?.approved)
                                    }
                                aria-label="Approve"
                                title="Approve"
                              />
                              <Button
                                variant="danger"
                                size="sm"
                                icon={XCircleIcon}
                                onClick={() => handleReject(outpass)}
                                disabled={outpass.hodApprovalRequested && !outpass.hodApproval?.approved}
                                aria-label="Reject"
                                title="Reject"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRequestParentOtp(outpass)}
                                disabled={
                                  !!outpass.parentApproval?.approved ||
                                  (!!outpass.parentApproval?.requestedAt && !outpass.parentApproval?.approved)
                                }
                              >
                                Request Parent OTP
                              </Button>
                              {!outpass.parentApproval?.approved && outpass.parentApproval?.requestedAt && (
                                <span className="text-xs text-gray-500 ml-2">OTP requested</span>
                              )}
                              {!outpass.hodApprovalRequested && (
                                <Button variant="ghost" size="sm" onClick={() => handleSendToHod(outpass)}>Send to HOD</Button>
                              )}
                              {outpass.hodApprovalRequested && !outpass.hodApproval?.approved && (
                                <span className="text-xs text-gray-400 ml-2">Awaiting HOD approval</span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.05 }
              }
            }}
          >
            {filteredOutpasses.map((outpass) => (
              <Motion.div
                key={outpass._id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <Card glassmorphic hover className="h-full">
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                          <Motion.div
                        className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <span className="text-white font-bold text-lg">{(outpass.studentName || (outpass.student?.firstName ? outpass.student.firstName : '') || 'S').charAt(0) || 'S'}</span>
                      </Motion.div>
                          <div className="min-w-0 overflow-hidden">
                            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{outpass.studentName || (outpass.student?.firstName ? `${outpass.student.firstName} ${outpass.student.lastName || ''}` : 'Unknown')}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{outpass.student?.rollNumber || outpass.studentId || outpass.student?.registerNumber || 'N/A'}</p>
                          </div>
                    </div>
                    <Badge variant={getStatusColor(outpass.status)} pulse>{outpass.status}</Badge>
                  </div>

                  {/* Reason */}
                  <div className="mb-4"><p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{outpass.reason}</p></div>

                  {/* Date & Time */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm"><CalendarIcon className="h-4 w-4 text-blue-500" /><span className="text-slate-600 dark:text-slate-400">{formatDate(outpass.departureDateTime || outpass.leaveTime, 'MMM dd, yyyy')}</span></div>
                    <div className="flex items-center gap-2 text-sm"><ClockIcon className="h-4 w-4 text-purple-500" /><span className="text-slate-600 dark:text-slate-400">{formatDate(outpass.departureDateTime || outpass.leaveTime, 'HH:mm')} - {formatDate(outpass.returnDateTime || outpass.expectedReturnTime, 'HH:mm')}</span></div>
                    <div className="flex items-center gap-2 text-sm"><UserIcon className="h-4 w-4 text-green-500" /><span className="text-slate-600 dark:text-slate-400">Submitted {formatRelativeTime(outpass.createdAt)}</span></div>
                  </div>

                  {/* Actions */}
                        <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button variant="ghost" size="sm" icon={EyeIcon} onClick={() => handleView(outpass)} className="flex-1">View</Button>
                        {(outpass.status === OUTPASS_STATUS.PENDING_WARDEN_APPROVAL || outpass.status === 'pending') && (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          icon={CheckCircleIcon}
                          onClick={() => handleApprove(outpass)}
                          className="flex-1"
                          disabled={
                            (outpass.parentApproval?.requestedAt && !outpass.parentApproval?.approved) ||
                            (outpass.parentApproval?.approved && currentUser?.role !== 'warden') ||
                            (outpass.hodApprovalRequested && !outpass.hodApproval?.approved)
                          }
                          aria-label="Approve"
                          title="Approve"
                        />
                        <Button
                          variant="danger"
                          size="sm"
                          icon={XCircleIcon}
                          onClick={() => handleReject(outpass)}
                          className="flex-1"
                          disabled={outpass.hodApprovalRequested && !outpass.hodApproval?.approved}
                          aria-label="Reject"
                          title="Reject"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRequestParentOtp(outpass)}
                          className="flex-1"
                          disabled={outpass.parentApproval?.requestedAt && !outpass.parentApproval?.approved}
                        >
                          Request Parent OTP
                        </Button>
                        {!outpass.parentApproval?.approved && outpass.parentApproval?.requestedAt && (
                          <span className="text-xs text-gray-500 ml-2">OTP requested</span>
                        )}
                        {!outpass.hodApprovalRequested && (
                          <Button variant="ghost" size="sm" onClick={() => handleSendToHod(outpass)} className="flex-1">Send to HOD</Button>
                        )}
                        {outpass.hodApprovalRequested && !outpass.hodApproval?.approved && (
                          <span className="text-xs text-gray-400 ml-2">Awaiting HOD approval</span>
                        )}
                      </>
                    )}
                  </div>
                </Card>
              </Motion.div>
            ))}
          </Motion.div>
        )}
      </Motion.div>

      {/* View Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Outpass Request Details"
        gradient
        size="lg"
      >
        {selectedOutpass && (
          <div className="space-y-6">
            {/* Student Info */}
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">
                  {selectedOutpass.student?.name?.charAt(0) || 'S'}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {selectedOutpass.student?.name}
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  {selectedOutpass.student?.registerNumber} • {selectedOutpass.student?.email}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Departure</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  {formatDate(selectedOutpass.departureDateTime, 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Return</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  {formatDate(selectedOutpass.returnDateTime, 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Assigned Warden</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{selectedOutpass.wardenName || (selectedOutpass.warden && (selectedOutpass.warden.firstName ? `${selectedOutpass.warden.firstName} ${selectedOutpass.warden.lastName || ''}` : (typeof selectedOutpass.warden === 'string' ? selectedOutpass.warden : (selectedOutpass.warden?.email || '-')))) || '-'}</p>
                {selectedOutpass.warden?.assignedStudentsCount !== undefined && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Assigned Students: {selectedOutpass.warden.assignedStudentsCount}</p>
                )}
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Assigned HOD</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{selectedOutpass.hodName || (selectedOutpass.hod && (selectedOutpass.hod.name || (selectedOutpass.hod.firstName ? `${selectedOutpass.hod.firstName} ${selectedOutpass.hod.lastName || ''}` : (typeof selectedOutpass.hod === 'string' ? selectedOutpass.hod : (selectedOutpass.hod?.email || '-'))))) || '-'}</p>
                {selectedOutpass.hod?.assignedStudentsCount !== undefined && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Assigned Students: {selectedOutpass.hod.assignedStudentsCount}</p>
                )}
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl col-span-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
                <Badge variant={getStatusColor(selectedOutpass.status)} className="mt-2">
                  {selectedOutpass.status || 'N/A'}
                </Badge>
              </div>
            </div>

            {/* Reason */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Reason</p>
              <p className="text-slate-900 dark:text-white">
                {selectedOutpass.reason}
              </p>
            </div>

            <ModalFooter>
              <Button variant="ghost" onClick={() => setShowViewModal(false)}>
                Close
              </Button>
              {selectedOutpass.status === OUTPASS_STATUS.PENDING_WARDEN_APPROVAL && (
                <>
                  <Button
                    variant="success"
                    icon={CheckCircleIcon}
                    onClick={() => {
                      setShowViewModal(false)
                      handleApprove(selectedOutpass)
                    }}
                    disabled={
                      (selectedOutpass.parentApproval?.requestedAt && !selectedOutpass.parentApproval?.approved) ||
                      (selectedOutpass.parentApproval?.approved && currentUser?.role !== 'warden') ||
                      (selectedOutpass.hodApprovalRequested && !selectedOutpass.hodApproval?.approved)
                    }
                    aria-label="Approve"
                    title={
                      selectedOutpass.parentApproval?.requestedAt && !selectedOutpass.parentApproval?.approved
                        ? 'Awaiting parent verification'
                        : (selectedOutpass.parentApproval?.approved && currentUser?.role !== 'warden'
                          ? 'Only assigned warden may approve after parent verification'
                          : 'Approve')
                    }
                  />
                  <Button
                    variant="danger"
                    icon={XCircleIcon}
                    onClick={() => {
                      setShowViewModal(false)
                      handleReject(selectedOutpass)
                    }}
                    aria-label="Reject"
                    title="Reject"
                  />
                </>
              )}
            </ModalFooter>
          </div>
        )}
      </Modal>

      {/* Parent OTP Modal */}
      <Modal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        title="Enter Parent OTP"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Enter the OTP sent to the parent to confirm approval.</p>
          {currentUser?.role !== 'warden' && (
            <p className="text-xs text-yellow-700 dark:text-yellow-300">Only wardens can submit the parent OTP here. Parents should use the parent portal/public approval link.</p>
          )}
          <Input placeholder="Enter 6-digit OTP" value={otpValue} onChange={(e) => setOtpValue(e.target.value)} />
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={resendOtp}>Resend OTP</Button>
          </div>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowOtpModal(false)}>Cancel</Button>
            <Button variant="success" onClick={submitOtp} disabled={currentUser?.role !== 'warden'}>Submit OTP</Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Approve Outpass Request"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-semibold text-green-900 dark:text-green-100">
                Approve Request?
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Student will be notified immediately
              </p>
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Are you sure you want to approve the outpass request for <strong>{selectedOutpass?.student?.name}</strong>?
          </p>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowApproveModal(false)}>
              Cancel
            </Button>
            <Button
              variant="success"
              icon={CheckCircleIcon}
              onClick={confirmApprove}
              aria-label="Approve Request"
              title="Approve Request"
            />
          </ModalFooter>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Outpass Request"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <XCircleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-semibold text-red-900 dark:text-red-100">
                Reject Request?
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                Please provide a reason for rejection
              </p>
            </div>
          </div>
          <Textarea
            label="Rejection Reason"
            placeholder="Enter reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            required
            glassmorphic
          />
          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={XCircleIcon}
              onClick={confirmReject}
              disabled={!rejectReason.trim()}
              aria-label="Reject Request"
              title="Reject Request"
            />
          </ModalFooter>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
