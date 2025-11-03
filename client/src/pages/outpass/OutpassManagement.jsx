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
  UserIcon,
  ArrowPathIcon
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
  const [selectedOutpass, setSelectedOutpass] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

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
      
      setOutpasses(outpassList)
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

  const filteredOutpasses = Array.isArray(outpasses) ? outpasses.filter(outpass =>
    outpass.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    outpass.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : []

  const handleView = (outpass) => {
    setSelectedOutpass(outpass)
    setShowViewModal(true)
  }

  const handleApprove = (outpass) => {
    setSelectedOutpass(outpass)
    setShowApproveModal(true)
  }

  const handleReject = (outpass) => {
    setSelectedOutpass(outpass)
    setShowRejectModal(true)
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

        {/* Outpass Cards Grid */}
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
                    <div className="flex items-center gap-3">
                      <Motion.div
                        className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <span className="text-white font-bold text-lg">
                          {outpass.student?.name?.charAt(0) || 'S'}
                        </span>
                      </Motion.div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {outpass.student?.name || 'Unknown'}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {outpass.student?.registerNumber || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={getStatusColor(outpass.status)} pulse>
                      {outpass.status}
                    </Badge>
                  </div>

                  {/* Reason */}
                  <div className="mb-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                      {outpass.reason}
                    </p>
                  </div>

                  {/* Date & Time */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarIcon className="h-4 w-4 text-blue-500" />
                      <span className="text-slate-600 dark:text-slate-400">
                        {formatDate(outpass.departureDateTime, 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <ClockIcon className="h-4 w-4 text-purple-500" />
                      <span className="text-slate-600 dark:text-slate-400">
                        {formatDate(outpass.departureDateTime, 'HH:mm')} - {formatDate(outpass.returnDateTime, 'HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <UserIcon className="h-4 w-4 text-green-500" />
                      <span className="text-slate-600 dark:text-slate-400">
                        Submitted {formatRelativeTime(outpass.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={EyeIcon}
                      onClick={() => handleView(outpass)}
                      className="flex-1"
                    >
                      View
                    </Button>
                    {outpass.status === OUTPASS_STATUS.PENDING_WARDEN_APPROVAL && (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          icon={CheckCircleIcon}
                          onClick={() => handleApprove(outpass)}
                          className="flex-1"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={XCircleIcon}
                          onClick={() => handleReject(outpass)}
                          className="flex-1"
                        >
                          Reject
                        </Button>
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
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl col-span-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
                <Badge variant={getStatusColor(selectedOutpass.status)} className="mt-2">
                  {selectedOutpass.status}
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
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    icon={XCircleIcon}
                    onClick={() => {
                      setShowViewModal(false)
                      handleReject(selectedOutpass)
                    }}
                  >
                    Reject
                  </Button>
                </>
              )}
            </ModalFooter>
          </div>
        )}
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
            <Button variant="success" icon={CheckCircleIcon} onClick={confirmApprove}>
              Approve Request
            </Button>
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
            >
              Reject Request
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
