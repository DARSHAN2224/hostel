import express from 'express';
import mongoose from 'mongoose';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import os from 'os';
import { healthCheckLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint - Check if server and database are running
 * @access  Public
 */
router.get(
  '/',
  healthCheckLimiter,
  asyncHandler(async (req, res) => {
    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        memory: {
          total: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
          free: `${Math.round(os.freemem() / 1024 / 1024)} MB`,
          used: `${Math.round((os.totalmem() - os.freemem()) / 1024 / 1024)} MB`,
          usage: `${Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)}%`,
        },
        cpu: {
          cores: os.cpus().length,
          model: os.cpus()[0]?.model || 'Unknown',
        },
      },
      database: {
        status: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        name: mongoose.connection.name,
        host: mongoose.connection.host,
        models: Object.keys(mongoose.connection.models).length,
      },
    };

    // If database is not connected, return 503
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json(
        new ApiResponse(503, healthData, 'Service Unavailable - Database not connected', false)
      );
    }

    res.json(new ApiResponse(200, healthData, 'Service is healthy'));
  })
);

/**
 * @route   GET /api/health/ping
 * @desc    Simple ping endpoint for monitoring
 * @access  Public
 */
router.get('/ping', (req, res) => {
  res.json({ pong: true, timestamp: Date.now() });
});

/**
 * @route   GET /api/health/db
 * @desc    Detailed database health check
 * @access  Public
 */
router.get(
  '/db',
  healthCheckLimiter,
  asyncHandler(async (req, res) => {
    const dbHealth = {
      connection: {
        readyState: mongoose.connection.readyState,
        status: ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'][mongoose.connection.readyState],
        name: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
      },
      collections: mongoose.connection.collections
        ? Object.keys(mongoose.connection.collections).map((name) => ({
            name,
            modelName: mongoose.connection.collections[name]?.modelName,
          }))
        : [],
      models: Object.keys(mongoose.connection.models),
    };

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json(
        new ApiResponse(503, dbHealth, 'Database not connected', false)
      );
    }

    res.json(new ApiResponse(200, dbHealth, 'Database is healthy'));
  })
);

export default router;
