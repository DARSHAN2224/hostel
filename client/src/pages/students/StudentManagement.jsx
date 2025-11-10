/**
 * Student Management Page - Ultra Modern
 * Manage all students with advanced search, filters, and actions
 */

import { useState, useEffect, useCallback } from 'react'
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

import toast from 'react-hot-toast'

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
    password: '',
    student: {
      rollNumber: '',
      year: '',
      department: '',
      hostelBlock: ''
    }
  })

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
      name: student.name || '',
      email: student.email || '',
      registerNumber: student.registerNumber || '',
      year: student.year || '',
      hostelBlock: student.hostelBlock || '',
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
                    Year {student.year}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant="success">
                    {student.hostel}
                  </Badge>
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

            {/* Year Filter */}
            <Select
              placeholder="All Years"
              options={[
                { label: '1st Year', value: '1' },
                { label: '2nd Year', value: '2' },
                { label: '3rd Year', value: '3' },
                { label: '4th Year', value: '4' }
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
                <p className="text-sm text-slate-500 dark:text-slate-400">Year</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  Year {selectedStudent.year || 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  {selectedStudent.phone || 'N/A'}
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
          <Input label="Password" type="password" value={addData.password} onChange={(e)=>setAddData(prev=>({...prev, password: e.target.value}))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Register Number" value={addData.student.rollNumber} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, rollNumber: e.target.value}}))} />
            <Input label="Year" value={addData.student.year} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, year: e.target.value}}))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Department" value={addData.student.department} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, department: e.target.value}}))} />
            <Input label="Hostel Block" value={addData.student.hostelBlock} onChange={(e)=>setAddData(prev=>({...prev, student: {...prev.student, hostelBlock: e.target.value}}))} />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={()=>setShowAddModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={async ()=>{
              try{
                // Compose payload expected by managed create endpoint
                const payload = {
                  firstName: addData.firstName,
                  lastName: addData.lastName,
                  email: addData.email,
                  password: addData.password,
                  role: 'student',
                  student: {
                    rollNumber: addData.student.rollNumber,
                    year: addData.student.year,
                    department: addData.student.department,
                    hostelBlock: addData.student.hostelBlock
                  }
                }
                await studentService.create(payload)
                toast.success('Student created successfully')
                setShowAddModal(false)
                setAddData({ firstName: '', lastName: '', email: '', password: '', student: { rollNumber: '', year: '', department: '', hostelBlock: '' } })
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
          <Input label="Name" value={editData.name || ''} onChange={(e)=>setEditData(prev=>({...prev, name:e.target.value}))} />
          <Input label="Email" type="email" value={editData.email || ''} onChange={(e)=>setEditData(prev=>({...prev, email:e.target.value}))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Register Number" value={editData.registerNumber || ''} onChange={(e)=>setEditData(prev=>({...prev, registerNumber:e.target.value}))} />
            <Input label="Year" value={editData.year || ''} onChange={(e)=>setEditData(prev=>({...prev, year:e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Hostel Block" value={editData.hostelBlock || ''} onChange={(e)=>setEditData(prev=>({...prev, hostelBlock:e.target.value}))} />
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
