/**
 * Outpass History Page
 * View and filter past outpass requests with export functionality
 */

import { useState, useEffect, useCallback } from 'react'
import { motion as Motion } from 'framer-motion'
import {
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import DashboardLayout from '../../layouts/DashboardLayout'
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import { LoadingCard } from '../../components/ui/Loading'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import EmptyState from '../../components/ui/EmptyState'
import apiClient from '../../services/api'
import { formatDate, formatRelativeTime } from '../../utils/helpers'
import { OUTPASS_STATUS } from '../../constants'

export default function OutpassHistory() {
  const [loading, setLoading] = useState(true)
  const [outpasses, setOutpasses] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [exportFormat, setExportFormat] = useState('csv')

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        status: statusFilter === 'all' ? '' : statusFilter,
        limit: 100,
        sort: '-createdAt'
      }
      const response = await apiClient.get('/outpass/history', { params })
      
      let list = []
      if (Array.isArray(response)) {
        list = response
      } else if (response?.data?.outpasses) {
        list = response.data.outpasses
      } else if (response?.outpasses) {
        list = response.outpasses
      }
      
      setOutpasses(list)
    } catch (error) {
      console.error('Failed to fetch history:', error)
      setOutpasses([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const filteredOutpasses = Array.isArray(outpasses) ? outpasses.filter(outpass => {
    const matchesSearch = 
      outpass.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      outpass.reason?.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (dateFilter === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return matchesSearch && new Date(outpass.createdAt) >= today
    }
    
    if (dateFilter === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return matchesSearch && new Date(outpass.createdAt) >= weekAgo
    }
    
    if (dateFilter === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      return matchesSearch && new Date(outpass.createdAt) >= monthAgo
    }
    
    return matchesSearch
  }) : []

  const handleExport = async () => {
    const fileBase = `outpass-history-${new Date().toISOString().split('T')[0]}`
    if (exportFormat === 'csv') {
      const csv = [
        ['Student', 'Status', 'Reason', 'Departure', 'Return', 'Submitted'].join(','),
        ...filteredOutpasses.map(o => [
          o.student?.name || 'Unknown',
          o.status,
          `"${(o.reason || '').replaceAll('"', '""')}"`,
          formatDate(o.departureDateTime, 'yyyy-MM-dd HH:mm'),
          formatDate(o.returnDateTime, 'yyyy-MM-dd HH:mm'),
          formatDate(o.createdAt, 'yyyy-MM-dd HH:mm')
        ].join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileBase}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else if (exportFormat === 'json') {
      const json = filteredOutpasses.map(o => ({
        student: o.student?.name || 'Unknown',
        status: o.status,
        reason: o.reason,
        departure: o.departureDateTime,
        return: o.returnDateTime,
        submitted: o.createdAt
      }))
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileBase}.json`
      a.click()
      URL.revokeObjectURL(url)
    } else if (exportFormat === 'xlsx') {
      const rows = filteredOutpasses.map(o => ({
        Student: o.student?.name || 'Unknown',
        Status: o.status,
        Reason: o.reason,
        Departure: formatDate(o.departureDateTime, 'yyyy-MM-dd HH:mm'),
        Return: formatDate(o.returnDateTime, 'yyyy-MM-dd HH:mm'),
        Submitted: formatDate(o.createdAt, 'yyyy-MM-dd HH:mm')
      }))
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('History')
      // Add header
      const headers = Object.keys(rows[0] || {
        Student: '', Status: '', Reason: '', Departure: '', Return: '', Submitted: ''
      })
      worksheet.addRow(headers)
      // Add data rows
      for (const row of rows) {
        worksheet.addRow(headers.map(h => row[h]))
      }
      // Auto width
      for (const col of worksheet.columns) {
        let maxLength = 10
        col.eachCell({ includeEmpty: true }, (cell) => {
          const val = cell.value ? String(cell.value) : ''
          maxLength = Math.max(maxLength, val.length + 2)
        })
        col.width = Math.min(maxLength, 40)
      }
      const buffer = await workbook.xlsx.writeBuffer()
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${fileBase}.xlsx`)
    } else if (exportFormat === 'pdf') {
      const doc = new jsPDF()
      doc.setFontSize(14)
      doc.text('Outpass History', 14, 20)
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
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Outpass History
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              View and export past outpass requests
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={exportFormat} onChange={(e)=>setExportFormat(e.target.value)} glassmorphic>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="pdf">PDF</option>
            </Select>
            <Button
              icon={ArrowDownTrayIcon}
              onClick={handleExport}
              disabled={filteredOutpasses.length === 0}
            >
              Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card glassmorphic gradient>
          <CardHeader>
            <CardTitle icon={FunnelIcon}>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Search by student or reason..."
                icon={MagnifyingGlassIcon}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                glassmorphic
              />
              
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                glassmorphic
              >
                <option value="all">All Status</option>
                <option value={OUTPASS_STATUS.APPROVED}>Approved</option>
                <option value={OUTPASS_STATUS.REJECTED}>Rejected</option>
                <option value={OUTPASS_STATUS.COMPLETED}>Completed</option>
                <option value={OUTPASS_STATUS.CANCELLED}>Cancelled</option>
              </Select>

              <Select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                glassmorphic
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* History Table */}
        <Card glassmorphic>
          <CardContent>
            {loading ? (
              <LoadingCard />
            ) : filteredOutpasses.length === 0 ? (
              <EmptyState
                icon={ClockIcon}
                title="No history found"
                description="Try adjusting your filters"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Date Range
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredOutpasses.map((outpass, index) => (
                      <Motion.tr
                        key={outpass._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                        className="transition-all duration-200"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {outpass.student?.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {outpass.student?.registerNumber || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge status={outpass.status}>{outpass.status}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                            {outpass.reason}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {formatDate(outpass.departureDateTime, 'MMM dd')}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(outpass.departureDateTime, 'HH:mm')} - {formatDate(outpass.returnDateTime, 'HH:mm')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatRelativeTime(outpass.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={EyeIcon}
                          >
                            View
                          </Button>
                        </td>
                      </Motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </Motion.div>
    </DashboardLayout>
  )
}
