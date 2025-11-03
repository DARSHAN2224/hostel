/**
 * Database Seeder - Test Warden Creation
 * 
 * This script creates a test warden account for development/testing.
 * 
 * Usage: node src/scripts/seedWarden.js
 */

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { config } from '../config/config.js'

// Direct Warden model definition
const wardenSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  phone: String,
  role: { type: String, default: 'warden' },
  hostelType: String,
  assignedHostelBlocks: [{
    blockName: String,
    isPrimary: Boolean,
    floors: [String],
    totalRooms: Number,
    currentOccupancy: Number
  }],
  permissions: {
    canApproveOutpasses: { type: Boolean, default: true },
    canRejectOutpasses: { type: Boolean, default: true },
    canViewAllRequests: { type: Boolean, default: true },
    canManageStudents: { type: Boolean, default: true },
    canContactParents: { type: Boolean, default: true },
    maxOutpassDuration: { type: Number, default: 72 }
  },
  isEmailVerified: { type: Boolean, default: false },
  status: { type: String, default: 'active' },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  }
})

const Warden = mongoose.models.Warden || mongoose.model('Warden', wardenSchema)

const seedWarden = async () => {
  try {
    console.log('🌱 Starting warden seeding process...')
    
    // Connect to database
    const dbUrl = config.database.url || config.database.uri || 'mongodb://localhost:27017/hostel_management'
    console.log(`📡 Connecting to: ${dbUrl.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`)
    
    await mongoose.connect(dbUrl)
    console.log('✅ Connected to database')

    // Warden credentials
    const wardenEmail = process.env.TEST_WARDEN_EMAIL || 'warden@college.edu'
    
    // Check if warden already exists
    const existingWarden = await Warden.findOne({ email: wardenEmail })
    
    if (existingWarden) {
      console.log('⚠️  Warden already exists!')
      console.log(`   Email: ${existingWarden.email}`)
      console.log('   Use the existing warden account or delete it first.')
      await mongoose.connection.close()
      process.exit(0)
    }

    // Warden data
    const wardenData = {
      email: wardenEmail,
      password: process.env.TEST_WARDEN_PASSWORD || 'Warden@123',
      firstName: 'Test',
      lastName: 'Warden',
      phone: '9876543210',
      role: 'warden',
      hostelType: 'boys', // or 'girls'
      assignedHostelBlocks: [
        {
          blockName: 'A Block',
          isPrimary: true,
          floors: ['Ground', 'First', 'Second'],
          totalRooms: 50,
          currentOccupancy: 35
        }
      ],
      permissions: {
        canApproveOutpasses: true,
        canRejectOutpasses: true,
        canViewAllRequests: true,
        canManageStudents: true,
        canContactParents: true,
        maxOutpassDuration: 72
      },
      emergencyContact: {
        name: 'Emergency Contact',
        relationship: 'Spouse',
        phone: '9999888877'
      },
      isEmailVerified: true, // Skip email verification for test account
      status: 'active'
    }

    // Hash password
    const salt = await bcrypt.genSalt(12)
    wardenData.password = await bcrypt.hash(wardenData.password, salt)

    // Create warden
    const warden = await Warden.create(wardenData)

    console.log('\n✅ Test warden created successfully!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`📧 Email:       ${warden.email}`)
    console.log(`🔑 Password:    ${process.env.TEST_WARDEN_PASSWORD || 'Warden@123'}`)
    console.log(`👤 Name:        ${warden.firstName} ${warden.lastName}`)
    console.log(`🏠 Hostel Type: ${warden.hostelType}`)
    console.log(`🏢 Block:       ${warden.assignedHostelBlocks[0].blockName}`)
    console.log(`🆔 ID:          ${warden._id}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n💡 Login at: http://localhost:5173/warden/login')
    console.log('   Or POST /api/v1/auth/login with email and password\n')

    await mongoose.connection.close()
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to seed warden:', error.message)
    console.error(error)
    await mongoose.connection.close()
    process.exit(1)
  }
}

// Run the seeder
seedWarden()
