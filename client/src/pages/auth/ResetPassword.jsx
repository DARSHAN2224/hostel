import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'
import authService from '../../services/authService'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // FIX: ROUTES.LOGIN doesn't exist — navigate to '/' (landing/home) instead
    // so the user can pick their role login from there
    if (!token) {
      toast.error('Reset token missing or invalid. Please request a new reset link.')
      navigate('/')
    }
  }, [token, navigate])

  const submit = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match')
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters')
    setLoading(true)
    const loader = toast.loading('Resetting password...')
    try {
      await authService.resetPassword(token, newPassword, confirmPassword)
      toast.success('Password reset successful. Please log in with your new password.', { id: loader, duration: 4000 })
      // FIX: ROUTES.LOGIN is undefined — navigate to '/' so user can pick their role login
      navigate('/')
    } catch (err) {
      const message = err?.response?.data?.message || err?.data?.message || 'Failed to reset password'
      toast.error(message, { id: loader })
    } finally {
      setLoading(false)
    }
  }

  // Don't render the form if there's no token (redirect is in progress)
  if (!token) return null

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/90 dark:bg-slate-800/90 rounded-2xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Reset Password</h2>
        <p className="text-sm text-slate-600 mb-4">Set a new password for your account.</p>
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <div className="flex items-center justify-end">
            <Button type="submit" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}