
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  MapPinIcon,
  ChevronDownIcon,
  XMarkIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  BuildingOffice2Icon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  TableCellsIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckSolid, XCircleIcon as XSolid } from '@heroicons/react/24/solid'
import DashboardLayout from '../../layouts/DashboardLayout'
import Card from '../../components/ui/Card'
import { useOutpassEvents } from '../../hooks/useSocket'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal, { ModalFooter } from '../../components/ui/Modal'
import { LoadingCard } from '../../components/ui/Loading'
import EmptyState from '../../components/ui/EmptyState'
import Textarea from '../../components/ui/Textarea'
import { getOutpasses, approveOutpass, rejectOutpass } from '../../services/outpassService'
import outpassService from '../../services/outpassService'
import { formatDate, formatRelativeTime } from '../../utils/helpers'
import { OUTPASS_STATUS } from '../../constants'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { selectUser } from '../../store/authSlice'

// ─── constants ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'pending',  label: 'Pending',  dot: 'bg-amber-500',   activeBg: 'bg-amber-50 dark:bg-amber-900/30', activeText: 'text-amber-700 dark:text-amber-300', activeBorder: 'border-amber-400' },
  { id: 'approved', label: 'Approved', dot: 'bg-emerald-500', activeBg: 'bg-emerald-50 dark:bg-emerald-900/30', activeText: 'text-emerald-700 dark:text-emerald-300', activeBorder: 'border-emerald-400' },
  { id: 'rejected', label: 'Rejected', dot: 'bg-rose-500',    activeBg: 'bg-rose-50 dark:bg-rose-900/30', activeText: 'text-rose-700 dark:text-rose-300', activeBorder: 'border-rose-400' },
  { id: 'all',      label: 'All',      dot: 'bg-slate-500',   activeBg: 'bg-slate-100 dark:bg-slate-800', activeText: 'text-slate-700 dark:text-slate-200', activeBorder: 'border-slate-400' },
]

const HOSTEL_BLOCKS = ['A', 'B', 'C', 'D', 'E']

const DURATION_OPTIONS = [
  { label: 'Any duration', value: '' },
  { label: '≤ 4 hours',    value: '4' },
  { label: '≤ 8 hours',    value: '8' },
  { label: '≤ 12 hours',   value: '12' },
  { label: '> 12 hours',   value: '12+' },
]

// ─── helpers ──────────────────────────────────────────────────────────────────
function monthKey(date) {
  if (!date) return 'Unknown'
  const d = new Date(date)
  if (isNaN(d)) return 'Unknown'
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function durationHours(o) {
  const leave = o.leaveTime || o.departureDateTime
  const ret   = o.expectedReturnTime || o.returnDateTime
  if (!leave || !ret) return null
  return (new Date(ret) - new Date(leave)) / 3_600_000
}

function formatDuration(hrs) {
  if (hrs === null || hrs === undefined) return null
  if (hrs < 1) return `${Math.round(hrs * 60)}m`
  const h = Math.floor(hrs)
  const m = Math.round((hrs - h) * 60)
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function otpStillValid(parentApproval) {
  if (!parentApproval?.requestedAt) return false
  if (parentApproval?.approved)     return false
  return Date.now() - new Date(parentApproval.requestedAt).getTime() < 10 * 60 * 1000
}

function safeStr(val) {
  if (!val) return ''
  if (typeof val === 'object') return val.place || val.name || JSON.stringify(val)
  return String(val)
}

function normaliseOutpass(o) {
  const dep = o.leaveTime || o.departureDateTime || o.leave_time || null
  const ret = o.expectedReturnTime || o.returnDateTime || o.return_time || null
  const hrs = durationHours({ leaveTime: dep, expectedReturnTime: ret })

  return {
    ...o,
    departureDateTime: dep,
    returnDateTime:    ret,
    durationHours:     hrs,
    destination:       safeStr(o.destination),
    studentName:
      o.student?.firstName
        ? `${o.student.firstName} ${o.student.lastName || ''}`.trim()
        : (o.studentName || o.student?.fullName || 'Unknown'),
    studentEmail: o.student?.email || o.studentEmail || '',
    studentRoll:  o.student?.rollNumber || o.rollNumber || '',
    hostelBlock:  o.student?.hostelBlock || o.hostelBlock || '',
    roomNumber:   o.student?.roomNumber  || o.roomNumber  || '',
    wardenName:
      o.warden && typeof o.warden === 'object'
        ? (o.warden.firstName ? `${o.warden.firstName} ${o.warden.lastName || ''}`.trim() : o.warden.fullName || '')
        : (o.warden || ''),
    hodName:
      o.hod && typeof o.hod === 'object'
        ? (o.hod.name || `${o.hod.firstName || ''} ${o.hod.lastName || ''}`.trim())
        : (o.hod || ''),
  }
}

// ─── Status config ─────────────────────────────────────────────────────────
const STATUS_CFG = {
  approved:           { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-800 dark:text-emerald-200', dot: 'bg-emerald-500', label: 'Approved' },
  // ADD these 3 entries in STATUS_CFG:
counsellor_pending:     { bg: 'bg-sky-100 dark:bg-sky-900/40',  text: 'text-sky-800 dark:text-sky-200',  dot: 'bg-sky-500',  label: 'Counsellor Review' },
counsellor_approved:    { bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-800 dark:text-teal-200', dot: 'bg-teal-500', label: 'Counsellor OK' },
rejected_by_counsellor: { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-800 dark:text-rose-200', dot: 'bg-rose-500', label: 'Counsellor Rejected' },
  approved_by_warden: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-800 dark:text-emerald-200', dot: 'bg-emerald-500', label: 'Warden OK' },
  approved_by_hod:    { bg: 'bg-teal-100 dark:bg-teal-900/40',       text: 'text-teal-800 dark:text-teal-200',       dot: 'bg-teal-500',   label: 'HOD OK' },
  rejected:           { bg: 'bg-rose-100 dark:bg-rose-900/40',        text: 'text-rose-800 dark:text-rose-200',        dot: 'bg-rose-500',   label: 'Rejected' },
  rejected_by_hod:    { bg: 'bg-rose-100 dark:bg-rose-900/40',        text: 'text-rose-800 dark:text-rose-200',        dot: 'bg-rose-500',   label: 'HOD Rejected' },
  pending:            { bg: 'bg-amber-100 dark:bg-amber-900/40',      text: 'text-amber-800 dark:text-amber-200',      dot: 'bg-amber-500',  label: 'Pending' },
  out:                { bg: 'bg-blue-100 dark:bg-blue-900/40',        text: 'text-blue-800 dark:text-blue-200',        dot: 'bg-blue-500',   label: 'Out' },
  completed:          { bg: 'bg-slate-100 dark:bg-slate-700',         text: 'text-slate-700 dark:text-slate-200',      dot: 'bg-slate-400',  label: 'Completed' },
  cancelled:          { bg: 'bg-slate-100 dark:bg-slate-700',         text: 'text-slate-500 dark:text-slate-400',      dot: 'bg-slate-400',  label: 'Cancelled' },
}

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400', label: status }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

// ─── FilterBar ────────────────────────────────────────────────────────────────
function FilterBar({ filters, onChange, onReset, hasActive }) {
  const cls = "h-9 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400 w-full"
  return (
    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">From</label>
          <input type="date" value={filters.dateFrom} onChange={e => onChange('dateFrom', e.target.value)} className={cls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">To</label>
          <input type="date" value={filters.dateTo} onChange={e => onChange('dateTo', e.target.value)} className={cls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Block</label>
          <div className="relative">
            <select value={filters.block} onChange={e => onChange('block', e.target.value)} className={`${cls} appearance-none pr-8`}>
              <option value="">All Blocks</option>
              {HOSTEL_BLOCKS.map(b => <option key={b} value={b}>Block {b}</option>)}
            </select>
            <ChevronDownIcon className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Duration</label>
          <div className="relative">
            <select value={filters.duration} onChange={e => onChange('duration', e.target.value)} className={`${cls} appearance-none pr-8`}>
              {DURATION_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <ChevronDownIcon className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>
      {hasActive && (
        <button onClick={onReset} className="flex items-center gap-1.5 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors">
          <XMarkIcon className="h-4 w-4" /> Clear all filters
        </button>
      )}
    </div>
  )
}

// ─── Desktop Row ──────────────────────────────────────────────────────────────
function DesktopRow({ outpass, onView }) {
  const dep = outpass.departureDateTime
  const ret = outpass.returnDateTime
  const hrs = outpass.durationHours
  const dur = formatDuration(hrs)
  const isOvernight = hrs !== null && hrs > 12

  return (
    <Motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="group flex items-center gap-4 px-6 py-4 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
    >
      {/* Col 1: Student name + reason */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold text-slate-900 dark:text-white truncate leading-tight">{outpass.studentName}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">{outpass.reason}</p>
        {outpass.hostelBlock && (
          <span className="text-xs font-medium text-violet-600 dark:text-violet-400">Block {outpass.hostelBlock}{outpass.roomNumber ? ` · ${outpass.roomNumber}` : ''}</span>
        )}
      </div>

      {/* Col 2: Dates */}
      <div className="hidden md:flex flex-col gap-0.5 shrink-0 min-w-[130px]">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {dep ? formatDate(dep, 'MMM d') : '—'}
        </p>
        <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
          {dep ? formatDate(dep, 'HH:mm') : '—'} → {ret ? formatDate(ret, 'HH:mm') : '—'}
        </p>
        {dur && (
          <span className={`text-xs font-semibold ${isOvernight ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {dur}{isOvernight ? ' · Overnight' : ''}
          </span>
        )}
      </div>

      {/* Col 3: Destination + relative time */}
      <div className="hidden lg:flex flex-col items-end gap-1 shrink-0 min-w-[120px]">
        {outpass.destination && (
          <span className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            <MapPinIcon className="h-3.5 w-3.5 text-slate-400" />{outpass.destination}
          </span>
        )}
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <CalendarIcon className="h-3 w-3" />{formatRelativeTime(outpass.createdAt)}
        </span>
      </div>

      {/* Col 4: Status + button */}
      <div className="flex items-center gap-3 shrink-0">
        <StatusBadge status={outpass.status} />
        <button
          onClick={() => onView(outpass)}
          className="h-9 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-violet-400 hover:text-violet-700 dark:hover:border-violet-500 dark:hover:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all whitespace-nowrap"
        >
          View
        </button>
      </div>
    </Motion.div>
  )
}

// ─── Mobile Card ──────────────────────────────────────────────────────────────
function MobileCard({ outpass, onView }) {
  const dep = outpass.departureDateTime
  const ret = outpass.returnDateTime
  const hrs = outpass.durationHours
  const dur = formatDuration(hrs)
  const isOvernight = hrs !== null && hrs > 12

  return (
    <Motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 transition-all"
    >
      {/* Top accent based on status */}
      <div className={`h-1 w-full ${STATUS_CFG[outpass.status]?.dot || 'bg-slate-300'}`} />

      <div className="p-4 space-y-3">
        {/* Row 1: Name + Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate">{outpass.studentName}</p>
            {outpass.hostelBlock && (
              <p className="text-xs text-violet-600 dark:text-violet-400 font-medium mt-0.5">Block {outpass.hostelBlock}{outpass.roomNumber ? ` · ${outpass.roomNumber}` : ''}</p>
            )}
          </div>
          <StatusBadge status={outpass.status} />
        </div>

        {/* Row 2: Date + Time */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
          <CalendarIcon className="h-4 w-4 text-violet-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {dep ? formatDate(dep, 'MMM d, yyyy') : '—'}
            </p>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {dep ? formatDate(dep, 'HH:mm') : '—'} → {ret ? formatDate(ret, 'HH:mm') : '—'}
              {dur && <span className={`ml-2 font-semibold not-italic ${isOvernight ? 'text-indigo-500' : 'text-slate-400'}`}>· {dur}{isOvernight ? ' overnight' : ''}</span>}
            </p>
          </div>
        </div>

        {/* Row 3: Reason */}
        <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">{outpass.reason}</p>

        {/* Row 4: Destination + Submitted + Button */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col gap-0.5 min-w-0">
            {outpass.destination && (
              <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                <MapPinIcon className="h-3 w-3 shrink-0" />{outpass.destination}
              </span>
            )}
            <span className="text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(outpass.createdAt)}</span>
          </div>
          <button
            onClick={() => onView(outpass)}
            className="shrink-0 h-9 px-4 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 active:scale-95 transition-all shadow-sm shadow-violet-500/20"
          >
            View
          </button>
        </div>
      </div>
    </Motion.div>
  )
}

// ─── DetailField ──────────────────────────────────────────────────────────────
function DetailField({ label, value, full }) {
  return (
    <div className={`flex flex-col gap-1 ${full ? 'col-span-2' : ''}`}>
      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-slate-900 dark:text-white">{value || '—'}</span>
    </div>
  )
}

// ─── Inline OTP Panel ─────────────────────────────────────────────────────────
function InlineOtpPanel({ outpass, currentUserRole, onSuccess, onResend }) {
  const [otp, setOtp]           = useState('')
  const [submitting, setSubmit] = useState('')
  const valid = otpStillValid(outpass?.parentApproval)

  const handleVerify = async () => {
    if (otp.length !== 6) { toast.error('Enter the 6-digit OTP'); return }
    if (currentUserRole !== 'warden') { toast.error('Only wardens can submit the OTP'); return }
    setSubmit('verify')
    try {
      await outpassService.parentApprove(outpass._id, otp, '')
      toast.success('Parent verified — outpass approved ✓')
      setOtp(''); onSuccess()
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Invalid OTP')
    } finally { setSubmit('') }
  }

  const handleResend = async () => {
    setSubmit('resend')
    try { const r = await onResend(); toast.success('OTP resent to parent'); return r }
    catch (err) { toast.error(err?.response?.data?.message || err.message || 'Failed to resend') }
    finally { setSubmit('') }
  }

  return (
    <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheckIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-900 dark:text-amber-100">Parent OTP Verification</p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
            {valid ? 'OTP sent to parent. Ask them and enter below.' : 'OTP expired — resend to get a new one.'}
          </p>
        </div>
      </div>
      {currentUserRole !== 'warden' && (
        <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800 font-medium">
          Only wardens can submit the OTP.
        </p>
      )}
      <div className="flex gap-2">
        <input
          type="text" inputMode="numeric" placeholder="6-digit OTP" value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6}
          disabled={currentUserRole !== 'warden' || !valid}
          className="flex-1 h-10 px-3 rounded-xl border-2 border-amber-300 dark:border-amber-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-400/50 disabled:opacity-50"
        />
        <button
          onClick={handleVerify}
          disabled={submitting === 'verify' || otp.length !== 6 || currentUserRole !== 'warden' || !valid}
          className="h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-sm font-bold transition-colors flex items-center gap-1.5"
        >
          {submitting === 'verify' ? <><ArrowPathIcon className="h-4 w-4 animate-spin" />Verifying…</> : <><CheckCircleIcon className="h-4 w-4" />Verify</>}
        </button>
      </div>
      <button
        onClick={handleResend} disabled={submitting === 'resend'}
        className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 transition-colors disabled:opacity-50"
      >
        {submitting === 'resend' ? <><ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />Resending…</> : <><ArrowPathIcon className="h-3.5 w-3.5" />Resend OTP</>}
      </button>
    </div>
  )
}

// ─── Export helpers ────────────────────────────────────────────────────────────
function exportToCSV(data, filename) {
  if (!data.length) { toast.error('No data to export'); return }
  const headers = ['Student Name','Roll Number','Block','Room','Status','Destination','Reason','Departure','Return','Duration (hrs)','Submitted']
  const rows = data.map(o => [
    o.studentName,
    o.studentRoll || '',
    o.hostelBlock || '',
    o.roomNumber || '',
    o.status,
    o.destination || '',
    (o.reason || '').replace(/"/g, '""'),
    o.departureDateTime ? formatDate(o.departureDateTime, 'MMM d yyyy HH:mm') : '',
    o.returnDateTime ? formatDate(o.returnDateTime, 'MMM d yyyy HH:mm') : '',
    o.durationHours !== null && o.durationHours !== undefined ? o.durationHours.toFixed(1) : '',
    o.createdAt ? new Date(o.createdAt).toLocaleString() : '',
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${filename}.csv`; a.click()
  URL.revokeObjectURL(url)
  toast.success('Exported as CSV (Excel compatible)')
}

function exportToPDF(data, filename) {
  if (!data.length) { toast.error('No data to export'); return }
  const html = `
    <html><head><title>${filename}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      p { color: #666; margin-bottom: 16px; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { background: #7c3aed; color: white; padding: 8px; text-align: left; }
      td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
      tr:nth-child(even) { background: #f9fafb; }
      .approved { color: #059669; font-weight: bold; }
      .pending  { color: #d97706; font-weight: bold; }
      .rejected { color: #dc2626; font-weight: bold; }
    </style></head><body>
    <h1>Outpass Requests Report</h1>
    <p>Generated: ${new Date().toLocaleString()} &nbsp;·&nbsp; Total: ${data.length} records</p>
    <table>
      <thead><tr>
        <th>Student</th><th>Block/Room</th><th>Status</th>
        <th>Destination</th><th>Departure</th><th>Return</th><th>Duration</th>
      </tr></thead>
      <tbody>
        ${data.map(o => `
          <tr>
            <td><strong>${o.studentName}</strong>${o.studentRoll ? `<br/><small>${o.studentRoll}</small>` : ''}</td>
            <td>${o.hostelBlock ? `Block ${o.hostelBlock}${o.roomNumber ? ` / ${o.roomNumber}` : ''}` : '—'}</td>
            <td class="${o.status}">${STATUS_CFG[o.status]?.label || o.status}</td>
            <td>${o.destination || '—'}</td>
            <td>${o.departureDateTime ? new Date(o.departureDateTime).toLocaleString() : '—'}</td>
            <td>${o.returnDateTime ? new Date(o.returnDateTime).toLocaleString() : '—'}</td>
            <td>${o.durationHours !== null && o.durationHours !== undefined ? `${o.durationHours.toFixed(1)}h` : '—'}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    </body></html>`
  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 500)
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OutpassManagement() {
   const currentUser = useSelector(selectUser)
  const [activeTab, setActiveTab] = useState(
  currentUser?.role === 'security' ? 'approved' : 'pending'
  )
  const [outpasses,      setOutpasses]      = useState([])
  const [loading,        setLoading]        = useState(true)
  const [searchTerm,     setSearchTerm]     = useState('')
  const [showFilters,    setShowFilters]    = useState(false)
  const [filters,        setFilters]        = useState({ dateFrom: '', dateTo: '', block: '', duration: '' })
  const [showExport,     setShowExport]     = useState(false)
  const exportRef = useRef(null)

  const [selectedOutpass,  setSelectedOutpass]  = useState(null)
  const [showViewModal,    setShowViewModal]    = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal,  setShowRejectModal]  = useState(false)
  const [rejectReason,     setRejectReason]     = useState('')
  const [requestingOtpId,  setRequestingOtpId]  = useState(null)
 

  const isSecurityRole = currentUser?.role === 'security'

  const visibleTabs = isSecurityRole
    ? TABS.filter(t => ['approved', 'all'].includes(t.id))
    : TABS

  // Close export dropdown on outside click
  useEffect(() => {
    function handler(e) { if (exportRef.current && !exportRef.current.contains(e.target)) setShowExport(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchOutpasses = useCallback(async () => {
    try {
      setLoading(true)
      const response = await getOutpasses({ status: activeTab === 'all' ? '' : activeTab })
      let list = []
      if (Array.isArray(response))                        list = response
      else if (Array.isArray(response?.data?.outpasses)) list = response.data.outpasses
      else if (Array.isArray(response?.outpasses))       list = response.outpasses
      else if (Array.isArray(response?.data))            list = response.data
      setOutpasses(list.map(normaliseOutpass))
    } catch (err) {
      console.error('Failed to fetch outpasses:', err)
      setOutpasses([])
    } finally {
      setLoading(false)
    }
  }, [activeTab])
  // Inside the component, after fetchOutpasses is defined:


  useEffect(() => { fetchOutpasses() }, [fetchOutpasses])

// Real-time updates via socket
useOutpassEvents({
  onCreated:          () => fetchOutpasses(),
  onApproved:         () => fetchOutpasses(),
  onRejected:         () => fetchOutpasses(),
  onCancelled:        () => fetchOutpasses(),
  onDashboardRefresh: () => fetchOutpasses(),
})

  // ── filter/search logic ────────────────────────────────────────────────────
  const hasActiveFilter = !!(filters.dateFrom || filters.dateTo || filters.block || filters.duration)
  const handleFilterChange = (key, val) => setFilters(f => ({ ...f, [key]: val }))
  const resetFilters = () => setFilters({ dateFrom: '', dateTo: '', block: '', duration: '' })

  const filteredOutpasses = useMemo(() => {
    if (!Array.isArray(outpasses)) return []

    return outpasses.filter(o => {
      // ── Search: match against name, reason, destination, roll number
      const q = searchTerm.trim().toLowerCase()
      if (q) {
        const searchable = [
          o.studentName,
          o.reason,
          o.destination,
          o.studentRoll,
          o.studentEmail,
          o.hostelBlock,
        ].map(v => (v || '').toLowerCase())
        const matched = searchable.some(s => s.includes(q))
        if (!matched) return false
      }

      // ── Date From filter
      if (filters.dateFrom) {
        const dep = o.departureDateTime || o.leaveTime || o.createdAt
        if (!dep) return false
        if (new Date(dep) < new Date(filters.dateFrom + 'T00:00:00')) return false
      }

      // ── Date To filter
      if (filters.dateTo) {
        const dep = o.departureDateTime || o.leaveTime || o.createdAt
        if (!dep) return false
        if (new Date(dep) > new Date(filters.dateTo + 'T23:59:59')) return false
      }

      // ── Block filter (normalize both sides to uppercase trim)
      if (filters.block) {
        const block = (o.hostelBlock || o.student?.hostelBlock || '').toString().trim().toUpperCase()
        if (block !== filters.block.trim().toUpperCase()) return false
      }

      // ── Duration filter
      if (filters.duration) {
        const hrs = o.durationHours
        if (hrs === null || hrs === undefined) return false
        if (filters.duration === '12+') { if (hrs <= 12) return false }
        else { if (hrs > Number(filters.duration)) return false }
      }

      return true
    })
  }, [outpasses, searchTerm, filters])

  const grouped = useMemo(() => {
    const map = {}
    for (const o of filteredOutpasses) {
      const key = monthKey(o.departureDateTime || o.leaveTime || o.createdAt)
      if (!map[key]) map[key] = []
      map[key].push(o)
    }
    return Object.entries(map)
  }, [filteredOutpasses])

  // ── view handler ──────────────────────────────────────────────────────────
  const handleView = async (outpass) => {
    let enriched = { ...outpass }
    try {
      if (outpass?.warden?._id) {
        const svc = await import('../../services/userService')
        const fn = svc.getById || svc.default?.getById
        if (fn) {
          const resp = await fn('warden', outpass.warden._id)
          const w = resp?.data?.data?.user || resp?.data?.user || resp?.user || resp?.data
          if (w) enriched.warden = { ...outpass.warden, ...w }
        }
      }
    } catch {}
    setSelectedOutpass(normaliseOutpass(enriched))
    setShowViewModal(true)
  }

  const handleRequestParentOtp = async () => {
    if (!selectedOutpass) return
    setRequestingOtpId(selectedOutpass._id)
    try {
      const resp = await outpassService.requestParentOtp(selectedOutpass._id)
      toast.success('OTP sent to parent\'s email')
      const updated = resp?.data?.outpass || resp?.outpass || null
      setSelectedOutpass(prev => ({
        ...prev,
        parentApproval: {
          ...(prev?.parentApproval || {}),
          ...(updated?.parentApproval || {}),
          requestedAt: updated?.parentApproval?.requestedAt || new Date().toISOString(),
          approved: false,
        },
      }))
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to send OTP')
    } finally {
      setRequestingOtpId(null)
      fetchOutpasses()
    }
  }

  const handleResendOtp = async () => {
    const resp = await outpassService.requestParentOtp(selectedOutpass._id)
    const updated = resp?.data?.outpass || resp?.outpass || null
    setSelectedOutpass(prev => normaliseOutpass({
      ...prev,
      parentApproval: updated?.parentApproval || { ...prev?.parentApproval, requestedAt: new Date().toISOString() },
    }))
    return resp
  }

  const handleOtpSuccess = () => {
    fetchOutpasses()
    setSelectedOutpass(prev => normaliseOutpass({
      ...prev,
      parentApproval: { ...prev?.parentApproval, approved: true, approvedAt: new Date().toISOString() },
    }))
  }

  const handleSendToHod = async () => {
    if (!selectedOutpass) return
    try {
      const resp = await outpassService.sendToHod(selectedOutpass._id)
      const returned = resp?.data?.outpass || resp?.outpass || null
      if (returned) setSelectedOutpass(prev => normaliseOutpass({ ...prev, ...returned }))
      else setSelectedOutpass(prev => normaliseOutpass({ ...prev, hodApprovalRequested: true }))
      const smsSent = resp?.data?.hodSmsSent ?? resp?.hodSmsSent
      if (smsSent === true)       toast.success('Sent to HOD — notified via SMS')
      else if (smsSent === false) toast('Sent to HOD — SMS failed, notify manually', { icon: '⚠️' })
      else                        toast.success('Sent to HOD for approval')
      fetchOutpasses()
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to send to HOD')
    }
  }
  const handleSendToCounsellor = async () => {
  if (!selectedOutpass) return
  try {
    const resp = await outpassService.sendToCounsellor(selectedOutpass._id)
    const returned = resp?.data?.outpass || resp?.outpass || null
    if (returned) setSelectedOutpass(prev => normaliseOutpass({ ...prev, ...returned }))
    else setSelectedOutpass(prev => normaliseOutpass({ ...prev, counsellorApprovalRequested: true }))
    toast.success('Sent to counsellor for approval')
    fetchOutpasses()
  } catch (err) {
    toast.error(err?.response?.data?.message || err.message || 'Failed to send to counsellor')
  }
  }
  const confirmApprove = async () => {
    try {
      const t = toast.loading('Approving…')
      await approveOutpass(selectedOutpass._id, '')
      toast.success('Outpass approved!', { id: t })
      setShowApproveModal(false); setShowViewModal(false)
      fetchOutpasses()
    } catch (err) { toast.error(err?.message || 'Failed to approve') }
  }

  const confirmReject = async () => {
    if (!rejectReason.trim()) { toast.error('Provide a reason'); return }
    try {
      const t = toast.loading('Rejecting…')
      await rejectOutpass(selectedOutpass._id, rejectReason)
      toast.success('Outpass rejected', { id: t })
      setShowRejectModal(false); setShowViewModal(false); setRejectReason('')
      fetchOutpasses()
    } catch (err) { toast.error(err?.message || 'Failed to reject') }
  }

  // ── Derived flags ──────────────────────────────────────────────────────────
  const isPending = selectedOutpass && (
    selectedOutpass.status === 'pending' ||
    selectedOutpass.status === OUTPASS_STATUS?.PENDING_WARDEN_APPROVAL
  )
  const parentOtpRequested = !!selectedOutpass?.parentApproval?.requestedAt
  const parentApproved     = !!selectedOutpass?.parentApproval?.approved
  const hodRequested       = !!selectedOutpass?.hodApprovalRequested
  const hodApproved        = !!selectedOutpass?.hodApproval?.approved
  const counsellorRequested = !!selectedOutpass?.counsellorApprovalRequested
  const counsellorApproved  = !!selectedOutpass?.counsellorApproval?.approved
  const showOtpPanel       = isPending && parentOtpRequested && !parentApproved
  const canRequestOtp      = isPending && !parentOtpRequested
  const canApprove =
    isPending &&
    !(!parentApproved && parentOtpRequested) &&
    !(parentApproved && currentUser?.role !== 'warden') &&
    !(hodRequested && !hodApproved)

  const activeFilterCount = [filters.dateFrom, filters.dateTo, filters.block, filters.duration].filter(Boolean).length

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Outpass Requests</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review, filter, and manage student leave requests</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Export dropdown */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setShowExport(v => !v)}
                className="flex items-center gap-2 h-9 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-violet-400 hover:text-violet-700 dark:hover:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${showExport ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showExport && (
                  <Motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-11 z-50 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden min-w-[180px]"
                  >
                    <button
                      onClick={() => { exportToCSV(filteredOutpasses, 'outpass-requests'); setShowExport(false) }}
                      className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                    >
                      <TableCellsIcon className="h-4 w-4" /> Export Excel / CSV
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-slate-700" />
                    <button
                      onClick={() => { exportToPDF(filteredOutpasses, 'outpass-requests'); setShowExport(false) }}
                      className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
                    >
                      <PrinterIcon className="h-4 w-4" /> Export PDF
                    </button>
                  </Motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
                showFilters || hasActiveFilter
                  ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-500/25'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-violet-400 hover:text-violet-700 dark:hover:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20'
              }`}
            >
              <FunnelIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-white/30 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Tabs — 2×2 on mobile, row on desktop ────────────────────────── */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:gap-1 sm:bg-slate-100 sm:dark:bg-slate-800 sm:p-1 sm:rounded-2xl sm:w-fit">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border-2 sm:border-0 ${
                activeTab === tab.id
                  ? `${tab.activeBg} ${tab.activeText} border-current sm:bg-white sm:dark:bg-slate-700 sm:text-slate-900 sm:dark:text-white sm:shadow-sm`
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 sm:bg-transparent sm:dark:bg-transparent hover:text-slate-700 dark:hover:text-slate-200 sm:border-0'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${tab.dot} flex-shrink-0`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Search + Filters ────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, reason, destination, roll number…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-0 focus:border-violet-500 dark:focus:border-violet-500 transition-colors font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          <AnimatePresence>
            {showFilters && (
              <Motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <FilterBar filters={filters} onChange={handleFilterChange} onReset={resetFilters} hasActive={hasActiveFilter} />
              </Motion.div>
            )}
          </AnimatePresence>

          {/* Active filter chips */}
          {hasActiveFilter && (
            <div className="flex flex-wrap gap-2">
              {filters.dateFrom && <FilterChip label={`From: ${filters.dateFrom}`} onRemove={() => handleFilterChange('dateFrom', '')} />}
              {filters.dateTo && <FilterChip label={`To: ${filters.dateTo}`} onRemove={() => handleFilterChange('dateTo', '')} />}
              {filters.block && <FilterChip label={`Block ${filters.block}`} onRemove={() => handleFilterChange('block', '')} />}
              {filters.duration && <FilterChip label={DURATION_OPTIONS.find(d => d.value === filters.duration)?.label || filters.duration} onRemove={() => handleFilterChange('duration', '')} />}
            </div>
          )}
        </div>

        {/* ── Results summary ─────────────────────────────────────────────── */}
        {!loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="font-bold text-slate-700 dark:text-slate-300">{filteredOutpasses.length}</span>
            <span>request{filteredOutpasses.length !== 1 ? 's' : ''} found</span>
            {(searchTerm || hasActiveFilter) && outpasses.length !== filteredOutpasses.length && (
              <span className="text-slate-400">· filtered from {outpasses.length} total</span>
            )}
          </div>
        )}

        {/* ── Content ─────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <LoadingCard key={i} />)}
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <EmptyState
              icon={ClockIcon}
              title="No requests found"
              description={hasActiveFilter || searchTerm ? 'Try adjusting your filters or search term' : 'No outpass requests in this category'}
            />
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([month, items]) => (
              <div key={month}>
                {/* Month header */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-wide">{month}</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full">
                    {items.length} request{items.length !== 1 ? 's' : ''}
                  </span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                </div>

                {/* Mobile: card grid */}
                <div className="sm:hidden space-y-3">
                  <AnimatePresence>
                    {items.map(op => <MobileCard key={op._id} outpass={op} onView={handleView} />)}
                  </AnimatePresence>
                </div>

                {/* Desktop: table rows */}
                <div className="hidden sm:block bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <AnimatePresence>
                    {items.map(op => <DesktopRow key={op._id} outpass={op} onView={handleView} />)}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══ View / Detail Modal ═══════════════════════════════════════════════ */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Outpass Details" size="lg">
  {selectedOutpass && (
    <div className="space-y-5">
      {/* Student banner */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-2 border-violet-200 dark:border-violet-800">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
          <span className="text-white font-black text-xl">{(selectedOutpass.studentName || 'S').charAt(0).toUpperCase()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-900 dark:text-white text-lg leading-tight">{selectedOutpass.studentName}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
            {selectedOutpass.studentRoll || selectedOutpass.student?.rollNumber || ''}
            {selectedOutpass.studentEmail ? ` · ${selectedOutpass.studentEmail}` : ''}
          </p>
          {(selectedOutpass.hostelBlock || selectedOutpass.student?.hostelBlock) && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/40 px-2.5 py-1 rounded-full mt-1.5">
              <BuildingOffice2Icon className="h-3 w-3" />
              Block {selectedOutpass.hostelBlock || selectedOutpass.student?.hostelBlock}
              {(selectedOutpass.roomNumber || selectedOutpass.student?.roomNumber) ? ` · Room ${selectedOutpass.roomNumber || selectedOutpass.student?.roomNumber}` : ''}
            </span>
          )}
        </div>
        <div className="ml-auto shrink-0"><StatusBadge status={selectedOutpass.status} /></div>
      </div>

      {/* Time + destination */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Departure', dt: selectedOutpass.departureDateTime },
          { label: 'Return',    dt: selectedOutpass.returnDateTime },
        ].map(({ label, dt }) => (
          <div key={label} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-base font-black text-slate-900 dark:text-white">{dt ? formatDate(dt, 'MMM d, yyyy') : '—'}</p>
            <p className="text-sm font-mono font-semibold text-slate-500 dark:text-slate-400">{dt ? formatDate(dt, 'HH:mm') : '—'}</p>
          </div>
        ))}
      </div>

      {/* Duration pill */}
      {selectedOutpass.durationHours !== null && selectedOutpass.durationHours !== undefined && (
        <div className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Duration: {formatDuration(selectedOutpass.durationHours)}
            {selectedOutpass.durationHours > 12 && <span className="ml-2 text-indigo-600 dark:text-indigo-400">· Overnight</span>}
          </span>
        </div>
      )}

      {/* Reason */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Reason</p>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{selectedOutpass.reason || '—'}</p>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <DetailField label="Destination" value={selectedOutpass.destination} />
        <DetailField label="Type"        value={selectedOutpass.outpassType} />
        <DetailField label="Warden"      value={selectedOutpass.wardenName || selectedOutpass.warden?.email} />
        <DetailField label="HOD"         value={selectedOutpass.hodName    || selectedOutpass.hod?.email} />
        <DetailField label="Submitted"   value={formatRelativeTime(selectedOutpass.createdAt)} />
        <DetailField label="Request ID"  value={selectedOutpass.requestId || selectedOutpass._id?.slice(-8)} />
      </div>

      {/* ── Approval chain status banners ──────────────────────────────── */}

      {/* Counsellor status banner */}
      {counsellorRequested && (
        <div className={`flex items-center gap-3 p-3 rounded-xl text-sm border-2 font-semibold ${
          counsellorApproved
            ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
            : 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700'
        }`}>
          <ShieldCheckIcon className="h-5 w-5 shrink-0" />
          {counsellorApproved ? 'Counsellor has approved' : 'Awaiting counsellor approval'}
        </div>
      )}

      {/* HOD status banner */}
      {hodRequested && (
        <div className={`flex items-center gap-3 p-3 rounded-xl text-sm border-2 font-semibold ${
          hodApproved
            ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
        }`}>
          <BuildingOffice2Icon className="h-5 w-5 shrink-0" />
          {hodApproved ? 'HOD has approved' : 'Awaiting HOD approval'}
        </div>
      )}

      {/* OTP Panel */}
      {showOtpPanel && (
        <InlineOtpPanel
          outpass={selectedOutpass}
          currentUserRole={currentUser?.role}
          onSuccess={handleOtpSuccess}
          onResend={handleResendOtp}
        />
      )}

      {/* Parent approved banner */}
      {parentApproved && (
        <div className="flex items-center gap-3 p-3 rounded-xl text-sm bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-200 dark:border-emerald-800 font-semibold">
          <ShieldCheckIcon className="h-5 w-5 shrink-0" /> Parent verified and approved
        </div>
      )}

      {/* ── Actions ────────────────────────────────────────────────────── */}
      {isPending && (
        <div className="pt-2 border-t-2 border-slate-100 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Actions</p>
          <div className="flex flex-wrap gap-2">

            {/* Approve */}
            <button
              onClick={() => setShowApproveModal(true)}
              disabled={!canApprove}
              title={!canApprove ? 'Check conditions above' : 'Approve outpass'}
              className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-emerald-500/20"
            >
              <CheckCircleIcon className="h-4 w-4" />Approve
            </button>

            {/* Reject */}
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={(hodRequested && !hodApproved) || (counsellorRequested && !counsellorApproved)}
              className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-rose-500/20"
            >
              <XCircleIcon className="h-4 w-4" />Reject
            </button>

            {/* Parent OTP — only show after counsellor approved (or counsellor not involved) */}
            {canRequestOtp && (!counsellorRequested || counsellorApproved) && (
              <button
                onClick={handleRequestParentOtp}
                disabled={requestingOtpId === selectedOutpass._id}
                className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-bold border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-violet-400 hover:text-violet-700 dark:hover:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-40 transition-all"
              >
                {requestingOtpId === selectedOutpass._id
                  ? <><ArrowPathIcon className="h-4 w-4 animate-spin" />Sending…</>
                  : <><ShieldCheckIcon className="h-4 w-4" />Parent OTP</>}
              </button>
            )}

            {/* Send to Counsellor */}
            {!counsellorRequested && (
              <button
                onClick={handleSendToCounsellor}
                className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-bold border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all"
              >
                <ShieldCheckIcon className="h-4 w-4" />Send to Counsellor
              </button>
            )}

            {/* Send to HOD */}
            {!hodRequested && (
              <button
                onClick={handleSendToHod}
                className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-bold border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all"
              >
                <BuildingOffice2Icon className="h-4 w-4" />Send to HOD
              </button>
            )}

          </div>
        </div>
      )}

      {/* Dev tools */}
      <details className="text-xs text-slate-400">
        <summary className="cursor-pointer hover:text-slate-600 dark:hover:text-slate-300">Dev tools</summary>
        <div className="flex gap-2 mt-2">
          <button className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono"
            onClick={async () => { try { await navigator.clipboard.writeText(selectedOutpass._id || ''); toast.success('ID copied') } catch { toast.error('Copy failed') } }}>
            Copy ID
          </button>
          <button className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono"
            onClick={async () => { try { const enc = btoa(JSON.stringify({ requestId: selectedOutpass._id })); await navigator.clipboard.writeText(enc); toast.success('QR payload copied') } catch { toast.error('Copy failed') } }}>
            Copy QR payload
          </button>
        </div>
      </details>

      <ModalFooter>
        <Button variant="ghost" onClick={() => setShowViewModal(false)}>Close</Button>
      </ModalFooter>
    </div>
  )}
</Modal>

      {/* ══ Approve Confirm ═══════════════════════════════════════════════════ */}
      <Modal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} title="Confirm Approval" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border-2 border-emerald-200 dark:border-emerald-800">
            <CheckCircleIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-emerald-900 dark:text-emerald-100">Approve this request?</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">The student will be notified immediately.</p>
            </div>
          </div>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowApproveModal(false)}>Cancel</Button>
            <Button variant="success" icon={CheckCircleIcon} onClick={confirmApprove}>Approve</Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ══ Reject Modal ══════════════════════════════════════════════════════ */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Request" size="md">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl border-2 border-rose-200 dark:border-rose-800">
            <XCircleIcon className="h-8 w-8 text-rose-600 dark:text-rose-400 shrink-0" />
            <div>
              <p className="font-bold text-rose-900 dark:text-rose-100">Reject this request?</p>
              <p className="text-sm text-rose-700 dark:text-rose-300">Give a clear reason so the student can re-apply.</p>
            </div>
          </div>
          <Textarea
            label="Rejection reason" placeholder="e.g. Insufficient details provided…"
            value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} required
          />
          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowRejectModal(false)}>Cancel</Button>
            <Button variant="danger" icon={XCircleIcon} onClick={confirmReject} disabled={!rejectReason.trim()}>Reject</Button>
          </ModalFooter>
        </div>
      </Modal>
    </DashboardLayout>
  )
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────
function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700">
      {label}
      <button onClick={onRemove} className="hover:text-violet-900 dark:hover:text-violet-100 transition-colors">
        <XMarkIcon className="h-3.5 w-3.5" />
      </button>
    </span>
  )
}