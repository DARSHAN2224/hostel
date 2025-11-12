import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'
import authService from '../../services/authService'
import { ROUTES } from '../../constants'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const loader = toast.loading('Requesting password reset...')
    try {
      await authService.forgotPassword(email)
      toast.success('If an account exists, a reset link was sent to the email', { id: loader })
      navigate(ROUTES.LOGIN)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to request password reset', { id: loader })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/90 dark:bg-slate-800/90 rounded-2xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Forgot Password</h2>
        <p className="text-sm text-slate-600 mb-4">Enter your email and we'll send a password reset link if the account exists.</p>
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="flex items-center justify-between">
            <Link to={ROUTES.LOGIN} className="text-sm text-slate-500">Back to login</Link>
            <Button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
