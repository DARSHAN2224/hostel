/**
 * Outpass History Page – Card-based redesign (mobile + desktop)
 * Matches the provided mockups with month-grouped cards + filter panel
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSelector } from 'react-redux'
import { selectUser } from '../../store/authSlice'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import {
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  MapPinIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import DashboardLayout from '../../layouts/DashboardLayout'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import { LoadingCard } from '../../components/ui/Loading'
import EmptyState from '../../components/ui/EmptyState'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import apiClient from '../../services/api'
import toast from 'react-hot-toast'
import outpassService from '../../services/outpassService'
import { formatDate, formatRelativeTime } from '../../utils/helpers'
import { OUTPASS_STATUS } from '../../constants'

/* ─────────────────────────────────────────────
   Helper: group outpasses by "Month Year"
───────────────────────────────────────────── */
function groupByMonth(list) {
  const groups = {}
  list.forEach(o => {
    const d = new Date(o.createdAt)
    const key = isNaN(d) ? 'Unknown' : d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(o)
  })
  return groups
}

/* ─────────────────────────────────────────────
   Status chip colours
───────────────────────────────────────────── */
const STATUS_STYLES = {
  approved:          'bg-green-100 text-green-700 border-green-200',
  rejected:          'bg-red-100 text-red-600 border-red-200',
  pending:           'bg-amber-100 text-amber-700 border-amber-200',
  cancelled:         'bg-red-100 text-red-500 border-red-200',
  completed:         'bg-blue-100 text-blue-700 border-blue-200',
  approved_by_hod:   'bg-teal-100 text-teal-700 border-teal-200',
  approved_by_warden:'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const STATUS_ICONS = {
  approved:  '✓',
  rejected:  '✕',
  pending:   '⏳',
  cancelled: '✕',
  completed: '✓',
}

function StatusChip({ status }) {
  const cls = STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border-gray-200'
  const icon = STATUS_ICONS[status] || '•'
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      <span>{icon}</span>
      {status}
    </span>
  )
}

/* ─────────────────────────────────────────────
   Filter Dropdown Panel
───────────────────────────────────────────── */
function FilterPanel({ statusFilter, setStatusFilter, dateFilter, setDateFilter,
  monthFilter, setMonthFilter, yearFilter, setYearFilter, onReset }) {

  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December']
  const years  = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)

  return (
    <Motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="absolute right-0 top-12 z-50 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 p-5 space-y-4"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-slate-800 dark:text-white">Filters</span>
        <button onClick={onReset} className="text-xs text-blue-500 hover:underline">Reset all</button>
      </div>

      {/* Status */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Status</p>
        <div className="flex flex-wrap gap-2">
          {['all','approved','rejected','pending','completed','cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                statusFilter === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600 hover:border-blue-400'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Quick date */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Quick Date</p>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all',   label: 'All Time' },
            { value: 'today', label: 'Today' },
            { value: 'week',  label: 'Last 7 Days' },
            { value: 'month', label: 'Last 30 Days' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setDateFilter(opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                dateFilter === opt.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600 hover:border-blue-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Month */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Month</p>
        <select
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
          className="w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Months</option>
          {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
      </div>

      {/* Year */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Year</p>
        <select
          value={yearFilter}
          onChange={e => setYearFilter(e.target.value)}
          className="w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </Motion.div>
  )
}

/* ─────────────────────────────────────────────
   Outpass Card (matches mockup)
───────────────────────────────────────────── */
function OutpassCard({ outpass, index, user, onView, onApprove, onReject, onHodApprove, onRequestParentOtp }) {
  const depDate   = outpass.departureDateTime ? new Date(outpass.departureDateTime) : null
  const retDate   = outpass.returnDateTime   ? new Date(outpass.returnDateTime)    : null

  const dateLabel = depDate && !isNaN(depDate)
    ? depDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—'

  const timeLabel = (() => {
    if (!depDate || isNaN(depDate)) return ''
    const fmt = d => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    return `${fmt(depDate)}${retDate && !isNaN(retDate) ? '–' + fmt(retDate) : ''}`
  })()

  return (
    <Motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.22 }}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-200 p-5"
    >
      {/* Top row: status + date */}
      <div className="flex items-center gap-3 mb-3">
        <StatusChip status={outpass.status} />
        <div className="flex items-baseline gap-1.5 text-sm text-slate-700 dark:text-slate-300">
          <span className="font-semibold">{dateLabel}</span>
          {timeLabel && (
            <span className="text-slate-400 dark:text-slate-500 text-xs">• {timeLabel}</span>
          )}
        </div>
      </div>

      {/* Reason */}
      <p className="text-base font-semibold text-slate-900 dark:text-white leading-snug mb-3 line-clamp-2">
        {outpass.reason || '—'}
      </p>

      {/* Meta: destination + submitted */}
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-4">
        {outpass.destination && (
          <span className="flex items-center gap-1">
            <MapPinIcon className="w-3.5 h-3.5" />
            {outpass.destination}
          </span>
        )}
        <span className="flex items-center gap-1">
          <CalendarDaysIcon className="w-3.5 h-3.5" />
          Submitted {formatRelativeTime(outpass.createdAt)}
        </span>
      </div>

      {/* Student info (for warden/admin view) */}
      {user?.role !== 'student' && outpass.student && (
        <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {outpass.student?.firstName
              ? `${outpass.student.firstName} ${outpass.student.lastName || ''}`
              : outpass.student?.fullName || 'Unknown'}
          </span>
          {(outpass.student?.rollNumber || outpass.studentId) && (
            <span className="text-slate-400">· {outpass.student?.rollNumber || outpass.studentId}</span>
          )}
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onView(outpass)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          View Details
        </button>

        {['warden','admin'].includes(user?.role) && outpass.status === 'pending' && (
          <>
            <button
              onClick={() => onApprove(outpass._id)}
              disabled={
                (outpass.parentApproval?.requestedAt && !outpass.parentApproval?.approved) ||
                (outpass.hodApprovalRequested && !outpass.hodApproval?.approved)
              }
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-40"
            >
              <CheckCircleIcon className="w-4 h-4" /> Approve
            </button>
            <button
              onClick={() => onReject(outpass._id)}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
            >
              <XCircleIcon className="w-4 h-4" /> Reject
            </button>
            <button
              onClick={() => onRequestParentOtp(outpass)}
              disabled={!!outpass.parentApproval?.approved || (!!outpass.parentApproval?.requestedAt && !outpass.parentApproval?.approved)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40"
            >
              {outpass.parentApproval?.requestedAt && !outpass.parentApproval?.approved ? 'OTP Requested' : 'Request Parent OTP'}
            </button>
          </>
        )}

        {user?.role === 'hod' && outpass.hodApprovalRequested && ['pending','approved_by_warden'].includes(outpass.status) && (
          <>
            <button
              onClick={() => onHodApprove(outpass._id)}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
            >
              <CheckCircleIcon className="w-4 h-4" /> HOD Approve
            </button>
            <button
              onClick={() => onReject(outpass._id)}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
            >
              <XCircleIcon className="w-4 h-4" /> Reject
            </button>
          </>
        )}
      </div>
    </Motion.div>
  )
}

/* ─────────────────────────────────────────────
   Detail Modal
───────────────────────────────────────────── */
function DetailModal({ outpass, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <Motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18 }}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg p-7"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Outpass Details</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Status</p>
              <StatusChip status={outpass.status} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Type</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">{outpass.outpassType || '—'}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Reason</p>
            <p className="text-sm text-slate-900 dark:text-white">{outpass.reason}</p>
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Destination</p>
            <p className="text-sm text-slate-900 dark:text-white">{outpass.destination || '—'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Departure</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {formatDate(outpass.departureDateTime, 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Expected Return</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {formatDate(outpass.returnDateTime, 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Warden</p>
              <p className="text-sm text-slate-900 dark:text-white">{outpass.wardenName || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">HOD</p>
              <p className="text-sm text-slate-900 dark:text-white">{outpass.hodName || '—'}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Submitted</p>
            <p className="text-sm text-slate-900 dark:text-white">
              {formatDate(outpass.createdAt, 'MMM dd, yyyy HH:mm')}
            </p>
          </div>
        </div>

        <div className="mt-7 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-80 transition-opacity"
          >
            Close
          </button>
        </div>
      </Motion.div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function OutpassHistory() {
  const [loading, setLoading]               = useState(true)
  const [outpasses, setOutpasses]           = useState([])
  const [searchTerm, setSearchTerm]         = useState('')
  const [statusFilter, setStatusFilter]     = useState('all')
  const [dateFilter, setDateFilter]         = useState('all')
  const [monthFilter, setMonthFilter]       = useState('')
  const [yearFilter, setYearFilter]         = useState('')
  const [exportFormat, setExportFormat]     = useState('csv')
  const [selectedOutpass, setSelectedOutpass] = useState(null)
  const [showFilters, setShowFilters]       = useState(false)
  const filterRef = useRef(null)

  const user = useSelector(selectUser)

  /* Close filter panel on outside click */
  useEffect(() => {
    const handler = e => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilters(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* ── Fetch ── */
  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)
      const params = { status: statusFilter === 'all' ? '' : statusFilter, limit: 100, sort: '-createdAt' }
      let response
      if (user?.role === 'student') {
        const { getMyOutpasses } = await import('../../services/outpassService')
        response = await getMyOutpasses(params)
      } else {
        response = await apiClient.get('/outpass/history', { params })
      }

      let list = []
      if (Array.isArray(response))                      list = response
      else if (response?.data?.outpasses)               list = response.data.outpasses
      else if (response?.outpasses)                     list = response.outpasses
      else if (response?.data && Array.isArray(response.data)) list = response.data

      const normalized = (Array.isArray(list) ? list : []).map(o => ({
        ...o,
        departureDateTime: o.leaveTime || o.departureDateTime || o.leave_time || null,
        returnDateTime:    o.expectedReturnTime || o.returnDateTime || o.return_time || null,
        destination:       typeof o.destination === 'object' ? (o.destination.place || '') : (o.destination || ''),
        wardenName:        o.warden && typeof o.warden === 'object'
          ? (o.warden.firstName ? `${o.warden.firstName} ${o.warden.lastName || ''}` : (o.warden.fullName || ''))
          : (o.warden || ''),
        hodName:           o.hod && typeof o.hod === 'object'
          ? (o.hod.name || `${o.hod.firstName || ''} ${o.hod.lastName || ''}`.trim())
          : (o.hod || ''),
      }))

      setOutpasses(normalized)
    } catch (error) {
      console.error('Failed to fetch history:', error)
      setOutpasses([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, user?.role])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  /* ── Filter logic ── */
  const filteredOutpasses = outpasses.filter(o => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      o.reason?.toLowerCase().includes(term) ||
      o.destination?.toLowerCase().includes(term) ||
      o.student?.firstName?.toLowerCase().includes(term) ||
      o.student?.fullName?.toLowerCase().includes(term)

    if (!matchesSearch) return false

    const d = new Date(o.createdAt)

    if (dateFilter === 'today') {
      const today = new Date(); today.setHours(0,0,0,0)
      if (d < today) return false
    }
    if (dateFilter === 'week') {
      const w = new Date(); w.setDate(w.getDate() - 7)
      if (d < w) return false
    }
    if (dateFilter === 'month') {
      const m = new Date(); m.setMonth(m.getMonth() - 1)
      if (d < m) return false
    }

    if (monthFilter !== '' && d.getMonth() !== Number(monthFilter)) return false
    if (yearFilter  !== '' && d.getFullYear() !== Number(yearFilter)) return false

    return true
  })

  const grouped = groupByMonth(filteredOutpasses)

  const activeFilterCount = [
    statusFilter !== 'all',
    dateFilter !== 'all',
    monthFilter !== '',
    yearFilter  !== '',
  ].filter(Boolean).length

  /* ── Actions ── */
  const handleApprove = async id => {
    if (!window.confirm('Approve this outpass?')) return
    try {
      const resp = await outpassService.approve(id)
      toast.success(resp?.message || 'Outpass approved')
      setOutpasses(prev => prev.map(o => o._id === id ? { ...o, status: resp?.outpass?.status || 'approved' } : o))
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to approve') }
  }

  const handleReject = async id => {
    const reason = window.prompt('Reason for rejection (required)')
    if (!reason) return toast.error('Rejection reason required')
    try {
      const resp = await outpassService.reject(id, reason)
      toast.success(resp?.message || 'Outpass rejected')
      setOutpasses(prev => prev.map(o => o._id === id ? { ...o, status: resp?.outpass?.status || 'rejected' } : o))
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to reject') }
  }

  const handleHodApprove = async id => {
    if (!window.confirm('Approve as HOD?')) return
    try {
      const resp = await outpassService.hodApprove(id)
      toast.success(resp?.message || 'HOD approved')
      setOutpasses(prev => prev.map(o => o._id === id ? { ...o, status: resp?.outpass?.status || 'approved_by_hod' } : o))
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to approve') }
  }

  const handleRequestParentOtp = async op => {
    try {
      if (op.parentApproval?.approved) return toast.error('Parent already approved')
      const resp = await outpassService.requestParentOtp(op._id)
      toast.success(resp?.message || 'Parent verification requested')
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to request OTP') }
  }

  /* ── Export ── */
  const handleExport = async () => {
    const fileBase = `outpass-history-${new Date().toISOString().split('T')[0]}`
    if (exportFormat === 'csv') {
      const csv = [
        ['Student','Status','Reason','Departure','Return','Submitted'].join(','),
        ...filteredOutpasses.map(o => [
          o.student?.name || 'Unknown', o.status,
          `"${(o.reason || '').replaceAll('"', '""')}"`,
          formatDate(o.departureDateTime, 'yyyy-MM-dd HH:mm'),
          formatDate(o.returnDateTime,   'yyyy-MM-dd HH:mm'),
          formatDate(o.createdAt,         'yyyy-MM-dd HH:mm'),
        ].join(','))
      ].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `${fileBase}.csv`; a.click()
      URL.revokeObjectURL(url)
    } else if (exportFormat === 'json') {
      const json = filteredOutpasses.map(o => ({
        student: o.student?.name || 'Unknown', status: o.status, reason: o.reason,
        departure: o.departureDateTime, return: o.returnDateTime, submitted: o.createdAt,
      }))
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `${fileBase}.json`; a.click()
      URL.revokeObjectURL(url)
    } else if (exportFormat === 'xlsx') {
      const rows = filteredOutpasses.map(o => ({
        Student: o.student?.name || 'Unknown', Status: o.status, Reason: o.reason,
        Departure: formatDate(o.departureDateTime, 'yyyy-MM-dd HH:mm'),
        Return:    formatDate(o.returnDateTime,    'yyyy-MM-dd HH:mm'),
        Submitted: formatDate(o.createdAt,          'yyyy-MM-dd HH:mm'),
      }))
      const workbook  = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('History')
      const headers   = Object.keys(rows[0] || { Student:'',Status:'',Reason:'',Departure:'',Return:'',Submitted:'' })
      worksheet.addRow(headers)
      rows.forEach(r => worksheet.addRow(headers.map(h => r[h])))
      worksheet.columns.forEach(col => {
        let max = 10
        col.eachCell({ includeEmpty: true }, c => { max = Math.max(max, String(c.value || '').length + 2) })
        col.width = Math.min(max, 40)
      })
      const buffer = await workbook.xlsx.writeBuffer()
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${fileBase}.xlsx`)
    } else if (exportFormat === 'pdf') {
      const doc = new jsPDF()
      doc.setFontSize(14); doc.text('Outpass History', 14, 20)
      doc.setFontSize(10)
      let y = 30
      for (const o of filteredOutpasses.slice(0, 30)) {
        const line = `${(o.student?.name || 'Unknown').slice(0,20)} | ${o.status.padEnd(9)} | ${formatDate(o.departureDateTime,'MM/dd HH:mm')} - ${formatDate(o.returnDateTime,'MM/dd HH:mm')}`
        doc.text(line, 14, y)
        y += 6
        if (y > 280) { doc.addPage(); y = 20 }
      }
      doc.save(`${fileBase}.pdf`)
    }
  }

  /* ── Render ── */
  return (
    <DashboardLayout>
      <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl mx-auto">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Outpass History</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">View and export past outpass requests</p>
          </div>

          {/* Export */}
          <div className="flex items-center gap-2">
            <select
              value={exportFormat}
              onChange={e => setExportFormat(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="pdf">PDF</option>
            </select>
            <button
              onClick={handleExport}
              disabled={filteredOutpasses.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              <ArrowDownTrayIcon className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* ── Search + Filter bar ── */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by reason or destination..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
            />
          </div>

          {/* Filter toggle */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-medium transition-all shadow-sm ${
                showFilters || activeFilterCount > 0
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-gray-200 dark:border-slate-600 hover:border-blue-400'
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 bg-white text-blue-600 rounded-full text-xs font-bold w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showFilters && (
                <FilterPanel
                  statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                  dateFilter={dateFilter}     setDateFilter={setDateFilter}
                  monthFilter={monthFilter}   setMonthFilter={setMonthFilter}
                  yearFilter={yearFilter}     setYearFilter={setYearFilter}
                  onReset={() => {
                    setStatusFilter('all')
                    setDateFilter('all')
                    setMonthFilter('')
                    setYearFilter('')
                  }}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <LoadingCard />
        ) : filteredOutpasses.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-10 flex flex-col items-center text-center">
            <ClockIcon className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-700 dark:text-slate-200 font-semibold">No history found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([monthLabel, items]) => (
              <div key={monthLabel}>
                {/* Month header */}
                <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 px-1">
                  {monthLabel}
                </h2>
                <div className="space-y-3">
                  {items.map((op, i) => (
                    <OutpassCard
                      key={op._id}
                      outpass={op}
                      index={i}
                      user={user}
                      onView={setSelectedOutpass}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onHodApprove={handleHodApprove}
                      onRequestParentOtp={handleRequestParentOtp}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Motion.div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedOutpass && (
          <DetailModal outpass={selectedOutpass} onClose={() => setSelectedOutpass(null)} />
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}