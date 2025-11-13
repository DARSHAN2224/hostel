/**
 * HOD Dashboard - Ultra Modern Department Overview
 * Department management with approval queue and student analytics
 */

import { useState, useEffect, useCallback } from 'react'
import { motion as Motion } from 'framer-motion'
import {
  AcademicCapIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentTextIcon,
  UsersIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import DashboardLayout from '../../layouts/DashboardLayout'
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Textarea from '../../components/ui/Textarea'
import { LoadingCard } from '../../components/ui/Loading'
import EmptyState from '../../components/ui/EmptyState'
import { formatDateTime } from '../../utils/helpers'
import outpassService from '../../services/outpassService'
import jsPDF from 'jspdf'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import toast from 'react-hot-toast'

export default function HODDashboard() {
  const [loading, setLoading] = useState(true)
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingApprovals: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0
  })
  const [selectedOutpass, setSelectedOutpass] = useState(null)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [approveComments, setApproveComments] = useState('')

  const fetchHODData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await outpassService.getHodDashboard?.()
      const data = res?.data || {}
      const statsData = data.statistics || {}
      setStats({
        totalStudents: statsData.totalStudents || 0,
        pendingApprovals: statsData.pendingOutpasses || 0,
        approvedThisMonth: statsData.approvedOutpasses || 0,
        rejectedThisMonth: statsData.rejectedOutpasses || 0,
        yearDistribution: statsData.yearDistribution || []
      })
      setPendingApprovals(Array.isArray(data.pendingOutpasses) ? data.pendingOutpasses : [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch HOD data:', error)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHODData()
  }, [fetchHODData])

  const filteredApprovals = pendingApprovals.filter(outpass => {
    const student = outpass.student
    return (
      student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.registerNumber.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

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
      await outpassService.hodApprove(selectedOutpass._id, approveComments)
      toast.success('Outpass approved')
      setShowApproveModal(false)
      setSelectedOutpass(null)
      setApproveComments('')
      fetchHODData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to approve')
    }
  }

  const confirmReject = async () => {
    try {
      await outpassService.hodReject(selectedOutpass._id, rejectReason)
      toast.success('Outpass rejected')
      setShowRejectModal(false)
      setSelectedOutpass(null)
      setRejectReason('')
      fetchHODData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to reject')
    }
  }

  const downloadDeptReport = async () => {
    try {
      const now = new Date().toISOString().slice(0,10)
      // Build rows
      const rows = pendingApprovals.map(p => ({
        Student: `${p.student?.firstName || ''} ${p.student?.lastName || ''}`.trim(),
        Register: p.student?.registerNumber,
        Year: p.student?.yearOfStudy || p.student?.year,
        Reason: p.reason,
        Destination: p.destination,
        Depart: formatDateTime(p.departureDateTime),
        Return: formatDateTime(p.returnDateTime),
        Status: p.status
      }))
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Dept Pending')
      const headers = Object.keys(rows[0] || { Student:'', Register:'', Year:'', Reason:'', Destination:'', Depart:'', Return:'', Status:'' })
      ws.addRow(headers)
      for (const r of rows) {
        ws.addRow(headers.map(h=>r[h]))
      }
      for (const col of ws.columns) {
        let m=10
        col.eachCell({includeEmpty:true}, c=>{
          const v=c.value?String(c.value):''
          m=Math.max(m,v.length+2)
        })
        col.width=Math.min(m,50)
      }
      const buf = await wb.xlsx.writeBuffer()
      saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `hod_department_pending_${now}.xlsx`)

      // Simple PDF summary
      const doc = new jsPDF()
      doc.setFontSize(14)
      doc.text('HOD Department Pending Report', 14, 20)
      doc.setFontSize(10)
      let y = 30
      for (const r of rows.slice(0, 25)) {
        doc.text(`${r.Student} | ${r.Register} | ${r.Status}`, 14, y)
        y+=6
        if(y>280){
          doc.addPage()
          y=20
        }
      }
      doc.save(`hod_department_pending_${now}.pdf`)
    } catch (err) {
      console.error('Failed to export', err)
      toast.error('Failed to download department report')
    }
  }

  const statCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: UsersIcon,
      gradient: 'from-indigo-500 to-purple-500',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20'
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: ClockIcon,
      gradient: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20'
    },
    {
      title: 'Approved (Month)',
      value: stats.approvedThisMonth,
      icon: CheckCircleIcon,
      gradient: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      title: 'Rejected (Month)',
      value: stats.rejectedThisMonth,
      icon: XCircleIcon,
      gradient: 'from-red-500 to-pink-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
    }
  ]
  // Build year distribution from stats if available, otherwise show empty
  const yearDistribution = (stats.yearDistribution && Array.isArray(stats.yearDistribution))
    ? stats.yearDistribution.map((y, idx) => ({ year: `Year ${y.yearOfStudy}`, count: y.count, color: ['from-blue-500 to-cyan-500','from-green-500 to-emerald-500','from-purple-500 to-pink-500','from-orange-500 to-red-500','from-amber-500 to-yellow-500','from-teal-500 to-cyan-500'][idx % 6] }))
    : []

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
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-8 shadow-2xl"
        >
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-float" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          </div>
          <div className="relative flex items-center gap-4">
            <SparklesIcon className="h-12 w-12 text-white animate-pulse" />
            <div>
              <h1 className="text-3xl font-display font-bold text-white">
                HOD Dashboard
              </h1>
              <p className="mt-1 text-lg text-white/90">
                Department overview and outpass approvals 🎓
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Year Distribution */}
          <Motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card glassmorphic gradient>
              <CardHeader>
                <CardTitle gradient icon={ChartBarIcon}>Student Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {yearDistribution.map((item, index) => (
                    <Motion.div
                      key={item.year}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{item.year}</span>
                        <span className={`font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                          {item.count}
                        </span>
                      </div>
                      <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <Motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${stats.totalStudents > 0 ? (item.count / stats.totalStudents) * 100 : 0}%` }}
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

          {/* Pending Approvals */}
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2"
          >
            <Card glassmorphic gradient>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle gradient icon={DocumentTextIcon}>Pending Approvals</CardTitle>
                  <Button variant="ghost" onClick={downloadDeptReport}>Download Department Report</Button>
                </div>
                <div className="mt-4">
                  <Input
                    placeholder="Search by name or register number..."
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
                ) : filteredApprovals.length === 0 ? (
                  <EmptyState
                    icon={AcademicCapIcon}
                    title="No pending approvals"
                    description="All outpass requests have been processed"
                  />
                ) : (
                  <div className="space-y-4">
                    {filteredApprovals.map((outpass, index) => (
                      <Motion.div
                        key={outpass._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ x: 4, scale: 1.01 }}
                        className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            {/* Student Avatar */}
                            <Motion.div
                              whileHover={{ scale: 1.1, rotate: 360 }}
                              transition={{ duration: 0.5 }}
                              className="relative"
                            >
                              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full blur opacity-50" />
                              <div className="relative h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
                                <span className="text-xl font-bold text-white">
                                  {outpass.student.firstName.charAt(0)}
                                </span>
                              </div>
                            </Motion.div>

                            {/* Outpass Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-slate-900 dark:text-white">
                                  {outpass.student.firstName} {outpass.student.lastName}
                                </h4>
                                <Badge variant="default">{outpass.student.registerNumber}</Badge>
                                <Badge variant="default">Year {outpass.student.yearOfStudy || outpass.student.year}</Badge>
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
                              <div className="mt-2">
                                <Badge variant="warning" icon={ClockIcon} pulse>
                                  {outpass.status}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="success"
                              icon={CheckCircleIcon}
                              onClick={() => handleApprove(outpass)}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              icon={XCircleIcon}
                              onClick={() => handleReject(outpass)}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      </Motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </Motion.div>
        </div>

        {/* Approve Modal */}
        <Modal
          isOpen={showApproveModal}
          onClose={() => setShowApproveModal(false)}
          title="Approve Outpass Request"
          gradient
        >
          {selectedOutpass && (
            <div className="space-y-4">
              {/* Student Card */}
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <span className="text-lg font-bold text-white">
                      {selectedOutpass.student.firstName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      {selectedOutpass.student.firstName} {selectedOutpass.student.lastName}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {selectedOutpass.student.registerNumber} - Year {selectedOutpass.student.year}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Reason:</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {selectedOutpass.reason}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Destination:</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {selectedOutpass.destination}
                    </span>
                  </div>
                </div>
              </div>

              <Textarea
                label="Comments (Optional)"
                value={approveComments}
                onChange={(e) => setApproveComments(e.target.value)}
                placeholder="Add any comments for this approval..."
                rows={3}
                glassmorphic
              />

              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <p className="text-sm text-green-900 dark:text-green-100">
                  Student will be notified of the approval via email and can proceed with their outpass.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowApproveModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="success"
                  icon={CheckCircleIcon}
                  onClick={confirmApprove}
                  className="flex-1"
                >
                  Confirm Approval
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Reject Modal */}
        <Modal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          title="Reject Outpass Request"
          gradient
        >
          {selectedOutpass && (
            <div className="space-y-4">
              {/* Warning Banner */}
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-900 dark:text-red-100 font-medium">
                  You are about to reject this outpass request
                </p>
              </div>

              {/* Student Card */}
              <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <UserIcon className="h-10 w-10 text-slate-600 dark:text-slate-400" />
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      {selectedOutpass.student.firstName} {selectedOutpass.student.lastName}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {selectedOutpass.student.registerNumber}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium">Reason:</span> {selectedOutpass.reason}
                </p>
              </div>

              <Textarea
                label="Rejection Reason *"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                rows={4}
                required
                glassmorphic
              />

              <div className="flex items-center gap-3 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  icon={XCircleIcon}
                  onClick={confirmReject}
                  disabled={!rejectReason.trim()}
                  className="flex-1"
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </Motion.div>
    </DashboardLayout>
  )
}
