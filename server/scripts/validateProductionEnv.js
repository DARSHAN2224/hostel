#!/usr/bin/env node

/**
 * Production Environment Validator
 * Validates that all required environment variables are set for production deployment
 */

/* eslint-env node */
/* global process */

import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const REQUIRED_ENV_VARS = {
  // Critical - Must be set
  CRITICAL: [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'JWT_SECRET',
    'REFRESH_TOKEN_SECRET',
    'ADMIN_REGISTRATION_SECRET'
  ],
  
  // Important - Should be set
  IMPORTANT: [
    'CORS_ORIGIN',
    'LOG_LEVEL',
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASSWORD'
  ],
  
  // Optional - Nice to have
  OPTIONAL: [
    'SENTRY_DSN',
    'AWS_BUCKET_NAME',
    'REDIS_URL',
    'CLOUDINARY_CLOUD_NAME'
  ]
}

const PRODUCTION_VALUES = {
  NODE_ENV: 'production',
  LOG_LEVEL: ['error', 'warn', 'info']
}

const MIN_SECRET_LENGTH = 32

class EnvValidator {
  constructor() {
    this.errors = []
    this.warnings = []
    this.info = []
  }

  validate() {
    console.log(chalk.blue.bold('\n🔍 Validating Production Environment...\n'))

    // Load .env.production if it exists
    const envPath = path.join(__dirname, '../.env.production')
    if (!fs.existsSync(envPath)) {
      this.errors.push('.env.production file not found!')
      this.printResults()
      return false
    }

    // Parse environment file
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const envVars = this.parseEnvFile(envContent)

    // Validate critical variables
    this.validateCriticalVars(envVars)
    
    // Validate important variables
    this.validateImportantVars(envVars)
    
    // Validate optional variables
    this.validateOptionalVars(envVars)
    
    // Validate specific values
    this.validateValues(envVars)
    
    // Validate secret strength
    this.validateSecrets(envVars)
    
    // Check for common mistakes
    this.checkCommonMistakes(envVars)

    this.printResults()
    return this.errors.length === 0
  }

  parseEnvFile(content) {
    const vars = {}
    const lines = content.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          vars[key.trim()] = valueParts.join('=').trim()
        }
      }
    }
    
    return vars
  }

  validateCriticalVars(envVars) {
    for (const varName of REQUIRED_ENV_VARS.CRITICAL) {
      if (!envVars[varName] || envVars[varName].includes('REPLACE') || envVars[varName].includes('your-')) {
        this.errors.push(`❌ ${varName} is not set or contains placeholder value`)
      } else {
        this.info.push(`✅ ${varName} is set`)
      }
    }
  }

  validateImportantVars(envVars) {
    for (const varName of REQUIRED_ENV_VARS.IMPORTANT) {
      if (!envVars[varName] || envVars[varName].includes('REPLACE') || envVars[varName].includes('your-')) {
        this.warnings.push(`⚠️  ${varName} is not set or contains placeholder value`)
      } else {
        this.info.push(`✅ ${varName} is set`)
      }
    }
  }

  validateOptionalVars(envVars) {
    for (const varName of REQUIRED_ENV_VARS.OPTIONAL) {
      if (!envVars[varName]) {
        this.info.push(`ℹ️  ${varName} is not set (optional)`)
      } else {
        this.info.push(`✅ ${varName} is set`)
      }
    }
  }

  validateValues(envVars) {
    // Check NODE_ENV
    if (envVars.NODE_ENV !== PRODUCTION_VALUES.NODE_ENV) {
      this.errors.push(`❌ NODE_ENV must be "production", got "${envVars.NODE_ENV}"`)
    }

    // Check LOG_LEVEL
    if (envVars.LOG_LEVEL && !PRODUCTION_VALUES.LOG_LEVEL.includes(envVars.LOG_LEVEL)) {
      this.warnings.push(`⚠️  LOG_LEVEL "${envVars.LOG_LEVEL}" is not recommended for production. Use: error, warn, or info`)
    }

    // Check CORS_ORIGIN
    if (envVars.CORS_ORIGIN && envVars.CORS_ORIGIN.includes('localhost')) {
      this.warnings.push(`⚠️  CORS_ORIGIN contains "localhost" - should be production URL`)
    }

    // Check PORT
    const port = Number.parseInt(envVars.PORT, 10)
    if (Number.isNaN(port) || port < 1 || port > 65535) {
      this.errors.push(`❌ PORT must be a valid port number (1-65535)`)
    }
  }

  validateSecrets(envVars) {
    const secrets = ['JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'ADMIN_REGISTRATION_SECRET']
    
    for (const secret of secrets) {
      if (envVars[secret]) {
        if (envVars[secret].length < MIN_SECRET_LENGTH) {
          this.errors.push(`❌ ${secret} must be at least ${MIN_SECRET_LENGTH} characters long`)
        }
        
        // Check for common weak secrets
        const weak = ['secret', 'password', '123456', 'admin', 'test']
        if (weak.some(w => envVars[secret].toLowerCase().includes(w))) {
          this.errors.push(`❌ ${secret} appears to be weak or contains common words`)
        }
      }
    }
  }

  checkCommonMistakes(envVars) {
    // Check for development values
    if (envVars.DATABASE_URL && envVars.DATABASE_URL.includes('localhost')) {
      this.warnings.push(`⚠️  DATABASE_URL points to localhost - should be production database`)
    }

    // Check for example/placeholder values
    const placeholders = ['example.com', 'yourdomain.com', 'REPLACE', 'CHANGE_THIS', 'your-']
    for (const [key, value] of Object.entries(envVars)) {
      if (placeholders.some(p => value.includes(p))) {
        this.warnings.push(`⚠️  ${key} contains placeholder value: "${value}"`)
      }
    }

    // Check initial admin password
    if (envVars.INITIAL_ADMIN_PASSWORD) {
      if (envVars.INITIAL_ADMIN_PASSWORD.length < 8) {
        this.errors.push(`❌ INITIAL_ADMIN_PASSWORD must be at least 8 characters`)
      }
      if (envVars.INITIAL_ADMIN_PASSWORD === 'Admin@123' || envVars.INITIAL_ADMIN_PASSWORD === 'admin') {
        this.warnings.push(`⚠️  INITIAL_ADMIN_PASSWORD is using default value - change it immediately after first login!`)
      }
    }

    // Check email configuration
    if (envVars.EMAIL_USER && envVars.EMAIL_USER.includes('example')) {
      this.warnings.push(`⚠️  EMAIL_USER appears to be a placeholder`)
    }
  }

  printResults() {
    console.log(chalk.blue.bold('\n📊 Validation Results:\n'))

    if (this.errors.length > 0) {
      console.log(chalk.red.bold('❌ CRITICAL ERRORS:'))
      for (const error of this.errors) {
        console.log(chalk.red(`  ${error}`))
      }
      console.log()
    }

    if (this.warnings.length > 0) {
      console.log(chalk.yellow.bold('⚠️  WARNINGS:'))
      for (const warning of this.warnings) {
        console.log(chalk.yellow(`  ${warning}`))
      }
      console.log()
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green.bold('✅ All checks passed!\n'))
      console.log(chalk.green('Your production environment is properly configured.\n'))
    } else if (this.errors.length === 0) {
      console.log(chalk.yellow.bold('⚠️  Configuration has warnings but is functional\n'))
      console.log(chalk.yellow('Review warnings before deploying to production.\n'))
    } else {
      console.log(chalk.red.bold('❌ Configuration has critical errors!\n'))
      console.log(chalk.red('Fix all errors before deploying to production.\n'))
    }

    // Security recommendations
    console.log(chalk.cyan.bold('🔐 Security Recommendations:\n'))
    console.log(chalk.cyan('  1. Generate strong secrets using: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'))
    console.log(chalk.cyan('  2. Use a production-grade database (MongoDB Atlas, AWS DocumentDB)'))
    console.log(chalk.cyan('  3. Set up SSL/TLS certificates (Let\'s Encrypt)'))
    console.log(chalk.cyan('  4. Configure a production email service (SendGrid, AWS SES)'))
    console.log(chalk.cyan('  5. Enable error tracking (Sentry)'))
    console.log(chalk.cyan('  6. Set up automated backups'))
    console.log(chalk.cyan('  7. Use environment-specific .env files (never commit .env.production!)'))
    console.log(chalk.cyan('  8. Change INITIAL_ADMIN_PASSWORD immediately after first login\n'))
  }
}

// Run validation
const validator = new EnvValidator()
const isValid = validator.validate()

process.exit(isValid ? 0 : 1)
