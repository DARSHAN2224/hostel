import { motion as Motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { 
  HomeIcon, 
  UserGroupIcon, 
  DocumentTextIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  SparklesIcon,
  ClockIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline'
import { ROUTES } from '../../constants'

const navigation = [
  { name: 'Dashboard', href: ROUTES.DASHBOARD, icon: HomeIcon, gradient: 'from-blue-500 to-cyan-500' },
  { name: 'Students', href: ROUTES.STUDENTS, icon: UserGroupIcon, gradient: 'from-green-500 to-emerald-500' },
  { name: 'Outpass Requests', href: ROUTES.OUTPASS_REQUESTS, icon: DocumentTextIcon, gradient: 'from-purple-500 to-pink-500' },
  { name: 'History', href: ROUTES.OUTPASS_HISTORY, icon: ClockIcon, gradient: 'from-orange-500 to-red-500' },
  { name: 'Reports', href: ROUTES.REPORTS, icon: ChartBarIcon, gradient: 'from-indigo-500 to-purple-500' },
]

const bottomNavigation = [
  { name: 'Profile', href: ROUTES.PROFILE, icon: UserCircleIcon },
  { name: 'Settings', href: ROUTES.SETTINGS, icon: Cog6ToothIcon },
]

export default function Sidebar({ onLogout, mobile }) {
  const location = useLocation()

  const sidebarVariants = {
    hidden: { x: -300, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 20,
        staggerChildren: 0.05
      }
    }
  }

  const itemVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1 }
  }

  return (
    <Motion.aside
      initial={mobile ? "hidden" : "visible"}
      animate="visible"
      variants={sidebarVariants}
      className="hidden lg:flex lg:flex-col lg:w-72 lg:flex-shrink-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 shadow-xl relative z-20"
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Logo */}
        <Motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 px-6 py-6 border-b border-slate-200/50 dark:border-slate-700/50"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur-md opacity-75"></div>
            <div className="relative bg-gradient-to-br from-blue-600 to-purple-600 p-2.5 rounded-xl shadow-lg">
              <SparklesIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-display font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Hostel MS
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Management System</p>
          </div>
        </Motion.div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto hide-scrollbar">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon
            
            return (
              <Motion.div
                key={item.name}
                variants={itemVariants}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  to={item.href}
                  className="group relative block"
                >
                  {/* Active indicator */}
                  {isActive && (
                    <Motion.div
                      layoutId="activeTab"
                      className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-10 rounded-xl`}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  
                  {/* Content */}
                  <div className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}>
                    <div className={`relative ${isActive ? 'scale-110' : ''} transition-transform duration-200`}>
                      {isActive && (
                        <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} rounded-lg blur-md opacity-50`}></div>
                      )}
                      <Icon className={`relative h-5 w-5 ${isActive ? `bg-gradient-to-r ${item.gradient} text-transparent bg-clip-text` : ''}`} />
                    </div>
                    <span className={`font-medium text-sm ${isActive ? 'font-semibold' : ''}`}>
                      {item.name}
                    </span>
                    
                    {/* Hover effect */}
                    {!isActive && (
                      <div className="absolute inset-0 bg-slate-100 dark:bg-slate-700/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10"></div>
                    )}
                  </div>
                </Link>
              </Motion.div>
            )
          })}
        </nav>

        {/* Bottom navigation */}
        <div className="px-4 py-4 border-t border-slate-200/50 dark:border-slate-700/50 space-y-1">
          {bottomNavigation.map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon
            
            return (
              <Motion.div
                key={item.name}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/30 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              </Motion.div>
            )
          })}
          
          {/* Logout button */}
          <Motion.button
            onClick={onLogout}
            whileHover={{ x: 4, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span>Logout</span>
          </Motion.button>
        </div>

        {/* Decorative element */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-100/50 dark:from-slate-900/50 to-transparent pointer-events-none"></div>
      </div>
    </Motion.aside>
  )
}
