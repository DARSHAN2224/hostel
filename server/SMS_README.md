SMS setup

This project includes an SMS sender abstraction supporting Twilio (production) and a mock provider (development).

1) Install dependencies (only if not already installed):

```powershell
cd A:\HostelManagement\server
npm install twilio debug
```

2) Configure environment variables

Copy `.env.example` to `.env` and set values. Important keys for SMS:

- SMS_PROVIDER: mock | twilio
- TWILIO_ACCOUNT_SID: Your Twilio account SID
- TWILIO_AUTH_TOKEN: Your Twilio auth token
- TWILIO_FROM_NUMBER: The phone number to send SMS from (in E.164 format, e.g., +1234567890)

Example `.env` snippet:

```
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1XXXXXXXXXX
```

3) How the flow works

- Admin or warden calls POST /api/v1/outpass/parent/request-otp/:requestId (must be authenticated).
- The server generates a 6-digit OTP and stores it on the outpass.parentApproval object.
- The server sends a short SMS to the parent's phone (mock logs to console when SMS_PROVIDER=mock).
- Admin receives a response with `parentContact` and `otpSent: true` and the sanitized outpass (no OTP).
- Parent approves by calling the OTP endpoint (public): POST /api/v1/outpass/parent/approve-public/:requestId { otp }
  - If OTP is valid, server marks parentApproval.approved=true, deletes OTP from DB, and returns a short-lived parentToken.
- Parent or mobile app can then call GET /api/v1/outpass/parent/portal/:requestId with Authorization: Bearer <parentToken> to fetch full outpass details.

4) Security notes

- Do NOT set SMS_PROVIDER=mock in production. Use Twilio and ensure your `.env` is stored securely.
- OTP is deleted after successful approval to prevent reuse.
- The public approval endpoint is rate-limited to prevent brute force attempts.

If you want me to hook this into a parent mobile app or add webhook/delivery receipts, tell me and I will implement it.
