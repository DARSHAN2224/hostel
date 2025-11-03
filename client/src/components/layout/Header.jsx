import { motion as Motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { 
  BellIcon, 
  Bars3Icon, 
  MoonIcon, 
  SunIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { getInitials } from '../../utils/helpers'

export default function Header({ user, toggleSidebar, theme, toggleTheme }) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  const notifications = []

  return (
    <Motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm"
    >
      <div className="px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left side */}
          <div className="flex items-center gap-4 flex-1">
            {/* Mobile menu button */}
            <Motion.button
              onClick={toggleSidebar}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
            >
              <Bars3Icon className="h-6 w-6" />
            </Motion.button>
            
            {/* Welcome message */}
            <div className="hidden md:block">
              <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white">
                Welcome back, {user?.firstName || 'User'}! 👋
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Here's what's happening today
              </p>
            </div>

            {/* Search button */}
            <Motion.button
              onClick={() => setShowSearch(!showSearch)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="ml-auto md:ml-0 p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </Motion.button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Theme toggle */}
            <Motion.button
              onClick={toggleTheme}
              whileHover={{ scale: 1.05, rotate: 180 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 md:p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all duration-300"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait">
                {theme === 'dark' ? (
                  <Motion.div
                    key="sun"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SunIcon className="h-5 w-5 text-yellow-500" />
                  </Motion.div>
                ) : (
                  <Motion.div
                    key="moon"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <MoonIcon className="h-5 w-5 text-slate-700" />
                  </Motion.div>
                )}
              </AnimatePresence>
            </Motion.button>

            {/* Notifications */}
            <div className="relative">
              <Motion.button
                onClick={() => setShowNotifications(!showNotifications)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2 md:p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
              >
                <BellIcon className="h-5 w-5" />
                {notifications.length > 0 && (
                  <Motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-1.5 right-1.5 flex h-2 w-2"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </Motion.span>
                )}
              </Motion.button>

              {/* Notifications dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowNotifications(false)}
                    />
                    <Motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-80 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-20"
                    >
                      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                          Notifications
                        </h3>
                      </div>
                      {notifications.length === 0 ? (
                        <div className="px-4 py-12 text-center">
                          <BellIcon className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            No new notifications
                          </p>
                        </div>
                      ) : (
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.map((notification, index) => (
                            <Motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                            >
                              <p className="text-sm text-slate-900 dark:text-white font-medium">
                                {notification.message}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {notification.time}
                              </p>
                            </Motion.div>
                          ))}
                        </div>
                      )}
                    </Motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile */}
            <Motion.div 
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
            >
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                  {user?.role || 'User'}
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-md opacity-50"></div>
                <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold text-sm shadow-lg">
                  {getInitials(user?.firstName, user?.lastName)}
                </div>
              </div>
            </Motion.div>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            <div className="px-4 md:px-6 py-3">
              <div className="relative max-w-2xl">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students, outpasses, reports..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  autoFocus
                />
              </div>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.header>
  )
}
