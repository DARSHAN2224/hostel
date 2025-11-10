import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { BellIcon, CheckIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid'
import PropTypes from 'prop-types'
import { notificationService } from '../services'
import toast from 'react-hot-toast'

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)
  const inFlightRef = useRef(false)
  const abortControllerRef = useRef(null)

  // Fetch notifications and unread count
  const fetchNotifications = async () => {
    // Prevent overlapping requests
    if (inFlightRef.current) return
    inFlightRef.current = true

    // Abort previous controller and create a fresh one
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      const controller = new AbortController()
      abortControllerRef.current = controller

      const [notifResponse, countResponse] = await Promise.all([
        notificationService.getNotifications({ limit: 10 }, { signal: controller.signal }),
        notificationService.getUnreadCount({ signal: controller.signal })
      ])

      setNotifications(notifResponse.data?.data || notifResponse.data || notifResponse || [])
      setUnreadCount(countResponse.data?.unreadCount || countResponse.data || 0)
    } catch (_error) {
      // Ignore abort/cancel errors, suppress log for those
      if (!(_error && (_error.name === 'CanceledError' || _error.name === 'AbortError' || _error.message === 'canceled' || _error.code === 'ERR_CANCELED'))) {
        console.error('Failed to fetch notifications:', _error)
      }
    } finally {
      inFlightRef.current = false
    }
  }

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => {
      clearInterval(interval)
      abortControllerRef.current?.abort()
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId)
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      toast.error('Failed to mark as read')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true)
      await notificationService.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to mark all as read')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId)
      setNotifications(prev => prev.filter(n => n._id !== notificationId))
      toast.success('Notification deleted')
    } catch {
      toast.error('Failed to delete notification')
    }
  }

  const handleClearAll = async () => {
    try {
      setLoading(true)
      await notificationService.clearAll()
      setNotifications([])
      setUnreadCount(0)
      toast.success('All notifications cleared')
    } catch {
      toast.error('Failed to clear notifications')
    } finally {
      setLoading(false)
    }
  }

  const getNotificationIcon = (type) => {
    const iconClass = "w-5 h-5"
    switch (type) {
      case 'outpass_approved':
        return <CheckIcon className={`${iconClass} text-green-500`} />
      case 'outpass_rejected':
        return <XMarkIcon className={`${iconClass} text-red-500`} />
      case 'violation_reported':
        return <BellSolidIcon className={`${iconClass} text-orange-500`} />
      default:
        return <BellSolidIcon className={`${iconClass} text-blue-500`} />
    }
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors duration-200"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellSolidIcon className="w-6 h-6 text-blue-500 animate-pulse" />
        ) : (
          <BellIcon className="w-6 h-6" />
        )}
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <Motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-96 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 z-50 max-h-[600px] flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
              {notifications.length > 0 && (
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      disabled={loading}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={handleClearAll}
                    disabled={loading}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400">
                  <BellIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification._id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onDelete={handleDelete}
                      getIcon={getNotificationIcon}
                      formatTime={formatTime}
                    />
                  ))}
                </div>
              )}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const NotificationItem = ({ notification, onMarkAsRead, onDelete, getIcon, formatTime }) => {
  return (
    <div
      className={`px-4 py-3 hover:bg-gray-700/50 transition-colors ${
        notification.isRead ? '' : 'bg-blue-900/20'
      }`}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-1">
          {getIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h4 className="text-sm font-medium text-white truncate">
              {notification.title}
            </h4>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {formatTime(notification.createdAt)}
            </span>
          </div>
          <p className="text-sm text-gray-300 mt-1 line-clamp-2">
            {notification.message}
          </p>
          
          {/* Priority Badge */}
          {notification.priority === 'high' && (
            <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-red-500/20 text-red-400 rounded">
              High Priority
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex gap-2">
          {!notification.isRead && (
            <button
              onClick={() => onMarkAsRead(notification._id)}
              className="text-blue-400 hover:text-blue-300 transition-colors"
              aria-label="Mark as read"
            >
              <CheckIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(notification._id)}
            className="text-red-400 hover:text-red-300 transition-colors"
            aria-label="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

NotificationItem.propTypes = {
  notification: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    isRead: PropTypes.bool.isRequired,
    priority: PropTypes.string,
    createdAt: PropTypes.string.isRequired,
  }).isRequired,
  onMarkAsRead: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  getIcon: PropTypes.func.isRequired,
  formatTime: PropTypes.func.isRequired,
}

export default NotificationBell
