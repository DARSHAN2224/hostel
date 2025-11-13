import debug from 'debug'
import { config } from '../config/config.js'
const log = debug('app:sms')

/**
 * Simple SMS sender abstraction.
 * Supports 'twilio' provider when TWILIO_* env vars are set, otherwise falls back to a mock logger.
 * Uses dynamic import for 'twilio' so the package is optional during development.
 */
export async function sendSms(to, message, { from } = {}) {
  const provider = config?.sms?.provider || 'mock'

  if (!to) {
    throw new Error('Missing "to" phone number for SMS')
  }

  if (provider === 'twilio') {
  const accountSid = config?.sms?.twilio?.accountSid
  const authToken = config?.sms?.twilio?.authToken
  const defaultFrom = config?.sms?.twilio?.fromNumber

    if (!accountSid || !authToken || !(from || defaultFrom)) {
      throw new Error('Twilio provider configured but TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_NUMBER is missing')
    }

    try {
  const twilio = await import('twilio')
      const client = twilio.default(accountSid, authToken)
      const res = await client.messages.create({ body: message, from: from || defaultFrom, to })
      log('Twilio SMS sent to %s sid=%s', to, res.sid)
      return { success: true, provider: 'twilio', sid: res.sid }
    } catch (err) {
      log('Twilio send failed', err)
      throw err
    }
  }

  // Mock provider: log message to server console (useful in development)
  log('Mock SMS to %s: %s', to, message)
  // Also print to console so developers can copy OTP during testing
  console.info('\n[MOCK SMS] To:', to)
  console.info('[MOCK SMS] Message:', message, '\n')
  return { success: true, provider: 'mock' }
}

export default { sendSms }
