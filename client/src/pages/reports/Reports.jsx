/**
 * Reports and Analytics Page
 * System-wide analytics and downloadable reports
 */

import { useState, useEffect } from 'react'
import { motion as Motion } from 'framer-motion'
import {
  ChartBarIcon,
  DocumentChartBarIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import DashboardLayout from '../../layouts/DashboardLayout'
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import { LoadingCard } from '../../components/ui/Loading'
import outpassService from '../../services/outpassService'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Reports() {
  const [timeRange, setTimeRange] = useState('month')
  const [exportFormat, setExportFormat] = useState('csv')
  const [_loading, _setLoading] = useState(false)
  const [stats, setStats] = useState({
    totalRequests: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    avgProcessingTime: '0h',
    topReason: 'N/A'
  })

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        _setLoading(true)
        
        // Calculate date range based on selected time range
        const now = new Date()
        let startDate = new Date()
        
        switch (timeRange) {
          case 'week':
            startDate.setDate(now.getDate() - 7)
            break
          case 'month':
            startDate.setDate(now.getDate() - 30)
            break
          case 'quarter':
            startDate.setMonth(now.getMonth() - 3)
            break
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1)
            break
          default:
            startDate.setDate(now.getDate() - 30)
        }
        
        const response = await outpassService.getStatistics({
          startDate: startDate.toISOString(),
          endDate: now.toISOString()
        })
        
        const data = response?.data?.data || response?.data || {}
        
        setStats({
          totalRequests: data.totalRequests || 0,
          approved: data.approved || 0,
          rejected: data.rejected || 0,
          pending: data.pending || 0,
          avgProcessingTime: data.avgProcessingTime || '0h',
          topReason: data.topReason || 'N/A'
        })
        
        _setLoading(false)
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        })
        
        // Set to zero instead of mock data to show real API status
        setStats({
          totalRequests: 0,
          approved: 0,
          rejected: 0,
          pending: 0,
          avgProcessingTime: '0h',
          topReason: 'No data'
        })
        _setLoading(false)
      }
    }
    
    fetchAnalytics()
  }, [timeRange])

  const reports = [
    {
      title: 'Outpass Summary Report',
      description: 'Complete overview of all outpass requests',
      icon: DocumentChartBarIcon,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Student Activity Report',
      description: 'Individual student outpass history',
      icon: UserGroupIcon,
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Approval Analytics',
      description: 'Approval rates and processing times',
      icon: CheckCircleIcon,
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Monthly Trends',
      description: 'Month-over-month comparison',
      icon: CalendarIcon,
      color: 'from-orange-500 to-red-500'
    }
  ]

  const handleGenerateReport = async (reportType) => {
    const now = new Date()
    const dataRows = [
      { Metric: 'Report Type', Value: reportType },
      { Metric: 'Time Range', Value: timeRange },
      { Metric: 'Generated At', Value: now.toISOString() },
      { Metric: 'Total Requests', Value: stats.totalRequests },
      { Metric: 'Approved', Value: stats.approved },
      { Metric: 'Rejected', Value: stats.rejected },
      { Metric: 'Pending', Value: stats.pending },
      { Metric: 'Avg Processing Time', Value: stats.avgProcessingTime },
      { Metric: 'Top Reason', Value: stats.topReason },
    ]

    const baseFileName = `${reportType.replace(/\s+/g, '_').toLowerCase()}_${timeRange}_${now.toISOString().slice(0,10)}`

    switch (exportFormat) {
      case 'csv': {
        const headers = 'Metric,Value\n'
        const csv = headers + dataRows.map(r => `${JSON.stringify(r.Metric)},${JSON.stringify(r.Value)}`).join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `${baseFileName}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        break
      }
      case 'json': {
        const blob = new Blob([JSON.stringify({ reportType, timeRange, stats }, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${baseFileName}.json`
        link.click()
        break
      }
      case 'xlsx': {
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Report')
        const headers = Object.keys(dataRows[0] || { Metric: '', Value: '' })
        worksheet.addRow(headers)
        dataRows.forEach(row => {
          worksheet.addRow(headers.map(h => row[h]))
        })
        worksheet.columns.forEach((col) => {
          let maxLength = 10
          col.eachCell({ includeEmpty: true }, (cell) => {
            const val = cell.value ? String(cell.value) : ''
            maxLength = Math.max(maxLength, val.length + 2)
          })
          col.width = Math.min(maxLength, 50)
        })
        const buffer = await workbook.xlsx.writeBuffer()
        saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${baseFileName}.xlsx`)
        break
      }
      case 'pdf': {
        const doc = new jsPDF()
        doc.setFontSize(14)
        doc.text(`Report: ${reportType}`, 14, 20)
        doc.setFontSize(10)
        doc.text(`Time Range: ${timeRange}`, 14, 28)
        doc.text(`Generated At: ${now.toISOString()}`, 14, 34)
        let y = 46
        dataRows.slice(3).forEach(row => {
          doc.text(`${row.Metric}: ${row.Value}`, 14, y)
          y += 8
        })
        doc.save(`${baseFileName}.pdf`)
        break
      }
      default:
        console.warn('Unsupported export format:', exportFormat)
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
              Reports & Analytics
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              System insights and downloadable reports
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              glassmorphic
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 3 Months</option>
              <option value="year">Last Year</option>
            </Select>
            <Select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              glassmorphic
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="pdf">PDF</option>
            </Select>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'Total Requests', value: stats.totalRequests, icon: DocumentChartBarIcon, color: 'from-blue-500 to-cyan-500' },
            { title: 'Approved', value: stats.approved, icon: CheckCircleIcon, color: 'from-green-500 to-emerald-500' },
            { title: 'Rejected', value: stats.rejected, icon: XCircleIcon, color: 'from-red-500 to-pink-500' },
            { title: 'Pending', value: stats.pending, icon: ClockIcon, color: 'from-amber-500 to-orange-500' }
          ].map((stat, index) => (
            <Motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card glassmorphic hover>
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        {stat.title}
                      </p>
                      <h3 className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mt-2`}>
                        {stat.value}
                      </h3>
                    </div>
                    <Motion.div
                      className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}
                      whileHover={{ scale: 1.1, rotate: 360 }}
                      transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                    >
                      <stat.icon className="h-6 w-6 text-white" />
                    </Motion.div>
                  </div>
                </CardContent>
              </Card>
            </Motion.div>
          ))}
        </div>

  {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card glassmorphic gradient>
            <CardHeader>
              <CardTitle icon={ClockIcon}>Processing Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Avg. Processing Time
                  </span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {stats.avgProcessingTime}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Approval Rate
                  </span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {stats.totalRequests > 0 ? ((stats.approved / stats.totalRequests) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Top Reason
                  </span>
                  <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {stats.topReason}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card glassmorphic gradient>
            <CardHeader>
              <CardTitle icon={ChartBarIcon}>Quick Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={256} minHeight={256}>
                <BarChart data={[
                  { name: 'Approved', value: stats.approved },
                  { name: 'Rejected', value: stats.rejected },
                  { name: 'Pending', value: stats.pending }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="name" className="text-slate-600 dark:text-slate-400" />
                  <YAxis allowDecimals={false} className="text-slate-600 dark:text-slate-400" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgb(255 255 255 / 0.9)',
                      border: '1px solid rgb(226 232 240)',
                      borderRadius: '0.75rem',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Bar dataKey="value" fill="#6b21a8" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Available Reports */}
        <Card glassmorphic gradient>
          <CardHeader>
            <CardTitle icon={DocumentChartBarIcon}>Available Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.map((report, index) => (
                  <Motion.div
                    key={report.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 4, scale: 1.02 }}
                    className="flex items-center justify-between p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <Motion.div
                        className={`p-3 rounded-xl bg-gradient-to-br ${report.color}`}
                        whileHover={{ scale: 1.1, rotate: 360 }}
                        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                      >
                        <report.icon className="h-6 w-6 text-white" />
                      </Motion.div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">
                          {report.title}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {report.description}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      icon={ArrowDownTrayIcon}
                      onClick={() => handleGenerateReport(report.title)}
                    >
                      Download
                    </Button>
                  </Motion.div>
                ))}
              </div>
          </CardContent>
        </Card>
      </Motion.div>
    </DashboardLayout>
  )
}
