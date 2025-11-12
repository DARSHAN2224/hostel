/**
 * normalizeServerErrors
 * Accepts an axios error response payload and returns a normalized
 * array of { field, message } or null when none found.
 */
export function normalizeServerErrors(payload) {
  if (!payload || typeof payload !== 'object') return null

  // Joi/validate middleware: payload.data.errors
  const joi = payload.data?.errors
  if (Array.isArray(joi) && joi.length > 0) {
    return joi.map(e => ({ field: e.field || null, message: e.message || String(e) }))
  }

  // Central error handler: payload.details
  const details = payload.details
  if (Array.isArray(details) && details.length > 0) {
    return details.map(e => ({ field: e.field || null, message: e.message || String(e) }))
  }

  return null
}

export default normalizeServerErrors
