import { motion as Motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  AcademicCapIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  BookOpenIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { login } from '../../services/authService'
import { setCredentials } from '../../store/authSlice'
import { ROUTES, STORAGE_KEYS } from '../../constants'

const ROLE_CONFIG = {
  student: {
    name: 'Student',
    icon: AcademicCapIcon,
    gradient: 'from-blue-500 to-cyan-500',
    iconColor: 'text-blue-500',
    bgGradient: 'from-blue-50 to-cyan-50',
    darkBgGradient: 'from-slate-900 to-blue-950'
  },
  warden: {
    name: 'Warden',
    icon: UserGroupIcon,
    gradient: 'from-green-500 to-emerald-500',
    iconColor: 'text-green-500',
    bgGradient: 'from-green-50 to-emerald-50',
    darkBgGradient: 'from-slate-900 to-green-950'
  },
  admin: {
    name: 'Admin',
    icon: Cog6ToothIcon,
    gradient: 'from-purple-500 to-pink-500',
    iconColor: 'text-purple-500',
    bgGradient: 'from-purple-50 to-pink-50',
    darkBgGradient: 'from-slate-900 to-purple-950'
  },
  security: {
    name: 'Security',
    icon: ShieldCheckIcon,
    gradient: 'from-orange-500 to-red-500',
    iconColor: 'text-orange-500',
    bgGradient: 'from-orange-50 to-red-50',
    darkBgGradient: 'from-slate-900 to-orange-950'
  },
  hod: {
    name: 'HOD',
    icon: BookOpenIcon,
    gradient: 'from-indigo-500 to-purple-500',
    iconColor: 'text-indigo-500',
    bgGradient: 'from-indigo-50 to-purple-50',
    darkBgGradient: 'from-slate-900 to-indigo-950'
  }
}

const RoleLogin = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState(null)

  // Extract role from URL path
  const role = location.pathname.split('/')[1] || 'student'
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.student
  const Icon = config.icon

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm()

  useEffect(() => {
    // Check if user is already logged in with valid tokens
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
    
    if (accessToken && refreshToken) {
      // User is already authenticated, redirect to dashboard based on role
      const redirectToDashboard = () => {
        switch (role) {
          case 'student':
            navigate('/student/dashboard', { replace: true })
            break
          case 'warden':
            navigate(ROUTES.DASHBOARD, { replace: true })
            break
          case 'admin':
            navigate('/admin/dashboard', { replace: true })
            break
          case 'security':
            navigate('/security/dashboard', { replace: true })
            break
          case 'hod':
            navigate('/hod/dashboard', { replace: true })
            break
          default:
            navigate(ROUTES.DASHBOARD, { replace: true })
        }
      }
      
      redirectToDashboard()
    }
  }, [role, navigate])

  const onSubmit = async (data) => {
    setIsLoading(true)
    const loadingToast = toast.loading('Signing you in...')

    try {
      // Add role to login request
      const response = await login({ ...data, role: role })
      const resp = response?.data || response || {}

      // Store tokens in localStorage using STORAGE_KEYS
      if (resp.accessToken) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, resp.accessToken)
      if (resp.refreshToken) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, resp.refreshToken)

      dispatch(setCredentials({ user: resp.user, token: resp.accessToken }))

      toast.success(`Welcome back, ${resp.user?.name || resp.user?.email || 'User'}!`, {
        id: loadingToast,
        duration: 3000,
        icon: '👋'
      })

      // If user must change password, redirect them to settings to enforce password change
      if (resp.mustChangePassword) {
        toast('Please change your password before using the application.', { id: loadingToast, duration: 5000 })
        return navigate('/settings')
      }

      // Navigate to role-specific dashboard
      setTimeout(() => {
        switch (role) {
          case 'student':
            navigate('/student/dashboard')
            break
          case 'warden':
            navigate(ROUTES.DASHBOARD)
            break
          case 'admin':
            navigate('/admin/dashboard')
            break
          case 'security':
            navigate('/security/dashboard')
            break
          case 'hod':
            navigate('/hod/dashboard')
            break
          default:
            navigate(ROUTES.DASHBOARD)
        }
      }, 500)
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Invalid credentials'
      toast.error(message, { id: loadingToast })
      // If server indicates email is unverified, surface quick actions
      if (error.response?.status === 403 && message.toLowerCase().includes('verify')) {
        setUnverifiedEmail(data.email)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bgGradient} dark:${config.darkBgGradient} flex items-center justify-center p-4 relative overflow-hidden`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r ${config.gradient} opacity-20 rounded-full blur-3xl animate-pulse-slow`}></div>
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r ${config.gradient} opacity-20 rounded-full blur-3xl animate-pulse-slow`} style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Back Button */}
      <Motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-6 left-6 z-10"
      >
        <Link to={ROUTES.HOME}>
          <Motion.button
            whileHover={{ scale: 1.05, x: -5 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-soft"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </Motion.button>
        </Link>
      </Motion.div>

      {/* Login Card */}
      <Motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md z-10"
      >
        {/* Glow Effect */}
        <div className={`absolute -inset-0.5 bg-gradient-to-r ${config.gradient} rounded-3xl opacity-30 blur-xl`}></div>

        {/* Card */}
        <div className="relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Gradient Top Bar */}
          <div className={`h-2 bg-gradient-to-r ${config.gradient}`}></div>

          <div className="p-8 md:p-10">
            {/* Icon Header */}
            <div className="flex flex-col items-center mb-8">
              <Motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="relative mb-4"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient} rounded-2xl blur-md opacity-50`}></div>
                <div className={`relative w-20 h-20 bg-gradient-to-br ${config.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
                  <Icon className="w-10 h-10 text-white" />
                </div>
              </Motion.div>

              <Motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-2">
                  Welcome Back
                </h1>
                <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2 justify-center">
                  <span>Sign in as</span>
                  <span className={`font-semibold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
                    {config.name}
                  </span>
                </p>
              </Motion.div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email Input */}
              <Motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <EnvelopeIcon className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    })}
                    className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border ${
                      errors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                    } rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-${config.iconColor.split('-')[1]}-500 focus:border-transparent transition-all`}
                    placeholder="your.email@example.com"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <Motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 text-sm text-red-500 flex items-center gap-1"
                  >
                    <span>⚠</span> {errors.email.message}
                  </Motion.p>
                )}
              </Motion.div>

              {/* Password Input */}
              <Motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <LockClosedIcon className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', { 
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters'
                      }
                    })}
                    className={`w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-900/50 border ${
                      errors.password ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                    } rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-${config.iconColor.split('-')[1]}-500 focus:border-transparent transition-all`}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <Motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 text-sm text-red-500 flex items-center gap-1"
                  >
                    <span>⚠</span> {errors.password.message}
                  </Motion.p>
                )}
              </Motion.div>

              {/* Remember Me & Forgot Password */}
              <Motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-between text-sm"
              >
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className={`w-4 h-4 rounded border-slate-300 text-${config.iconColor.split('-')[1]}-500 focus:ring-2 focus:ring-${config.iconColor.split('-')[1]}-500 cursor-pointer`}
                  />
                  <span className="text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    Remember me
                  </span>
                </label>
                <Link to="/forgot-password" className={`font-medium bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent hover:opacity-80 transition-opacity`}>Forgot password?</Link>
              </Motion.div>

              {/* Submit Button */}
              <Motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  className={`w-full py-3.5 px-6 bg-gradient-to-r ${config.gradient} text-white font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-5 h-5" />
                      <span>Sign In</span>
                    </>
                  )}
                </Motion.button>
              </Motion.div>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/90 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400">
                  Need help?
                </span>
              </div>
            </div>

            {/* Unverified email quick actions */}
            {unverifiedEmail && (
              <div className="p-4 mb-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-sm">
                <p className="mb-2">Your email <strong>{unverifiedEmail}</strong> is not verified.</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const res = await (await import('../../services/authService')).default.resendVerification(unverifiedEmail)
                        const code = res?.data?.data?.verificationCode
                        if (code) toast.success(`Verification code (dev): ${code}`)
                        toast.success('Verification email resent (if account exists)')
                      } catch (err) {
                        toast.error(err?.response?.data?.message || 'Failed to resend verification')
                      }
                    }}
                    className="px-3 py-2 bg-white/90 rounded-lg border text-sm"
                  >Resend verification</button>
                  <a href="/verify-email" className="px-3 py-2 bg-amber-600 text-white rounded-lg text-sm">Enter verification code</a>
                </div>
              </div>
            )}
            {/* Footer */}
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center"
            >
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Don't have an account?{' '}
                <span className="text-slate-500 dark:text-slate-400">
                  Contact your administrator
                </span>
              </p>
            </Motion.div>
          </div>
        </div>
      </Motion.div>
    </div>
  )
}

export default RoleLogin
