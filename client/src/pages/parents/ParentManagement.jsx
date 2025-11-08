import { useState } from 'react'
import { motion as Motion } from 'framer-motion'
import {
  UserGroupIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import DashboardLayout from '../../layouts/DashboardLayout'
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table'
import { parentService } from '../../services'
import toast from 'react-hot-toast'
import Loading from '../../components/ui/Loading'

export default function ParentManagement() {
  const [parents, setParents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedParent, setSelectedParent] = useState(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    occupation: '',
    relationship: 'father'
  })

  const fetchParents = async () => {
    try {
      setLoading(true)
      const response = await parentService.getAllParents({
        search: searchQuery,
        limit: 100
      })
      setParents(response.data?.data || response.data || [])
    } catch {
      toast.error('Failed to fetch parents')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (selectedParent) {
        await parentService.updateParent(selectedParent._id, formData)
        toast.success('Parent updated successfully')
      } else {
        await parentService.createParent(formData)
        toast.success('Parent created successfully')
      }
      setIsModalOpen(false)
      resetForm()
      fetchParents()
    } catch {
      toast.error(selectedParent ? 'Failed to update parent' : 'Failed to create parent')
    }
  }

  const handleEdit = (parent) => {
    setSelectedParent(parent)
    setFormData({
      firstName: parent.firstName || '',
      lastName: parent.lastName || '',
      email: parent.email || '',
      phone: parent.phone || '',
      address: parent.address || '',
      occupation: parent.occupation || '',
      relationship: parent.relationship || 'father'
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (parentId) => {
    if (!confirm('Are you sure you want to delete this parent?')) return
    
    try {
      await parentService.deleteParent(parentId)
      toast.success('Parent deleted successfully')
      fetchParents()
    } catch {
      toast.error('Failed to delete parent')
    }
  }

  const resetForm = () => {
    setSelectedParent(null)
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      occupation: '',
      relationship: 'father'
    })
  }

  const filteredParents = parents.filter(parent =>
    `${parent.firstName} ${parent.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    parent.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    parent.phone?.includes(searchQuery)
  )

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-full">
        <Loading size="large" />
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout>
      <Motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <UserGroupIcon className="w-8 h-8 text-blue-500" />
              Parent Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage parent and guardian information
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            className="flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add Parent
          </Button>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search parents by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Parents Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Parents ({filteredParents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Relationship</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Occupation</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No parents found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredParents.map((parent) => (
                      <TableRow key={parent._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                              {parent.firstName?.[0]}{parent.lastName?.[0]}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {parent.firstName} {parent.lastName}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 capitalize">
                            {parent.relationship}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <PhoneIcon className="w-4 h-4" />
                              {parent.phone}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <EnvelopeIcon className="w-4 h-4" />
                              {parent.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {parent.occupation || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {parent.students?.length || 0} student(s)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(parent)}
                            >
                              <PencilIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(parent._id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </Motion.div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={selectedParent ? 'Edit Parent' : 'Add New Parent'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Input
            label="Phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Relationship
              </label>
              <select
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              >
                <option value="father">Father</option>
                <option value="mother">Mother</option>
                <option value="guardian">Guardian</option>
              </select>
            </div>
            <Input
              label="Occupation"
              value={formData.occupation}
              onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {selectedParent ? 'Update' : 'Create'} Parent
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
