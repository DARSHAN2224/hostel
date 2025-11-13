import Credential from '../../src/models/Credential.js'

describe('Credential model', () => {
  test('password field is select:false and toJSON removes password', () => {
    const pwdPath = Credential.schema.paths.password
    expect(pwdPath).toBeDefined()
    expect(pwdPath.options.select).toBe(false)

    const cred = new Credential({ userId: '000000000000000000000000', role: 'student', password: 'secret' })
    const json = cred.toJSON()
    expect(json.password).toBeUndefined()
  })
})
