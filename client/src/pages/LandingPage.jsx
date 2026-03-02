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
  CheckCircleIcon,
  HeartIcon
} from '@heroicons/react/24/outline'
import { ROUTES } from '../constants'

const ROLES = [
  {
    name: 'Student',
    description: 'Access your hostel account and manage outpass requests with ease',
    icon: AcademicCapIcon,
    loginLink: ROUTES.STUDENT_LOGIN,
    gradient: 'from-blue-500 to-cyan-500',
    shadow: 'hover:shadow-blue-500/30',
    glow: 'from-blue-500 to-cyan-500',
    iconBg: 'from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    tag: 'Most Used'
  },
  {
    name: 'Warden',
    description: 'Efficiently manage hostel blocks and approve outpass requests',
    icon: UserGroupIcon,
    loginLink: ROUTES.WARDEN_LOGIN,
    gradient: 'from-emerald-500 to-teal-500',
    shadow: 'hover:shadow-emerald-500/30',
    glow: 'from-emerald-500 to-teal-500',
    iconBg: 'from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    tag: null
  },
  {
    name: 'Admin',
    description: 'Complete system administration and comprehensive user management',
    icon: Cog6ToothIcon,
    loginLink: ROUTES.ADMIN_LOGIN,
    gradient: 'from-violet-500 to-purple-600',
    shadow: 'hover:shadow-violet-500/30',
    glow: 'from-violet-500 to-purple-600',
    iconBg: 'from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30',
    iconColor: 'text-violet-600 dark:text-violet-400',
    tag: null
  },
  {
    name: 'Security',
    description: 'Streamlined gate management and instant student verification',
    icon: ShieldCheckIcon,
    loginLink: ROUTES.SECURITY_LOGIN,
    gradient: 'from-orange-500 to-rose-500',
    shadow: 'hover:shadow-orange-500/30',
    glow: 'from-orange-500 to-rose-500',
    iconBg: 'from-orange-50 to-rose-50 dark:from-orange-900/30 dark:to-rose-900/30',
    iconColor: 'text-orange-600 dark:text-orange-400',
    tag: null
  },
  {
    name: 'HOD',
    description: 'Department head approvals and comprehensive student oversight',
    icon: BookOpenIcon,
    loginLink: ROUTES.HOD_LOGIN,
    gradient: 'from-indigo-500 to-blue-600',
    shadow: 'hover:shadow-indigo-500/30',
    glow: 'from-indigo-500 to-blue-600',
    iconBg: 'from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    tag: null
  },
  {
    name: 'Counsellor',
    description: 'Student welfare counselling and outpass approval for sensitive cases',
    icon: HeartIcon,
    loginLink: '/counsellor/login',
    gradient: 'from-pink-500 to-rose-500',
    shadow: 'hover:shadow-pink-500/30',
    glow: 'from-pink-500 to-rose-500',
    iconBg: 'from-pink-50 to-rose-50 dark:from-pink-900/30 dark:to-rose-900/30',
    iconColor: 'text-pink-600 dark:text-pink-400',
    tag: 'New'
  }
]

const FEATURES = [
  'Secure Role-Based Access',
  'Real-Time Outpass Tracking',
  'Clear Reports for HODs & Admins',
  'Faster Approvals, Reduced Delays'
]

const IMPACT_BEFORE = [
  'Paper-based outpass registers',
  'Proxy entries & manual errors',
  'Delayed approval tracking',
  'Physical record storage'
]

const IMPACT_AFTER = [
  'Up to 85% reduction in paper usage',
  'Real-time approval & monitoring',
  'Transparent attendance tracking',
  'Accurate reporting for HOD & Admin',
  'Reduced processing time by 60–70%'
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
}

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-x-hidden">

      {/* ── Background mesh ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute -top-20 right-0 w-[500px] h-[500px] bg-violet-400/10 dark:bg-violet-500/5 rounded-full blur-[100px]" />
        <div className="absolute top-[60%] left-1/3 w-[400px] h-[400px] bg-pink-400/8 dark:bg-pink-500/5 rounded-full blur-[100px]" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.015] dark:opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* ── Header ── */}
      <Motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="sticky top-0 z-50 backdrop-blur-2xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/60 dark:border-slate-800/60"
      >
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <img
                src="https://ncet.co.in/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FNGE-Logo.251512d2.png&w=640&q=75"
                alt="NCET Logo"
                className="h-11 w-auto object-contain"
              />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 leading-none mb-0.5">NCET</p>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-none">
                Hostel Management
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="font-medium">All systems operational</span>
          </div>
        </div>
      </Motion.header>

      {/* ── Hero ── */}
      <section className="relative max-w-7xl mx-auto px-6 pt-20 pb-12 text-center">
        <Motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs font-semibold tracking-wide uppercase"
        >
          <SparklesIcon className="w-3.5 h-3.5" />
          Digital Hostel Platform — v2.0
        </Motion.div>

        <Motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-5 leading-[1.05]"
          style={{ fontFamily: '"Syne", "Plus Jakarta Sans", sans-serif' }}
        >
          <span className="text-slate-900 dark:text-white">Welcome to Your</span>
          <br />
          <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-pink-600 bg-clip-text text-transparent">
            Hostel Hub
          </span>
        </Motion.h2>

        <Motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Manage hostel operations securely and efficiently through a centralized digital platform.
          Select your role below to continue.
        </Motion.p>

        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap justify-center gap-3"
        >
          {FEATURES.map((f, i) => (
            <Motion.span
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 + i * 0.07 }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400 shadow-sm"
            >
              <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
              {f}
            </Motion.span>
          ))}
        </Motion.div>
      </section>

      {/* ── Role Cards — 3 × 2 grid ── */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <Motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {ROLES.map((role) => {
            const Icon = role.icon
            return (
              <Motion.div
                key={role.name}
                variants={cardVariants}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                className="group relative"
              >
                {/* Card glow ring on hover */}
                <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${role.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm`} />

                <div className={`relative h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm group-hover:shadow-xl ${role.shadow} transition-all duration-300`}>
                  {/* Colour bar */}
                  <div className={`h-1 bg-gradient-to-r ${role.gradient}`} />

                  <div className="p-7">
                    {/* Icon + badge row */}
                    <div className="flex items-start justify-between mb-5">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${role.iconBg} flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-inner`}>
                        <Icon className={`w-7 h-7 ${role.iconColor}`} />
                      </div>
                      {role.tag && (
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r ${role.gradient} text-white shadow-sm`}>
                          {role.tag}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      {role.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6 min-h-[48px]">
                      {role.description}
                    </p>

                    <Link to={role.loginLink}>
                      <Motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className={`w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r ${role.gradient} text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200`}
                      >
                        Login as {role.name}
                        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                      </Motion.button>
                    </Link>
                  </div>

                  {/* Subtle decorative arc */}
                  <div className={`absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-gradient-to-br ${role.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
                </div>
              </Motion.div>
            )
          })}
        </Motion.div>
      </section>

      {/* ── Impact Section ── */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <Motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-blue-500 via-violet-500 to-pink-500 opacity-10 blur-xl" />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-lg">
                📊
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Digital Transformation Impact
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Before vs After switching to our platform</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {/* Before */}
              <div className="p-6 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/50">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">⚠️</span>
                  <h4 className="font-bold text-rose-700 dark:text-rose-400 text-sm">Before: Manual System</h4>
                </div>
                <ul className="space-y-2.5">
                  {IMPACT_BEFORE.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <span className="mt-0.5 text-rose-400 font-bold flex-shrink-0">✗</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* After */}
              <div className="p-6 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/50">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">✅</span>
                  <h4 className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">Now: Digital Platform</h4>
                </div>
                <ul className="space-y-2.5">
                  {IMPACT_AFTER.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <CheckCircleIcon className="w-4 h-4 mt-0.5 text-emerald-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Motion.div>
      </section>

      {/* ── Footer ── */}
      <Motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl py-6"
      >
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-500">
            © 2026 NCET Hostel Management System · All rights reserved
          </p>
        </div>
      </Motion.footer>
    </div>
  )
}

export default LandingPage