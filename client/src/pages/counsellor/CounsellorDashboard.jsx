import { useEffect, useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { selectUser } from '../../store/authSlice'
import counsellorService from '../../services/counsellorService'
import DashboardLayout from '../../layouts/DashboardLayout'
import toast from 'react-hot-toast'

// ─── Small stat card ──────────────────────────────────────────────────────────
const StatCard = ({ label, value, color = 'blue' }) => {
  const colorMap = {
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    green:  'bg-green-50 text-green-700 border-green-200',
    red:    'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200'
  }
  return (
    <div className={`rounded-lg border p-4 ${colorMap[color] || colorMap.blue}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value ?? '—'}</p>
    </div>
  )
}

// ─── Badge for outpass status ─────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    pending:                'bg-yellow-100 text-yellow-800',
    counsellor_pending:     'bg-yellow-100 text-yellow-800',
    counsellor_approved:    'bg-blue-100 text-blue-800',
    approved:               'bg-green-100 text-green-800',
    rejected:               'bg-red-100 text-red-800',
    rejected_by_counsellor: 'bg-red-100 text-red-800',
    out:                    'bg-purple-100 text-purple-800',
    completed:              'bg-gray-100 text-gray-700',
    cancelled:              'bg-gray-100 text-gray-500'
  }
  const cls = map[status] || 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  )
}

// ─── Hostel type badge ────────────────────────────────────────────────────────
const HostelTypeBadge = ({ hostelType }) => {
  if (!hostelType) return null
  const cls = hostelType === 'boys'
    ? 'bg-blue-100 text-blue-700 border border-blue-200'
    : 'bg-pink-100 text-pink-700 border border-pink-200'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {hostelType} hostel
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
const CounsellorDashboard = () => {
  const user = useSelector(selectUser)

  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading]             = useState(true)
  const [actionLoading, setActionLoading] = useState({}) // { [requestId]: true/false }
  const [rejectModal, setRejectModal]     = useState(null) // requestId being rejected
  const [rejectReason, setRejectReason]   = useState('')

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      const data = await counsellorService.getDashboard()
      setDashboardData(data)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = async (requestId) => {
    try {
      setActionLoading(prev => ({ ...prev, [requestId]: true }))
      await counsellorService.approveOutpass(requestId)
      toast.success('Outpass approved successfully')
      fetchDashboard()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Approval failed')
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: false }))
    }
  }

  // ── Reject (open modal) ────────────────────────────────────────────────────
  const openRejectModal = (requestId) => {
    setRejectModal(requestId)
    setRejectReason('')
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please enter a rejection reason')
      return
    }
    try {
      setActionLoading(prev => ({ ...prev, [rejectModal]: true }))
      await counsellorService.rejectOutpass(rejectModal, rejectReason)
      toast.success('Outpass rejected')
      setRejectModal(null)
      fetchDashboard()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Rejection failed')
    } finally {
      setActionLoading(prev => ({ ...prev, [rejectModal]: false }))
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <span className="ml-3 text-gray-500">Loading dashboard…</span>
        </div>
      </DashboardLayout>
    )
  }

  const { statistics = {}, pendingOutpasses = [], department, counsellor } = dashboardData || {}

  // hostelType may come from the counsellor object returned by backend
  const hostelType = counsellor?.hostelType || user?.hostelType

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Counsellor Dashboard
          </h1>
          {/* Show name, department AND hostelType so it's clear which hostel they serve */}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {counsellor?.firstName} {counsellor?.lastName}
              {department && <> &mdash; {department}</>}
            </p>
            <HostelTypeBadge hostelType={hostelType} />
          </div>
          {/* Isolation notice: reassures the counsellor they only see their own students */}
          {hostelType && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Showing students assigned to you in the{' '}
              <span className="font-medium capitalize">{hostelType}</span> hostel only.
            </p>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Students"    value={statistics.totalStudents}    color="blue"   />
          <StatCard label="Pending Approvals" value={statistics.pendingOutpasses}  color="yellow" />
          <StatCard label="Approved"          value={statistics.approvedOutpasses} color="green"  />
          <StatCard label="Rejected"          value={statistics.rejectedOutpasses} color="red"    />
        </div>

        {/* Year distribution */}
        {statistics.yearDistribution?.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
              Students by Year
            </h2>
            <div className="flex flex-wrap gap-3">
              {statistics.yearDistribution.map(y => (
                <span
                  key={y.yearOfStudy}
                  className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
                >
                  Year {y.yearOfStudy}: {y.count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pending outpass requests table */}
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Pending College-Hours Outpasses ({pendingOutpasses.length})
            </h2>
          </div>

          {pendingOutpasses.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-gray-400">
              No pending outpass requests
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Hostel</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Destination</th>
                    <th className="px-4 py-3 text-left">Leave Time</th>
                    <th className="px-4 py-3 text-left">Return Time</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {pendingOutpasses.map(op => (
                    <tr key={op._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {op.student?.firstName} {op.student?.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{op.student?.rollNumber}</p>
                      </td>
                      {/* Show hostelBlock so counsellor can see which block the student is in */}
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        <span className="text-xs font-medium">
                          {op.student?.hostelBlock || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-700 dark:text-gray-300">
                        {op.outpassType}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {op.destination?.place || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {formatDateTime(op.leaveTime)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {formatDateTime(op.expectedReturnTime)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={op.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(op._id)}
                            disabled={!!actionLoading[op._id]}
                            className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white
                                       hover:bg-green-700 disabled:opacity-50"
                          >
                            {actionLoading[op._id] ? '…' : 'Approve'}
                          </button>
                          <button
                            onClick={() => openRejectModal(op._id)}
                            disabled={!!actionLoading[op._id]}
                            className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white
                                       hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Reject Outpass
            </h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason…"
              rows={3}
              className="w-full rounded border border-gray-300 p-2 text-sm focus:outline-none
                         focus:ring-2 focus:ring-red-400 dark:border-gray-600 dark:bg-gray-700
                         dark:text-white"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700
                           hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!!actionLoading[rejectModal]}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white
                           hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading[rejectModal] ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default CounsellorDashboard