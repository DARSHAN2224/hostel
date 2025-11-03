import { motion as Motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  AcademicCapIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  BookOpenIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { ROUTES } from '../constants'

const ROLES = [
  {
    name: 'Student',
    description: 'Access your hostel account and manage outpass requests with ease',
    icon: AcademicCapIcon,
    loginLink: ROUTES.STUDENT_LOGIN,
    gradient: 'from-blue-500 to-cyan-500',
    iconColor: 'text-blue-500',
    bgGlow: 'group-hover:shadow-blue-500/50'
  },
  {
    name: 'Warden',
    description: 'Efficiently manage hostel blocks and approve outpass requests',
    icon: UserGroupIcon,
    loginLink: ROUTES.WARDEN_LOGIN,
    gradient: 'from-green-500 to-emerald-500',
    iconColor: 'text-green-500',
    bgGlow: 'group-hover:shadow-green-500/50'
  },
  {
    name: 'Admin',
    description: 'Complete system administration and comprehensive user management',
    icon: Cog6ToothIcon,
    loginLink: ROUTES.ADMIN_LOGIN,
    gradient: 'from-purple-500 to-pink-500',
    iconColor: 'text-purple-500',
    bgGlow: 'group-hover:shadow-purple-500/50'
  },
  {
    name: 'Security',
    description: 'Streamlined gate management and instant student verification',
    icon: ShieldCheckIcon,
    loginLink: ROUTES.SECURITY_LOGIN,
    gradient: 'from-orange-500 to-red-500',
    iconColor: 'text-orange-500',
    bgGlow: 'group-hover:shadow-orange-500/50'
  },
  {
    name: 'HOD',
    description: 'Department head approvals and comprehensive student oversight',
    icon: BookOpenIcon,
    loginLink: ROUTES.HOD_LOGIN,
    gradient: 'from-indigo-500 to-purple-500',
    iconColor: 'text-indigo-500',
    bgGlow: 'group-hover:shadow-indigo-500/50'
  }
]

const FEATURES = [
  'Seamless account management by administrators',
  'Instant email verification for security',
  'Role-based access control system',
  'Real-time outpass tracking & approvals'
]

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative">
        {/* Header */}
        <Motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-white/20 dark:border-slate-700/50 shadow-lg"
        >
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur-lg opacity-75 animate-pulse-slow"></div>
                  <div className="relative bg-gradient-to-br from-blue-600 to-purple-600 p-2.5 rounded-xl shadow-lg">
                    <SparklesIcon className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                    Hostel Management
                  </h1>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Modern. Secure. Efficient.</p>
                </div>
              </div>
              
              <Motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-sm text-slate-600 dark:text-slate-400 font-medium"
              >
                v2.0
              </Motion.div>
            </div>
          </div>
        </Motion.header>

        {/* Hero Section */}
        <main className="container mx-auto px-6 py-16">
          <Motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-center mb-16"
          >
            <Motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 border border-blue-200 dark:border-blue-800"
            >
              <SparklesIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                Next Generation Platform
              </span>
            </Motion.div>

            <h2 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-slate-900 via-blue-800 to-slate-900 dark:from-white dark:via-blue-200 dark:to-white bg-clip-text text-transparent">
                Welcome to Your
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
                Digital Hostel Hub
              </span>
            </h2>
            
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed mb-8">
              Experience seamless hostel management with our modern, secure, and intuitive platform.
              Select your role below to access your personalized dashboard.
            </p>

            {/* Features List */}
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap justify-center gap-4 mb-12"
            >
              {FEATURES.map((feature, index) => (
                <Motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-full border border-slate-200 dark:border-slate-700"
                >
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{feature}</span>
                </Motion.div>
              ))}
            </Motion.div>
          </Motion.div>

          {/* Role Cards Grid */}
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
          >
            {ROLES.map((role, index) => {
              const Icon = role.icon
              return (
                <Motion.div
                  key={role.name}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                  whileHover={{ y: -8 }}
                  className="group relative"
                >
                  {/* Glow Effect */}
                  <div className={`absolute -inset-0.5 bg-gradient-to-r ${role.gradient} rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-500 ${role.bgGlow}`}></div>
                  
                  {/* Card */}
                  <div className="relative h-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-soft hover:shadow-2xl transition-all duration-500">
                    {/* Gradient Top Bar */}
                    <div className={`h-1.5 bg-gradient-to-r ${role.gradient}`}></div>

                    <div className="p-8">
                      {/* Icon with Animation */}
                      <Motion.div
                        whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                        className={`inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br ${role.gradient} p-0.5 shadow-lg group-hover:shadow-xl transition-shadow duration-500`}
                      >
                        <div className="flex items-center justify-center w-full h-full bg-white dark:bg-slate-800 rounded-2xl">
                          <Icon className={`w-8 h-8 ${role.iconColor}`} />
                        </div>
                      </Motion.div>

                      {/* Content */}
                      <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white mb-3 group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                        {role.name}
                      </h3>
                      
                      <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed min-h-[60px]">
                        {role.description}
                      </p>

                      {/* Login Button */}
                      <Link to={role.loginLink}>
                        <Motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r ${role.gradient} text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group/btn`}
                        >
                          <span>Login as {role.name}</span>
                          <ArrowRightIcon className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform duration-300" />
                        </Motion.button>
                      </Link>
                    </div>

                    {/* Decorative Corner Element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent dark:from-white/10 rounded-bl-full"></div>
                  </div>
                </Motion.div>
              )
            })}
          </Motion.div>

          {/* Info Section */}
          <Motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <div className="relative group">
              {/* Glow Effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl opacity-20 group-hover:opacity-30 blur-xl transition duration-500"></div>
              
              {/* Info Card */}
              <div className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl px-8 py-10 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl">
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <CheckCircleIcon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-2">
                      Account Creation Process
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                      Our secure, managed account system ensures authorized access only
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { title: 'Admin', desc: 'Created via seeder script or secret endpoint', icon: '🔐' },
                    { title: 'Warden', desc: 'Created by Admin with proper authorization', icon: '👤' },
                    { title: 'Students & Staff', desc: 'Created by Admin or Warden as needed', icon: '👥' }
                  ].map((item, index) => (
                    <Motion.div
                      key={index}
                      whileHover={{ scale: 1.05 }}
                      className="p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700"
                    >
                      <div className="text-2xl mb-2">{item.icon}</div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-1">{item.title}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                    </Motion.div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                    <ShieldCheckIcon className="w-4 h-4" />
                    All accounts require email verification after creation for enhanced security
                  </p>
                </div>
              </div>
            </div>
          </Motion.div>
        </main>

        {/* Footer */}
        <Motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="py-8 px-6 border-t border-slate-200 dark:border-slate-700 backdrop-blur-xl bg-white/50 dark:bg-slate-900/50"
        >
          <div className="container mx-auto text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              &copy; {new Date().getFullYear()} Hostel Management System. 
              <span className="mx-2">•</span>
              Built with modern technologies
              <span className="mx-2">•</span>
              Secure & Reliable
            </p>
          </div>
        </Motion.footer>
      </div>
    </div>
  )
}

export default LandingPage
