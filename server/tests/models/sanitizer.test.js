import Admin from '../../src/models/Admin.js'
import Student from '../../src/models/Student.js'
import Warden from '../../src/models/Warden.js'

describe('Model toJSON sanitizers', () => {
  test('admin.toJSON removes sensitive fields', () => {
    const a = new Admin({ firstName: 'A', lastName: 'B', email: 'a@b.com', password: 'secret' })
    const j = a.toJSON()
    expect(j.password).toBeUndefined()
    expect(j.passwordResetToken).toBeUndefined()
  })

  test('student.toJSON removes sensitive fields', () => {
    const s = new Student({ firstName: 'S', lastName: 'T', email: 's@t.com', password: 'pwd' })
    const j = s.toJSON()
    expect(j.password).toBeUndefined()
    expect(j.passwordResetToken).toBeUndefined()
  })

  test('warden.toJSON removes sensitive fields', () => {
    const w = new Warden({ firstName: 'W', lastName: 'Z', email: 'w@z.com', password: 'pwd' })
    const j = w.toJSON()
    expect(j.password).toBeUndefined()
    expect(j.passwordResetToken).toBeUndefined()
  })
})
