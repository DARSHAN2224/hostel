import Warden from '../../src/models/Warden.js'
import Student from '../../src/models/Student.js'
import Admin from '../../src/models/Admin.js'

describe('Password reset token generation', () => {
  test('warden createPasswordResetToken sets token and expiry', () => {
    const w = new Warden()
    const token = w.createPasswordResetToken()
    expect(typeof token).toBe('string')
    expect(w.passwordResetToken).toBeDefined()
    expect(w.passwordResetExpires).toBeDefined()
  })

  test('student createPasswordResetToken sets token and expiry', () => {
    const s = new Student()
    const token = s.createPasswordResetToken()
    expect(typeof token).toBe('string')
    expect(s.passwordResetToken).toBeDefined()
    expect(s.passwordResetExpires).toBeDefined()
  })

  test('admin createPasswordResetToken sets token and expiry', () => {
    const a = new Admin()
    const token = a.createPasswordResetToken()
    expect(typeof token).toBe('string')
    expect(a.passwordResetToken).toBeDefined()
    expect(a.passwordResetExpires).toBeDefined()
  })
})
