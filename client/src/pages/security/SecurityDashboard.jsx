/**
 * Security Dashboard - Ultra Modern Gate Management
 * Real-time outpass verification and gate management interface
 */

import { useState, useEffect, useCallback } from 'react'
import { motion as Motion } from 'framer-motion'
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
  ExclamationTriangleIcon
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
import toast from 'react-hot-toast'
import { Scanner } from '@yudiel/react-qr-scanner'

export default function SecurityDashboard() {
  const [loading, setLoading] = useState(true)
  const [activeOutpasses, setActiveOutpasses] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState({
    activeOutpasses: 0,
    exitedToday: 0,
    returnedToday: 0,
    overdueOutpasses: 0
  })
  const [selectedOutpass, setSelectedOutpass] = useState(null)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [actionType, setActionType] = useState('exit') // 'exit' or 'return'
  const [manualCode, setManualCode] = useState('')
  // QR scanning state is managed by the component; no explicit local state needed

  const fetchSecurityData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch active outpasses
      const response = await securityService.getActiveOutpasses()
      const outpasses = response?.data?.data || response?.data?.outpasses || []
      // Ensure minimal normalization so the UI won't crash if server shape varies
      const safeOutpasses = (outpasses || []).map(orig => {
        const o = { ...orig }
        try {
          if (o._id && o._id.$oid) o._id = o._id.$oid
          else if (o._id && o._id.toString) o._id = o._id.toString()
        } catch (err) { console.debug('safeOutpasses id conversion failed', err) }
        o.student = o.student || {}
        o.student.firstName = o.student.firstName || o.student.firstname || ''
        o.student.lastName = o.student.lastName || o.student.lastname || ''
        o.student.registerNumber = o.student.registerNumber || o.student.rollNumber || o.studentId || o.rollNumber || ''
        o.student.hostelBlock = o.student.hostelBlock || o.student.hostel_block || ''
        if (o.destination && typeof o.destination === 'object') o.destination = o.destination.place || JSON.stringify(o.destination)
        o.departureDateTime = o.departureDateTime || o.leaveTime || null
        o.returnDateTime = o.returnDateTime || o.expectedReturnTime || null
        o.exitTime = o.exitTime || (o.gateEntry && o.gateEntry.exitTime) || null
        o.returnTime = o.returnTime || (o.gateEntry && o.gateEntry.returnTime) || null
        return o
      })
      
      // Calculate stats from the data
      const now = new Date()
      const todayStart = new Date(now.setHours(0, 0, 0, 0))
      
      const exitedToday = outpasses.filter(o => 
        o.exitTime && new Date(o.exitTime) >= todayStart
      ).length
      
      const returnedToday = outpasses.filter(o => 
        o.returnTime && new Date(o.returnTime) >= todayStart
      ).length
      
      const overdueOutpasses = outpasses.filter(o => 
        !o.returnTime && new Date(o.returnDateTime) < now
      ).length
      
      setStats({
        activeOutpasses: outpasses.filter(o => !o.returnTime).length,
        exitedToday,
        returnedToday,
        overdueOutpasses
      })
      
      setActiveOutpasses(safeOutpasses)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch security data:', error)
      toast.error('Failed to load security data')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSecurityData()
  }, [fetchSecurityData])

  const filteredOutpasses = activeOutpasses.filter(outpass => {
    const student = outpass.student || {}
    const q = (searchQuery || '').toLowerCase()
    return (
      (student.firstName || '').toLowerCase().includes(q) ||
      (student.lastName || '').toLowerCase().includes(q) ||
      (student.registerNumber || '').toLowerCase().includes(q)
    )
  })

  const resolveOutpassFromCode = (code) => {
    try {
      // Accept raw id, JSON string, base64 payload, or known keys
      let payload = code

      // If base64 encoded JSON was pasted (common for QR payloads), attempt decode
      if (typeof code === 'string') {
        const txt = code.trim()
        // base64 detection: fairly loose check
        if (/^[A-Za-z0-9+/=\s]+$/.test(txt) && txt.length % 4 === 0) {
          try {
            const decoded = atob(txt)
            if (decoded && decoded.trim().startsWith('{')) payload = decoded
          } catch {
            console.debug('resolveOutpassFromCode: not valid base64')
          }
        }

        if (typeof payload === 'string' && payload.trim().startsWith('{')) {
          try { payload = JSON.parse(payload) } catch (err) { console.debug('resolveOutpassFromCode JSON parse failed', err) }
        }
      }

      // Candidates for id: payload string, payload._id, payload.id, payload.requestId, payload.outpassId
      const candidates = []
      if (typeof payload === 'string') candidates.push(payload)
      if (payload && typeof payload === 'object') {
        if (payload._id) candidates.push(String(payload._id))
        if (payload.id) candidates.push(String(payload.id))
        if (payload.requestId) candidates.push(String(payload.requestId))
        if (payload.outpassId) candidates.push(String(payload.outpassId))
        if (payload.request_id) candidates.push(String(payload.request_id))
      }

      // Try to match any candidate against the currently loaded active outpasses
      for (const c of candidates) {
        if (!c) continue
        const found = activeOutpasses.find(o => String(o._id) === String(c) || String(o.requestId) === String(c))
        if (found) return found
      }

      return null
    } catch {
      return null
    }
  }

    const normalizeOutpassForClient = (o) => {
      if (!o) return null
      const out = { ...o }
      // ensure _id is string
      try {
        if (out._id && out._id.$oid) out._id = out._id.$oid
        else if (out._id && out._id.toString) out._id = out._id.toString()
      } catch (err) { console.debug('normalizeOutpassForClient id conversion failed', err) }

      out.departureDateTime = out.departureDateTime || out.leaveTime || out.departureDateTime || null
      out.returnDateTime = out.returnDateTime || out.expectedReturnTime || out.returnDateTime || null
      out.exitTime = out.exitTime || (out.gateEntry && out.gateEntry.exitTime) || null
      out.returnTime = out.returnTime || (out.gateEntry && out.gateEntry.returnTime) || null

      out.student = out.student || {}
      out.student.firstName = out.student.firstName || out.student.firstname || ''
      out.student.lastName = out.student.lastName || out.student.lastname || ''
      out.student.registerNumber = out.student.registerNumber || out.student.rollNumber || out.studentId || out.rollNumber || ''
      out.student.hostelBlock = out.student.hostelBlock || out.student.hostel_block || ''

      // Normalize destination: sometimes stored as object {place: '...'}
      if (out.destination && typeof out.destination === 'object') {
        out.destination = out.destination.place || JSON.stringify(out.destination)
      }

      return out
    }

  const handleScanResult = (result) => {
    if (!result) return
    const text = Array.isArray(result) ? result[0]?.rawValue || result[0]?.text : result.rawValue || result.text || String(result)
    ;(async () => {
      let found = resolveOutpassFromCode(text)
      if (!found) {
        try {
          console.debug('security.verifyOutpass - sending code:', text)
          const resp = await securityService.verifyOutpass(text)
          const serverOut = resp?.data || resp
          if (serverOut) found = normalizeOutpassForClient(serverOut)
        } catch (err) {
          console.error('verifyOutpass error', err)
          const msg = err?.message || err?.data?.message || 'Server error'
          toast.error(msg)
        }
      }

      if (found) {
        setSelectedOutpass(found)
        setActionType(!found.exitTime ? 'exit' : 'return')
        setShowVerifyModal(true)
        toast.success('QR recognized')
      } else {
        toast.error('QR not recognized for any active outpass')
      }
    })()
  }

  const handleVerifyAction = (outpass, type) => {
    setSelectedOutpass(outpass)
    setActionType(type)
    setShowVerifyModal(true)
  }

  const handleConfirmAction = async () => {
    try {
      if (actionType === 'exit') {
        console.debug('security.recordExit - outpassId', selectedOutpass._id)
        await securityService.recordExit(selectedOutpass._id)
        toast.success(`Exit recorded for ${selectedOutpass.student.firstName} ${selectedOutpass.student.lastName}`)
      } else {
        console.debug('security.recordReturn - outpassId', selectedOutpass._id)
        await securityService.recordReturn(selectedOutpass._id)
        toast.success(`Return recorded for ${selectedOutpass.student.firstName} ${selectedOutpass.student.lastName}`)
      }
      
      setShowVerifyModal(false)
      setSelectedOutpass(null)
      fetchSecurityData() // Refresh the data
    } catch (error) {
      console.error(`Failed to record ${actionType}:`, error)
      toast.error(error.message || error?.response?.data?.message || `Failed to record ${actionType}`)
    }
  }

  const statCards = [
    {
      title: 'Active Outpasses',
      value: stats.activeOutpasses,
      icon: ClockIcon,
      gradient: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      title: 'Exited Today',
      value: stats.exitedToday,
      icon: ArrowRightEndOnRectangleIcon,
      gradient: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20'
    },
    {
      title: 'Returned Today',
      value: stats.returnedToday,
      icon: ArrowLeftStartOnRectangleIcon,
      gradient: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      title: 'Overdue',
      value: stats.overdueOutpasses,
      icon: ExclamationTriangleIcon,
      gradient: 'from-red-500 to-pink-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
    }
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
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 p-8 shadow-2xl"
        >
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-float" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          </div>
          <div className="relative flex items-center gap-4">
            <SparklesIcon className="h-12 w-12 text-white animate-pulse" />
            <div>
              <h1 className="text-3xl font-display font-bold text-white">
                Security Dashboard
              </h1>
              <p className="mt-1 text-lg text-white/90">
                Gate management and outpass verification 🛡️
              </p>
            </div>
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
                      <h3 className={`text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                        {stat.value}
                      </h3>
                    </div>
                    <Motion.div
                      className={`p-3 rounded-xl ${stat.bgColor}`}
                      whileHover={{ scale: 1.1, rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <stat.icon className={`h-6 w-6`} />
                    </Motion.div>
                  </div>
                </CardContent>
              </Card>
            </Motion.div>
          ))}
        </div>

        {/* Quick Verification */}
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card glassmorphic gradient>
            <CardHeader>
              <CardTitle gradient icon={QrCodeIcon}>Quick Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Input
                    placeholder="Scan QR or paste code / outpass id..."
                    icon={QrCodeIcon}
                    glassmorphic
                    value={manualCode}
                    onChange={(e)=>setManualCode(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={()=>{
                      ;(async () => {
                        let found = resolveOutpassFromCode(manualCode)
                        if (!found) {
                          try {
                            console.debug('security.verifyOutpass - sending code:', manualCode)
                            const resp = await securityService.verifyOutpass(manualCode)
                            const serverOut = resp?.data || resp
                            if (serverOut) found = normalizeOutpassForClient(serverOut)
                          } catch (err) {
                            console.error('verifyOutpass error', err)
                            const msg = err?.message || err?.data?.message || 'Server error'
                            toast.error(msg)
                          }
                        }

                        if(found){ setSelectedOutpass(found); setActionType(!found.exitTime? 'exit':'return'); setShowVerifyModal(true);} else { toast.error('No matching active outpass'); }
                      })()
                    }} className="flex-1">
                      Verify Code
                    </Button>
                    <Button variant="success" icon={ArrowRightEndOnRectangleIcon} onClick={()=>{
                      ;(async () => {
                        let found = resolveOutpassFromCode(manualCode)
                        if (!found) {
                          try {
                            console.debug('security.verifyOutpass - sending code:', manualCode)
                            const resp = await securityService.verifyOutpass(manualCode)
                            const serverOut = resp?.data || resp
                            if (serverOut) found = normalizeOutpassForClient(serverOut)
                          } catch (err) {
                            console.error('verifyOutpass error', err)
                            const msg = err?.message || err?.data?.message || 'Server error'
                            toast.error(msg)
                          }
                        }

                        if(found){ setSelectedOutpass(found); setActionType('exit'); setShowVerifyModal(true);} else { toast.error('No matching active outpass'); }
                      })()
                    }} className="flex-1">
                      Record Exit
                    </Button>
                    <Button variant="primary" icon={ArrowLeftStartOnRectangleIcon} onClick={()=>{
                      ;(async () => {
                        let found = resolveOutpassFromCode(manualCode)
                        if (!found) {
                          try {
                            const resp = await securityService.verifyOutpass(manualCode)
                            const serverOut = resp?.data || resp
                            if (serverOut) found = normalizeOutpassForClient(serverOut)
                          } catch (err) {
                            console.error('verifyOutpass error', err)
                            const msg = err?.message || err?.data?.message || 'Server error'
                            toast.error(msg)
                          }
                        }

                        if(found){ setSelectedOutpass(found); setActionType('return'); setShowVerifyModal(true);} else { toast.error('No matching active outpass'); }
                      })()
                    }} className="flex-1">
                      Record Return
                    </Button>
                  </div>
                </div>
                <div className="p-2 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl border-2 border-dashed border-orange-300 dark:border-orange-700">
                  <div className="text-center mb-2 text-sm text-slate-700 dark:text-slate-300">Scan QR Code</div>
                  <div className="rounded-xl overflow-hidden">
                    <Scanner
                      onScan={(result) => handleScanResult(result)}
                      onError={(error) => console.error(error)}
                      components={{ finder: true, torch: true, onOff: true, zoom: true }}
                      scanDelay={200}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Motion.div>

        {/* Active Outpasses */}
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card glassmorphic gradient>
            <CardHeader>
              <CardTitle gradient icon={ShieldCheckIcon}>Active Outpasses</CardTitle>
              <div className="mt-4">
                <Input
                  placeholder="Search by name or register number..."
                  icon={MagnifyingGlassIcon}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  glassmorphic
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <LoadingCard key={i} />)}
                </div>
              ) : filteredOutpasses.length === 0 ? (
                <EmptyState
                  icon={ShieldCheckIcon}
                  title="No active outpasses"
                  description="All students are currently in the hostel"
                />
              ) : (
                <div className="space-y-4">
                  {filteredOutpasses.map((outpass, index) => (
                    <Motion.div
                      key={outpass._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ x: 4, scale: 1.01 }}
                      className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Student Avatar */}
                          <Motion.div
                            whileHover={{ scale: 1.1, rotate: 360 }}
                            transition={{ duration: 0.5 }}
                            className="relative"
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-500 rounded-full blur opacity-50" />
                            <div className="relative h-14 w-14 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                              <span className="text-xl font-bold text-white">
                                {outpass.student.firstName.charAt(0)}
                              </span>
                            </div>
                          </Motion.div>

                          {/* Student Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-slate-900 dark:text-white">
                                {outpass.student.firstName} {outpass.student.lastName}
                              </h4>
                              <Badge variant="default">{outpass.student.registerNumber}</Badge>
                              <Badge variant="default">Block {outpass.student.hostelBlock}</Badge>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                              {outpass.reason}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                              <div className="flex items-center gap-1">
                                <CalendarDaysIcon className="h-3.5 w-3.5" />
                                <span>Depart: {formatDateTime(outpass.departureDateTime)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <CalendarDaysIcon className="h-3.5 w-3.5" />
                                <span>Return: {formatDateTime(outpass.returnDateTime)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {!outpass.exitTime ? (
                            <Button
                              variant="success"
                              icon={ArrowRightEndOnRectangleIcon}
                              onClick={() => handleVerifyAction(outpass, 'exit')}
                            >
                              Mark Exit
                            </Button>
                          ) : !outpass.returnTime ? (
                            <Button
                              variant="primary"
                              icon={ArrowLeftStartOnRectangleIcon}
                              onClick={() => handleVerifyAction(outpass, 'return')}
                            >
                              Mark Return
                            </Button>
                          ) : (
                            <Badge variant="success" icon={CheckCircleIcon}>
                              Completed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Motion.div>

        {/* Verification Modal */}
        <Modal
          isOpen={showVerifyModal}
          onClose={() => setShowVerifyModal(false)}
          title={`Confirm ${actionType === 'exit' ? 'Exit' : 'Return'}`}
          gradient
        >
          {selectedOutpass && (
            <div className="space-y-4">
              {/* Student Card */}
              <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <span className="text-lg font-bold text-white">
                      {selectedOutpass.student.firstName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      {selectedOutpass.student.firstName} {selectedOutpass.student.lastName}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {selectedOutpass.student.registerNumber}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Block:</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {selectedOutpass.student.hostelBlock}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Destination:</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {selectedOutpass.destination}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      {actionType === 'exit' ? 'Departure' : 'Expected Return'}:
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {formatDateTime(actionType === 'exit' ? selectedOutpass.departureDateTime : selectedOutpass.returnDateTime)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                <ShieldCheckIcon className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                <p className="text-sm text-orange-900 dark:text-orange-100">
                  Confirm that the student is {actionType === 'exit' ? 'leaving' : 'entering'} the hostel premises.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowVerifyModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
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
