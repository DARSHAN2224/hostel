/**
 * RoleLogin.jsx
 * Role-specific login page, path: /client/src/pages/auth/RoleLogin.jsx
 * Reads the role from the URL path segment (e.g. /student/login → role = student).
 */

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  AcademicCapIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  BookOpenIcon,
  HeartIcon,
  EnvelopeIcon,
  LockClosedIcon,
  ArrowLeftIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { loginUser, selectIsAuthenticated, selectAuthLoading } from '../../store/authSlice'
import { ROUTES } from '../../constants'

/* ── Role metadata ─────────────────────────────────────────────── */
const ROLE_META = {
  student: {
    label: 'Student',
    icon: AcademicCapIcon,
    gradient: 'from-blue-500 to-cyan-500',
    ring: 'focus:ring-blue-400',
    btn: 'from-blue-500 to-cyan-500',
    shadow: 'shadow-blue-500/25',
    glow: 'from-blue-400/20 to-cyan-400/20',
    accent: 'text-blue-600 dark:text-blue-400',
    bg: 'from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40',
    tag: 'Hostel Student Portal',
    defaultEmail: ''
  },
  warden: {
    label: 'Warden',
    icon: UserGroupIcon,
    gradient: 'from-emerald-500 to-teal-500',
    ring: 'focus:ring-emerald-400',
    btn: 'from-emerald-500 to-teal-500',
    shadow: 'shadow-emerald-500/25',
    glow: 'from-emerald-400/20 to-teal-400/20',
    accent: 'text-emerald-600 dark:text-emerald-400',
    bg: 'from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40',
    tag: 'Hostel Warden Portal',
    defaultEmail: ''
  },
  admin: {
    label: 'Admin',
    icon: Cog6ToothIcon,
    gradient: 'from-violet-500 to-purple-600',
    ring: 'focus:ring-violet-400',
    btn: 'from-violet-500 to-purple-600',
    shadow: 'shadow-violet-500/25',
    glow: 'from-violet-400/20 to-purple-400/20',
    accent: 'text-violet-600 dark:text-violet-400',
    bg: 'from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40',
    tag: 'Administration Portal',
    defaultEmail: ''
  },
  security: {
    label: 'Security',
    icon: ShieldCheckIcon,
    gradient: 'from-orange-500 to-rose-500',
    ring: 'focus:ring-orange-400',
    btn: 'from-orange-500 to-rose-500',
    shadow: 'shadow-orange-500/25',
    glow: 'from-orange-400/20 to-rose-400/20',
    accent: 'text-orange-600 dark:text-orange-400',
    bg: 'from-orange-50 to-rose-50 dark:from-orange-950/40 dark:to-rose-950/40',
    tag: 'Security Gate Portal',
    defaultEmail: ''
  },
  hod: {
    label: 'HOD',
    icon: BookOpenIcon,
    gradient: 'from-indigo-500 to-blue-600',
    ring: 'focus:ring-indigo-400',
    btn: 'from-indigo-500 to-blue-600',
    shadow: 'shadow-indigo-500/25',
    glow: 'from-indigo-400/20 to-blue-400/20',
    accent: 'text-indigo-600 dark:text-indigo-400',
    bg: 'from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40',
    tag: 'Head of Department Portal',
    defaultEmail: ''
  },
  counsellor: {
    label: 'Counsellor',
    icon: HeartIcon,
    gradient: 'from-pink-500 to-rose-500',
    ring: 'focus:ring-pink-400',
    btn: 'from-pink-500 to-rose-500',
    shadow: 'shadow-pink-500/25',
    glow: 'from-pink-400/20 to-rose-400/20',
    accent: 'text-pink-600 dark:text-pink-400',
    bg: 'from-pink-50 to-rose-50 dark:from-pink-950/40 dark:to-rose-950/40',
    tag: 'Student Counsellor Portal',
    defaultEmail: ''
  }
}

/* ── Role → dashboard redirect map ───────────────────────────── */
const DASHBOARD_MAP = {
  student:    ROUTES.STUDENT_DASHBOARD  || '/student/dashboard',
  warden:     ROUTES.DASHBOARD          || '/dashboard',
  admin:      ROUTES.ADMIN_DASHBOARD    || '/admin/dashboard',
  security:   ROUTES.SECURITY_DASHBOARD || '/security/dashboard',
  hod:        ROUTES.HOD_DASHBOARD      || '/hod/dashboard',
  counsellor: '/counsellor/dashboard'
}

/* ── Helper: derive role from URL ─────────────────────────────── */
const getRoleFromPath = (pathname) => {
  const segments = pathname.split('/')
  // e.g. /student/login → segments[1] = 'student'
  const first = segments[1]?.toLowerCase()
  if (ROLE_META[first]) return first
  return 'student'
}

/* ── Component ─────────────────────────────────────────────────── */
const RoleLogin = () => {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const location  = useLocation()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const loading   = useSelector(selectAuthLoading)

  const role = getRoleFromPath(location.pathname)
  const meta = ROLE_META[role] || ROLE_META.student
  const Icon = meta.icon

  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { email: meta.defaultEmail, password: '' }
  })

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate(DASHBOARD_MAP[role] || '/dashboard', { replace: true })
  }, [isAuthenticated, navigate, role])

  const onSubmit = async (data) => {
    try {
      const result = await dispatch(loginUser({ ...data, role })).unwrap()
      if (result?.mustChangePassword) {
        toast('Please change your password to continue.', { icon: '🔒' })
        return navigate('/settings')
      }
      toast.success(`Welcome back!`)
      navigate(DASHBOARD_MAP[role] || '/dashboard', { replace: true })
    } catch (err) {
      toast.error(err?.message || 'Invalid credentials. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex relative overflow-hidden">

      {/* ── Mesh background ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className={`absolute -top-32 -left-32 w-[500px] h-[500px] bg-gradient-to-br ${meta.glow} rounded-full blur-[100px]`} />
        <div className={`absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl ${meta.glow} rounded-full blur-[120px]`} />
        <svg className="absolute inset-0 w-full h-full opacity-[0.02] dark:opacity-[0.04]">
          <defs>
            <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="currentColor"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      {/* ── Left decorative panel (hidden on mobile) ── */}
      <div className="hidden lg:flex flex-col w-[42%] relative">
        <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} opacity-90`} />
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
            {[...Array(8)].map((_, i) => (
              <circle
                key={i}
                cx={-60 + i * 80}
                cy={200 + (i % 3) * 120}
                r={60 + i * 20}
                fill="none"
                stroke="white"
                strokeWidth="1"
              />
            ))}
            {[...Array(6)].map((_, i) => (
              <line
                key={`l${i}`}
                x1={i * 80}
                y1="0"
                x2={i * 80 + 200}
                y2="600"
                stroke="white"
                strokeWidth="0.5"
                strokeDasharray="4 8"
              />
            ))}
          </svg>
        </div>

        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          {/* Back to landing */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors group w-fit"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to roles
          </Link>

          {/* Center content */}
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center mb-8 shadow-2xl"
            >
              <Icon className="w-12 h-12 text-white" />
            </Motion.div>

            <Motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-4xl font-black text-white mb-3"
              style={{ fontFamily: '"Syne", sans-serif' }}
            >
              {meta.label} Portal
            </Motion.h2>

            <Motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="text-white/70 text-base max-w-xs leading-relaxed"
            >
              {meta.tag} — Secure, centralized hostel management
            </Motion.p>

            {/* Feature pills */}
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="flex flex-col gap-3 mt-10 w-full max-w-xs"
            >
              {['Secure authentication', 'Role-based access', 'Real-time updates'].map((f, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-medium">
                  <div className="w-2 h-2 rounded-full bg-white/80 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </Motion.div>
          </div>

          {/* NCET logo bottom */}
          <div className="flex items-center gap-2 opacity-60">
            <img
              src="https://ncet.co.in/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FNGE-Logo.251512d2.png&w=640&q=75"
              alt="NCET"
              className="h-8 w-auto object-contain brightness-0 invert"
            />
            <span className="text-white text-xs font-semibold tracking-wide">NCET Hostel Management</span>
          </div>
        </div>
      </div>

      {/* ── Right: Login form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 relative z-10">

        {/* Mobile header */}
        <div className="lg:hidden w-full max-w-sm mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-medium transition-colors group mb-6"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            All roles
          </Link>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{meta.tag}</p>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{meta.label} Login</h1>
            </div>
          </div>
        </div>

        {/* Form card */}
        <Motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          {/* Heading (desktop) */}
          <div className="hidden lg:block mb-8">
            <p className={`text-xs font-bold uppercase tracking-widest ${meta.accent} mb-1`}>{meta.tag}</p>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2" style={{ fontFamily: '"Syne", sans-serif' }}>
              Sign in
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Enter your credentials to access the {meta.label.toLowerCase()} dashboard.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none w-[18px] h-[18px]" />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="your@email.com"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+\.\S+$/,
                      message: 'Invalid email address'
                    }
                  })}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm transition-all outline-none
                    ${errors.email
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-400/40'
                      : `border-slate-200 dark:border-slate-700 focus:border-transparent focus:ring-2 ${meta.ring}/40`
                    }`}
                />
              </div>
              <AnimatePresence>
                {errors.email && (
                  <Motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-1.5 text-xs text-rose-500 font-medium"
                  >
                    {errors.email.message}
                  </Motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className={`text-xs font-semibold ${meta.accent} hover:underline`}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 w-[18px] h-[18px]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Minimum 6 characters' }
                  })}
                  className={`w-full pl-10 pr-11 py-3 rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm transition-all outline-none
                    ${errors.password
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-400/40'
                      : `border-slate-200 dark:border-slate-700 focus:border-transparent focus:ring-2 ${meta.ring}/40`
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword
                    ? <EyeSlashIcon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                    : <EyeIcon className="w-[18px] h-[18px]" />}
                </button>
              </div>
              <AnimatePresence>
                {errors.password && (
                  <Motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-1.5 text-xs text-rose-500 font-medium"
                  >
                    {errors.password.message}
                  </Motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Submit */}
            <Motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.015 }}
              whileTap={{ scale: loading ? 1 : 0.975 }}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r ${meta.btn} text-white font-bold text-sm shadow-lg ${meta.shadow} hover:shadow-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  Sign in as {meta.label}
                  <ArrowRightIcon className="w-4 h-4" />
                </>
              )}
            </Motion.button>
          </form>

          {/* Role switcher */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-400 text-center mb-3 font-medium">Sign in as a different role</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(ROLE_META)
                .filter(([r]) => r !== role)
                .slice(0, 6)
                .map(([r, m]) => {
                  const RoleIcon = m.icon
                  return (
                    <Link
                      key={r}
                      to={`/${r}/login`}
                      className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all group"
                    >
                      <RoleIcon className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                      <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">{m.label}</span>
                    </Link>
                  )
                })}
            </div>
          </div>
        </Motion.div>
      </div>
    </div>
  )
}

export default RoleLogin