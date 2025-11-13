import mongoose from 'mongoose'
// Use global fetch available in modern Node.js (v18+)
const fetch = global.fetch || (await import('node:node-fetch')).default
import { config } from '../src/config/config.js'

const run = async () => {
  console.log('E2E smoke: connecting to DB...')
  // Connect using the exact URL so we use the same database instance and DB name as the server
  await mongoose.connect(config.database.url)
  console.log('Connected')

  const Hod = (await import('../src/models/Hod.js')).default
  const Warden = (await import('../src/models/Warden.js')).default
  const Student = (await import('../src/models/Student.js')).default
  const OutpassRequest = (await import('../src/models/OutpassRequest.js')).default

  // Create HOD
  let hod = await Hod.findOne({ email: 'hod-test@college.edu' })
  if (!hod) {
  hod = await Hod.create({ name: 'Test HOD', email: 'hod-test@college.edu', password: 'HodPass123', department: 'CSE', phone: '919900112233' })
    console.log('Created HOD', hod._id)
  } else console.log('Found HOD', hod._id)

  // Create Warden
  let warden = await Warden.findOne({ email: 'warden-test@college.edu' })
  if (!warden) {
    warden = await Warden.create({
      firstName: 'Warden',
      lastName: 'Test',
      email: 'warden-test@college.edu',
      password: 'WardenPass123',
      phone: '919900223344',
      hostelType: 'boys',
      assignedHostelBlocks: [{ blockName: 'B1', isPrimary: true }],
      emergencyContact: { name: 'Admin', phone: '919998887776', relationship: 'admin' }
    })
    console.log('Created Warden', warden._id)
  } else console.log('Found Warden', warden._id)

  // Create Student
  let student = await Student.findOne({ email: 'student-test@college.edu' })
  if (!student) {
    student = await Student.create({
      firstName: 'Student',
      lastName: 'Test',
      email: 'student-test@college.edu',
      password: 'StudentPass123',
      phone: '919900334455',
      rollNumber: 'R001',
      course: 'Computer Science Engineering',
      year: new Date().getFullYear(),
      yearOfStudy: 2,
      semester: 4,
      department: 'CSE',
      hostelType: 'boys',
      hostelBlock: 'B1',
      roomNumber: '101',
      parentDetails: { guardianPhone: '919900445566', fatherName: 'Test Father' },
      hodId: hod._id,
      wardenId: warden._id
    })
    console.log('Created Student', student._id)
  } else console.log('Found Student', student._id)

  // Create Outpass
  const leave = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
  const ret = new Date(Date.now() + 5 * 60 * 60 * 1000) // 5 hours from now

  let outpass = await OutpassRequest.create({
    student: student._id,
    studentId: student.studentId || student._id.toString(),
    rollNumber: student.rollNumber,
    outpassType: 'local',
    reason: 'Test outing',
    leaveTime: leave,
    expectedReturnTime: ret,
    destination: { place: 'Market', address: 'Nearby', contactPerson: { name: 'Shop', phone: '+919900556677' } },
    warden: warden._id,
    hodApprovalRequested: false,
    hod: hod._id
  })

  console.log('Created outpass', outpass._id)

  // Generate warden token using instance method
  const tokens = warden.generateTokens()
  const wardenToken = tokens.accessToken

  const apiBase = `http://localhost:${config.port}/api/v1/outpass`

  // Request Parent OTP
  console.log('\nCalling requestParentOtp...')
  let res = await fetch(`${apiBase}/parent/request-otp/${outpass._id}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${wardenToken}`, 'Content-Type': 'application/json' }
  })
  const body = await res.json()
  console.log('requestParentOtp response:', res.status, body)

  // Refresh outpass from DB to read OTP (dev-only step)
  outpass = await OutpassRequest.findById(outpass._id)
  console.log('Outpass parentApproval stored:', !!outpass.parentApproval, 'otpExists:', !!outpass.parentApproval?.otp)

  const otp = outpass.parentApproval?.otp
  if (!otp) {
    console.error('No OTP persisted — aborting')
    process.exit(1)
  }

  // Parent approve via public endpoint
  console.log('\nCalling parent public approve with OTP...')
  res = await fetch(`${apiBase}/parent/approve-public/${outpass._id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ otp })
  })
  const approveBody = await res.json()
  console.log('parent approve response:', res.status, approveBody)

  // Now send to HOD as warden
  console.log('\nCalling sendToHod...')
  res = await fetch(`${apiBase}/warden/send-to-hod/${outpass._id}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${wardenToken}`, 'Content-Type': 'application/json' }
  })
  const sendBody = await res.json()
  console.log('sendToHod response:', res.status, sendBody)

  console.log('\nE2E smoke finished')
  process.exit(0)
}

run().catch(err => {
  console.error('E2E script failed', err)
  process.exit(1)
})
