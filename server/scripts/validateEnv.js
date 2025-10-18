#!/usr/bin/env node
/**
 * Environment Validation Script
 * Validates that all required environment variables are set
 */

import { config, validateConfig } from '../src/config/config.js'

console.log('🔍 Validating environment configuration...\n')

try {
  validateConfig()
  
  console.log('✅ Environment validation passed!')
  console.log('\n📋 Configuration Summary:')
  console.log(`   Environment: ${config.nodeEnv}`)
  console.log(`   Port: ${config.port}`)
  console.log(`   Database: ${config.database.url ? '✅ Set' : '❌ Missing'}`)
  console.log(`   JWT Secret: ${config.jwt.secret ? '✅ Set' : '❌ Missing'}`)
  console.log(`   CORS Origin: ${config.cors.origin}`)
  console.log(`   Log Level: ${config.logging.level}`)
  
  process.exit(0)
  
} catch (error) {
  console.error('❌ Environment validation failed!')
  console.error(error.message)
  process.exit(1)
}