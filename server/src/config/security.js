import helmet from 'helmet';
import cors from 'cors';
import {config} from './config.js';

/**
 * Helmet Security Configuration
 * Helmet helps secure Express apps by setting various HTTP headers
 */
export const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  
  // Cross-Origin-Embedder-Policy
  crossOriginEmbedderPolicy: false,
  
  // Cross-Origin-Opener-Policy
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  
  // Cross-Origin-Resource-Policy
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  
  // Expect-CT (deprecated but still useful for older browsers)
  expectCt: { maxAge: 86400 },
  
  // X-Frame-Options (Clickjacking protection)
  frameguard: { action: 'deny' },
  
  // Hide X-Powered-By header
  hidePoweredBy: true,
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  
  // IE No Open (for IE8+)
  ieNoOpen: true,
  
  // X-Content-Type-Options
  noSniff: true,
  
  // Origin-Agent-Cluster
  originAgentCluster: true,
  
  // Referrer-Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  
  // X-XSS-Protection (legacy browsers)
  xssFilter: true,
});

/**
 * CORS Configuration
 * Cross-Origin Resource Sharing settings
 */
export const corsConfig = cors({
  // Allow requests from frontend URL
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      config.clientUrl,
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
    ];
    
    if (process.env.NODE_ENV === 'development') {
      // In development, allow all localhost origins
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  
  // Allow credentials (cookies, authorization headers)
  credentials: true,
  
  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  
  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  
  // Exposed headers (headers that browser can access)
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'Authorization',
    'X-Request-Id',
  ],
  
  // Preflight cache duration (in seconds)
  maxAge: 600, // 10 minutes
  
  // Pass the CORS preflight response to the next handler
  preflightContinue: false,
  
  // Provide a successful status code for OPTIONS requests
  optionsSuccessStatus: 204,
});

/**
 * Additional Security Middleware
 */
export const additionalSecurityHeaders = (req, res, next) => {
  // Prevent browser from caching sensitive data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Additional custom headers
  res.setHeader('X-Request-Id', req.id || Date.now().toString());
  
  next();
};

/**
 * Trusted Proxy Configuration
 * Trust first proxy (for Heroku, AWS, etc.)
 */
export const trustProxy = 1;
