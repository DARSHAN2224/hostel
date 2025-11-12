/**
 * Security Management Page
 * Manage all Security personnel with search, filters and actions
 */

import { useState, useEffect, useCallback, useRef } from 'react'
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
  ShieldCheckIcon,
  ClipboardDocumentIcon
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
import { userService } from '../../services/userService'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { selectUser } from '../../store/authSlice'

export default function SecurityManagement() {
  const [securities, setSecurities] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({ status: '' })
  const [selected, setSelected] = useState(null)
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
    status: 'active'
  })
  const inFlightRef = useRef(false)

  const fetchSecurities = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      setLoading(true)
      const params = { role: 'security', limit: 200 }
      const resp = await userService.getAll(params)
      const users = resp?.data?.users || resp?.data?.data?.users || resp?.data || []
      const mapped = users.map(u => ({
        _id: u._id,
        firstName: u.firstName || (u.name ? String(u.name).split(' ')[0] : '') || '',
        lastName: u.lastName || (u.name ? String(u.name).split(' ').slice(1).join(' ') : '') || '',
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'N/A',
        email: u.email,
        phone: u.phone || 'N/A',
  // employeeId / designation / currentShift removed from model
  employeeId: undefined,
  designation: undefined,
  currentShift: undefined,
        status: u.status || 'active',
        generatedPassword: u.generatedPassword || u.generated_password || u.plainPassword || u.password
      }))
      setSecurities(mapped)
    } catch (err) {
      console.error('Failed to fetch security users:', err)
      toast.error('Failed to load security users')
      setSecurities([])
    } finally {
      setLoading(false)
      inFlightRef.current = false
    }
  }, [])

  useEffect(() => { fetchSecurities() }, [fetchSecurities])

  const handleSearch = (e) => setSearchTerm(e.target.value)

  const filtered = Array.isArray(securities) ? securities.filter(s => {
    const fullName = `${s.firstName || ''} ${s.lastName || ''}`.trim()
    return (
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }) : []

  const handleView = (u) => { setSelected(u); setShowViewModal(true) }
  const handleEdit = (u) => {
    setSelected(u)
    setEditData({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email || '',
      phone: u.phone || '',
      status: u.status || 'active'
    })
    setShowEditModal(true)
  }
  const handleDelete = (u) => { setSelected(u); setShowDeleteModal(true) }
  const handleAdd = () => { setAddData({ firstName: '', lastName: '', email: '', phone: '', status: 'active' }); setShowAddModal(true) }

  const saveAdd = async () => {
    try {
      const payload = {
        role: 'security',
        email: addData.email,
        firstName: addData.firstName,
        lastName: addData.lastName,
        phone: addData.phone
      }
      const resp = await userService.create(payload)
      const genPwd = resp?.data?.data?.generatedPassword || resp?.data?.generatedPassword
      if (genPwd) toast.success(`Security added — password: ${genPwd}`)
      else toast.success('Security added')
      setShowAddModal(false)
      fetchSecurities()
    } catch (err) {
      console.error('Failed to add security:', err)
      let msg = err.response?.data?.message || 'Failed to add security'
      const errorsArr = err.response?.data?.errors
      if (Array.isArray(errorsArr) && errorsArr.length > 0 && errorsArr[0].message) msg = errorsArr[0].message
      toast.error(msg)
    }
  }

  const saveEdit = async () => {
    try {
      const payload = {
        firstName: editData.firstName,
        lastName: editData.lastName,
        email: editData.email,
        phone: editData.phone,
        status: editData.status
      }
      await userService.update('security', selected._id, payload)
      toast.success('Security updated')
      setShowEditModal(false)
      fetchSecurities()
    } catch (err) {
      console.error('Failed to update security:', err)
      toast.error(err.response?.data?.message || 'Failed to update security')
    }
  }

  const confirmDelete = async () => {
    try {
      await userService.remove('security', selected._id)
      toast.success(`Security ${selected.name} deleted`)
      setShowDeleteModal(false)
      fetchSecurities()
    } catch (err) {
      console.error('Failed to delete security:', err)
      toast.error(err.response?.data?.message || 'Delete failed')
    }
  }

  const currentUser = useSelector(selectUser)
  const navigate = useNavigate()
  const copyPassword = async (pwd) => {
    if (!pwd) return
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(pwd)
      } else {
        const ta = document.createElement('textarea')
        ta.value = pwd
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      toast.success('Password copied to clipboard')
    } catch (err) {
      console.error('Copy failed', err)
      toast.error('Failed to copy password')
    }
  }
  useEffect(() => { if (currentUser && currentUser.role !== 'admin') navigate('/') }, [currentUser, navigate])

  return (
    <DashboardLayout>
      <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Security Management</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Manage security personnel</p>
          </div>
          <Button icon={UserPlusIcon} variant="primary" className="shadow-lg shadow-orange-500/30" onClick={handleAdd}>Add Security</Button>
        </div>

        <Card glassmorphic gradient>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input placeholder="Search by name, email, or employee id..." icon={MagnifyingGlassIcon} value={searchTerm} onChange={handleSearch} glassmorphic className="bg-white dark:bg-slate-900" />
            </div>
            <Select placeholder="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} glassmorphic className="bg-white dark:bg-slate-900">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </Card>

        <Card glassmorphic>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">Security List <span className="ml-3 text-sm font-normal text-slate-500 dark:text-slate-400">({filtered.length} personnel)</span></h2>
            <Button variant="ghost" size="sm" icon={ArrowPathIcon} onClick={fetchSecurities}>Refresh</Button>
          </div>

          {loading ? <LoadingTable rows={5} columns={6} /> : (
            filtered.length === 0 ? (
              <EmptyState icon={ShieldCheckIcon} title="No security personnel found" description="Try adjusting your search or filter criteria" />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-rose-500/10">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Phone</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Password</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white/50 dark:bg-slate-800/50">
                    {filtered.map((u, idx) => (
                      <Motion.tr key={u._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: idx * 0.03 }} className="transition-all duration-200" whileHover={{ backgroundColor: 'rgba(249, 115, 22, 0.05)' }}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Motion.div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg" whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}>
                              <ShieldCheckIcon className="h-6 w-6 text-white" />
                            </Motion.div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-slate-900 dark:text-white">{`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'N/A'}</div>
                              <div className="text-sm text-slate-500 dark:text-slate-400">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white font-medium">{u.phone || 'N/A'}</td>
                        {/* removed employee id / designation / shift columns */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white font-medium">
                          {currentUser?.role === 'admin' ? (
                            u.generatedPassword ? (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm text-amber-700 dark:text-amber-300">{u.generatedPassword}</span>
                                <button onClick={() => copyPassword(u.generatedPassword)} title="Copy password" className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
                                  <ClipboardDocumentIcon className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                                </button>
                              </div>
                            ) : <span className="text-sm text-slate-500">—</span>
                          ) : <span className="text-sm text-slate-500">Hidden</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <Motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleView(u)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="View"><EyeIcon className="h-5 w-5" /></Motion.button>
                            <Motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleEdit(u)} className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Edit"><PencilIcon className="h-5 w-5" /></Motion.button>
                            <Motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(u)} className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete"><TrashIcon className="h-5 w-5" /></Motion.button>
                          </div>
                        </td>
                      </Motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </Card>

        {/* View Modal */}
        <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Security Details" gradient size="lg">
          {selected && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg"><ShieldCheckIcon className="h-10 w-10 text-white" /></div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{`${selected.firstName || ''} ${selected.lastName || ''}`.trim() || selected.name}</h3>
                  <p className="text-slate-500 dark:text-slate-400">{selected.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{selected.phone || 'N/A'}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{selected.status || 'active'}</p>
                </div>
              </div>
              <ModalFooter>
                <Button variant="ghost" onClick={() => setShowViewModal(false)}>Close</Button>
              </ModalFooter>
            </div>
          )}
        </Modal>

        {/* Edit Modal */}
        <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Security" size="md">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" value={editData.firstName || ''} onChange={(e) => setEditData((p) => ({ ...p, firstName: e.target.value }))} />
              <Input label="Last Name" value={editData.lastName || ''} onChange={(e) => setEditData((p) => ({ ...p, lastName: e.target.value }))} />
            </div>
            <Input label="Email" type="email" value={editData.email || ''} onChange={(e) => setEditData((p) => ({ ...p, email: e.target.value }))} />
            <Input label="Phone" value={editData.phone || ''} onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))} />
            {/* Employee ID / Designation / Shift removed from edit form */}
            <Select label="Status" value={editData.status || 'active'} onChange={(e) => setEditData((p) => ({ ...p, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            <ModalFooter>
              <Button variant="ghost" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={saveEdit}>Save Changes</Button>
            </ModalFooter>
          </div>
        </Modal>

        {/* Add Modal */}
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Security" size="md">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" value={addData.firstName} onChange={(e) => setAddData((p) => ({ ...p, firstName: e.target.value }))} placeholder="First name" />
              <Input label="Last Name" value={addData.lastName} onChange={(e) => setAddData((p) => ({ ...p, lastName: e.target.value }))} placeholder="Last name" />
            </div>
            <Input label="Email" type="email" value={addData.email} onChange={(e) => setAddData((p) => ({ ...p, email: e.target.value }))} placeholder="security@college.edu" />
            <Input label="Phone" value={addData.phone} onChange={(e) => setAddData((p) => ({ ...p, phone: e.target.value }))} placeholder="+91 9876543210" />
            {/* Employee ID / Designation / Shift removed from Add form */}
            <ModalFooter>
              <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={saveAdd}>Add Security</Button>
            </ModalFooter>
          </div>
        </Modal>

        {/* Delete Modal */}
        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirm Delete" size="md">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <XCircleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-100">Delete Security?</p>
                <p className="text-sm text-red-700 dark:text-red-300">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-400">Are you sure you want to delete <strong>{selected?.name}</strong>? All their data will be permanently removed.</p>
            <ModalFooter>
              <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
              <Button variant="danger" onClick={confirmDelete}>Delete</Button>
            </ModalFooter>
          </div>
        </Modal>

      </Motion.div>
    </DashboardLayout>
  )
}
