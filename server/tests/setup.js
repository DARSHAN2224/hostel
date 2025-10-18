import mongoose from 'mongoose';
import config from '../src/config/config.js';

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for database operations
jest.setTimeout(10000);

// Connect to test database before all tests
beforeAll(async () => {
  // Use a separate test database
  const testDbUri = process.env.TEST_MONGODB_URI || config.mongoUri.replace(/\/\w+$/, '/hostel_test');
  
  await mongoose.connect(testDbUri);
  console.log('✓ Connected to test database');
});

// Clear all collections before each test
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Disconnect from database after all tests
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  console.log('✓ Disconnected from test database');
});

// Global error handler
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});
