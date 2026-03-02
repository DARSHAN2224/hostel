import { useState, useEffect, useCallback } from 'react'
import { motion as Motion } from 'framer-motion'
import {
  UserGroupIcon,
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import DashboardLayout from '../../layouts/DashboardLayout'
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Select from '../../components/ui/Select'
import { LoadingCard } from '../../components/ui/Loading'
import EmptyState from '../../components/ui/EmptyState'
import counsellorService from '../../services/counsellorService'
import userService, { getUserStats, createUser, updateUser, deleteUser } from '../../services/userService'
import { DEPARTMENTS } from '../../constants'
import toast from 'react-hot-toast'

// ─── Hostel type options ──────────────────────────────────────────────────────
const HOSTEL_TYPE_OPTIONS = [
  { value: 'boys',  label: 'Boys Hostel'  },
  { value: 'girls', label: 'Girls Hostel' }
]

export default function CounsellorManagement() {
  const [counsellors, setCounsellors]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [stats, setStats]               = useState({ total: 0, active: 0 })
  const [search, setSearch]             = useState('')
  // Filter list by hostelType ('' = all)
  const [filterHostelType, setFilterHostelType] = useState('')
  const [showCreate, setShowCreate]     = useState(false)
  const [showEdit, setShowEdit]         = useState(false)
  const [selected, setSelected]         = useState(null)
  const [editForm, setEditForm]         = useState({})
  const [createForm, setCreateForm]     = useState({
    firstName: '', lastName: '', email: '', phone: '',
    department: '',
    hostelType: '',          // ← required for boys/girls isolation
    collegeHoursStart: '09:00',
    collegeHoursEnd:   '17:00'
  })

  const departmentsList = DEPARTMENTS || []

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [listRes, statsRes] = await Promise.all([
        userService.getAll({ role: 'counsellor', limit: 100 }),
        getUserStats()
      ])

      // /users returns { users: [...], total: N }
      const payload = listRes?.data || listRes
      const list = payload?.users || payload?.counsellors || []
      setCounsellors(Array.isArray(list) ? list : [])

      const s = statsRes?.data || statsRes
      setStats({
        total:  s?.counsellorCount || list.length || 0,
        active: list.filter(c => c.status === 'active').length
      })
    } catch (err) {
      toast.error(err?.message || 'Failed to load counsellors')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async () => {
    const { firstName, lastName, email, phone, department, hostelType } = createForm
    if (!firstName || !lastName || !email || !phone || !department) {
      toast.error('Fill all required fields')
      return
    }
    // hostelType is required so the backend can enforce boys/girls isolation
    if (!hostelType) {
      toast.error('Please select a hostel type (boys or girls)')
      return
    }
    try {
      const t = toast.loading('Creating counsellor...')
      await createUser({ role: 'counsellor', ...createForm })
      toast.success('Counsellor created', { id: t })
      setShowCreate(false)
      setCreateForm({
        firstName: '', lastName: '', email: '', phone: '',
        department: '', hostelType: '',
        collegeHoursStart: '09:00', collegeHoursEnd: '17:00'
      })
      fetchData()
    } catch (err) {
      toast.error(err?.message || 'Failed to create counsellor')
    }
  }

  const handleEdit = async () => {
    try {
      const t = toast.loading('Updating...')
      await updateUser('counsellor', selected._id, editForm)
      toast.success('Counsellor updated', { id: t })
      setShowEdit(false)
      fetchData()
    } catch (err) {
      toast.error(err?.message || 'Failed to update counsellor')
    }
  }

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete ${c.firstName} ${c.lastName}?`)) return
    try {
      const t = toast.loading('Deleting...')
      await deleteUser('counsellor', c._id)
      toast.success('Counsellor deleted', { id: t })
      fetchData()
    } catch (err) {
      toast.error(err?.message || 'Failed to delete counsellor')
    }
  }

  const openEdit = (c) => {
    setSelected(c)
    setEditForm({
      firstName:         c.firstName         || '',
      lastName:          c.lastName          || '',
      email:             c.email             || '',
      phone:             c.phone             || '',
      status:            c.status            || 'active',
      department:        c.department        || '',
      hostelType:        c.hostelType        || '',   // ← preserve existing hostelType
      collegeHoursStart: c.collegeHoursStart || '09:00',
      collegeHoursEnd:   c.collegeHoursEnd   || '17:00',
    })
    setShowEdit(true)
  }

  // Apply search + hostelType filter
  const filtered = counsellors.filter(c => {
    const matchesSearch = `${c.firstName} ${c.lastName} ${c.email} ${c.department}`
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchesHostel = !filterHostelType || c.hostelType === filterHostelType
    return matchesSearch && matchesHostel
  })

  // Helper: label for hostelType
  const hostelLabel = (ht) => {
    if (ht === 'boys')  return { label: 'Boys',  cls: 'bg-blue-100 text-blue-700' }
    if (ht === 'girls') return { label: 'Girls', cls: 'bg-pink-100 text-pink-700' }
    return { label: '—', cls: 'bg-gray-100 text-gray-500' }
  }

  return (
    <DashboardLayout>
      <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

        {/* Header */}
        <Motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 p-8 shadow-2xl"
        >
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <UserGroupIcon className="h-12 w-12 text-white" />
              <div>
                <h1 className="text-3xl font-bold text-white">Counsellor Management</h1>
                <p className="mt-1 text-white/90">
                  {stats.total} total · {stats.active} active
                </p>
              </div>
            </div>
            <Button variant="glass" icon={UserPlusIcon} onClick={() => setShowCreate(true)}>
              Add Counsellor
            </Button>
          </div>
        </Motion.div>

        {/* List */}
        <Card glassmorphic gradient>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <CardTitle gradient icon={UserGroupIcon}>All Counsellors</CardTitle>
              {/* Hostel type filter tabs */}
              <div className="flex gap-2 text-sm">
                {[{ value: '', label: 'All' }, ...HOSTEL_TYPE_OPTIONS].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterHostelType(opt.value)}
                    className={`rounded-full px-3 py-1 font-medium transition-colors ${
                      filterHostelType === opt.value
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, email, department…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
                glassmorphic
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">{[1,2,3].map(i => <LoadingCard key={i} />)}</div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={UserGroupIcon} title="No counsellors found" description="Create one using the button above" />
            ) : (
              <div className="space-y-3">
                {filtered.map((c, idx) => {
                  const hl = hostelLabel(c.hostelType)
                  return (
                    <Motion.div
                      key={c._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="flex items-center justify-between p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-pink-300 dark:hover:border-pink-700 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-md flex-shrink-0">
                          <span className="text-white font-bold text-lg">
                            {c.firstName?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {c.firstName} {c.lastName}
                          </p>
                          <p className="text-sm text-slate-500">{c.email}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {c.department} · {c.collegeHoursStart}–{c.collegeHoursEnd}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Hostel type pill — key for boys/girls isolation visibility */}
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${hl.cls}`}>
                          {hl.label}
                        </span>
                        <Badge variant={c.status === 'active' ? 'success' : 'danger'}>
                          {c.status}
                        </Badge>
                        <Button variant="ghost" icon={PencilIcon} onClick={() => openEdit(c)} />
                        <Button variant="ghost" icon={TrashIcon}  onClick={() => handleDelete(c)} />
                      </div>
                    </Motion.div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Create Modal ──────────────────────────────────────────────────── */}
        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Counsellor" gradient>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name *" glassmorphic value={createForm.firstName}
                onChange={e => setCreateForm(p => ({...p, firstName: e.target.value}))} />
              <Input label="Last Name *"  glassmorphic value={createForm.lastName}
                onChange={e => setCreateForm(p => ({...p, lastName: e.target.value}))} />
            </div>
            <Input label="Email *" type="email" glassmorphic value={createForm.email}
              onChange={e => setCreateForm(p => ({...p, email: e.target.value}))} />
            <Input label="Phone *" type="tel" glassmorphic value={createForm.phone}
              onChange={e => setCreateForm(p => ({...p, phone: e.target.value}))} />
            <Select label="Department *" glassmorphic value={createForm.department}
              onChange={e => setCreateForm(p => ({...p, department: e.target.value}))}>
              <option value="">Select Department</option>
              {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>

            {/*
              hostelType is required so the backend knows which hostel this counsellor
              belongs to and can enforce boys/girls isolation on student queries.
            */}
            <Select label="Hostel Type *" glassmorphic value={createForm.hostelType}
              onChange={e => setCreateForm(p => ({...p, hostelType: e.target.value}))}>
              <option value="">Select Hostel Type</option>
              {HOSTEL_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>

            <div className="grid grid-cols-2 gap-4">
              <Input label="College Hours Start" type="time" glassmorphic value={createForm.collegeHoursStart}
                onChange={e => setCreateForm(p => ({...p, collegeHoursStart: e.target.value}))} />
              <Input label="College Hours End"   type="time" glassmorphic value={createForm.collegeHoursEnd}
                onChange={e => setCreateForm(p => ({...p, collegeHoursEnd: e.target.value}))} />
            </div>
            <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
              A password will be auto-generated and emailed to the counsellor. They must change it on first login.
            </p>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
              <Button icon={UserPlusIcon} onClick={handleCreate} className="flex-1">Create</Button>
            </div>
          </div>
        </Modal>

        {/* ── Edit Modal ────────────────────────────────────────────────────── */}
        <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Counsellor" gradient>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" glassmorphic value={editForm.firstName || ''}
                onChange={e => setEditForm(p => ({...p, firstName: e.target.value}))} />
              <Input label="Last Name"  glassmorphic value={editForm.lastName  || ''}
                onChange={e => setEditForm(p => ({...p, lastName: e.target.value}))} />
            </div>
            <Input label="Email" type="email" glassmorphic value={editForm.email || ''}
              onChange={e => setEditForm(p => ({...p, email: e.target.value}))} />
            <Input label="Phone" type="tel" glassmorphic value={editForm.phone || ''}
              onChange={e => setEditForm(p => ({...p, phone: e.target.value}))} />
            <Select label="Department" glassmorphic value={editForm.department || ''}
              onChange={e => setEditForm(p => ({...p, department: e.target.value}))}>
              <option value="">Select Department</option>
              {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>

            {/* Allow admin to reassign counsellor to boys/girls hostel */}
            <Select label="Hostel Type" glassmorphic value={editForm.hostelType || ''}
              onChange={e => setEditForm(p => ({...p, hostelType: e.target.value}))}>
              <option value="">Select Hostel Type</option>
              {HOSTEL_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>

            <div className="grid grid-cols-2 gap-4">
              <Input label="College Hours Start" type="time" glassmorphic value={editForm.collegeHoursStart || '09:00'}
                onChange={e => setEditForm(p => ({...p, collegeHoursStart: e.target.value}))} />
              <Input label="College Hours End"   type="time" glassmorphic value={editForm.collegeHoursEnd   || '17:00'}
                onChange={e => setEditForm(p => ({...p, collegeHoursEnd: e.target.value}))} />
            </div>
            <Select label="Status" glassmorphic value={editForm.status || 'active'}
              onChange={e => setEditForm(p => ({...p, status: e.target.value}))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </Select>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowEdit(false)} className="flex-1">Cancel</Button>
              <Button icon={PencilIcon} onClick={handleEdit} className="flex-1">Update</Button>
            </div>
          </div>
        </Modal>

      </Motion.div>
    </DashboardLayout>
  )
}