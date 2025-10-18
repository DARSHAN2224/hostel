import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const testConnection = async () => {
  try {
    const uri = process.env.DATABASE_URL || 'mongodb://localhost:27017/hostel_management'
    
    console.log('\n🔍 MongoDB Connection Test')
    console.log('=' .repeat(50))
    console.log('📍 Attempting to connect to:', uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'))
    console.log('=' .repeat(50))
    
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    })
    
    console.log('\n✅ SUCCESS! Connected to MongoDB')
    console.log('🏠 Host:', conn.connection.host)
    console.log('🚪 Port:', conn.connection.port)
    console.log('📁 Database:', conn.connection.name)
    console.log('🔗 Ready State:', conn.connection.readyState, '(1 = connected)')
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray()
    console.log('\n📦 Existing Collections:', collections.length > 0 ? collections.map(c => c.name).join(', ') : 'None')
    
    // Get database stats
    const stats = await mongoose.connection.db.stats()
    console.log('\n📊 Database Stats:')
    console.log('   - Collections:', stats.collections)
    console.log('   - Data Size:', Math.round(stats.dataSize / 1024), 'KB')
    console.log('   - Storage Size:', Math.round(stats.storageSize / 1024), 'KB')
    
    await mongoose.disconnect()
    console.log('\n👋 Disconnected successfully')
    console.log('=' .repeat(50))
    console.log('✅ Your MongoDB connection is working perfectly!\n')
    
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ CONNECTION FAILED!')
    console.error('=' .repeat(50))
    console.error('Error:', error.message)
    console.error('=' .repeat(50))
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Solution:')
      console.error('   MongoDB server is not running. Please:')
      console.error('   1. Start MongoDB: net start MongoDB (Windows)')
      console.error('   2. Or use MongoDB Atlas (Cloud)')
      console.error('   3. See MONGODB_SETUP.md for detailed instructions\n')
    } else if (error.message.includes('authentication failed')) {
      console.error('\n💡 Solution:')
      console.error('   Authentication failed. Check:')
      console.error('   1. Username and password in DATABASE_URL')
      console.error('   2. User exists in MongoDB')
      console.error('   3. User has correct permissions\n')
    } else if (error.message.includes('getaddrinfo')) {
      console.error('\n💡 Solution:')
      console.error('   Cannot resolve hostname. Check:')
      console.error('   1. DATABASE_URL format is correct')
      console.error('   2. Internet connection (if using Atlas)')
      console.error('   3. Firewall settings\n')
    }
    
    process.exit(1)
  }
}

console.log('\n🚀 Starting MongoDB Connection Test...\n')
testConnection()
