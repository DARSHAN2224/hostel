#!/usr/bin/env node
/**
 * Database Health Check Script
 * Checks database connection and health
 */

import dotenv from 'dotenv'
dotenv.config()

import { connectDatabase, checkDatabaseHealth, dbUtils } from '../src/db/database.js'
import logger from '../src/utils/logger.js'

const checkHealth = async () => {
  try {
    console.log('🔍 Checking database health...\n')
    
    // Connect to database
    await connectDatabase()
    
    // Check health
    const health = await checkDatabaseHealth()
    
    if (health.status === 'healthy') {
      console.log('✅ Database is healthy!')
      console.log(`   Host: ${health.host}:${health.port}`)
      console.log(`   Database: ${health.name}`)
      console.log(`   Ready State: ${health.readyState}`)
      
      // Get additional stats
      try {
        const stats = await dbUtils.getStats()
        console.log('\n📊 Database Statistics:')
        console.log(`   Collections: ${stats.collections}`)
        console.log(`   Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`)
        console.log(`   Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`)
        console.log(`   Indexes: ${stats.indexes}`)
        
        const collections = await dbUtils.getCollections()
        console.log(`   Collection Names: ${collections.join(', ') || 'None'}`)
        
      } catch (statsError) {
        console.log('\n⚠️  Could not retrieve database statistics')
      }
      
    } else {
      console.log('❌ Database is unhealthy!')
      console.log(`   Error: ${health.error}`)
      console.log(`   Ready State: ${health.readyState}`)
    }
    
  } catch (error) {
    console.error('❌ Database health check failed!')
    console.error(error.message)
    process.exit(1)
    
  } finally {
    process.exit(0)
  }
}

checkHealth()