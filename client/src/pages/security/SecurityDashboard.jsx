/**
 * Security Dashboard — Gate Management
 * Auto-records exit on first QR scan, return on second scan (after 10-min cooldown).
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { useOutpassEvents } from '../../hooks/useSocket'
import {
  QrCodeIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightEndOnRectangleIcon,
  ArrowLeftStartOnRectangleIcon,
  CalendarDaysIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import DashboardLayout from '../../layouts/DashboardLayout'
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { LoadingCard } from '../../components/ui/Loading'
import EmptyState from '../../components/ui/EmptyState'
import { formatDateTime } from '../../utils/helpers'
import securityService from '../../services/securityService'
import outpassService from '../../services/outpassService'
import toast from 'react-hot-toast'
import { Scanner } from '@yudiel/react-qr-scanner'

// ─── helpers ────────────────────────────────────────────────────────────────

function normalizeOutpass(o) {
  if (!o) return null
  const out = { ...o }
  out._id = out._id?.$oid ?? (out._id?.toString?.() ?? out._id)
  out.departureDateTime = out.departureDateTime || out.leaveTime
  out.returnDateTime = out.returnDateTime || out.expectedReturnTime
  out.exitTime = out.exitTime || out.gateEntry?.exitTime || null
  out.returnTime = out.returnTime || out.gateEntry?.returnTime || null
  out.student = out.student || {}
  out.student.registerNumber =
    out.student.registerNumber || out.student.rollNumber || out.rollNumber || ''
  if (out.destination && typeof out.destination === 'object') {
    out.destination = out.destination.place || JSON.stringify(out.destination)
  }
  return out
}

// ─── component ──────────────────────────────────────────────────────────────

export default function SecurityDashboard() {
  const [loading, setLoading] = useState(true)
  const [activeOutpasses, setActiveOutpasses] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState({
    studentsOut: 0,
    exitsToday: 0,
    returnsToday: 0,
    overdueReturns: 0,
  })

  // Manual code input
  const [manualCode, setManualCode] = useState('')

  // Scan state — prevent duplicate scans with a cooldown ref
  const scanCooldown = useRef(false)

  // Last scan result (shown as a toast-style banner under the scanner)
  const [lastScan, setLastScan] = useState(null) // { action, name, message, isError }

  // Manual confirm modal (for the list row buttons — not for QR auto-scan)
  const [selectedOutpass, setSelectedOutpass] = useState(null)
  const [actionType, setActionType] = useState('exit')
  const [showVerifyModal, setShowVerifyModal] = useState(false)

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      const [statsRes, outpassRes] = await Promise.allSettled([
        securityService.getDashboardStats(),
        securityService.getActiveOutpasses(),
      ])

      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value?.data?.data || statsRes.value?.data || {}
        setStats({
          studentsOut: d.studentsOut ?? 0,
          exitsToday: d.exitsToday ?? 0,
          returnsToday: d.returnsToday ?? 0,
          overdueReturns: d.overdueReturns ?? 0,
        })
      }

      if (outpassRes.status === 'fulfilled') {
        const raw = outpassRes.value?.data?.data?.outpasses || outpassRes.value?.data?.outpasses || []
        setActiveOutpasses(raw.map(normalizeOutpass))
      }
    } catch (err) {
      console.error('fetchData error', err)
      toast.error('Failed to load security data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useOutpassEvents({
  onExit:   () => fetchData(),
  onReturn: () => fetchData(),
  onDashboardRefresh: () => fetchData(),
})

  // ── auto-scan handler ──────────────────────────────────────────────────────
  /**
   * Called by the QR Scanner component or the manual input button.
   * Calls POST /api/v1/security/scan which auto-decides exit vs return.
   */
  const handleScan = useCallback(async (code) => {
    if (!code || scanCooldown.current) return
    scanCooldown.current = true

    try {
      const resp = await securityService.scanOutpass(code)
      const { action, outpass, message } = resp?.data?.data || resp?.data || {}
      const name = outpass?.student
        ? `${outpass.student.firstName} ${outpass.student.lastName}`
        : 'Student'

      if (action === 'exit') {
        toast.success(`✅ EXIT recorded — ${name}`, { duration: 4000 })
        setLastScan({ action, name, message: `Exit at ${new Date().toLocaleTimeString()}`, isError: false })
      } else if (action === 'return') {
        toast.success(`🏠 RETURN recorded — ${name}`, { duration: 4000 })
        setLastScan({ action, name, message: `Returned at ${new Date().toLocaleTimeString()}`, isError: false })
      } else if (action === 'too_soon') {
        const rem = resp?.data?.data?.remainingMinutes ?? '?'
        toast.error(`⏳ Too soon — return allowed in ${rem} min`, { duration: 5000 })
        setLastScan({ action, name, message: `Return blocked — ${rem} min remaining`, isError: true })
      } else if (action === 'already_completed') {
        toast(`ℹ️ Outpass already completed for ${name}`, { duration: 3000 })
        setLastScan({ action, name, message: 'Already completed', isError: false })
      }

      fetchData()
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Scan failed'
      toast.error(msg, { duration: 4000 })
      setLastScan({ action: 'error', name: '', message: msg, isError: true })
    } finally {
      // Allow next scan after 3 seconds
      setTimeout(() => { scanCooldown.current = false }, 3000)
    }
  }, [fetchData])

  const handleQRScan = useCallback((result) => {
    if (!result) return
    const text = Array.isArray(result)
      ? result[0]?.rawValue || result[0]?.text || ''
      : result.rawValue || result.text || String(result)
    if (text) handleScan(text)
  }, [handleScan])

  // ── manual row actions (still uses confirm modal) ──────────────────────────
  const handleRowAction = (outpass, type) => {
    setSelectedOutpass(outpass)
    setActionType(type)
    setShowVerifyModal(true)
  }

  const handleConfirmAction = async () => {
    try {
      if (actionType === 'exit') {
        await outpassService.recordExit(selectedOutpass._id)
        toast.success(`Exit recorded — ${selectedOutpass.student.firstName}`)
      } else {
        await outpassService.recordReturn(selectedOutpass._id)
        toast.success(`Return recorded — ${selectedOutpass.student.firstName}`)
      }
      setShowVerifyModal(false)
      setSelectedOutpass(null)
      fetchData()
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || `Failed to record ${actionType}`)
    }
  }

  // ── filter ─────────────────────────────────────────────────────────────────
  const filtered = activeOutpasses.filter(o => {
    const s = o.student || {}
    const q = searchQuery.toLowerCase()
    return (
      (s.firstName || '').toLowerCase().includes(q) ||
      (s.lastName || '').toLowerCase().includes(q) ||
      (s.registerNumber || '').toLowerCase().includes(q)
    )
  })

  // ── stat cards ─────────────────────────────────────────────────────────────
  const statCards = [
    { title: 'Students Out Now', value: stats.studentsOut, icon: UserGroupIcon, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { title: 'Exited Today', value: stats.exitsToday, icon: ArrowRightEndOnRectangleIcon, gradient: 'from-orange-500 to-red-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { title: 'Returned Today', value: stats.returnsToday, icon: ArrowLeftStartOnRectangleIcon, gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    { title: 'Overdue Returns', value: stats.overdueReturns, icon: ExclamationTriangleIcon, gradient: 'from-red-500 to-pink-500', bg: 'bg-red-50 dark:bg-red-900/20' },
  ]

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

        {/* Header */}
        <Motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 p-8 shadow-2xl"
        >
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-float" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          </div>
          <div className="relative flex items-center gap-4">
            <SparklesIcon className="h-12 w-12 text-white animate-pulse" />
            <div>
              <h1 className="text-3xl font-display font-bold text-white">Security Dashboard</h1>
              <p className="mt-1 text-lg text-white/90">
                Gate management — scan QR to auto-record exit / return 🛡️
              </p>
            </div>
          </div>
        </Motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((s, i) => (
            <Motion.div key={s.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card glassmorphic hover className="h-full">
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">{s.title}</p>
                      <h3 className={`text-3xl font-bold bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent`}>{s.value}</h3>
                    </div>
                    <Motion.div className={`p-3 rounded-xl ${s.bg}`} whileHover={{ scale: 1.1, rotate: 360 }} transition={{ duration: 0.5 }}>
                      <s.icon className="h-6 w-6" />
                    </Motion.div>
                  </div>
                </CardContent>
              </Card>
            </Motion.div>
          ))}
        </div>

        {/* QR Scanner */}
        <Motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card glassmorphic gradient>
            <CardHeader>
              <CardTitle gradient icon={QrCodeIcon}>QR Scanner — Auto Exit / Return</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Left: manual input */}
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-sm text-orange-900 dark:text-orange-100 space-y-1">
                    <p className="font-semibold">How it works:</p>
                    <p>🔴 <strong>1st scan</strong> → Exit recorded automatically</p>
                    <p>🟢 <strong>2nd scan</strong> (after 10 min) → Return recorded automatically</p>
                    <p>⏳ Scanning within 10 min shows a cooldown message</p>
                  </div>

                  <Input
                    placeholder="Paste outpass ID or QR code text..."
                    icon={QrCodeIcon}
                    glassmorphic
                    value={manualCode}
                    onChange={e => setManualCode(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && manualCode.trim()) { handleScan(manualCode.trim()); setManualCode('') } }}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => { if (manualCode.trim()) { handleScan(manualCode.trim()); setManualCode('') } }}
                  >
                    <ShieldCheckIcon className="h-4 w-4 mr-2" />
                    Scan Manual Code
                  </Button>

                  {/* Last scan result banner */}
                  <AnimatePresence>
                    {lastScan && (
                      <Motion.div
                        key={lastScan.message}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`p-3 rounded-xl flex items-start gap-3 text-sm ${
                          lastScan.isError
                            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-100'
                            : lastScan.action === 'exit'
                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-900 dark:text-green-100'
                            : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100'
                        }`}
                      >
                        {lastScan.isError
                          ? <XCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                          : <CheckCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />}
                        <div>
                          <p className="font-semibold">{lastScan.name || 'Last scan'}</p>
                          <p>{lastScan.message}</p>
                        </div>
                      </Motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Right: camera scanner */}
                <div className="p-2 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl border-2 border-dashed border-orange-300 dark:border-orange-700">
                  <p className="text-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Point camera at student QR code
                  </p>
                  <div className="rounded-xl overflow-hidden">
                    <Scanner
                      onScan={handleQRScan}
                      onError={err => console.error('QR scanner error:', err)}
                      components={{ finder: true, torch: true, onOff: true, zoom: true }}
                      scanDelay={300}
                    />
                  </div>
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Works with phone camera or external QR scanner
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Motion.div>

        {/* Active Outpasses list */}
        <Motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card glassmorphic gradient>
            <CardHeader>
              <CardTitle gradient icon={ShieldCheckIcon}>
                Approved Outpasses ({filtered.length})
              </CardTitle>
              <div className="mt-4">
                <Input
                  placeholder="Search by name or register number..."
                  icon={MagnifyingGlassIcon}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  glassmorphic
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">{[1, 2, 3].map(i => <LoadingCard key={i} />)}</div>
              ) : filtered.length === 0 ? (
                <EmptyState icon={ShieldCheckIcon} title="No approved outpasses" description="All students are currently in the hostel" />
              ) : (
                <div className="space-y-3">
                  {filtered.map((outpass, idx) => {
                    const isOut = !!outpass.exitTime
                    const isCompleted = !!outpass.returnTime
                    const isOverdue =
                      isOut && !isCompleted &&
                      outpass.returnDateTime &&
                      new Date(outpass.returnDateTime) < new Date()

                    return (
                      <Motion.div
                        key={outpass._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        whileHover={{ x: 4 }}
                        className={`p-4 rounded-xl border transition-all duration-200 ${
                          isOverdue
                            ? 'bg-red-50/50 dark:bg-red-900/10 border-red-300 dark:border-red-700'
                            : isCompleted
                            ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                            : 'bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow">
                                <span className="text-lg font-bold text-white">
                                  {(outpass.student.firstName || '?').charAt(0)}
                                </span>
                              </div>
                              {isOut && !isCompleted && (
                                <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${isOverdue ? 'bg-red-500' : 'bg-orange-400'}`} />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-semibold text-slate-900 dark:text-white truncate">
                                  {outpass.student.firstName} {outpass.student.lastName}
                                </span>
                                <Badge variant="default">{outpass.student.registerNumber}</Badge>
                                {outpass.student.hostelBlock && <Badge variant="default">Block {outpass.student.hostelBlock}</Badge>}
                                {isOverdue && <Badge variant="danger">Overdue</Badge>}
                                {isCompleted && <Badge variant="success">Completed</Badge>}
                                {isOut && !isCompleted && !isOverdue && <Badge variant="warning">Out</Badge>}
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{outpass.reason}</p>
                              <div className="flex gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <ArrowRightEndOnRectangleIcon className="h-3 w-3" />
                                  Leave: {formatDateTime(outpass.departureDateTime)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <ArrowLeftStartOnRectangleIcon className="h-3 w-3" />
                                  Return: {formatDateTime(outpass.returnDateTime)}
                                </span>
                                {outpass.exitTime && (
                                  <span className="flex items-center gap-1 text-orange-600">
                                    <ClockIcon className="h-3 w-3" />
                                    Exited: {formatDateTime(outpass.exitTime)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isCompleted ? (
                              <Badge variant="success" className="flex items-center gap-1">
                                <CheckCircleIcon className="h-3.5 w-3.5" /> Done
                              </Badge>
                            ) : !isOut ? (
                              <Button
                                variant="success"
                                icon={ArrowRightEndOnRectangleIcon}
                                onClick={() => handleRowAction(outpass, 'exit')}
                                size="sm"
                              >
                                Mark Exit
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                icon={ArrowLeftStartOnRectangleIcon}
                                onClick={() => handleRowAction(outpass, 'return')}
                                size="sm"
                              >
                                Mark Return
                              </Button>
                            )}
                          </div>
                        </div>
                      </Motion.div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </Motion.div>

        {/* Manual row confirm modal */}
        <Modal
          isOpen={showVerifyModal}
          onClose={() => setShowVerifyModal(false)}
          title={`Confirm ${actionType === 'exit' ? 'Exit' : 'Return'}`}
          gradient
        >
          {selectedOutpass && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <span className="text-lg font-bold text-white">
                      {selectedOutpass.student.firstName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {selectedOutpass.student.firstName} {selectedOutpass.student.lastName}
                    </p>
                    <p className="text-sm text-slate-500">{selectedOutpass.student.registerNumber}</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Destination:</span>
                    <span className="font-medium">{selectedOutpass.destination || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Expected return:</span>
                    <span className="font-medium">{formatDateTime(selectedOutpass.returnDateTime)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-sm text-orange-900 dark:text-orange-100">
                <ShieldCheckIcon className="h-5 w-5 flex-shrink-0" />
                <p>
                  Confirm student is {actionType === 'exit' ? 'leaving' : 'entering'} the hostel premises.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="ghost" onClick={() => setShowVerifyModal(false)} className="flex-1">Cancel</Button>
                <Button
                  variant={actionType === 'exit' ? 'success' : 'primary'}
                  icon={actionType === 'exit' ? ArrowRightEndOnRectangleIcon : ArrowLeftStartOnRectangleIcon}
                  onClick={handleConfirmAction}
                  className="flex-1"
                >
                  Confirm {actionType === 'exit' ? 'Exit' : 'Return'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </Motion.div>
    </DashboardLayout>
  )
}