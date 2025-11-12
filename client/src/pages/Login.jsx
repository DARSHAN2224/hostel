/**
 * Login Page
 * User authentication with role-based login
 */

import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { loginUser, selectIsAuthenticated, selectAuthLoading, selectAuthError } from '../store/authSlice'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { USER_ROLES, ROUTES } from '../constants'
import { EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline'

const Login = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const loading = useSelector(selectAuthLoading)
  const error = useSelector(selectAuthError)

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      password: '',
      role: USER_ROLES.WARDEN
    }
  })

  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROUTES.DASHBOARD)
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (error) {
      toast.error(error)
    }
  }, [error])

  const onSubmit = async (data) => {
    try {
      const result = await dispatch(loginUser(data)).unwrap()
      // If server asks for password change, redirect to settings so user can update their password
      if (result?.mustChangePassword) {
        toast('Please change your password before using the application', { icon: '🔒' })
        return navigate('/settings')
      }
      toast.success('Login successful!')
      navigate(ROUTES.DASHBOARD)
    } catch {
      // Error is handled by useEffect above
    }
  }

  const roleOptions = [
    { value: USER_ROLES.WARDEN, label: 'Warden' },
    { value: USER_ROLES.ADMIN, label: 'Admin' },
    { value: USER_ROLES.STUDENT, label: 'Student' },
    { value: USER_ROLES.SECURITY, label: 'Security' }
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="py-4 px-6 sm:px-10 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 text-primary">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path 
                  clipRule="evenodd" 
                  d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z" 
                  fill="currentColor" 
                  fillRule="evenodd"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Hostel Management
            </h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Secure Login
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Access your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
            <div className="space-y-4">
              <Select
                label="Select Role"
                options={roleOptions}
                {...register('role', { required: 'Role is required' })}
                error={errors.role?.message}
                required
              />

              <Input
                label="Email Address"
                type="email"
                icon={EnvelopeIcon}
                placeholder="your.email@example.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                    message: 'Invalid email address'
                  }
                })}
                error={errors.email?.message}
                required
              />

              <Input
                label="Password"
                type="password"
                icon={LockClosedIcon}
                placeholder="Enter your password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters'
                  }
                })}
                error={errors.password?.message}
                required
              />
            </div>

            <div className="flex items-center justify-end">
              <div className="text-sm">
                <Link 
                  to="/forgot-password" 
                  className="font-medium text-primary hover:text-primary/80"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                fullWidth
                loading={loading}
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>

            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              <p>
                Need an account?{' '}
                <Link 
                  to={ROUTES.REGISTER} 
                  className="font-medium text-primary hover:text-primary/80"
                >
                  Contact administrator
                </Link>
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

export default Login