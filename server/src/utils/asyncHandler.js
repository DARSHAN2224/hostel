/**
 * AsyncHandler Utility
 * 
 * Wraps async route handlers to automatically catch errors and pass them to error middleware.
 * Eliminates the need for repetitive try-catch blocks in controllers.
 * 
 * Usage:
 * export const myController = asyncHandler(async (req, res, next) => {
 *   // Your code here - no try-catch needed!
 *   // Errors are automatically caught and passed to next()
 * })
 */

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next)
  } catch (error) {
    // Pass error to Express error handling middleware
    next(error)
  }
}

export { asyncHandler }
