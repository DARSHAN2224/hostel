/**
 * Student Detail Page
 * Full profile view with outpass history
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  UserIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  AcademicCapIcon,
  HomeIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  PencilIcon,
} from '@heroicons/react/24/outline'
import DashboardLayout from '../../layouts/DashboardLayout'
import Button from '../../components/ui/Button'
import studentService from '../../services/studentService'
import outpassService from '../../services/outpassService'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { selectUser } from '../../store/authSlice'

const TABS = ['Overview', 'Outpass History']

const avatarColors = [
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-teal-500 to-cyan-600',
]

function StatusBadge({ status }) {
  const map = {
    pending:       { bg: 'bg-amber-100 dark:bg-amber-900/30',   text: 'text-amber-700 dark:text-amber-300',   label: 'Pending' },
    approved:      { bg: 'bg-blue-100 dark:bg-blue-900/30',     text: 'text-blue-700 dark:text-blue-300',     label: 'Approved' },
    rejected:      { bg: 'bg-red-100 dark:bg-red-900/30',       text: 'text-red-700 dark:text-red-300',       label: 'Rejected' },
    out:           { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', label: 'Out' },
    completed:     { bg: 'bg-emerald-100 dark:bg-emerald-900/30',text: 'text-emerald-700 dark:text-emerald-300',label: 'Completed' },
    overdue:       { bg: 'bg-red-100 dark:bg-red-900/30',       text: 'text-red-700 dark:text-red-300',       label: 'Overdue' },
    cancelled:     { bg: 'bg-slate-100 dark:bg-slate-700',      text: 'text-slate-600 dark:text-slate-300',   label: 'Cancelled' },
    expired:       { bg: 'bg-slate-100 dark:bg-slate-700',      text: 'text-slate-600 dark:text-slate-300',   label: 'Expired' },
  }
  const s = map[status] || { bg: 'bg-slate-100', text: 'text-slate-600', label: status }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

function StudentStatusBadge({ status }) {
  const map = {
    active:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    inactive:  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${map[status] || map.active}`}>
      {status || 'active'}
    </span>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
        <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{label}</p>
        <p className="text-sm text-slate-800 dark:text-slate-200 font-medium mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function StudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const currentUser = useSelector(selectUser)

  const [student, setStudent] = useState(null)
  const [outpasses, setOutpasses] = useState([])
  const [loadingStudent, setLoadingStudent] = useState(true)
  const [loadingOutpasses, setLoadingOutpasses] = useState(true)
  const [activeTab, setActiveTab] = useState('Overview')

  useEffect(() => {
    fetchStudent()
    fetchOutpasses()
  }, [id])

  const fetchStudent = async () => {
    try {
      setLoadingStudent(true)
      const res = await studentService.getById(id)
      const data = res?.data?.student || res?.student || res?.data || res
      setStudent(data)
    } catch (err) {
      console.error('Failed to fetch student:', err)
      toast.error('Failed to load student details')
    } finally {
      setLoadingStudent(false)
    }
  }

  const fetchOutpasses = async () => {
    try {
      setLoadingOutpasses(true)
      // Try to get outpass history filtered by this student
      const res = await outpassService.getHistory({ studentId: id, limit: 50 })
      const data = res?.data?.outpasses || res?.outpasses || res?.data || []
      setOutpasses(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch outpasses:', err)
      setOutpasses([])
    } finally {
      setLoadingOutpasses(false)
    }
  }

  const colorIndex = student ? student.firstName?.charCodeAt(0) % avatarColors.length : 0

  // Outpass stats
  const outpassStats = {
    total: outpasses.length,
    completed: outpasses.filter(o => o.status === 'completed').length,
    pending: outpasses.filter(o => ['pending', 'approved'].includes(o.status)).length,
    overdue: outpasses.filter(o => o.status === 'overdue').length,
  }

  if (loadingStudent) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <ArrowPathIcon className="h-8 w-8 text-blue-500 animate-spin" />
            <p className="text-sm text-slate-500">Loading student details...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!student) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <ExclamationCircleIcon className="h-12 w-12 text-slate-300" />
          <p className="text-slate-500">Student not found</p>
          <Button variant="ghost" icon={ArrowLeftIcon} onClick={() => navigate('/students')}>
            Back to Students
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">

        {/* Breadcrumb + Back */}
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <button
            onClick={() => navigate('/students')}
            className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Students
          </button>
          <span>/</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {student.firstName} {student.lastName}
          </span>
        </div>

        {/* Profile Header Card */}
        <Motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            {/* Avatar */}
            <div className={`h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-br ${avatarColors[colorIndex]} flex items-center justify-center flex-shrink-0 shadow-lg`}>
              <span className="text-white text-3xl font-bold">
                {student.firstName?.charAt(0)?.toUpperCase()}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {student.firstName} {student.lastName}
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">{student.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StudentStatusBadge status={student.status} />
                  {currentUser?.role === 'admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={PencilIcon}
                      onClick={() => navigate('/students', { state: { editId: student._id } })}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </div>

              {/* Quick stats row */}
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                {[
                  { label: 'Reg No.', value: student.rollNumber },
                  { label: 'Department', value: student.department },
                  { label: 'Year', value: student.yearOfStudy ? `Year ${student.yearOfStudy}` : null },
                  { label: 'Room', value: student.hostelBlock && student.roomNumber ? `Block ${student.hostelBlock}, Room ${student.roomNumber}` : null },
                  { label: 'Hostel', value: student.hostelType ? (student.hostelType === 'boys' ? 'Boys Hostel' : 'Girls Hostel') : null },
                ].filter(i => i.value).map(item => (
                  <div key={item.label}>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{item.label}</span>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Outpass summary bar */}
          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Outpasses', value: outpassStats.total, color: 'text-slate-700 dark:text-slate-300' },
              { label: 'Completed', value: outpassStats.completed, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Active', value: outpassStats.pending, color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Overdue', value: outpassStats.overdue, color: 'text-red-600 dark:text-red-400' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </Motion.div>

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex gap-0">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'Overview' && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-5"
          >
            {/* Academic Info */}
            <SectionCard title="Academic Information">
              <InfoRow icon={AcademicCapIcon} label="Course" value={student.course} />
              <InfoRow icon={AcademicCapIcon} label="Department" value={student.department} />
              <InfoRow icon={CalendarDaysIcon} label="Year of Study" value={student.yearOfStudy ? `Year ${student.yearOfStudy}` : null} />
              <InfoRow icon={CalendarDaysIcon} label="Academic Year" value={student.year} />
              <InfoRow icon={CalendarDaysIcon} label="Semester" value={student.semester ? `Semester ${student.semester}` : null} />
              <InfoRow icon={UserIcon} label="Register Number" value={student.rollNumber} />
            </SectionCard>

            {/* Hostel Info */}
            <SectionCard title="Hostel Information">
              <InfoRow icon={HomeIcon} label="Hostel Type" value={student.hostelType === 'boys' ? 'Boys Hostel' : student.hostelType === 'girls' ? 'Girls Hostel' : student.hostelType} />
              <InfoRow icon={BuildingOfficeIcon} label="Block" value={student.hostelBlock ? `Block ${student.hostelBlock}` : null} />
              <InfoRow icon={BuildingOfficeIcon} label="Room Number" value={student.roomNumber} />
            </SectionCard>

            {/* Personal Info */}
            <SectionCard title="Personal Information">
              <InfoRow icon={EnvelopeIcon} label="Email" value={student.email} />
              <InfoRow icon={PhoneIcon} label="Phone" value={student.phone} />
              <InfoRow
                icon={CalendarDaysIcon}
                label="Date of Birth"
                value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null}
              />
              <InfoRow icon={UserIcon} label="Gender" value={student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : null} />
              <InfoRow icon={UserIcon} label="Blood Group" value={student.bloodGroup} />
            </SectionCard>

            {/* Address */}
            <SectionCard title="Address">
              <InfoRow
                icon={MapPinIcon}
                label="Permanent Address"
                value={[
                  student.permanentAddress?.street,
                  student.permanentAddress?.city,
                  student.permanentAddress?.state,
                  student.permanentAddress?.zipCode,
                  student.permanentAddress?.country,
                ].filter(Boolean).join(', ') || null}
              />
            </SectionCard>

            {/* Parent / Guardian */}
            <SectionCard title="Parent / Guardian Details">
              <InfoRow icon={UserIcon} label="Father's Name" value={student.parentDetails?.fatherName} />
              <InfoRow icon={UserIcon} label="Mother's Name" value={student.parentDetails?.motherName} />
              <InfoRow icon={PhoneIcon} label="Guardian Phone" value={student.parentDetails?.guardianPhone} />
              <InfoRow icon={EnvelopeIcon} label="Guardian Email" value={student.parentDetails?.guardianEmail} />
            </SectionCard>

            {/* Staff Assigned */}
            <SectionCard title="Assigned Staff">
              <div className="space-y-3">
                {[
                  { label: 'Warden', value: student.wardenId?.firstName ? `${student.wardenId.firstName} ${student.wardenId.lastName || ''}`.trim() : null },
                { label: 'HOD', value: student.hodId?.name || null },
                { label: 'Counsellor', value: student.counsellorId?.firstName ? `${student.counsellorId.firstName} ${student.counsellorId.lastName || ''}`.trim() : null },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{item.label}</span>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {item.value || <span className="text-slate-400 dark:text-slate-500 font-normal">Not assigned</span>}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </Motion.div>
        )}

        {activeTab === 'Outpass History' && (
          <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Outpass History</h3>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs">{outpasses.length}</span>
                </div>
                <Button variant="ghost" size="sm" icon={ArrowPathIcon} onClick={fetchOutpasses}>Refresh</Button>
              </div>

              {loadingOutpasses ? (
                <div className="flex items-center justify-center py-16">
                  <ArrowPathIcon className="h-6 w-6 text-blue-500 animate-spin" />
                </div>
              ) : outpasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <ClockIcon className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">No outpass history found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Request ID</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Destination</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Leave Time</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Return Time</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {outpasses.map((op, i) => (
                        <Motion.tr
                          key={op._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                              {op.requestId || op._id?.slice(-8)?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                              {op.outpassType?.replace('_', ' ') || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-slate-700 dark:text-slate-300 max-w-[150px] truncate block">
                              {op.destination?.place || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {op.leaveTime
                                ? new Date(op.leaveTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                : '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {op.expectedReturnTime
                                ? new Date(op.expectedReturnTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                : '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={op.status} />
                          </td>
                        </Motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Motion.div>
        )}
      </div>
    </DashboardLayout>
  )
}