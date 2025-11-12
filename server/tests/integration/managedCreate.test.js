/* eslint-env jest */
/* global global, describe, beforeAll, beforeEach, it, expect */
import request from 'supertest'
import { createApp } from '../../src/app.js'
import Admin from '../../src/models/Admin.js'
import { Student } from '../../src/models/index.js'

let app

describe('Managed user creation (admin) - student + parent transaction', () => {
  beforeAll(async () => {
    app = createApp()
  })

  beforeEach(async () => {
    // Create a super admin in DB
    await Admin.deleteMany({})
    const admin = await Admin.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'super.admin@test.local',
      password: 'AdminPass123',
      phone: '9999999999',
      adminRole: 'super_admin',
      isEmailVerified: true
    })
    // attach token for use in tests
    const { accessToken } = admin.generateTokens()
    admin._testToken = accessToken
    // store in memory for test
    global.__TEST_ADMIN__ = admin
  })

  it('creates student and parent atomically when provided parentDetails and no password (admin-generated)', async () => {
    const admin = global.__TEST_ADMIN__
    const token = admin._testToken

    const payload = {
      role: 'student',
      email: 'alice.student@test.local',
      student: {
        firstName: 'Alice',
        lastName: 'Student',
        student: {
          rollNumber: 'ST1001',
          course: 'CSE',
          year: 2,
          department: 'CSE',
          hostelType: 'boys',
          hostelBlock: 'A',
          roomNumber: '101'
        },
        parentDetails: {
          guardianPhone: '9111111111',
          guardianEmail: 'parent.alice@test.local',
          fatherName: 'Bob Student'
        }
      }
    }

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201)

    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('student')
    expect(res.body.data.student.email).toBe(payload.email)
    // mustChangePassword should be true because admin omitted password
    expect(res.body.data.student.mustChangePassword).toBe(true)
    // parent should be returned
    expect(res.body.data).toHaveProperty('parent')
    expect(res.body.data.parent.primaryPhone || res.body.data.parent.primaryPhone === payload.student.parentDetails.guardianPhone).toBeTruthy()
  })

  it('rolls back student when parent creation fails (invalid parent data)', async () => {
    const admin = global.__TEST_ADMIN__
    const token = admin._testToken

    const payload = {
      role: 'student',
      email: 'bob.student@test.local',
      student: {
        firstName: 'Bob',
        lastName: 'Student',
        student: {
          rollNumber: 'ST2001',
          course: 'CSE',
          year: 2,
          department: 'CSE',
          hostelType: 'boys',
          hostelBlock: 'A',
          roomNumber: '102'
        },
        // Intentionally invalid guardianPhone to trigger Parent validation error
        parentDetails: {
          guardianPhone: '123',
          guardianEmail: 'parent.bob@test.local',
          fatherName: 'Carl Student'
        }
      }
    }

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(400)

    expect(res.body.success).toBe(false)

    // Ensure student was not persisted due to rollback
    const found = await Student.findOne({ email: payload.email })
    expect(found).toBeNull()
  })
})
