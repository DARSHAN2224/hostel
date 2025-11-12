/**
 * HOD Management Page
 * Manage all HODs with advanced search, filters, and actions
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  AcademicCapIcon
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
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { selectUser } from '../../store/authSlice'
import hodService from '../../services/hodService'

export default function HODManagement() {
  const [hods, setHods] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    department: '',
    status: ''
  })
  const [selectedHOD, setSelectedHOD] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editData, setEditData] = useState({})
  const [addData, setAddData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    status: 'active'
  })

  const fetchHODs = useCallback(async () => {
    try {
      setLoading(true)
      const { hods } = (await (await import('../../services/hodService')).hodService.getAll()).data || {};
      setHods(hods || [])
    } catch (error) {
      console.error('Failed to fetch HODs:', error)
      toast.error('Failed to load HODs')
      setHods([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHODs()
  }, [fetchHODs])

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const filteredHODs = Array.isArray(hods) ? hods.filter(hod =>
    hod.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hod.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hod.department?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : []

  const handleView = (hod) => {
    setSelectedHOD(hod)
    setShowViewModal(true)
  }

  const handleDelete = (hod) => {
    setSelectedHOD(hod)
    setShowDeleteModal(true)
  }

  const handleEdit = (hod) => {
    setSelectedHOD(hod)
    setEditData({
      firstName: hod.firstName || '',
      lastName: hod.lastName || '',
      email: hod.email || '',
      phone: hod.phone || '',
      department: hod.department || '',
      status: hod.status || 'active'
    })
    setShowEditModal(true)
  }

  const handleAdd = () => {
    setAddData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: '',
      status: 'active'
    })
    setShowAddModal(true)
  }

  const saveEdit = async () => {
    try {
      // TODO: Implement API call
      // await hodService.update(selectedHOD._id, editData)
      toast.success('HOD updated successfully')
      setShowEditModal(false)
      setSelectedHOD(null)
      setEditData({})
      fetchHODs()
    } catch (err) {
      console.error('Failed to update HOD:', err)
      let msg = err.response?.data?.message || 'Failed to update HOD';
      const errorsArr = err.response?.data?.errors;
      if (Array.isArray(errorsArr) && errorsArr.length > 0 && errorsArr[0].message) {
        msg = errorsArr[0].message;
      }
      toast.error(msg);
    }
  }

  const saveAdd = async () => {
    try {
      const resp = await hodService.create(addData)
      const genPwd = resp?.data?.data?.generatedPassword || resp?.data?.generatedPassword
      if (genPwd) {
        toast.success(`HOD added — password: ${genPwd}`)
      } else {
        toast.success('HOD added successfully')
      }
      setShowAddModal(false)
      setAddData({
      firstName: '',
      lastName: '',
        email: '',
        phone: '',
        department: '',
        status: 'active'
      })
      fetchHODs()
    } catch (err) {
      console.error('Failed to add HOD:', err)
      let msg = err.response?.data?.message || 'Failed to add HOD';
      const errorsArr = err.response?.data?.errors;
      if (Array.isArray(errorsArr) && errorsArr.length > 0 && errorsArr[0].message) {
        msg = errorsArr[0].message;
      }
      toast.error(msg);
    }
  }

  const currentUser = useSelector(selectUser)

  const navigate = useNavigate()

  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/')
    }
  }, [currentUser, navigate])

  const confirmDelete = async () => {
    try {
      // TODO: Implement API call
      // await hodService.delete(selectedHOD._id)
      toast.success(`HOD ${selectedHOD.name} deleted successfully`)
      setShowDeleteModal(false)
      setSelectedHOD(null)
      fetchHODs()
    } catch (err) {
      console.error('Failed to delete HOD:', err)
      let msg = err.response?.data?.message || 'Failed to delete HOD';
      const errorsArr = err.response?.data?.errors;
      if (Array.isArray(errorsArr) && errorsArr.length > 0 && errorsArr[0].message) {
        msg = errorsArr[0].message;
      }
      toast.error(msg);
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
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              HOD Management
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Manage and monitor all department heads
            </p>
          </div>
          <Button
            icon={UserPlusIcon}
            variant="primary"
            className="shadow-lg shadow-teal-500/30"
            onClick={handleAdd}
          >
            Add HOD
          </Button>
        </div>

        {/* Search and Filters */}
        <Card glassmorphic gradient>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <Input
                placeholder="Search by name, email, or department..."
                icon={MagnifyingGlassIcon}
                value={searchTerm}
                onChange={handleSearch}
                glassmorphic
                className="bg-white dark:bg-slate-900"
              />
            </div>

            {/* Department Filter */}
            <Select
              placeholder="All Departments"
              options={[
                { label: 'Computer Science', value: 'Computer Science' },
                { label: 'Electronics', value: 'Electronics' },
                { label: 'Mechanical', value: 'Mechanical' },
                { label: 'Civil', value: 'Civil' },
                { label: 'Electrical', value: 'Electrical' }
              ]}
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              glassmorphic
              className="bg-white dark:bg-slate-900"
            />
          </div>

          {/* Active Filters */}
          <AnimatePresence>
            {(filters.department || searchTerm) && (
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
                {filters.department && (
                  <Badge variant="info">
                    Department: {filters.department}
                  </Badge>
                )}
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setFilters({ department: '', status: '' })
                  }}
                  className="ml-auto text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400"
                >
                  Clear all
                </button>
              </Motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* HODs Table */}
        <Card glassmorphic>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">
              HODs List
              <span className="ml-3 text-sm font-normal text-slate-500 dark:text-slate-400">
                ({filteredHODs.length} HODs)
              </span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              icon={ArrowPathIcon}
              onClick={fetchHODs}
            >
              Refresh
            </Button>
          </div>

          {loading ? (
            <LoadingTable rows={5} columns={5} />
          ) : filteredHODs.length === 0 ? (
            <EmptyState
              icon={AcademicCapIcon}
              title="No HODs found"
              description="Try adjusting your search or filter criteria"
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-blue-500/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                      HOD
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                      Phone
                    </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                          Department
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                          Password
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                          Status
                        </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white/50 dark:bg-slate-800/50">
                  {filteredHODs.map((hod, index) => (
                    <Motion.tr
                      key={hod._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ backgroundColor: 'rgba(20, 184, 166, 0.05)' }}
                      className="transition-all duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Motion.div
                            className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            <AcademicCapIcon className="h-6 w-6 text-white" />
                          </Motion.div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              {hod.name || 'N/A'}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              {hod.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white font-medium">
                        {hod.phone || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="info">
                          {hod.department || 'N/A'}
                        </Badge>
                      </td>

                      {/* Password column - admin only */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white font-medium">
                        {currentUser?.role === 'admin' ? (
                          (hod.generatedPassword || hod.generated_password || hod.plainPassword || hod.password) ? (
                            <span className="font-mono text-sm text-teal-700 dark:text-teal-300">{hod.generatedPassword || hod.generated_password || hod.plainPassword || hod.password}</span>
                          ) : (
                            <span className="text-sm text-slate-500">—</span>
                          )
                        ) : (
                          <span className="text-sm text-slate-500">Hidden</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={hod.status === 'active' ? 'success' : 'danger'}
                          icon={hod.status === 'active' ? CheckCircleIcon : XCircleIcon}
                        >
                          {hod.status || 'Active'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <Motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleView(hod)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="View Details"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </Motion.button>
                          <Motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEdit(hod)}
                            className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </Motion.button>
                          <Motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(hod)}
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
          )}
        </Card>
      </Motion.div>

      {/* View HOD Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="HOD Details"
        gradient
        size="lg"
      >
        {selectedHOD && (
          <div className="space-y-6">
            {/* HOD Header */}
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <AcademicCapIcon className="h-10 w-10 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedHOD.name}
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  {selectedHOD.email}
                </p>
              </div>
            </div>

            {/* HOD Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  {selectedHOD.phone || 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Department</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  {selectedHOD.department || 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  {selectedHOD.status || 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Assigned Students</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  {selectedHOD.assignedStudents || '0'}
                </p>
              </div>
            </div>

            <ModalFooter>
              <Button variant="ghost" onClick={() => setShowViewModal(false)}>
                Close
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      {/* Edit HOD Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit HOD"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={editData.name || ''}
            onChange={(e) => setEditData((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={editData.email || ''}
            onChange={(e) => setEditData((prev) => ({ ...prev, email: e.target.value }))}
          />
          <Input
            label="Phone"
            value={editData.phone || ''}
            onChange={(e) => setEditData((prev) => ({ ...prev, phone: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Department"
              value={editData.department || ''}
              onChange={(e) => setEditData((prev) => ({ ...prev, department: e.target.value }))}
            >
              <option value="">Select Department</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Electronics">Electronics</option>
              <option value="Mechanical">Mechanical</option>
              <option value="Civil">Civil</option>
              <option value="Electrical">Electrical</option>
            </Select>
            <Select
              label="Status"
              value={editData.status || 'active'}
              onChange={(e) => setEditData((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveEdit}>
              Save Changes
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Add HOD Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New HOD"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={addData.name || ''}
            onChange={(e) => setAddData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Enter HOD name"
          />
          <Input
            label="Email"
            type="email"
            value={addData.email || ''}
            onChange={(e) => setAddData((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="hod@college.edu"
          />
          <Input
            label="Phone"
            value={addData.phone || ''}
            onChange={(e) => setAddData((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="+91 9876543210"
          />
          {/* Password is generated server-side for admin-created accounts. No manual password input here. */}
          <Select
            label="Department"
            value={addData.department || ''}
            onChange={(e) => setAddData((prev) => ({ ...prev, department: e.target.value }))}
          >
            <option value="">Select Department</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Electronics">Electronics</option>
            <option value="Mechanical">Mechanical</option>
            <option value="Civil">Civil</option>
            <option value="Electrical">Electrical</option>
          </Select>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveAdd}>
              Add HOD
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
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
              <p className="font-semibold text-red-900 dark:text-red-100">Delete HOD?</p>
              <p className="text-sm text-red-700 dark:text-red-300">
                This action cannot be undone
              </p>
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Are you sure you want to delete <strong>{selectedHOD?.name}</strong>? All their data
            will be permanently removed.
          </p>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete HOD
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
