/**
 * Student Management Page — Redesigned
 * Clean table layout with stats, filters, and clickable rows
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  UserIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  XCircleIcon,
  ArrowPathIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import DashboardLayout from '../../layouts/DashboardLayout'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal, { ModalFooter } from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { useAssignmentOptions } from '../../hooks/useAssignmentOptions'
import { LoadingTable } from '../../components/ui/Loading'
import EmptyState from '../../components/ui/EmptyState'
import studentService from '../../services/studentService'
import userService from '../../services/userService'
import { DEPARTMENTS, HOSTEL_BLOCKS, ALL_BLOCKS, getBlocksForHostel, VALIDATION, COURSES } from '../../constants'

import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { selectUser } from '../../store/authSlice'

export default function StudentManagement() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    hostelBlock: '',
    yearOfStudy: '',
    status: '',
    hostelType: ''
  })
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editData, setEditData] = useState({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [addData, setAddData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    student: {
      rollNumber: '',
      year: '',
      yearOfStudy: '',
      course: '',
      semester: '',
      department: '',
      hostelType: '',
      hostelBlock: '',
      roomNumber: '',
      dateOfBirth: '',
      gender: '',
      permanentAddress: { street: '', city: '', state: '', zipCode: '', country: 'India' },
      parentDetails: {
        fatherName: '',
        motherName: '',
        guardianPhone: '',
        guardianEmail: ''
      }
    }
  })

  const currentUser = useSelector(selectUser)
  const navigate = useNavigate()

  // Assignment options for add modal (HOD + Counsellor only — warden is auto-assigned by block)
  const {
    hods: availableHods,
    counsellors: availableCounsellors
  } = useAssignmentOptions({
    hostelType: addData.student.hostelType,

  })

  // Assignment options for edit modal
  const {
    hods: editHods,
    counsellors: editCounsellors
  } = useAssignmentOptions({
    hostelType: editData.hostelType,
  })

  useEffect(() => {
    if (currentUser && !['admin', 'hod', 'warden', 'counsellor'].includes(currentUser.role)) {
      navigate('/')
    }
  }, [currentUser, navigate])

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true)
      const response = currentUser?.role === 'hod'
        ? await studentService.getForHod(filters)
        : await studentService.getAll(filters)

      let studentList = []
      if (Array.isArray(response)) {
        studentList = response
      } else if (response?.data?.students && Array.isArray(response.data.students)) {
        studentList = response.data.students
      } else if (response?.students && Array.isArray(response.students)) {
        studentList = response.students
      } else if (response?.data && Array.isArray(response.data)) {
        studentList = response.data
      } else if (Array.isArray(response?.data?.data)) {
        studentList = response.data.data
      } else if (Array.isArray(response?.data)) {
        studentList = response.data
      }
      setStudents(studentList)
    } catch (error) {
      console.error('Failed to fetch students:', error)
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [filters, currentUser?.role])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const filteredStudents = Array.isArray(students) ? students.filter(student => {
    const fullName = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase()
    const term = searchTerm.toLowerCase()
    return (
      fullName.includes(term) ||
      student.email?.toLowerCase().includes(term) ||
      student.rollNumber?.toLowerCase().includes(term) ||
      student.registerNumber?.toLowerCase().includes(term)
    )
  }) : []

  // Stats derived from student list
  const stats = {
    total: students.length,
    boys: students.filter(s => s.hostelType === 'boys').length,
    girls: students.filter(s => s.hostelType === 'girls').length,
    active: students.filter(s => s.status === 'active' || !s.status).length,
    suspended: students.filter(s => s.status === 'suspended').length,
  }

  const handleDelete = (student, e) => {
    e.stopPropagation()
    setSelectedStudent(student)
    setShowDeleteModal(true)
  }

  const handleEdit = (student, e) => {
    e.stopPropagation()
    setSelectedStudent(student)
    setEditData({
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      email: student.email || '',
      phone: student.phone || '',
      rollNumber: student.rollNumber || student.registerNumber || '',
      year: student.year || '',
      yearOfStudy: student.yearOfStudy || '',
      course: student.course || '',
      semester: student.semester || '',
      department: student.department || '',
      hostelType: student.hostelType || '',
      hostelBlock: student.hostelBlock || '',
      roomNumber: student.roomNumber || '',
      dateOfBirth: student.dateOfBirth || '',
      gender: student.gender || '',
      parentDetails: student.parentDetails || { fatherName: '', motherName: '', guardianPhone: '', guardianEmail: '' },
      permanentAddress: student.permanentAddress || { street: '', city: '', state: '', zipCode: '', country: 'India' },
      status: student.status || 'active',
      hodId: student.hodId || '',
      counsellorId: student.counsellorId || '',
    })
    setShowEditModal(true)
  }

  const saveEdit = async () => {
    try {
      await studentService.update(selectedStudent._id, editData)
      toast.success('Student updated')
      setShowEditModal(false)
      setSelectedStudent(null)
      setEditData({})
      fetchStudents()
    } catch (err) {
      let msg = err.response?.data?.message || 'Failed to update student'
      const errorsArr = err.response?.data?.errors
      if (Array.isArray(errorsArr) && errorsArr.length > 0 && errorsArr[0].message) {
        msg = errorsArr[0].message
      }
      toast.error(msg)
    }
  }

  const confirmDelete = async () => {
    try {
      await studentService.delete(selectedStudent._id)
      toast.success(`Student ${selectedStudent.firstName} ${selectedStudent.lastName} deleted successfully`)
      setShowDeleteModal(false)
      setSelectedStudent(null)
      fetchStudents()
    } catch (err) {
      console.error('Failed to delete student:', err)
      let msg = err.response?.data?.message || 'Failed to delete student'
      const errorsArr = err.response?.data?.errors
      if (Array.isArray(errorsArr) && errorsArr.length > 0 && errorsArr[0].message) {
        msg = errorsArr[0].message
      }
      toast.error(msg)
    }
  }

  // Safe helper to get blocks for a hostel type
  // const getBlocks = (hostelType) => {
  //   if (!hostelType) return ALL_BLOCKS || []
  //   return HOSTEL_BLOCKS[hostelType] || []
  // }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'suspended': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'inactive': return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
      default: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    }
  }

  const avatarColors = [
    'from-blue-500 to-blue-600',
    'from-violet-500 to-purple-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-teal-500 to-cyan-600',
    'from-indigo-500 to-blue-600',
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Student Management
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage and monitor all registered students
            </p>
          </div>
          {currentUser?.role === 'admin' && (
            <Button
              icon={UserPlusIcon}
              variant="primary"
              onClick={() => setShowAddModal(true)}
            >
              Add Student
            </Button>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total Students', value: stats.total, icon: '👥', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-800' },
            { label: 'Boys Hostel', value: stats.boys, icon: '🏠', color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400', border: 'border-indigo-100 dark:border-indigo-800' },
            { label: 'Girls Hostel', value: stats.girls, icon: '🏡', color: 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400', border: 'border-pink-100 dark:border-pink-800' },
            { label: 'Active', value: stats.active, icon: '✅', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-800' },
            { label: 'Suspended', value: stats.suspended, icon: '⚠️', color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400', border: 'border-red-100 dark:border-red-800' },
          ].map((stat, i) => (
            <Motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-xl border ${stat.border} bg-white dark:bg-slate-800 p-4 flex items-center gap-3`}
            >
              <span className={`text-2xl`}>{stat.icon}</span>
              <div>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{stat.label}</div>
              </div>
            </Motion.div>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <Input
                placeholder="Search by name, email, or register number..."
                icon={MagnifyingGlassIcon}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              placeholder="All Hostel Types"
              options={[
                { label: 'Boys Hostel', value: 'boys' },
                { label: 'Girls Hostel', value: 'girls' },
              ]}
              value={filters.hostelType}
              onChange={e => setFilters(f => ({ ...f, hostelType: e.target.value, hostelBlock: '' }))}
            />
            <Select
              placeholder="All Years"
              options={[1,2,3,4,5,6].map(y => ({ label: `Year ${y}`, value: String(y) }))}
              value={filters.yearOfStudy}
              onChange={e => setFilters(f => ({ ...f, yearOfStudy: e.target.value }))}
            />
          </div>

          {/* Active Filters */}
          <AnimatePresence>
            {(filters.hostelBlock || filters.yearOfStudy || filters.hostelType || searchTerm) && (
              <Motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 flex flex-wrap items-center gap-2"
              >
                <span className="text-xs text-slate-500">Active filters:</span>
                {searchTerm && <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium dark:bg-blue-900/30 dark:text-blue-300">Search: {searchTerm}</span>}
                {filters.hostelType && <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium dark:bg-indigo-900/30 dark:text-indigo-300">{filters.hostelType === 'boys' ? 'Boys Hostel' : 'Girls Hostel'}</span>}
                {filters.yearOfStudy && <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium dark:bg-emerald-900/30 dark:text-emerald-300">Year {filters.yearOfStudy}</span>}
                <button
                  onClick={() => { setSearchTerm(''); setFilters({ hostelBlock: '', yearOfStudy: '', status: '', hostelType: '' }) }}
                  className="ml-auto text-xs text-slate-500 hover:text-red-500 transition-colors"
                >
                  Clear all
                </button>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Students Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Students List
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium">
                {filteredStudents.length}
              </span>
            </div>
            <Button variant="ghost" size="sm" icon={ArrowPathIcon} onClick={fetchStudents}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="p-6">
              <LoadingTable rows={5} columns={6} />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={UserIcon}
                title="No students found"
                description="Try adjusting your search or filter criteria"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reg No.</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Year</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Room</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredStudents.map((student, index) => (
                    <Motion.tr
                      key={student._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => navigate(`/students/${student._id}`)}
                      className="group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${avatarColors[index % avatarColors.length]} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-white text-sm font-semibold">
                              {student.firstName?.charAt(0)?.toUpperCase() || 'S'}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {student.firstName} {student.lastName}
                            </div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[180px]">
                              {student.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-slate-700 dark:text-slate-300">
                          {student.rollNumber || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{student.department || '—'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Year {student.yearOfStudy || student.year || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {student.hostelBlock && student.roomNumber
                            ? `${student.hostelBlock}-${student.roomNumber}`
                            : student.hostelBlock || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(student.status)}`}>
                          {student.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => navigate(`/students/${student._id}`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="View"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {currentUser?.role === 'admin' && (
                            <>
                              <button
                                onClick={(e) => handleEdit(student, e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => handleDelete(student, e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Delete"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <ChevronRightIcon className="h-4 w-4 text-slate-300 dark:text-slate-600 ml-1 group-hover:text-blue-400 transition-colors" />
                        </div>
                      </td>
                    </Motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Student Modal ── */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Student" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={addData.firstName} onChange={e => setAddData(p => ({ ...p, firstName: e.target.value }))} />
            <Input label="Last Name" value={addData.lastName} onChange={e => setAddData(p => ({ ...p, lastName: e.target.value }))} />
          </div>
          <Input label="Email" type="email" value={addData.email} onChange={e => setAddData(p => ({ ...p, email: e.target.value }))} />
          <Input label="Phone" type="tel" value={addData.phone} onChange={e => setAddData(p => ({ ...p, phone: e.target.value }))} />
          <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
            📧 A secure password will be generated and emailed to the student on first login.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Register Number" value={addData.student.rollNumber} onChange={e => setAddData(p => ({ ...p, student: { ...p.student, rollNumber: e.target.value } }))} />
            <Input label="Academic Year" type="number" placeholder="e.g. 2025" value={addData.student.year} onChange={e => setAddData(p => ({ ...p, student: { ...p.student, year: e.target.value } }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Course" value={addData.student.course} onChange={e => setAddData(p => ({ ...p, student: { ...p.student, course: e.target.value } }))}>
              <option value="">Select Course</option>
              {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select label="Semester" value={addData.student.semester} onChange={e => setAddData(p => ({ ...p, student: { ...p.student, semester: e.target.value } }))}>
              <option value="">Select Semester</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Year of Study" value={addData.student.yearOfStudy} onChange={e => setAddData(p => ({ ...p, student: { ...p.student, yearOfStudy: e.target.value } }))}>
              <option value="">Select Year</option>
              {[1,2,3,4,5,6].map(y => <option key={y} value={y}>{y}{y===1?'st':y===2?'nd':y===3?'rd':'th'} Year</option>)}
            </Select>
            <Select label="Department" value={addData.student.department} onChange={e => setAddData(p => ({ ...p, student: { ...p.student, department: e.target.value } }))}>
              <option value="">Select Department</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Hostel Type" value={addData.student.hostelType} onChange={e => setAddData(p => ({ ...p, student: { ...p.student, hostelType: e.target.value, hostelBlock: '' } }))}>
              <option value="">Select Hostel Type</option>
              <option value="boys">Boys Hostel</option>
              <option value="girls">Girls Hostel</option>
            </Select>
            <Select label="Hostel Block" value={addData.student.hostelBlock} onChange={e => setAddData(p => ({ ...p, student: { ...p.student, hostelBlock: e.target.value } }))}>
              <option value="">Select Block</option>
              {getBlocksForHostel(addData.student.hostelType).map(b => <option key={b} value={b}>Block {b}</option>)}
            </Select>
          </div>

          <Input label="Room Number" value={addData.student.roomNumber} onChange={e => setAddData(p => ({ ...p, student: { ...p.student, roomNumber: e.target.value } }))} />

          {/* Staff Assignment — Warden is auto-assigned by block */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Staff Assignment</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
              Warden is auto-assigned based on hostel block. Assign HOD and Counsellor manually.
            </p>
            <div className="space-y-3">
              <Select
                label="Assign HOD"
                value={addData.student.hodId || ''}
                onChange={e => setAddData(p => ({ ...p, student: { ...p.student, hodId: e.target.value } }))}
              >
                <option value="">Assign a Hod</option>
                {availableHods.map(h => (
                  <option key={h._id} value={h._id}>
                    {[h.firstName, h.lastName].filter(Boolean).join(' ') || h.name || 'Unnamed'} — {h.department}
                  </option>
                ))}
              </Select>
              <Select
                label="Assign Counsellor"
                value={addData.student.counsellorId || ''}
                onChange={e => setAddData(p => ({ ...p, student: { ...p.student, counsellorId: e.target.value } }))}
              >
                <option value="">Assign a Counsellor</option>
                {availableCounsellors.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.firstName} {c.lastName} — {c.department}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Permanent Address */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Permanent Address</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Street" value={addData.student.permanentAddress.street} onChange={e => setAddData(p => ({ ...p, student: { ...p.student, permanentAddress: { ...p.student.permanentAddress, street: e.target.value } } }))} />
              <Input label="City" value={addData.student.permanentAddress.city} onChange={e => setAddData(p => ({ ...p, student: { ...p.student, permanentAddress: { ...p.student.permanentAddress, city: e.target.value } } }))} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input label="State" value={addData.student.permanentAddress.state} onChange={e => setAddData(p => ({ ...p, student: { ...p.student, permanentAddress: { ...p.student.permanentAddress, state: e.target.value } } }))} />
              <Input label="Zip Code" value={addData.student.permanentAddress.zipCode} onChange={e => setAddData(p => ({ ...p, student: { ...p.student, permanentAddress: { ...p.student.permanentAddress, zipCode: e.target.value } } }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Date of Birth" type="date" value={addData.student.dateOfBirth} onChange={e => setAddData(p => ({ ...p, student: { ...p.student, dateOfBirth: e.target.value } }))} />
            <Select label="Gender" value={addData.student.gender} onChange={e => setAddData(p => ({ ...p, student: { ...p.student, gender: e.target.value } }))}>
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </div>

          {/* Parent Details */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Parent / Guardian Details</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Father's Name" value={addData.student.parentDetails.fatherName} onChange={e => setAddData(p => ({ ...p, student: { ...p.student, parentDetails: { ...p.student.parentDetails, fatherName: e.target.value } } }))} />
              <Input label="Mother's Name" value={addData.student.parentDetails.motherName} onChange={e => setAddData(p => ({ ...p, student: { ...p.student, parentDetails: { ...p.student.parentDetails, motherName: e.target.value } } }))} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input label="Guardian Phone" value={addData.student.parentDetails.guardianPhone} onChange={e => setAddData(p => ({ ...p, student: { ...p.student, parentDetails: { ...p.student.parentDetails, guardianPhone: e.target.value } } }))} />
              <Input label="Guardian Email" value={addData.student.parentDetails.guardianEmail} onChange={e => setAddData(p => ({ ...p, student: { ...p.student, parentDetails: { ...p.student.parentDetails, guardianEmail: e.target.value } } }))} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={async () => {
              try {
                const phone = addData.phone?.trim()
                if (phone && !VALIDATION.PHONE_PATTERN.test(phone)) {
                  toast.error('Phone must be 10-15 digits')
                  return
                }
                const guardianPhone = addData.student.parentDetails.guardianPhone?.trim()
                const guardianEmail = addData.student.parentDetails.guardianEmail?.trim()
                if (guardianPhone && !VALIDATION.PHONE_PATTERN.test(guardianPhone)) {
                  toast.error('Guardian phone must be 10-15 digits')
                  return
                }
                if (guardianEmail && !VALIDATION.EMAIL_PATTERN.test(guardianEmail)) {
                  toast.error('Guardian email is invalid')
                  return
                }

                const payload = {
                  firstName: addData.firstName,
                  lastName: addData.lastName,
                  email: addData.email,
                  phone: addData.phone,
                  role: 'student',
                  student: {
                    rollNumber: addData.student.rollNumber,
                    year: Number(addData.student.year),
                    yearOfStudy: Number(addData.student.yearOfStudy),
                    course: addData.student.course,
                    semester: Number(addData.student.semester),
                    department: addData.student.department,
                    hostelType: addData.student.hostelType,
                    hostelBlock: addData.student.hostelBlock,
                    roomNumber: addData.student.roomNumber,
                    dateOfBirth: addData.student.dateOfBirth,
                    gender: addData.student.gender,
                    parentDetails: addData.student.parentDetails,
                    permanentAddress: addData.student.permanentAddress,
                    ...(addData.student.hodId ? { hodId: addData.student.hodId } : {}),
                    ...(addData.student.counsellorId ? { counsellorId: addData.student.counsellorId } : {}),
                    // Warden is auto-assigned by the backend based on hostelBlock
                  }
                }

                const res = await userService.create(payload)
                toast.success('Student created successfully')

                try {
                  const respData = res?.data || res
                  if (respData?.message) toast.success(respData.message)
                  else toast('A secure password has been generated and emailed to the student.', { icon: '✉️' })
                  const verificationCode = respData?.data?.verificationCode || respData?.verificationCode
                  if (verificationCode) toast(`Verification code (dev): ${verificationCode}`, { icon: '🔑' })
                } catch (e) {
                  console.debug('Could not extract email info from response', e)
                }

                setShowAddModal(false)
                setAddData({
                  firstName: '', lastName: '', email: '', phone: '',
                  student: {
                    rollNumber: '', year: '', yearOfStudy: '', course: '', semester: '',
                    department: '', hostelType: '', hostelBlock: '', roomNumber: '',
                    dateOfBirth: '', gender: '',
                    permanentAddress: { street: '', city: '', state: '', zipCode: '', country: 'India' },
                    parentDetails: { fatherName: '', motherName: '', guardianPhone: '', guardianEmail: '' }
                  }
                })
                fetchStudents()
              } catch (err) {
                console.error('Failed to create student:', err)
                let msg = err.response?.data?.message || 'Failed to create student'
                const errorsArr = err.response?.data?.errors
                if (Array.isArray(errorsArr) && errorsArr.length > 0 && errorsArr[0].message) msg = errorsArr[0].message
                toast.error(msg)
              }
            }}>Create Student</Button>
          </div>
        </div>
      </Modal>

      {/* ── Edit Student Modal ── */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Student" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={editData.firstName || ''} onChange={e => setEditData(p => ({ ...p, firstName: e.target.value }))} />
            <Input label="Last Name" value={editData.lastName || ''} onChange={e => setEditData(p => ({ ...p, lastName: e.target.value }))} />
          </div>
          <Input label="Email" type="email" value={editData.email || ''} onChange={e => setEditData(p => ({ ...p, email: e.target.value }))} />
          <Input label="Phone" type="tel" value={editData.phone || ''} onChange={e => setEditData(p => ({ ...p, phone: e.target.value }))} />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Register / Roll Number" value={editData.rollNumber || ''} onChange={e => setEditData(p => ({ ...p, rollNumber: e.target.value }))} />
            <Input label="Academic Year" type="number" value={editData.year || ''} onChange={e => setEditData(p => ({ ...p, year: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Course" value={editData.course || ''} onChange={e => setEditData(p => ({ ...p, course: e.target.value }))}>
              <option value="">Select Course</option>
              {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select label="Semester" value={editData.semester || ''} onChange={e => setEditData(p => ({ ...p, semester: e.target.value }))}>
              <option value="">Select Semester</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Department" value={editData.department || ''} onChange={e => setEditData(p => ({ ...p, department: e.target.value }))}>
              <option value="">Select Department</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
            <Select label="Hostel Type" value={editData.hostelType || ''} onChange={e => setEditData(p => ({ ...p, hostelType: e.target.value, hostelBlock: '' }))}>
              <option value="">Select Hostel Type</option>
              <option value="boys">Boys Hostel</option>
              <option value="girls">Girls Hostel</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Hostel Block" value={editData.hostelBlock || ''} onChange={e => setEditData(p => ({ ...p, hostelBlock: e.target.value }))}>
              <option value="">Select Block</option>
              {getBlocksForHostel(editData.hostelType).map(b => <option key={b} value={b}>Block {b}</option>)}
            </Select>
            <Input label="Room Number" value={editData.roomNumber || ''} onChange={e => setEditData(p => ({ ...p, roomNumber: e.target.value }))} />
          </div>

          {/* Address */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Permanent Address</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Street" value={editData.permanentAddress?.street || ''} onChange={e => setEditData(p => ({ ...p, permanentAddress: { ...p.permanentAddress, street: e.target.value } }))} />
              <Input label="City" value={editData.permanentAddress?.city || ''} onChange={e => setEditData(p => ({ ...p, permanentAddress: { ...p.permanentAddress, city: e.target.value } }))} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input label="State" value={editData.permanentAddress?.state || ''} onChange={e => setEditData(p => ({ ...p, permanentAddress: { ...p.permanentAddress, state: e.target.value } }))} />
              <Input label="Zip Code" value={editData.permanentAddress?.zipCode || ''} onChange={e => setEditData(p => ({ ...p, permanentAddress: { ...p.permanentAddress, zipCode: e.target.value } }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Date of Birth" type="date" value={editData.dateOfBirth || ''} onChange={e => setEditData(p => ({ ...p, dateOfBirth: e.target.value }))} />
            <Select label="Gender" value={editData.gender || ''} onChange={e => setEditData(p => ({ ...p, gender: e.target.value }))}>
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </div>

          {/* Parent Details */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Parent / Guardian</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Father's Name" value={editData.parentDetails?.fatherName || ''} onChange={e => setEditData(p => ({ ...p, parentDetails: { ...p.parentDetails, fatherName: e.target.value } }))} />
              <Input label="Mother's Name" value={editData.parentDetails?.motherName || ''} onChange={e => setEditData(p => ({ ...p, parentDetails: { ...p.parentDetails, motherName: e.target.value } }))} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input label="Guardian Phone" value={editData.parentDetails?.guardianPhone || ''} onChange={e => setEditData(p => ({ ...p, parentDetails: { ...p.parentDetails, guardianPhone: e.target.value } }))} />
              <Input label="Guardian Email" value={editData.parentDetails?.guardianEmail || ''} onChange={e => setEditData(p => ({ ...p, parentDetails: { ...p.parentDetails, guardianEmail: e.target.value } }))} />
            </div>
          </div>

          <Select label="Status" value={editData.status || 'active'} onChange={e => setEditData(p => ({ ...p, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </Select>

          {/* Staff Assignment — HOD and Counsellor only */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Staff Assignment</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
              Warden is auto-assigned based on hostel block.
            </p>
            <div className="space-y-3">
              <Select
                label="HOD"
                value={editData.hodId || ''}
                onChange={e => setEditData(p => ({ ...p, hodId: e.target.value }))}
              >
                <option value="">— Keep current —</option>
                {editHods.map(h => (
                <option key={h._id} value={h._id}>
                  {[h.firstName, h.lastName].filter(Boolean).join(' ') || h.name || 'Unnamed'} — {h.department}
                </option>
              ))}
              </Select>
              <Select
                label="Counsellor"
                value={editData.counsellorId || ''}
                onChange={e => setEditData(p => ({ ...p, counsellorId: e.target.value }))}
              >
                <option value="">— Keep current —</option>
                {editCounsellors.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.firstName} {c.lastName} — {c.department}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={saveEdit}>Save Changes</Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirm Delete" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <XCircleIcon className="h-8 w-8 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-900 dark:text-red-100">Delete Student?</p>
              <p className="text-sm text-red-600 dark:text-red-300">This action cannot be undone</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete{' '}
            <strong className="text-slate-900 dark:text-white">
              {selectedStudent?.firstName} {selectedStudent?.lastName}
            </strong>?
            All their data will be permanently removed.
          </p>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete Student</Button>
          </ModalFooter>
        </div>
      </Modal>
    </DashboardLayout>
  )
}