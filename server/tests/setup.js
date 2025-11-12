/* eslint-env jest */
/* global process, beforeAll, beforeEach, afterAll, jest */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Set test environment
process.env.NODE_ENV = 'test'

// Increase timeout for database operations
jest.setTimeout(20000)

// Ensure minimal env vars required by createApp/validateConfig
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/hostel_test'

let mongoServer;

// Connect to test database before all tests
beforeAll(async () => {
  // If a TEST_MONGODB_URI is provided, use it; otherwise start an in-memory MongoDB
  const providedUri = process.env.TEST_MONGODB_URI
  let uri = providedUri

  if (!uri) {
    mongoServer = await MongoMemoryServer.create()
    uri = mongoServer.getUri()
  }

  await mongoose.connect(uri, { dbName: 'hostel_test' })
  console.log('✓ Connected to test database')
});

// Clear all collections before each test
beforeEach(async () => {
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key].deleteMany({})
  }
});

// Disconnect from database after all tests
afterAll(async () => {
  try {
    await mongoose.connection.dropDatabase()
  } catch (err) {
    console.warn('Error dropping test database:', err)
  }
  await mongoose.connection.close()
  if (mongoServer) await mongoServer.stop()
  console.log('✓ Disconnected from test database')
});

// Global error handler
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error)
});
