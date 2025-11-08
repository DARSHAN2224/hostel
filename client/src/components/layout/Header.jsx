import { motion as Motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { 
  Bars3Icon, 
  MoonIcon, 
  SunIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { getInitials } from '../../utils/helpers'
import PropTypes from 'prop-types'

export default function Header({ user, toggleSidebar, theme, toggleTheme, notificationBell }) {
  const [showSearch, setShowSearch] = useState(false)

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
            {notificationBell}

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

Header.propTypes = {
  user: PropTypes.object,
  toggleSidebar: PropTypes.func.isRequired,
  theme: PropTypes.string.isRequired,
  toggleTheme: PropTypes.func.isRequired,
  notificationBell: PropTypes.node,
}
