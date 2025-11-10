/**
 * Warden Management Page
 * Manage all wardens with advanced search, filters, and actions
 */

import { useState, useEffect, useCallback, useRef } from 'react'
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
  ShieldCheckIcon
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
import wardenService from '../../services/wardenService'
import toast from 'react-hot-toast'

export default function WardenManagement() {
  const [wardens, setWardens] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    hostelBlock: '',
    hostelType: '',
    status: ''
  })
  const [selectedWarden, setSelectedWarden] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editData, setEditData] = useState({})
  const [addData, setAddData] = useState({
    name: '',
    email: '',
    phone: '',
    hostelBlock: '',
    hostelType: '',
    status: 'active'
  })
  const inFlightRef = useRef(false)

  const fetchWardens = useCallback(async () => {
    // Prevent overlapping requests (e.g., StrictMode double-invoke)
    if (inFlightRef.current) return
    inFlightRef.current = true

    try {
      setLoading(true)

      const filterParams = {}
      if (filters.hostelType) filterParams.hostelType = filters.hostelType
      if (filters.hostelBlock) filterParams.hostelBlock = filters.hostelBlock

  const response = await wardenService.getWardens(filterParams)
  console.log('Raw warden API response:', response)
  // Transform backend data to match frontend structure, robust to missing/mismatched fields
  const transformedWardens = response.map(warden => {
        // Try to get hostelBlock from multiple possible fields
        let hostelBlock = 'N/A';
        if (Array.isArray(warden.assignedHostelBlocks) && warden.assignedHostelBlocks.length > 0) {
          hostelBlock = warden.assignedHostelBlocks[0].blockName || warden.assignedHostelBlocks[0].hostelBlock || 'N/A';
        } else if (warden.block) {
          hostelBlock = warden.block;
        } else if (warden.hostelBlock) {
          hostelBlock = warden.hostelBlock;
        }

        // Try to get assignedStudents from multiple possible fields
        let assignedStudents = 0;
        if (Array.isArray(warden.assignedHostelBlocks) && warden.assignedHostelBlocks.length > 0) {
          assignedStudents = warden.assignedHostelBlocks[0].currentOccupancy || 0;
        } else if (typeof warden.assignedStudents === 'number') {
          assignedStudents = warden.assignedStudents;
        }

        return {
          _id: warden._id,
          name: `${warden.firstName || ''} ${warden.lastName || ''}`.trim() || warden.name || 'N/A',
          email: warden.email,
          phone: warden.phone || 'N/A',
          hostelType: warden.hostelType || warden.type || 'N/A',
          hostelBlock,
          status: warden.status || 'active',
          assignedStudents
        };
      });

      setWardens(transformedWardens)
    } catch (error) {
      console.error('Failed to fetch wardens:', error)
      toast.error('Failed to load wardens')
      setWardens([])
    } finally {
      setLoading(false)
      inFlightRef.current = false
    }
  }, [filters])

  useEffect(() => {
    fetchWardens()
  }, [fetchWardens])

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const filteredWardens = Array.isArray(wardens) ? wardens.filter(warden =>
    warden.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    warden.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : []

  const handleView = (warden) => {
    setSelectedWarden(warden)
    setShowViewModal(true)
  }

  const handleDelete = (warden) => {
    setSelectedWarden(warden)
    setShowDeleteModal(true)
  }

  const handleEdit = (warden) => {
    setSelectedWarden(warden)
    setEditData({
      name: warden.name || '',
      email: warden.email || '',
      phone: warden.phone || '',
      hostelBlock: warden.hostelBlock || '',
      hostelType: warden.hostelType || '',
      status: warden.status || 'active'
    })
    setShowEditModal(true)
  }

  const handleAdd = () => {
    setAddData({
      name: '',
      email: '',
      phone: '',
      hostelBlock: '',
      hostelType: '',
      status: 'active'
    })
    setShowAddModal(true)
  }

  const saveEdit = async () => {
    try {
      await wardenService.update(selectedWarden._id, editData)
      toast.success('Warden updated successfully')
      setShowEditModal(false)
      setSelectedWarden(null)
      setEditData({})
      fetchWardens()
    } catch (error) {
      console.error('Failed to update warden:', error)
      toast.error(error.response?.data?.message || 'Failed to update warden')
    }
  }

  const saveAdd = async () => {
    try {
      await wardenService.create(addData)
      toast.success('Warden added successfully')
      setShowAddModal(false)
      setAddData({
        name: '',
        email: '',
        phone: '',
        hostelBlock: '',
        hostelType: '',
        status: 'active'
      })
      fetchWardens()
    } catch (error) {
      console.error('Failed to add warden:', error)
      // Try to extract the most specific backend validation error
      let msg = error.response?.data?.message || 'Failed to add warden';
      const errorsArr = error.response?.data?.errors;
      if (Array.isArray(errorsArr) && errorsArr.length > 0 && errorsArr[0].message) {
        msg = errorsArr[0].message;
      }
      toast.error(msg);
    }
  }

  const confirmDelete = async () => {
    try {
      await wardenService.delete(selectedWarden._id)
      toast.success(`Warden ${selectedWarden.name} deleted successfully`)
      setShowDeleteModal(false)
      setSelectedWarden(null)
      fetchWardens()
    } catch (error) {
      console.error('Failed to delete warden:', error)
      toast.error(error.response?.data?.message || 'Failed to delete warden')
    }
  }

  // Helper function to render table content
  const renderTableContent = () => {
    if (loading) {
      return <LoadingTable rows={5} columns={5} />
    }
    
    if (filteredWardens.length === 0) {
      return (
        <EmptyState
          icon={ShieldCheckIcon}
          title="No wardens found"
          description="Try adjusting your search or filter criteria"
        />
      )
    }
    
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-orange-500/10">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                Warden
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                Phone
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                Hostel Type
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                Block
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
            {filteredWardens.map((warden, index) => (
              <Motion.tr
                key={warden._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ backgroundColor: 'rgba(251, 191, 36, 0.05)' }}
                className="transition-all duration-200"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Motion.div
                      className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center shadow-lg"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <ShieldCheckIcon className="h-6 w-6 text-white" />
                    </Motion.div>
                    <div className="ml-4">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {warden.name || 'N/A'}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {warden.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white font-medium">
                  {warden.phone || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant={warden.hostelType === 'boys' ? 'info' : 'primary'}>
                    {warden.hostelType === 'boys' ? "Boys' Hostel" : "Girls' Hostel"}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant="warning">
                    Block {warden.hostelBlock || 'N/A'}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge
                    variant={warden.status === 'active' ? 'success' : 'danger'}
                    icon={warden.status === 'active' ? CheckCircleIcon : XCircleIcon}
                  >
                    {warden.status || 'Active'}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <Motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleView(warden)}
                      className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="View Details"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </Motion.button>
                    <Motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEdit(warden)}
                      className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </Motion.button>
                    <Motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDelete(warden)}
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
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
              Warden Management
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Manage and monitor all hostel wardens
            </p>
          </div>
          <Button
            icon={UserPlusIcon}
            variant="primary"
            className="shadow-lg shadow-amber-500/30"
            onClick={handleAdd}
          >
            Add Warden
          </Button>
        </div>

        {/* Search and Filters */}
        <Card glassmorphic gradient>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <Input
                placeholder="Search by name or email..."
                icon={MagnifyingGlassIcon}
                value={searchTerm}
                onChange={handleSearch}
                glassmorphic
                className="bg-white dark:bg-slate-900"
              />
            </div>

            {/* Hostel Type Filter */}
            <Select
              placeholder="All Hostels"
              options={[
                { label: "Boys' Hostel", value: 'boys' },
                { label: "Girls' Hostel", value: 'girls' }
              ]}
              value={filters.hostelType}
              onChange={(e) => setFilters({ ...filters, hostelType: e.target.value })}
              glassmorphic
              className="bg-white dark:bg-slate-900"
            />

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
          </div>

          {/* Active Filters */}
          <AnimatePresence>
            {(filters.hostelType || filters.hostelBlock || searchTerm) && (
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
                {filters.hostelType && (
                  <Badge variant="success">
                    {filters.hostelType === 'boys' ? "Boys' Hostel" : "Girls' Hostel"}
                  </Badge>
                )}
                {filters.hostelBlock && (
                  <Badge variant="info">
                    Block: {filters.hostelBlock}
                  </Badge>
                )}
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setFilters({ hostelBlock: '', hostelType: '', status: '' })
                  }}
                  className="ml-auto text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400"
                >
                  Clear all
                </button>
              </Motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Wardens Table */}
        <Card glassmorphic>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">
              Wardens List
              <span className="ml-3 text-sm font-normal text-slate-500 dark:text-slate-400">
                ({filteredWardens.length} wardens)
              </span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              icon={ArrowPathIcon}
              onClick={fetchWardens}
            >
              Refresh
            </Button>
          </div>

          {renderTableContent()}
        </Card>
      </Motion.div>

      {/* View Warden Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Warden Details"
        gradient
        size="lg"
      >
        {selectedWarden && (
          <div className="space-y-6">
            {/* Warden Header */}
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center shadow-lg">
                <ShieldCheckIcon className="h-10 w-10 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedWarden.name}
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  {selectedWarden.email}
                </p>
              </div>
            </div>

            {/* Warden Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  {selectedWarden.phone || 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Hostel Type</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  {selectedWarden.hostelType === 'boys' ? "Boys' Hostel" : "Girls' Hostel"}
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Hostel Block</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  Block {selectedWarden.hostelBlock || 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  {selectedWarden.status || 'N/A'}
                </p>
              </div>
              <div className="col-span-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Assigned Students</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  {selectedWarden.assignedStudents || '0'}
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

      {/* Edit Warden Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Warden"
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
              label="Hostel Type"
              value={editData.hostelType || ''}
              onChange={(e) => setEditData((prev) => ({ ...prev, hostelType: e.target.value }))}
            >
              <option value="">Select Type</option>
              <option value="boys">Boys' Hostel</option>
              <option value="girls">Girls' Hostel</option>
            </Select>
            <Select
              label="Hostel Block"
              value={editData.hostelBlock || ''}
              onChange={(e) => setEditData((prev) => ({ ...prev, hostelBlock: e.target.value }))}
            >
              <option value="">Select Block</option>
              <option value="A">Block A</option>
              <option value="B">Block B</option>
              <option value="C">Block C</option>
              <option value="D">Block D</option>
            </Select>
          </div>
          <Select
            label="Status"
            value={editData.status || 'active'}
            onChange={(e) => setEditData((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
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

      {/* Add Warden Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Warden"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={addData.name || ''}
            onChange={(e) => setAddData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Enter warden name"
          />
          <Input
            label="Email"
            type="email"
            value={addData.email || ''}
            onChange={(e) => setAddData((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="warden@college.edu"
          />
          <Input
            label="Phone"
            value={addData.phone || ''}
            onChange={(e) => setAddData((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="+91 9876543210"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Hostel Type"
              value={addData.hostelType || ''}
              onChange={(e) => setAddData((prev) => ({ ...prev, hostelType: e.target.value }))}
            >
              <option value="">Select Type</option>
              <option value="boys">Boys' Hostel</option>
              <option value="girls">Girls' Hostel</option>
            </Select>
            <Select
              label="Hostel Block"
              value={addData.hostelBlock || ''}
              onChange={(e) => setAddData((prev) => ({ ...prev, hostelBlock: e.target.value }))}
            >
              <option value="">Select Block</option>
              <option value="A">Block A</option>
              <option value="B">Block B</option>
              <option value="C">Block C</option>
              <option value="D">Block D</option>
            </Select>
          </div>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveAdd}>
              Add Warden
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
              <p className="font-semibold text-red-900 dark:text-red-100">Delete Warden?</p>
              <p className="text-sm text-red-700 dark:text-red-300">
                This action cannot be undone
              </p>
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Are you sure you want to delete <strong>{selectedWarden?.name}</strong>? All their data
            will be permanently removed.
          </p>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete Warden
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
