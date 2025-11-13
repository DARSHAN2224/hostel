import mongoose from 'mongoose'
import { connectDatabase } from '../src/db/database.js'

async function run() {
  try {
    await connectDatabase()
    // Import models to ensure registration
    await import('../src/models/OutpassRequest.js')
    await import('../src/models/Student.js')
    await import('../src/models/Warden.js')
    await import('../src/models/Hod.js')
    await import('../src/models/Parent.js').catch(()=>{})

    console.log('Registered models:', mongoose.modelNames())
    process.exit(0)
  } catch (err) {
    console.error('Error while printing models:', err)
    process.exit(1)
  }
}

run()
