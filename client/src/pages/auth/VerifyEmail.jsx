import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'
import authService from '../../services/authService'
import { ROUTES } from '../../constants'

export default function VerifyEmail() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const loader = toast.loading('Verifying...')
    try {
      await authService.verifyEmail(email, code)
      toast.success('Email verified. You may now login.', { id: loader })
      navigate(ROUTES.LOGIN)
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
