import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'
import authService from '../../services/authService'
import { ROUTES, STORAGE_KEYS } from '../../constants'

export default function VerifyEmail() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Prefill email from navigation state or a pending verification marker
  useEffect(() => {
    if (location?.state?.email) return setEmail(location.state.email)
    try {
      const pending = localStorage.getItem(STORAGE_KEYS.PENDING_VERIFICATION_EMAIL)
      if (pending) setEmail(pending)
    } catch {
      // ignore storage errors
    }
  }, [location])

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const loader = toast.loading('Verifying...')
    try {
      const res = await authService.verifyEmail(email, code)
      const resp = res?.data || res

      // If tokens are returned, store them and current user, then clear pending marker
      try {
        if (resp.accessToken) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, resp.accessToken)
        if (resp.refreshToken) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, resp.refreshToken)
        if (resp.user) localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(resp.user))
        localStorage.removeItem(STORAGE_KEYS.PENDING_VERIFICATION_EMAIL)
      } catch {
        // ignore storage errors
      }

      toast.success('Email verified. Redirecting...', { id: loader })
      // Redirect to role-specific dashboard if available, else fallback to HOME
      const role = resp.user?.role
      switch (role) {
        case 'student':
          return navigate('/student/dashboard')
        case 'warden':
          return navigate(ROUTES.DASHBOARD)
        case 'admin':
          return navigate('/admin/dashboard')
        case 'security':
          return navigate('/security/dashboard')
        case 'hod':
          return navigate('/hod/dashboard')
        default:
          return navigate(ROUTES.HOME)
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to verify email', { id: loader })
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    if (!email) return toast.error('Enter email to resend verification')
    try {
      const r = await authService.resendVerification(email)
      const code = r?.data?.data?.verificationCode
      if (code) toast.success(`Verification code (dev): ${code}`)
      toast.success('Verification email resent (if account exists)')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to resend verification')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/90 dark:bg-slate-800/90 rounded-2xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Verify Email</h2>
        <p className="text-sm text-slate-600 mb-4">Enter your email and the verification code you received.</p>
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Verification Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />

          <div className="flex items-center justify-between">
            <button type="button" onClick={resend} className="text-sm text-slate-600">Resend code</button>
            <Button type="submit" disabled={loading}>{loading ? 'Verifying...' : 'Verify Email'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
