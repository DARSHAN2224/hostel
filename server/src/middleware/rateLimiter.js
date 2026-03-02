// import rateLimit from 'express-rate-limit';
// import { ApiResponse } from '../utils/ApiResponse.js';

// /**
//  * Custom rate limit handler that returns standardized API response
//  */
// const rateLimitHandler = (req, res) => {
//   res.status(429).json(
//     new ApiResponse(
//       429,
//       { retryAfter: res.getHeader('Retry-After') },
//       'Too many requests from this IP, please try again later.'
//     )
//   );
// };

// /**
//  * General API Rate Limiter
//  * Limits: 100 requests per 15 minutes per IP
//  * Applied to all API routes
//  */
// export const apiLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // Limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again after 15 minutes.',
//   standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
//   legacyHeaders: false, // Disable `X-RateLimit-*` headers
//   handler: rateLimitHandler,
//   // Skip successful requests from rate limiting (optional)
//   skipSuccessfulRequests: false,
//   // Skip failed requests from rate limiting (optional)
//   skipFailedRequests: false,
//   // Use default key generator (handles IPv6 properly)
//   // The default generator automatically handles IP addresses correctly
// });

// /**
//  * Authentication Rate Limiter (Stricter)
//  * Limits: 5 login/register attempts per 15 minutes per IP
//  * Applied to auth routes: login, register, forgot-password
//  */
// export const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // Limit each IP to 5 auth requests per windowMs
//   message: 'Too many authentication attempts, please try again after 15 minutes.',
//   standardHeaders: true,
//   legacyHeaders: false,
//   handler: rateLimitHandler,
//   skipSuccessfulRequests: false, // Count successful auth attempts
//   skipFailedRequests: false, // Count failed auth attempts
// });

// /**
//  * Password Reset Rate Limiter (Very Strict)
//  * Limits: 3 password reset requests per hour per IP
//  * Applied to forgot-password and reset-password routes
//  */
// export const passwordResetLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour
//   max: 3, // Limit each IP to 3 password reset requests per hour
//   message: 'Too many password reset attempts, please try again after 1 hour.',
//   standardHeaders: true,
//   legacyHeaders: false,
//   handler: rateLimitHandler,
//   skipSuccessfulRequests: false,
//   skipFailedRequests: false,
// });

// /**
//  * Email Verification Rate Limiter
//  * Limits: 3 verification email requests per hour per IP
//  * Applied to resend-verification route
//  */
// export const emailLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour
//   max: 3, // Limit each IP to 3 email requests per hour
//   message: 'Too many email verification requests, please try again after 1 hour.',
//   standardHeaders: true,
//   legacyHeaders: false,
//   handler: rateLimitHandler,
//   skipSuccessfulRequests: false,
//   skipFailedRequests: false,
// });

// /**
//  * Create Account Rate Limiter (Per IP + Per Email)
//  * Limits: 3 account creation attempts per day per IP
//  * Applied to register route
//  */
// export const createAccountLimiter = rateLimit({
//   windowMs: 24 * 60 * 60 * 1000, // 24 hours
//   max: 3, // Limit each IP to 3 account creations per day
//   message: 'Too many accounts created from this IP, please try again after 24 hours.',
//   standardHeaders: true,
//   legacyHeaders: false,
//   handler: rateLimitHandler,
//   skipSuccessfulRequests: false,
//   skipFailedRequests: true, // Don't count failed attempts for this one
// });

// /**
//  * Search/Read Rate Limiter (More Lenient)
//  * Limits: 200 requests per 15 minutes per IP
//  * Applied to search and read-heavy routes
//  */
// export const readLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 200, // Limit each IP to 200 read requests per windowMs
//   message: 'Too many read requests, please try again after 15 minutes.',
//   standardHeaders: true,
//   legacyHeaders: false,
//   handler: rateLimitHandler,
//   skipSuccessfulRequests: false,
//   skipFailedRequests: false,
// });

// /**
//  * Create/Update/Delete Rate Limiter (Moderate)
//  * Limits: 30 write operations per 15 minutes per IP
//  * Applied to POST/PUT/PATCH/DELETE routes
//  */
// export const writeLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 30, // Limit each IP to 30 write operations per windowMs
//   message: 'Too many write operations, please try again after 15 minutes.',
//   standardHeaders: true,
//   legacyHeaders: false,
//   handler: rateLimitHandler,
//   skipSuccessfulRequests: false,
//   skipFailedRequests: false,
// });

// /**
//  * Parent public approve limiter
//  * Stricter: 10 requests per hour per IP for OTP-based approvals
//  */
// export const parentPublicApproveLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour
//   max: 10, // Limit each IP to 10 public OTP approval attempts per hour
//   message: 'Too many parent approval attempts from this IP, please try again later.',
//   standardHeaders: true,
//   legacyHeaders: false,
//   handler: rateLimitHandler,
//   skipSuccessfulRequests: false,
//   skipFailedRequests: false,
// });

// /**
//  * Health Check Rate Limiter (Very Lenient)
//  * Limits: 60 requests per minute per IP
//  * Applied to /health endpoint
//  */
// export const healthCheckLimiter = rateLimit({
//   windowMs: 1 * 60 * 1000, // 1 minute
//   max: 60, // Limit each IP to 60 health checks per minute
//   message: 'Too many health check requests.',
//   standardHeaders: true,
//   legacyHeaders: false,
//   handler: rateLimitHandler,
//   skipSuccessfulRequests: true,
//   skipFailedRequests: true,
// });


import rateLimit from 'express-rate-limit';
import { ApiResponse } from '../utils/ApiResponse.js';

const isDev = process.env.NODE_ENV === 'development'

/**
 * Custom rate limit handler that returns standardized API response
 */
const rateLimitHandler = (req, res) => {
  res.status(429).json(
    new ApiResponse(
      429,
      { retryAfter: res.getHeader('Retry-After') },
      'Too many requests from this IP, please try again later.'
    )
  );
};

/**
 * General API Rate Limiter
 * Limits: 100 requests per 15 minutes per IP (production only — see app.js)
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 100,
  message: 'Too many requests from this IP, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

/**
 * Authentication Rate Limiter
 * Production: 5 attempts per 15 min
 * Development: 50 attempts per 15 min (so testing doesn't get blocked)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 50 : 5,
  message: 'Too many authentication attempts, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: false,
  skipFailedRequests: isDev ? true : false, // In dev, don't count failed attempts
});

/**
 * Password Reset Rate Limiter
 * Production: 3 per hour (strict - prevents abuse)
 * Development: 20 per hour (loose - allows repeated testing)
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 20 : 3,
  message: 'Too many password reset attempts, please try again after 1 hour.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: false,
  skipFailedRequests: isDev ? true : false, // In dev, don't count failed attempts
});

/**
 * Email Verification Rate Limiter
 * Production: 3 per hour
 * Development: 20 per hour
 */
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 20 : 3,
  message: 'Too many email verification requests, please try again after 1 hour.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: false,
  skipFailedRequests: isDev ? true : false,
});

/**
 * Create Account Rate Limiter
 * Production: 3 per 24 hours
 * Development: 50 per 24 hours
 */
export const createAccountLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: isDev ? 50 : 3,
  message: 'Too many accounts created from this IP, please try again after 24 hours.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: false,
  skipFailedRequests: true,
});

/**
 * Search/Read Rate Limiter (lenient)
 */
export const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 200,
  message: 'Too many read requests, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

/**
 * Write Rate Limiter
 */
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 30,
  message: 'Too many write operations, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

/**
 * Parent OTP Approval Limiter
 */
export const parentPublicApproveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 50 : 10,
  message: 'Too many parent approval attempts from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

/**
 * Health Check Rate Limiter (very lenient)
 */
export const healthCheckLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: 'Too many health check requests.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: true,
  skipFailedRequests: true,
});