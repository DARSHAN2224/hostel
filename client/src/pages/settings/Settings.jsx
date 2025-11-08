/**
 * Settings Page - Ultra Modern User Settings
 * Complete user settings with tabs for profile, security, and preferences
 */

import { useState } from 'react'
import PropTypes from 'prop-types'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { useSelector, useDispatch } from 'react-redux'
import {
  UserCircleIcon,
  LockClosedIcon,
  BellIcon,
  PaintBrushIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  KeyIcon,
  EnvelopeIcon,
  PhoneIcon,
  HomeIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'
import DashboardLayout from '../../layouts/DashboardLayout'
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import { selectUser, setUser } from '../../store/authSlice'
import { updateProfile as apiUpdateProfile, changePassword as apiChangePassword } from '../../services/authService'
import toast from 'react-hot-toast'
import { useTheme } from '../../hooks/useTheme'
import apiClient from '../../services/api'

export default function Settings({ initialTab = 'profile' }) {
  const user = useSelector(selectUser)
  const dispatch = useDispatch()
  const [activeTab, setActiveTab] = useState(initialTab)
  const { theme, setTheme } = useTheme()
  const [uploading, setUploading] = useState(false)
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true
  })

  // Profile form
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || ''
  })

  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserCircleIcon, color: 'from-blue-500 to-cyan-500' },
    { id: 'security', label: 'Security', icon: LockClosedIcon, color: 'from-green-500 to-emerald-500' },
    { id: 'notifications', label: 'Notifications', icon: BellIcon, color: 'from-purple-500 to-pink-500' },
    { id: 'appearance', label: 'Appearance', icon: PaintBrushIcon, color: 'from-orange-500 to-red-500' }
  ]

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileData(prev => ({ ...prev, [name]: value }))
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    try {
      const loading = toast.loading('Updating profile...')
      await apiUpdateProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
      })
      toast.success('Profile updated', { id: loading })
    } catch (err) {
      toast.error(err?.message || 'Failed to update profile')
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    try {
      const loading = toast.loading('Changing password...')
      await apiChangePassword({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword })
      toast.success('Password changed', { id: loading })
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err?.message || 'Failed to change password')
    }
  }

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit')
      return
    }

    try {
      setUploading(true)
      const loading = toast.loading('Uploading profile picture...')
      
      const formData = new FormData()
      formData.append('profilePicture', file)

      const response = await apiClient.post('/users/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      // Update user in Redux store
      const updatedUser = { ...user, profilePicture: response.data.data.profilePicture }
      dispatch(setUser(updatedUser))

      toast.success('Profile picture uploaded successfully', { id: loading })
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to upload profile picture')
    } finally {
      setUploading(false)
    }
  }

  const handleNotificationToggle = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const saveNotifications = async () => {
    try {
      const res = await apiClient.post('/notifications/preferences', notifications)
      if (res.status >= 200 && res.status < 300) {
        toast.success('Preferences saved')
      } else {
        throw new Error('Failed')
      }
    } catch {
      // Fallback: persist locally if backend not available
      localStorage.setItem('notification-preferences', JSON.stringify(notifications))
      toast.success('Preferences saved locally')
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
        <Motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-8 shadow-2xl"
        >
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-float" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          </div>
          <div className="relative flex items-center gap-4">
            <SparklesIcon className="h-12 w-12 text-white animate-pulse" />
            <div>
              <h1 className="text-3xl font-display font-bold text-white">
                Settings
              </h1>
              <p className="mt-1 text-lg text-white/90">
                Manage your account settings and preferences ⚙️
              </p>
            </div>
          </div>
        </Motion.div>

        {/* Tabs */}
        <div className="flex gap-2 p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex-1 px-4 py-3 text-sm font-medium transition-colors duration-200 rounded-xl"
            >
              {activeTab === tab.id && (
                <Motion.div
                  layoutId="activeTab"
                  className={`absolute inset-0 bg-gradient-to-r ${tab.color} rounded-xl shadow-lg`}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className={`relative flex items-center justify-center gap-2 ${
                activeTab === tab.id ? 'text-white' : 'text-slate-600 dark:text-slate-400'
              }`}>
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && (
            <Motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card glassmorphic gradient>
                <CardHeader>
                  <CardTitle gradient icon={UserCircleIcon}>Profile Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    {/* Avatar Section */}
                    <div className="flex items-center gap-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                      <Motion.div
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        className="relative"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full blur-xl opacity-50" />
                        <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-2xl overflow-hidden">
                          {user?.profilePicture ? (
                            <img 
                              src={`${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000'}${user.profilePicture}`}
                              alt="Profile" 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-4xl font-bold text-white">
                              {user?.firstName?.charAt(0) || 'U'}
                            </span>
                          )}
                        </div>
                      </Motion.div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {user?.firstName} {user?.lastName}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{user?.role}</p>
                        <div className="mt-2">
                          <label htmlFor="avatar-upload">
                            <span 
                              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-all duration-300"
                            >
                              <PhotoIcon className="h-4 w-4" />
                              {uploading ? 'Uploading...' : 'Change Avatar'}
                            </span>
                          </label>
                          <input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePictureUpload}
                            className="hidden"
                            disabled={uploading}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="First Name"
                        name="firstName"
                        value={profileData.firstName}
                        onChange={handleProfileChange}
                        icon={UserCircleIcon}
                        glassmorphic
                        required
                      />
                      <Input
                        label="Last Name"
                        name="lastName"
                        value={profileData.lastName}
                        onChange={handleProfileChange}
                        icon={UserCircleIcon}
                        glassmorphic
                        required
                      />
                    </div>

                    <Input
                      label="Email Address"
                      name="email"
                      type="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      icon={EnvelopeIcon}
                      glassmorphic
                      required
                    />

                    <Input
                      label="Phone Number"
                      name="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      icon={PhoneIcon}
                      glassmorphic
                    />

                    <Input
                      label="Address"
                      name="address"
                      value={profileData.address}
                      onChange={handleProfileChange}
                      icon={HomeIcon}
                      glassmorphic
                    />

                    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <CheckCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        Your profile information is encrypted and stored securely.
                      </p>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button variant="ghost" type="button">
                        Cancel
                      </Button>
                      <Button type="submit" icon={CheckCircleIcon}>
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </Motion.div>
          )}

          {activeTab === 'security' && (
            <Motion.div
              key="security"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card glassmorphic gradient>
                <CardHeader>
                  <CardTitle gradient icon={LockClosedIcon}>Security Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordSubmit} className="space-y-6">
                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                      <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                          Your account is secure
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-200 mt-1">
                          Last password change: Never
                        </p>
                      </div>
                    </div>

                    <Input
                      label="Current Password"
                      name="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      icon={KeyIcon}
                      glassmorphic
                      required
                    />

                    <Input
                      label="New Password"
                      name="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      icon={LockClosedIcon}
                      glassmorphic
                      required
                    />

                    <Input
                      label="Confirm New Password"
                      name="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      icon={LockClosedIcon}
                      glassmorphic
                      required
                    />

                    <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                      <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <p className="text-sm text-amber-900 dark:text-amber-100">
                        Make sure your password is at least 8 characters long and includes a mix of letters, numbers, and symbols.
                      </p>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button variant="ghost" type="button">
                        Cancel
                      </Button>
                      <Button type="submit" variant="success" icon={KeyIcon}>
                        Change Password
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </Motion.div>
          )}

          {activeTab === 'notifications' && (
            <Motion.div
              key="notifications"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card glassmorphic gradient>
                <CardHeader>
                  <CardTitle gradient icon={BellIcon}>Notification Preferences</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { key: 'email', label: 'Email Notifications', description: 'Receive notifications via email' },
                      { key: 'sms', label: 'SMS Notifications', description: 'Receive notifications via SMS' },
                      { key: 'push', label: 'Push Notifications', description: 'Receive browser push notifications' }
                    ].map((item, index) => (
                      <Motion.div
                        key={item.key}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700"
                      >
                        <div>
                          <h4 className="font-medium text-slate-900 dark:text-white">{item.label}</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{item.description}</p>
                        </div>
                        <button
                          onClick={() => handleNotificationToggle(item.key)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            notifications[item.key]
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                              : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        >
                          <Motion.span
                            layout
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                              notifications[item.key] ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </Motion.div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <Button icon={CheckCircleIcon} onClick={saveNotifications}>
                      Save Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Motion.div>
          )}

          {activeTab === 'appearance' && (
            <Motion.div
              key="appearance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card glassmorphic gradient>
                <CardHeader>
                  <CardTitle gradient icon={PaintBrushIcon}>Appearance Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <Select
                      label="Theme"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      glassmorphic
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto (System)</option>
                    </Select>

                    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <CheckCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        Theme changed to <strong>{theme === 'auto' ? 'Auto (System)' : theme.charAt(0).toUpperCase() + theme.slice(1)}</strong>. Changes apply immediately.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Motion.div
                        whileHover={{ scale: 1.02, y: -4 }}
                        onClick={() => setTheme('light')}
                        className={`p-6 bg-gradient-to-br from-slate-50 to-white rounded-xl border-2 ${theme === 'light' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'} cursor-pointer`}
                      >
                        <div className="w-full h-32 bg-white rounded-lg shadow-inner mb-3" />
                        <h4 className="font-medium text-slate-900">Light Mode</h4>
                        <p className="text-sm text-slate-600">Clean and bright</p>
                      </Motion.div>

                      <Motion.div
                        whileHover={{ scale: 1.02, y: -4 }}
                        onClick={() => setTheme('dark')}
                        className={`p-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border-2 ${theme === 'dark' ? 'border-blue-500 ring-2 ring-blue-400/30' : 'border-slate-700'} cursor-pointer`}
                      >
                        <div className="w-full h-32 bg-slate-800 rounded-lg shadow-inner mb-3" />
                        <h4 className="font-medium text-white">Dark Mode</h4>
                        <p className="text-sm text-slate-400">Easy on the eyes</p>
                      </Motion.div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Motion.div>
          )}
        </AnimatePresence>
      </Motion.div>
    </DashboardLayout>
  )
}

Settings.propTypes = {
  initialTab: PropTypes.string,
}
