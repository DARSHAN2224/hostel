import debug from 'debug'
import { config } from '../config/config.js'
const log = debug('app:sms')

export async function sendSms(to, message, { from } = {}) {
  const provider = config?.sms?.provider || 'mock'

  if (!to) {
    throw new Error('Missing "to" phone number for SMS')
  }
  const devNumber = process.env.SMS_DEV_REDIRECT_TO
  if (devNumber) {
    console.info(`[SMS DEV] Redirecting SMS from ${to} → ${devNumber}`)
    to = devNumber
  }
  if (provider === 'twilio') {
    const accountSid = config?.sms?.twilio?.accountSid
    const authToken = config?.sms?.twilio?.authToken
    const defaultFrom = config?.sms?.twilio?.fromNumber

    if (!accountSid || !authToken || !(from || defaultFrom)) {
      throw new Error('Twilio provider configured but credentials missing')
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

  if (provider === 'fast2sms') {
    const apiKey = process.env.FAST2SMS_API_KEY
    if (!apiKey) throw new Error('FAST2SMS_API_KEY is missing')

    const cleanNumber = to.replace('+91', '').replace(/\s/g, '').trim()

    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'q',          
        message: message,     
        numbers: cleanNumber,
        flash: 0
      })
    })

    const data = await response.json()
    if (!data.return) throw new Error(data.message || 'Fast2SMS failed')
    log('Fast2SMS sent to %s rid=%s', to, data.request_id)
    return { success: true, provider: 'fast2sms', sid: data.request_id }
  }

  // Mock fallback
  log('Mock SMS to %s: %s', to, message)
  console.info('\n[MOCK SMS] To:', to)
  console.info('[MOCK SMS] Message:', message, '\n')
  return { success: true, provider: 'mock' }
}

export default { sendSms }