import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

export const config = {
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 5000,
  
  // Application
  app: {
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    serverUrl: process.env.SERVER_URL || 'http://localhost:5000'
  },
  
  // Database
  database: {
    url: process.env.DATABASE_URL || 'mongodb://localhost:27017/hostel_management',
    name: process.env.DB_NAME || 'hostel_management',
    options: {
      // Modern Mongoose 6+ doesn't need these deprecated options
    }
  },
  
  // Authentication
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET,
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'
  },
  
  // Admin Setup
  adminRegistrationSecret: process.env.ADMIN_REGISTRATION_SECRET,
  
  // Security
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  
  // File upload
  upload: {
    path: process.env.UPLOAD_PATH || './uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['jpg', 'jpeg', 'png', 'pdf']
  },
  
  // Email
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM,
    host: process.env.EMAIL_HOST
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log'
  },
  
  // Features
  features: {
    enableRegistration: process.env.ENABLE_REGISTRATION !== 'false',
    enableEmailVerification: process.env.ENABLE_EMAIL_VERIFICATION === 'true',
    enablePasswordReset: process.env.ENABLE_PASSWORD_RESET !== 'false'
  }
}

// Validation function
export const validateConfig = () => {
  const required = ['JWT_SECRET', 'DATABASE_URL']
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '))
    console.error('Please check your .env file and ensure all required variables are set.')
    process.exit(1)
  }
  
  console.log('✅ All required environment variables are set')
}

// Enhanced logging function
export const logEnvironmentInfo = () => {
  console.log('\n=== 🚀 Environment Configuration ===')
  console.log(`📦 NODE_ENV: ${config.nodeEnv}`)
  console.log(`🚪 PORT: ${config.port}`)
  console.log(`🗄️  DATABASE: ${config.database.url ? '✅ Connected' : '❌ Not configured'}`)
  console.log(`🔐 JWT_SECRET: ${config.jwt.secret ? '✅ Set' : '❌ Missing'}`)
  console.log(`🌐 CORS_ORIGIN: ${config.cors.origin}`)
  console.log(`📧 EMAIL: ${config.email.user ? '✅ Configured' : '⚠️  Not configured'}`)
  console.log(`📝 LOG_LEVEL: ${config.logging.level}`)
  console.log('=====================================\n')
}