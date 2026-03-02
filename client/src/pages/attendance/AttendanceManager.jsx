/**
 * Attendance Manager v2
 * 6 tabs: Currently Out | Exited Today | Returned Today | Overdue | Currently In | Expected at Gate
 * - Block filter + date filter per tab
 * - Student detail modal (admin/warden/hod only, hidden for security)
 * - Auto-refresh every 60s
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { useSelector } from 'react-redux'
import {
  ArrowRightEndOnRectangleIcon,
  ArrowLeftStartOnRectangleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  MapPinIcon,
  PhoneIcon,
  HomeModernIcon,
  XMarkIcon,
  BuildingOffice2Icon,
  AcademicCapIcon,
  IdentificationIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import DashboardLayout from '../../layouts/DashboardLayout'
import securityService from '../../services/securityService'
import { selectUser } from '../../store/authSlice'
import toast from 'react-hot-toast'

// ─── constants ────────────────────────────────────────────────────────────────

const HOSTEL_BLOCKS = ['A', 'B', 'C', 'D', 'E']

const TABS = [
  { id: 'out',      label: 'Currently Out',    icon: ArrowRightEndOnRectangleIcon, gradFrom: '#2563eb', gradTo: '#0891b2', statKey: 'studentsOut',    desc: 'Exited, not yet returned' },
  { id: 'exited',   label: 'Exited Today',      icon: CalendarDaysIcon,             gradFrom: '#d97706', gradTo: '#f97316', statKey: 'exitsToday',     desc: 'All exits recorded today' },
  { id: 'returned', label: 'Returned Today',    icon: ArrowLeftStartOnRectangleIcon,gradFrom: '#16a34a', gradTo: '#059669', statKey: 'returnsToday',   desc: 'Returned to hostel today' },
  { id: 'overdue',  label: 'Overdue',           icon: ExclamationTriangleIcon,      gradFrom: '#dc2626', gradTo: '#e11d48', statKey: 'overdueReturns', desc: 'Past expected return time' },
  { id: 'in',       label: 'Currently In',      icon: HomeModernIcon,               gradFrom: '#7c3aed', gradTo: '#6d28d9', statKey: 'currentlyIn',   desc: 'Present inside hostel' },
  { id: 'expected', label: 'Expected at Gate',  icon: ClockIcon,                    gradFrom: '#0891b2', gradTo: '#0e7490', statKey: 'pendingExits',   desc: 'Approved, exit not recorded' },
]

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  return isNaN(d) ? '—' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
}

function fmtTime(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  return isNaN(d) ? '—' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function overdueLabel(mins) {
  if (!mins) return 'Overdue'
  if (mins < 60) return `${mins}m overdue`
  const h = Math.floor(mins / 60), m = mins % 60
  return m ? `${h}h ${m}m overdue` : `${h}h overdue`
}

function getStudentName(item) {
  const s = item.student || item
  return s.firstName ? `${s.firstName} ${s.lastName || ''}`.trim() : 'Unknown'
}

function getRoll(item) {
  const s = item.student || item
  return s.rollNumber || s.registerNumber || item.rollNumber || ''
}

function getBlock(item) {
  const s = item.student || item
  return s.hostelBlock || item.hostelBlock || ''
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, from = '#7c3aed', to = '#6d28d9' }) {
  return (
    <div
      className="h-11 w-11 rounded-2xl flex items-center justify-center shadow-md shrink-0 font-black text-white text-base"
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({ label, color = 'slate' }) {
  const map = {
    red:    'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    amber:  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    blue:   'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    green:  'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    violet: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
    cyan:   'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300',
    slate:  'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  }
  return (
    <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${map[color] || map.slate}`}>
      {label}
    </span>
  )
}

// ─── Filters Bar ──────────────────────────────────────────────────────────────

function FiltersBar({ block, date, onBlock, onDate, showDate = true }) {
  const cls = 'h-9 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 px-3 focus:outline-none focus:border-teal-500 transition-colors'
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative">
        <select value={block} onChange={e => onBlock(e.target.value)} className={`${cls} pr-8 appearance-none cursor-pointer`}>
          <option value="">All Blocks</option>
          {HOSTEL_BLOCKS.map(b => <option key={b} value={b}>Block {b}</option>)}
        </select>
        <ChevronDownIcon className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
      </div>
      {showDate && (
        <input type="date" value={date} onChange={e => onDate(e.target.value)} className={cls} />
      )}
      {(block || date) && (
        <button onClick={() => { onBlock(''); onDate('') }} className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors">
          <XMarkIcon className="h-3.5 w-3.5" />Clear
        </button>
      )}
    </div>
  )
}

// ─── Student Detail Modal (admin/warden/hod only) ─────────────────────────────

function StudentModal({ item, onClose }) {
  if (!item) return null
  const isStudentDoc = !item.gateEntry && !item.leaveTime
  const student = isStudentDoc ? item : (item.student || {})
  const outpass = isStudentDoc ? null : item
  const name = getStudentName(item)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <Motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Gradient header */}
        <div className="px-6 pt-6 pb-5" style={{ background: 'linear-gradient(135deg, #0d9488, #6366f1)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-white/70 uppercase tracking-widest">Student Details</p>
            <button onClick={onClose} className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
              <XMarkIcon className="h-4 w-4 text-white" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-black text-white">
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xl font-black text-white">{name}</p>
              <p className="text-sm text-white/70 font-mono">{getRoll(item)}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Student info */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: HomeModernIcon,    label: 'Block',      value: student.hostelBlock ? `Block ${student.hostelBlock}` : '—' },
              { icon: BuildingOffice2Icon, label: 'Room',     value: student.roomNumber || '—' },
              { icon: PhoneIcon,         label: 'Phone',      value: student.phoneNumber || student.phone || '—' },
              { icon: AcademicCapIcon,   label: 'Department', value: student.department || '—' },
              { icon: IdentificationIcon,label: 'Year',       value: student.yearOfStudy ? `Year ${student.yearOfStudy}` : '—' },
              { icon: IdentificationIcon,label: 'Email',      value: student.email || '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="h-3.5 w-3.5 text-slate-400" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</p>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Outpass details */}
          {outpass && (
            <div className="rounded-2xl border-2 border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 p-4 space-y-3">
              <p className="text-xs font-bold text-teal-700 dark:text-teal-300 uppercase tracking-widest">Outpass Details</p>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Reason',          value: outpass.reason },
                  { label: 'Destination',     value: typeof outpass.destination === 'object' ? outpass.destination?.place : outpass.destination },
                  { label: 'Planned Leave',   value: fmt(outpass.leaveTime || outpass.departureDateTime) },
                  { label: 'Expected Return', value: fmt(outpass.expectedReturnTime || outpass.returnDateTime) },
                  { label: 'Exit Time',       value: fmtTime(outpass.gateEntry?.exitTime || outpass.exitTime) },
                  { label: 'Return Time',     value: fmtTime(outpass.gateEntry?.returnTime || outpass.returnTime) },
                  { label: 'Status',          value: outpass.status },
                ].filter(r => r.value && r.value !== '—').map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-slate-500 shrink-0">{label}</span>
                    <span className="font-semibold text-slate-900 dark:text-white text-right capitalize">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Motion.div>
    </div>
  )
}

// ─── Student Card ─────────────────────────────────────────────────────────────

function StudentCard({ item, badge, badgeColor, extraInfo, onClick }) {
  const name = getStudentName(item)
  const roll = getRoll(item)
  const block = getBlock(item)
  const s = item.student || item
  const gradMap = {
    red: ['#dc2626','#e11d48'], amber: ['#d97706','#f97316'], blue: ['#2563eb','#0891b2'],
    green: ['#16a34a','#059669'], violet: ['#7c3aed','#6d28d9'], cyan: ['#0891b2','#0e7490'],
  }
  const [from, to] = gradMap[badgeColor] || gradMap.violet

  return (
    <Motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      onClick={onClick}
      className={`flex items-start gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-200 ${onClick ? 'cursor-pointer hover:border-teal-400 dark:hover:border-teal-600 hover:shadow-md' : ''}`}
    >
      <Avatar name={name} from={from} to={to} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{name}</p>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              {roll && <span className="text-xs text-slate-500 font-mono">{roll}</span>}
              {block && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400">
                  <HomeModernIcon className="h-3 w-3" />Block {block}
                </span>
              )}
              {(s.phoneNumber || s.phone) && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                  <PhoneIcon className="h-3 w-3" />{s.phoneNumber || s.phone}
                </span>
              )}
            </div>
          </div>
          <Badge label={badge} color={badgeColor} />
        </div>
        {extraInfo && <div className="mt-2 flex flex-wrap gap-3 text-xs">{extraInfo}</div>}
      </div>
    </Motion.div>
  )
}

// ─── Tab Panel ────────────────────────────────────────────────────────────────

function TabPanel({ list, loading, emptyIcon: Icon, emptyTitle, emptyDesc, renderCard, search, onSearch, block, onBlock, date, onDate, showDate = true }) {
  const filtered = list.filter(item => {
    const s = item.student || item
    const q = (search || '').toLowerCase()
    if (q) {
      const fields = [s.firstName, s.lastName, s.rollNumber, item.reason].map(v => (v || '').toLowerCase())
      if (!fields.some(f => f.includes(q))) return false
    }
    if (block) {
      if ((getBlock(item) || '').toUpperCase() !== block.toUpperCase()) return false
    }
    if (date) {
      const dayStart = new Date(date + 'T00:00:00')
      const dayEnd   = new Date(date + 'T23:59:59')
      const ref = item.gateEntry?.exitTime || item.exitTime || item.actualExitTime ||
                  item.gateEntry?.returnTime || item.returnTime || item.actualReturnTime ||
                  item.leaveTime || item.departureDateTime || item.createdAt
      if (!ref || new Date(ref) < dayStart || new Date(ref) > dayEnd) return false
    }
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text" placeholder="Search by name or roll number…" value={search}
            onChange={e => onSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>
        <FiltersBar block={block} date={date} onBlock={onBlock} onDate={onDate} showDate={showDate} />
      </div>
      {!loading && (
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {filtered.length} {filtered.length === 1 ? 'student' : 'students'}
          {(search || block || date) && list.length !== filtered.length ? ` of ${list.length} total` : ''}
        </p>
      )}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Icon className="h-8 w-8 text-slate-400" />
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{emptyTitle}</p>
            <p className="text-xs text-slate-400 mt-1">{emptyDesc}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>{filtered.map((item, i) => <div key={item._id || i}>{renderCard(item)}</div>)}</AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function AttendanceManager() {
  const user = useSelector(selectUser)
  const canViewModal = ['admin', 'warden', 'hod'].includes(user?.role)

  const [activeTab, setActiveTab] = useState('out')
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalItem, setModalItem] = useState(null)

  const [searches, setSearches] = useState({ out:'', exited:'', returned:'', overdue:'', in:'', expected:'' })
  const [blocks,   setBlocks]   = useState({ out:'', exited:'', returned:'', overdue:'', in:'', expected:'' })
  const [dates,    setDates]    = useState({ out:'', exited:'', returned:'', overdue:'', in:'', expected:'' })

  const setSearch = (tab, v) => setSearches(s => ({ ...s, [tab]: v }))
  const setBlock  = (tab, v) => setBlocks(s => ({ ...s, [tab]: v }))
  const setDate   = (tab, v) => setDates(s => ({ ...s, [tab]: v }))

  const [data, setData] = useState({
    out:[], exited:[], returned:[], overdue:[], in:[], expected:[],
    stats:{ studentsOut:0, exitsToday:0, returnsToday:0, overdueReturns:0, currentlyIn:0, pendingExits:0 },
  })

  const intervalRef = useRef(null)

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [statsRes, outRes, exitedRes, returnedRes, overdueRes, inRes, activeRes] = await Promise.allSettled([
        securityService.getDashboardStats(),
        securityService.getStudentsOut({ limit: 300 }),
        securityService.getExitedToday({ limit: 300 }),
        securityService.getReturnedLogs({ limit: 300 }),
        securityService.getOverdueReturns({ limit: 300 }),
        securityService.getCurrentlyIn({ limit: 300 }),
        securityService.getActiveOutpasses({ limit: 300 }),
      ])

      let stats = { studentsOut:0, exitsToday:0, returnsToday:0, overdueReturns:0, currentlyIn:0, pendingExits:0 }
      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value?.data?.data || statsRes.value?.data || {}
        stats.studentsOut    = d.studentsOut    ?? 0
        stats.exitsToday     = d.exitsToday     ?? 0
        stats.returnsToday   = d.returnsToday   ?? 0
        stats.overdueReturns = d.overdueReturns ?? 0
        stats.pendingExits   = d.pendingExits   ?? 0
      }

      const pick = (res, k1, k2) => {
        if (res.status !== 'fulfilled') return []
        const d = res.value?.data?.data || res.value?.data || {}
        const arr = d[k1] || d[k2] || []
        return Array.isArray(arr) ? arr : []
      }

      const out       = pick(outRes,     'outpasses', 'outpasses')
      const exited    = pick(exitedRes,  'outpasses', 'outpasses')
      const returned  = pick(returnedRes,'logs',      'outpasses')
      const overdue   = pick(overdueRes, 'outpasses', 'outpasses')
      const inStudents = pick(inRes,     'students',  'students')
      const allActive = pick(activeRes,  'outpasses', 'outpasses')
      const expected  = allActive.filter(o => !o.gateEntry?.exitTime && !o.exitTime)

      stats.currentlyIn = inStudents.length

      setData({ out, exited, returned, overdue, in: inStudents, expected, stats })
    } catch (err) {
      console.error('AttendanceManager fetch error', err)
      if (!silent) toast.error('Failed to load attendance data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    intervalRef.current = setInterval(() => fetchAll(true), 60_000)
    return () => clearInterval(intervalRef.current)
  }, [fetchAll])

  const now = new Date()

  const tabsWithCounts = TABS.map(tab => ({
    ...tab,
    count: { out: data.out, exited: data.exited, returned: data.returned, overdue: data.overdue, in: data.in, expected: data.expected }[tab.id]?.length ?? data.stats[tab.statKey] ?? 0,
  }))

  return (
    <DashboardLayout>
      <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-10">

        {/* Header */}
        <Motion.div
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl p-7 shadow-xl"
          style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 50%, #6366f1 100%)' }}
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl" />
          </div>
          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <ClipboardDocumentListIcon className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Attendance Manager</h1>
                <p className="text-sm text-white/80 mt-0.5">Live hostel gate tracking — auto-refreshes every minute</p>
              </div>
            </div>
            <button
              onClick={() => { fetchAll(true); toast('Refreshed', { icon: '🔄', duration: 1500 }) }}
              disabled={refreshing}
              className="flex items-center gap-2 h-9 px-4 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh
            </button>
          </div>
        </Motion.div>

        {/* 6 Tab Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {tabsWithCounts.map((tab, i) => {
            const isActive = activeTab === tab.id
            return (
              <Motion.button
                key={tab.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-start gap-1.5 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                  isActive ? 'border-transparent shadow-xl' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md'
                }`}
                style={isActive ? { background: `linear-gradient(135deg, ${tab.gradFrom}, ${tab.gradTo})` } : {}}
              >
                <div className="flex items-center justify-between w-full">
                  <tab.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className={`text-xl font-black ${isActive ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>{tab.count}</span>
                </div>
                <p className={`text-xs font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>{tab.label}</p>
                <p className={`text-xs leading-tight hidden sm:block ${isActive ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>{tab.desc}</p>
              </Motion.button>
            )
          })}
        </div>

        {/* Content Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-5 shadow-sm min-h-96">
          <AnimatePresence mode="wait">
            <Motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>

              {/* Currently Out */}
              {activeTab === 'out' && (
                <TabPanel list={data.out} loading={loading} search={searches.out} onSearch={v => setSearch('out',v)} block={blocks.out} onBlock={v => setBlock('out',v)} date={dates.out} onDate={v => setDate('out',v)}
                  emptyIcon={UserGroupIcon} emptyTitle="No students currently out" emptyDesc="All students are in the hostel"
                  renderCard={o => {
                    const exitTime = o.exitTime || o.gateEntry?.exitTime
                    const expected = o.returnDateTime || o.expectedReturnTime
                    const isLate = expected && new Date(expected) < now
                    return <StudentCard item={o} badge={isLate ? 'Late' : 'Out'} badgeColor={isLate ? 'red' : 'blue'} onClick={() => canViewModal && setModalItem(o)}
                      extraInfo={<>
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold"><ArrowRightEndOnRectangleIcon className="h-3.5 w-3.5" />Exited {fmtTime(exitTime)}</span>
                        <span className="flex items-center gap-1 text-slate-500"><ClockIcon className="h-3.5 w-3.5" />Due back {fmt(expected)}</span>
                      </>} />
                  }} />
              )}

              {/* Exited Today */}
              {activeTab === 'exited' && (
                <TabPanel list={data.exited} loading={loading} search={searches.exited} onSearch={v => setSearch('exited',v)} block={blocks.exited} onBlock={v => setBlock('exited',v)} date={dates.exited} onDate={v => setDate('exited',v)}
                  emptyIcon={CalendarDaysIcon} emptyTitle="No exits recorded today" emptyDesc="No student has exited yet today"
                  renderCard={o => {
                    const exitTime = o.exitTime || o.gateEntry?.exitTime
                    const returnTime = o.returnTime || o.gateEntry?.returnTime
                    return <StudentCard item={o} badge={returnTime ? 'Returned' : 'Still Out'} badgeColor={returnTime ? 'green' : 'amber'} onClick={() => canViewModal && setModalItem(o)}
                      extraInfo={<>
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold"><ArrowRightEndOnRectangleIcon className="h-3.5 w-3.5" />Exit {fmtTime(exitTime)}</span>
                        {returnTime && <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold"><ArrowLeftStartOnRectangleIcon className="h-3.5 w-3.5" />Return {fmtTime(returnTime)}</span>}
                      </>} />
                  }} />
              )}

              {/* Returned Today */}
              {activeTab === 'returned' && (
                <TabPanel list={data.returned} loading={loading} search={searches.returned} onSearch={v => setSearch('returned',v)} block={blocks.returned} onBlock={v => setBlock('returned',v)} date={dates.returned} onDate={v => setDate('returned',v)}
                  emptyIcon={ArrowLeftStartOnRectangleIcon} emptyTitle="No returns today" emptyDesc="No students have returned yet today"
                  renderCard={o => {
                    const returnTime = o.actualReturnTime || o.returnTime || o.gateEntry?.returnTime
                    const isLate = o.isLate || o.lateReturn || o.isLateReturn
                    return <StudentCard item={o} badge={isLate ? 'Late Return' : 'Returned'} badgeColor={isLate ? 'amber' : 'green'} onClick={() => canViewModal && setModalItem(o)}
                      extraInfo={<>
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold"><ArrowLeftStartOnRectangleIcon className="h-3.5 w-3.5" />Returned {fmtTime(returnTime)}</span>
                        {isLate && o.lateReturnMinutes && <span className="text-amber-600 font-semibold">{o.lateReturnMinutes}m late</span>}
                      </>} />
                  }} />
              )}

              {/* Overdue */}
              {activeTab === 'overdue' && (
                <TabPanel list={data.overdue} loading={loading} search={searches.overdue} onSearch={v => setSearch('overdue',v)} block={blocks.overdue} onBlock={v => setBlock('overdue',v)} date={dates.overdue} onDate={v => setDate('overdue',v)}
                  emptyIcon={CheckCircleIcon} emptyTitle="No overdue students" emptyDesc="All students returned on time"
                  renderCard={o => {
                    const mins = o.overdueMinutes ?? (o.expectedReturnTime ? Math.floor((now - new Date(o.expectedReturnTime)) / 60000) : 0)
                    return <StudentCard item={o} badge={overdueLabel(mins)} badgeColor="red" onClick={() => canViewModal && setModalItem(o)}
                      extraInfo={<>
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold"><ExclamationTriangleIcon className="h-3.5 w-3.5" />{overdueLabel(mins)}</span>
                        <span className="flex items-center gap-1 text-slate-500"><ClockIcon className="h-3.5 w-3.5" />Was due {fmt(o.expectedReturnTime || o.returnDateTime)}</span>
                      </>} />
                  }} />
              )}

              {/* Currently In */}
              {activeTab === 'in' && (
                <TabPanel list={data.in} loading={loading} search={searches.in} onSearch={v => setSearch('in',v)} block={blocks.in} onBlock={v => setBlock('in',v)} date={dates.in} onDate={v => setDate('in',v)} showDate={false}
                  emptyIcon={HomeModernIcon} emptyTitle="No students found" emptyDesc="No active students in the hostel"
                  renderCard={student => (
                    <StudentCard item={student} badge="In Hostel" badgeColor="violet" onClick={() => canViewModal && setModalItem(student)}
                      extraInfo={<>
                        {student.roomNumber && <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400 font-semibold"><BuildingOffice2Icon className="h-3.5 w-3.5" />Room {student.roomNumber}</span>}
                        {student.department && <span className="flex items-center gap-1 text-slate-500"><AcademicCapIcon className="h-3.5 w-3.5" />{student.department}</span>}
                      </>} />
                  )} />
              )}

              {/* Expected at Gate */}
              {activeTab === 'expected' && (
                <TabPanel list={data.expected} loading={loading} search={searches.expected} onSearch={v => setSearch('expected',v)} block={blocks.expected} onBlock={v => setBlock('expected',v)} date={dates.expected} onDate={v => setDate('expected',v)}
                  emptyIcon={ClockIcon} emptyTitle="No students expected at gate" emptyDesc="No approved outpasses pending exit"
                  renderCard={o => {
                    const leaveTime = o.leaveTime || o.departureDateTime
                    const isPast = leaveTime && new Date(leaveTime) < now
                    return <StudentCard item={o} badge={isPast ? 'Delayed Exit' : 'Expected'} badgeColor={isPast ? 'red' : 'cyan'} onClick={() => canViewModal && setModalItem(o)}
                      extraInfo={<>
                        <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-semibold"><CalendarDaysIcon className="h-3.5 w-3.5" />Planned {fmt(leaveTime)}</span>
                        <span className="flex items-center gap-1 text-slate-500">Return by {fmt(o.returnDateTime || o.expectedReturnTime)}</span>
                        {o.destination && <span className="flex items-center gap-1 text-slate-500"><MapPinIcon className="h-3.5 w-3.5" />{typeof o.destination === 'object' ? o.destination.place : o.destination}</span>}
                      </>} />
                  }} />
              )}

            </Motion.div>
          </AnimatePresence>
        </div>

      </Motion.div>

      {/* Modal */}
      <AnimatePresence>
        {modalItem && canViewModal && (
          <StudentModal item={modalItem} onClose={() => setModalItem(null)} />
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}