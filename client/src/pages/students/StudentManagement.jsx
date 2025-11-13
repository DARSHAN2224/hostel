/**
 * Student Management Page - Ultra Modern
 * Manage all students with advanced search, filters, and actions
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserPlusIcon,
  UserIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import DashboardLayout from '../../layouts/DashboardLayout'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal, { ModalFooter } from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { LoadingTable } from '../../components/ui/Loading'
import EmptyState from '../../components/ui/EmptyState'
import studentService from '../../services/studentService'
import userService from '../../services/userService'
import { DEPARTMENTS, HOSTEL_BLOCKS, VALIDATION, COURSES } from '../../constants'

import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { selectUser } from '../../store/authSlice'

export default function StudentManagement() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    hostelBlock: '',
    year: '',
    status: ''
  })
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
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
      permanentAddress: { street: '', city: '', state: '', zipCode: '', country: 'India' },
      emergencyContact: { name: '', phone: '', relationship: '' },
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

  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/')
    }
  }, [currentUser, navigate])

  const revealPassword = async (role, id) => {
    if (!id) return
    try {
      const resp = await userService.getCredential(role, id)
      const pwd = resp?.data?.password || resp?.password || resp?.data?.data?.password
      if (pwd) {
        setStudents(prev => prev.map(s => s._id === id ? { ...s, generatedPassword: pwd } : s))
        toast.success('Password revealed')
      } else {
        toast.error('No stored password found')
      }
    } catch (err) {
      // If credential not found, guide admin to use reset flow instead of showing a raw error
      if (err?.response?.status === 404) {
        toast('No stored generated password found for this user. You can send a password reset notification to the user instead.', { icon: 'ℹ️' })
      } else {
        console.error('Failed to reveal password', err)
        toast.error(err.response?.data?.message || 'Failed to reveal password')
      }
    }
  }

  const triggerReset = async (role, id) => {
    if (!id) return
    try {
      await userService.resetPassword(role, id)
      toast.success('Password reset requested and user notified')
    } catch (err) {
      console.error('Reset request failed', err)
      toast.error(err.response?.data?.message || 'Failed to request password reset')
    }
  }

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true)
      const response = await studentService.getAll(filters)
      // Robustly extract student array from any backend response structure
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
      setStudents([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const filteredStudents = Array.isArray(students) ? students.filter(student =>
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.registerNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : []

  const handleView = (student) => {
    setSelectedStudent(student)
    setShowViewModal(true)
  }

  const handleDelete = (student) => {
    setSelectedStudent(student)
    setShowDeleteModal(true)
  }

  const handleEdit = (student) => {
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
      parentDetails: student.parentDetails || { fatherName: '', motherName: '', guardianPhone: '', guardianEmail: '' },
      permanentAddress: student.permanentAddress || { street: '', city: '', state: '', zipCode: '', country: 'India' },
      emergencyContact: student.emergencyContact || { name: '', phone: '', relationship: '' },
      status: student.status || 'active'
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
      let msg = err.response?.data?.message || 'Failed to update student';
      const errorsArr = err.response?.data?.errors;
      if (Array.isArray(errorsArr) && errorsArr.length > 0 && errorsArr[0].message) {
        msg = errorsArr[0].message;
      }
      toast.error(msg);
    }
  }

  const suspendStudent = async () => {
    try {
      await studentService.suspend(selectedStudent._id, 'Violation of rules')
      toast.success('Student suspended')
      setShowViewModal(false)
      fetchStudents()
    } catch {
      toast.error('Failed to suspend')
    }
  }

  const activateStudent = async () => {
    try {
      await studentService.activate(selectedStudent._id)
      toast.success('Student activated')
      setShowViewModal(false)
      fetchStudents()
    } catch {
      toast.error('Failed to activate')
    }
  }

  const confirmDelete = async () => {
    try {
      await studentService.delete(selectedStudent._id)
      toast.success(`Student ${selectedStudent.firstName} ${selectedStudent.lastName} deleted successfully`)
      setShowDeleteModal(false)
      setSelectedStudent(null)
      fetchStudents() // Refresh the list
    } catch (err) {
      console.error('Failed to delete student:', err)
      let msg = err.response?.data?.message || 'Failed to delete student';
      const errorsArr = err.response?.data?.errors;
      if (Array.isArray(errorsArr) && errorsArr.length > 0 && errorsArr[0].message) {
        msg = errorsArr[0].message;
      }
      toast.error(msg);
    }
  }

  // Helper function to render table content
  const renderTableContent = () => {
    if (loading) {
      return <LoadingTable rows={5} columns={6} />
    }
    
    if (filteredStudents.length === 0) {
      return (
        <EmptyState
          icon={FunnelIcon}
          title="No students found"
          description="Try adjusting your search or filter criteria"
        />
      )
    }
    
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                Student
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                Register No
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                Department
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                Year
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                Hostel
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                Password
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white/50 dark:bg-slate-800/50">
            {filteredStudents.map((student, index) => (
              <Motion.tr
                key={student._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                className="transition-all duration-200"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Motion.div
                      className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <UserIcon className="h-6 w-6 text-white" />
                    </Motion.div>
                    <div className="ml-4">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {student.firstName} {student.lastName}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {student.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white font-medium">
                  {student.rollNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant="info">
                    {student.department}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant="primary">
                    Academic Year {student.year}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant="success">
                    {student.hostel}
                  </Badge>
                </td>

                {/* Password column - admin only */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white font-medium">
                  {currentUser?.role === 'admin' ? (
                    <div className="flex items-center gap-2">
                      {(student.generatedPassword || student.generated_password || student.plainPassword || student.password) ? (
                        <span className="font-mono text-sm text-blue-700 dark:text-blue-300">{student.generatedPassword || student.generated_password || student.plainPassword || student.password}</span>
                      ) : (
                        <span className="text-sm text-slate-500">—</span>
                      )}
                      <button onClick={() => revealPassword('student', student._id)} title="Reveal stored password" className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
                        <EyeIcon className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                      </button>
                      <button onClick={() => triggerReset('student', student._id)} title="Request password reset" className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
                        <ArrowPathIcon className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-500">Hidden</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <Motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleView(student)}
                      className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="View Details"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </Motion.button>
                    <Motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEdit(student)}
                      className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </Motion.button>
                    <Motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDelete(student)}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </Motion.button>
                  </div>
                </td>
              </Motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    )
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
              Student Management
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Manage and monitor all registered students
            </p>
          </div>
          <Button
            icon={UserPlusIcon}
            variant="primary"
            className="shadow-lg shadow-blue-500/30"
            onClick={() => setShowAddModal(true)}
          >
            Add Student
          </Button>
        </div>

        {/* Search and Filters */}
        <Card glassmorphic gradient>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <Input
                placeholder="Search by name, email, or register number..."
                icon={MagnifyingGlassIcon}
                value={searchTerm}
                onChange={handleSearch}
                glassmorphic
                className="bg-white dark:bg-slate-900"
              />
            </div>

            {/* Hostel Block Filter */}
            <Select
              placeholder="All Blocks"
              options={[
                { label: 'Block A', value: 'A' },
                { label: 'Block B', value: 'B' },
                { label: 'Block C', value: 'C' },
                { label: 'Block D', value: 'D' }
              ]}
              value={filters.hostelBlock}
              onChange={(e) => setFilters({ ...filters, hostelBlock: e.target.value })}
              glassmorphic
              className="bg-white dark:bg-slate-900"
            />

            {/* Academic Year Filter */}
            <Select
              placeholder="All Academic Years"
              options={[
                { label: '2022', value: '2022' },
                { label: '2023', value: '2023' },
                { label: '2024', value: '2024' },
                { label: '2025', value: '2025' },
                { label: '2026', value: '2026' }
              ]}
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              glassmorphic
              className="bg-white dark:bg-slate-900"
            />
          </div>

          {/* Active Filters */}
          <AnimatePresence>
            {(filters.hostelBlock || filters.year || searchTerm) && (
              <Motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 flex items-center gap-2"
              >
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Active filters:
                </span>
                {searchTerm && (
                  <Badge variant="primary">
                    Search: {searchTerm}
                  </Badge>
                )}
                {filters.hostelBlock && (
                  <Badge variant="info">
                    Block: {filters.hostelBlock}
                  </Badge>
                )}
                {filters.year && (
                  <Badge variant="success">
                    Year: {filters.year}
                  </Badge>
                )}
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setFilters({ hostelBlock: '', year: '', status: '' })
                  }}
                  className="ml-auto text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Clear all
                </button>
              </Motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Students Table */}
        <Card glassmorphic>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">
              Students List
              {' '}
              <span className="ml-3 text-sm font-normal text-slate-500 dark:text-slate-400">
                ({filteredStudents.length} students)
              </span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              icon={ArrowPathIcon}
              onClick={fetchStudents}
            >
              Refresh
            </Button>
          </div>

          {renderTableContent()}
        </Card>
      </Motion.div>

      {/* View Student Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Student Details"
        gradient
        size="lg"
      >
        {selectedStudent && (
          <div className="space-y-6">
            {/* Student Header */}
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-3xl">
                  {selectedStudent.name?.charAt(0) || 'S'}
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedStudent.name}
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  {selectedStudent.email}
                </p>
              </div>
            </div>

            {/* Student Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Register Number</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  {selectedStudent.registerNumber || 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Hostel Block</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  Block {selectedStudent.hostelBlock || 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Academic Year</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  {selectedStudent.year || 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  {selectedStudent.phone || 'N/A'}
                </p>
              </div>
              {/* Parent Info */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Parent / Guardian</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  {selectedStudent.parentDetails?.fatherName || selectedStudent.parentDetails?.motherName || 'N/A'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedStudent.parentDetails?.guardianPhone ? `Phone: ${selectedStudent.parentDetails.guardianPhone}` : ''}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedStudent.parentDetails?.guardianEmail ? `Email: ${selectedStudent.parentDetails.guardianEmail}` : ''}
                </p>
              </div>
            </div>

            <ModalFooter>
              <Button
                variant="ghost"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </Button>
              <Button variant="warning" onClick={suspendStudent}>
                Suspend
              </Button>
              <Button variant="success" onClick={activateStudent}>
                Activate
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      {/* Add Student Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Student"
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={addData.firstName} onChange={(e)=>setAddData(prev=>({...prev, firstName: e.target.value}))} />
            <Input label="Last Name" value={addData.lastName} onChange={(e)=>setAddData(prev=>({...prev, lastName: e.target.value}))} />
          </div>
          <Input label="Email" type="email" value={addData.email} onChange={(e)=>setAddData(prev=>({...prev, email: e.target.value}))} />
          <Input label="Phone" type="tel" value={addData.phone} onChange={(e)=>setAddData(prev=>({...prev, phone: e.target.value}))} />
          {/* Password is generated by the system and emailed to the student. Admins do not set passwords here. */}
          <p className="text-sm text-slate-500 dark:text-slate-400">A secure password will be generated and emailed to the student. They will be required to change it on first login.</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Register Number" value={addData.student.rollNumber} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, rollNumber: e.target.value}}))} />
            <Input label="Academic Year" type="number" placeholder="e.g. 2025" value={addData.student.year} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, year: e.target.value}}))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Course" value={addData.student.course} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, course: e.target.value}}))}>
              <option value="">Select Course</option>
              {/** Courses come from constants */}
              {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select label="Semester" value={addData.student.semester} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, semester: e.target.value}}))}>
              <option value="">Select Semester</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </Select>
          </div>
          {/* Year of Study select (1..6) */}
          <div className="grid grid-cols-2 gap-4">
            <Select label="Year of Study" value={addData.student.yearOfStudy} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, yearOfStudy: e.target.value}}))}>
              <option value="">Select Year of Study</option>
              {[1,2,3,4,5,6].map(y => <option key={y} value={y}>{y}{y===1? 'st': y===2? 'nd': y===3? 'rd':'th'} Year</option>)}
            </Select>
            <div />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Department" value={addData.student.department} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, department: e.target.value}}))}>
              <option value="">Select Department</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
            <Select label="Hostel Type" value={addData.student.hostelType} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, hostelType: e.target.value}}))}>
              <option value="">Select Hostel Type</option>
              <option value="boys">Boys Hostel</option>
              <option value="girls">Girls Hostel</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Hostel Block" value={addData.student.hostelBlock} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, hostelBlock: e.target.value}}))}>
              <option value="">Select Block</option>
              {HOSTEL_BLOCKS.map(b => <option key={b} value={b}>Block {b}</option>)}
            </Select>
            <Input label="Room Number" value={addData.student.roomNumber} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, roomNumber: e.target.value}}))} />
          </div>
          {/* Permanent Address */}
          <div className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Permanent Address</div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Street" value={addData.student.permanentAddress.street} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, permanentAddress: {...prev.student.permanentAddress, street: e.target.value}}}))} />
            <Input label="City" value={addData.student.permanentAddress.city} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, permanentAddress: {...prev.student.permanentAddress, city: e.target.value}}}))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="State" value={addData.student.permanentAddress.state} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, permanentAddress: {...prev.student.permanentAddress, state: e.target.value}}}))} />
            <Input label="Zip Code" value={addData.student.permanentAddress.zipCode} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, permanentAddress: {...prev.student.permanentAddress, zipCode: e.target.value}}}))} />
          </div>

          {/* Emergency Contact */}
          <div className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Emergency Contact</div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" value={addData.student.emergencyContact.name} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, emergencyContact: {...prev.student.emergencyContact, name: e.target.value}}}))} />
            <Input label="Phone" value={addData.student.emergencyContact.phone} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, emergencyContact: {...prev.student.emergencyContact, phone: e.target.value}}}))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Relationship" value={addData.student.emergencyContact.relationship} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, emergencyContact: {...prev.student.emergencyContact, relationship: e.target.value}}}))} />
            <div />
          </div>
          {/* Parent / Guardian Details */}
          <div className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Parent / Guardian Details</div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Father's Name" value={addData.student.parentDetails.fatherName} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, parentDetails: {...prev.student.parentDetails, fatherName: e.target.value}}}))} />
            <Input label="Mother's Name" value={addData.student.parentDetails.motherName} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, parentDetails: {...prev.student.parentDetails, motherName: e.target.value}}}))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Guardian Phone" value={addData.student.parentDetails.guardianPhone} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, parentDetails: {...prev.student.parentDetails, guardianPhone: e.target.value}}}))} />
            <Input label="Guardian Email" value={addData.student.parentDetails.guardianEmail} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, parentDetails: {...prev.student.parentDetails, guardianEmail: e.target.value}}}))} />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={()=>setShowAddModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={async ()=>{
              try{
                // Compose payload expected by managed create endpoint
                // basic client-side validation for phone & parent contact fields
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
                    semester: addData.student.semester,
                    department: addData.student.department,
                    hostelType: addData.student.hostelType,
                    hostelBlock: addData.student.hostelBlock,
                    roomNumber: addData.student.roomNumber,
                    parentDetails: addData.student.parentDetails,
                    permanentAddress: addData.student.permanentAddress,
                    emergencyContact: addData.student.emergencyContact
                  }
                }
                const res = await studentService.create(payload)
                toast.success('Student created successfully')

                // Inform admin that credentials were generated and emailed
                try {
                  const respData = res?.data || res
                  if (respData?.message) {
                    // If backend provided a friendly message about email sending, show it
                    toast.success(respData.message)
                  } else {
                    toast('A secure password has been generated and emailed to the student.', { icon: '✉️' })
                  }

                  // Expose verification code in development if backend included it
                  const verificationCode = respData?.data?.verificationCode || respData?.verificationCode
                  if (verificationCode) {
                    toast(`Verification code (dev): ${verificationCode}`, { icon: '🔑' })
                  }
                } catch (e) {
                  // Non-critical: ignore any toast extraction errors
                  console.debug('Could not extract email info from response', e)
                }

                setShowAddModal(false)
                setAddData({ firstName: '', lastName: '', email: '', phone: '', student: { rollNumber: '', year: '', yearOfStudy: '', course: '', semester: '', department: '', hostelType: '', hostelBlock: '', roomNumber: '', permanentAddress: { street: '', city: '', state: '', zipCode: '', country: 'India' }, emergencyContact: { name: '', phone: '', relationship: '' }, parentDetails: { fatherName: '', motherName: '', guardianPhone: '', guardianEmail: '' } } })
                fetchStudents()
              }catch(err){
                console.error('Failed to create student:', err)
                let msg = err.response?.data?.message || 'Failed to create student';
                const errorsArr = err.response?.data?.errors;
                if (Array.isArray(errorsArr) && errorsArr.length > 0 && errorsArr[0].message) {
                  msg = errorsArr[0].message;
                }
                toast.error(msg);
              }
            }}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Student"
        size="md"
      >
        <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="First Name" value={editData.firstName || ''} onChange={(e)=>setEditData(prev=>({...prev, firstName:e.target.value}))} />
                <Input label="Last Name" value={editData.lastName || ''} onChange={(e)=>setEditData(prev=>({...prev, lastName:e.target.value}))} />
              </div>
              <Input label="Email" type="email" value={editData.email || ''} onChange={(e)=>setEditData(prev=>({...prev, email:e.target.value}))} />
              <Input label="Phone" type="tel" value={editData.phone || ''} onChange={(e)=>setEditData(prev=>({...prev, phone:e.target.value}))} />

              <div className="grid grid-cols-2 gap-4">
                <Input label="Register / Roll Number" value={editData.rollNumber || ''} onChange={(e)=>setEditData(prev=>({...prev, rollNumber:e.target.value}))} />
                <Input label="Academic Year" type="number" value={editData.year || ''} onChange={(e)=>setEditData(prev=>({...prev, year:e.target.value}))} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select label="Course" value={editData.course || ''} onChange={(e)=>setEditData(prev=>({...prev, course: e.target.value}))}>
                  <option value="">Select Course</option>
                  {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
                <Select label="Semester" value={editData.semester || ''} onChange={(e)=>setEditData(prev=>({...prev, semester:e.target.value}))}>
                  <option value="">Select Semester</option>
                  {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select label="Department" value={editData.department || ''} onChange={(e)=>setEditData(prev=>({...prev, department: e.target.value}))}>
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
                <Select label="Hostel Type" value={editData.hostelType || ''} onChange={(e)=>setEditData(prev=>({...prev, hostelType: e.target.value}))}>
                  <option value="">Select Hostel Type</option>
                  <option value="boys">Boys Hostel</option>
                  <option value="girls">Girls Hostel</option>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select label="Hostel Block" value={editData.hostelBlock || ''} onChange={(e)=>setEditData(prev=>({...prev, hostelBlock:e.target.value}))}>
                  <option value="">Select Block</option>
                  {HOSTEL_BLOCKS.map(b => <option key={b} value={b}>Block {b}</option>)}
                </Select>
                <Input label="Room Number" value={editData.roomNumber || ''} onChange={(e)=>setEditData(prev=>({...prev, roomNumber:e.target.value}))} />
              </div>

              {/* Permanent Address */}
              <div className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Permanent Address</div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Street" value={editData.permanentAddress?.street || ''} onChange={(e)=>setEditData(prev=>({...prev, permanentAddress: {...prev.permanentAddress, street: e.target.value}}))} />
                <Input label="City" value={editData.permanentAddress?.city || ''} onChange={(e)=>setEditData(prev=>({...prev, permanentAddress: {...prev.permanentAddress, city: e.target.value}}))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="State" value={editData.permanentAddress?.state || ''} onChange={(e)=>setEditData(prev=>({...prev, permanentAddress: {...prev.permanentAddress, state: e.target.value}}))} />
                <Input label="Zip Code" value={editData.permanentAddress?.zipCode || ''} onChange={(e)=>setEditData(prev=>({...prev, permanentAddress: {...prev.permanentAddress, zipCode: e.target.value}}))} />
              </div>

              {/* Emergency Contact */}
              <div className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Emergency Contact</div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Name" value={editData.emergencyContact?.name || ''} onChange={(e)=>setEditData(prev=>({...prev, emergencyContact: {...prev.emergencyContact, name: e.target.value}}))} />
                <Input label="Phone" value={editData.emergencyContact?.phone || ''} onChange={(e)=>setEditData(prev=>({...prev, emergencyContact: {...prev.emergencyContact, phone: e.target.value}}))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Relationship" value={editData.emergencyContact?.relationship || ''} onChange={(e)=>setEditData(prev=>({...prev, emergencyContact: {...prev.emergencyContact, relationship: e.target.value}}))} />
                <div />
              </div>

              <div className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Parent / Guardian</div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Father's Name" value={editData.parentDetails?.fatherName || ''} onChange={(e)=>setEditData(prev=>({...prev, parentDetails: {...prev.parentDetails, fatherName: e.target.value}}))} />
                <Input label="Mother's Name" value={editData.parentDetails?.motherName || ''} onChange={(e)=>setEditData(prev=>({...prev, parentDetails: {...prev.parentDetails, motherName: e.target.value}}))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Guardian Phone" value={editData.parentDetails?.guardianPhone || ''} onChange={(e)=>setEditData(prev=>({...prev, parentDetails: {...prev.parentDetails, guardianPhone: e.target.value}}))} />
                <Input label="Guardian Email" value={editData.parentDetails?.guardianEmail || ''} onChange={(e)=>setEditData(prev=>({...prev, parentDetails: {...prev.parentDetails, guardianEmail: e.target.value}}))} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select label="Status" value={editData.status || 'active'} onChange={(e)=>setEditData(prev=>({...prev, status:e.target.value}))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </Select>
              </div>
          <ModalFooter>
            <Button variant="ghost" onClick={()=>setShowEditModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={saveEdit}>Save</Button>
          </ModalFooter>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Delete"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <XCircleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-semibold text-red-900 dark:text-red-100">
                Delete Student?
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                This action cannot be undone
              </p>
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Are you sure you want to delete <strong>{selectedStudent?.name}</strong>? All their data will be permanently removed.
          </p>
          <ModalFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
            >
              Delete Student
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
