/**
 * Database Seeder - Initial Admin Creation
 * 
 * This script creates the first admin account directly in the database.
 * Run this script ONCE when setting up the application for the first time.
 * 
 * Usage: npm run seed:admin
 */

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { config } from '../config/config.js'
import logger from '../utils/logger.js'

// Direct Admin model definition (to avoid circular dependencies)
const adminSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  phone: String,
  role: { type: String, default: 'admin' },
  adminRole: String,
  isEmailVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now }
})

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema)

const seedAdmin = async () => {
  try {
    console.log('🌱 Starting admin seeding process...')
    
    // Connect to database
    await mongoose.connect(config.database.uri)
    console.log('✅ Connected to database')

    // Check if any admin already exists
    const existingAdmin = await Admin.findOne({ role: 'admin' })
    
    if (existingAdmin) {
      console.log('⚠️  Admin already exists!')
      console.log(`   Email: ${existingAdmin.email}`)
      console.log('   Use the existing admin account or delete it first.')
      await mongoose.connection.close()
      process.exit(0)
    }

    // Admin credentials (change these if needed)
    const adminData = {
      email: process.env.INITIAL_ADMIN_EMAIL || 'admin@college.edu',
      password: process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123',
      firstName: 'Super',
      lastName: 'Admin',
      phone: '9999999999',
      role: 'admin',
      adminRole: 'superadmin',
      isEmailVerified: true, // Skip email verification for initial admin
      isActive: true
    }

    // Hash password
    const salt = await bcrypt.genSalt(12)
    adminData.password = await bcrypt.hash(adminData.password, salt)

    // Update admin role
    adminData.adminRole = 'super_admin'

    // Create admin
    const admin = await Admin.create(adminData)

    console.log('\n✅ Initial admin created successfully!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`📧 Email:    ${admin.email}`)
    console.log(`🔑 Password: ${process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123'}`)
    console.log(`👤 Name:     ${admin.firstName} ${admin.lastName}`)
    console.log(`🆔 ID:       ${admin._id}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n⚠️  IMPORTANT: Change this password after first login!')
    console.log('💡 Login at: POST /api/v1/auth/login\n')

    await mongoose.connection.close()
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to seed admin:', error.message)
    console.error(error)
    await mongoose.connection.close()
    process.exit(1)
  }
}

// Run the seeder
seedAdmin()
