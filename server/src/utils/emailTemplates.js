const EMAIL_BASE = {
  logo: 'https://ncet.co.in/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FNGE-Logo.251512d2.png&w=640&q=75',
  brandName: 'Hostel Management System',
  brandColor: '#4F46E5',
  accentColor: '#6366F1',
  year: new Date().getFullYear(),
}

const sharedHeader = `
  <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 32px 40px; text-align: center;">
    <img src="${EMAIL_BASE.logo}" alt="${EMAIL_BASE.brandName}" style="height: 56px; width: auto; object-fit: contain; margin-bottom: 16px; display: block; margin-left: auto; margin-right: auto;" />
    <div style="width: 40px; height: 2px; background: linear-gradient(to right, #818cf8, #c7d2fe); margin: 0 auto;"></div>
  </div>
`

const sharedFooter = `
  <div style="background-color: #1e1b4b; padding: 28px 40px; text-align: center;">
    <img src="${EMAIL_BASE.logo}" alt="${EMAIL_BASE.brandName}" style="height: 32px; width: auto; object-fit: contain; margin-bottom: 12px; opacity: 0.8;" />
    <p style="color: #a5b4fc; font-size: 12px; margin: 0 0 6px 0; font-family: Arial, sans-serif;">
      ${EMAIL_BASE.brandName} &nbsp;•&nbsp; NCET Campus, Bengaluru
    </p>
    <p style="color: #6366f1; font-size: 11px; margin: 0; font-family: Arial, sans-serif;">
      &copy; ${EMAIL_BASE.year} All rights reserved. This is an automated message — please do not reply.
    </p>
  </div>
`

// ─── 1. VERIFICATION EMAIL ───────────────────────────────────────────────────
export const VERIFICATION_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; border-radius:16px; overflow:hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.15);">

          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 32px 40px; text-align: center;">
              <img src="${EMAIL_BASE.logo}" alt="${EMAIL_BASE.brandName}" style="height:56px; width:auto; object-fit:contain; display:block; margin: 0 auto 16px auto;" />
              <div style="width:40px; height:2px; background: linear-gradient(to right, #818cf8, #c7d2fe); margin: 0 auto;"></div>
            </td>
          </tr>

          <!-- TITLE BAND -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 20px 40px; text-align:center;">
              <h1 style="color:white; margin:0; font-size:22px; font-weight:700; letter-spacing:0.5px;">
                ✉️ &nbsp; Verify Your Email Address
              </h1>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background-color:#ffffff; padding: 40px 40px 32px 40px;">
              <p style="color:#374151; font-size:16px; margin:0 0 8px 0;">Hello, <strong style="color:#4f46e5;">{username}</strong></p>
              <p style="color:#6b7280; font-size:14px; margin:0 0 28px 0; line-height:1.7;">
                Thank you for registering on the <strong>Hostel Management System</strong>. Use the verification code below to confirm your email address and activate your account.
              </p>

              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #eef2ff, #e0e7ff); border: 1px solid #c7d2fe; border-radius: 12px; padding: 28px; text-align: center; margin: 0 0 28px 0;">
                <p style="color:#6b7280; font-size:12px; margin:0 0 10px 0; text-transform:uppercase; letter-spacing:2px;">Your Verification Code</p>
                <span style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #4f46e5; font-family: 'Courier New', monospace;">{verificationCode}</span>
                <p style="color:#9ca3af; font-size:12px; margin:12px 0 0 0;">⏱ &nbsp;Expires in <strong>15 minutes</strong></p>
              </div>

              <p style="color:#6b7280; font-size:13px; margin:0 0 8px 0; line-height:1.7;">
                Enter this code on the verification page to complete your registration. If you did not create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- DIVIDER INFO -->
          <tr>
            <td style="background-color:#f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 40px;">
              <p style="color:#94a3b8; font-size:12px; margin:0; text-align:center;">
                🔒 &nbsp; For your security, never share this code with anyone.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#1e1b4b; padding: 28px 40px; text-align:center;">
              <img src="${EMAIL_BASE.logo}" alt="${EMAIL_BASE.brandName}" style="height:32px; width:auto; object-fit:contain; margin-bottom:12px; opacity:0.8;" />
              <p style="color:#a5b4fc; font-size:12px; margin:0 0 6px 0;">Hostel Management System &nbsp;•&nbsp; NCET Campus, Bengaluru</p>
              <p style="color:#6366f1; font-size:11px; margin:0;">&copy; ${EMAIL_BASE.year} All rights reserved. This is an automated message — please do not reply.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`


// ─── 2. PASSWORD RESET REQUEST ───────────────────────────────────────────────
export const PASSWORD_RESET_REQUEST_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; border-radius:16px; overflow:hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.15);">

          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 32px 40px; text-align: center;">
              <img src="${EMAIL_BASE.logo}" alt="${EMAIL_BASE.brandName}" style="height:56px; width:auto; object-fit:contain; display:block; margin: 0 auto 16px auto;" />
              <div style="width:40px; height:2px; background: linear-gradient(to right, #818cf8, #c7d2fe); margin: 0 auto;"></div>
            </td>
          </tr>

          <!-- TITLE BAND -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 20px 40px; text-align:center;">
              <h1 style="color:white; margin:0; font-size:22px; font-weight:700; letter-spacing:0.5px;">
                🔐 &nbsp; Password Reset Request
              </h1>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background-color:#ffffff; padding: 40px 40px 32px 40px;">
              <p style="color:#374151; font-size:16px; margin:0 0 8px 0;">Hello, <strong style="color:#4f46e5;">{username}</strong></p>
              <p style="color:#6b7280; font-size:14px; margin:0 0 28px 0; line-height:1.7;">
                We received a request to reset the password for your Hostel Management System account. Click the button below to create a new password.
              </p>

              <!-- Reset Button -->
              <div style="text-align:center; margin: 0 0 28px 0;">
                <a href="{resetURL}" style="display:inline-block; background: linear-gradient(135deg, #dc2626, #b91c1c); color:white; padding: 16px 40px; text-decoration:none; border-radius:10px; font-weight:700; font-size:16px; letter-spacing:0.5px; box-shadow: 0 4px 15px rgba(220,38,38,0.4);">
                  Reset Password &rarr;
                </a>
              </div>

              <!-- Warning Box -->
              <div style="background-color:#fef2f2; border-left: 4px solid #ef4444; border-radius:8px; padding: 16px 20px; margin: 0 0 20px 0;">
                <p style="color:#b91c1c; font-size:13px; margin:0; font-weight:600;">⚠️ &nbsp; This link will expire in <strong>1 hour</strong>.</p>
                <p style="color:#ef4444; font-size:12px; margin:8px 0 0 0;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
              </div>

              <p style="color:#6b7280; font-size:12px; margin:0; line-height:1.7;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <span style="color:#4f46e5; word-break:break-all;">{resetURL}</span>
              </p>
            </td>
          </tr>

          <!-- DIVIDER INFO -->
          <tr>
            <td style="background-color:#f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 40px;">
              <p style="color:#94a3b8; font-size:12px; margin:0; text-align:center;">
                🔒 &nbsp; For your security, never share this link with anyone.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#1e1b4b; padding: 28px 40px; text-align:center;">
              <img src="${EMAIL_BASE.logo}" alt="${EMAIL_BASE.brandName}" style="height:32px; width:auto; object-fit:contain; margin-bottom:12px; opacity:0.8;" />
              <p style="color:#a5b4fc; font-size:12px; margin:0 0 6px 0;">Hostel Management System &nbsp;•&nbsp; NCET Campus, Bengaluru</p>
              <p style="color:#6366f1; font-size:11px; margin:0;">&copy; ${EMAIL_BASE.year} All rights reserved. This is an automated message — please do not reply.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`


// ─── 3. PASSWORD RESET SUCCESS ───────────────────────────────────────────────
export const PASSWORD_RESET_SUCCESS_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Successful</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; border-radius:16px; overflow:hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.15);">

          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 32px 40px; text-align: center;">
              <img src="${EMAIL_BASE.logo}" alt="${EMAIL_BASE.brandName}" style="height:56px; width:auto; object-fit:contain; display:block; margin: 0 auto 16px auto;" />
              <div style="width:40px; height:2px; background: linear-gradient(to right, #818cf8, #c7d2fe); margin: 0 auto;"></div>
            </td>
          </tr>

          <!-- TITLE BAND -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669, #047857); padding: 20px 40px; text-align:center;">
              <h1 style="color:white; margin:0; font-size:22px; font-weight:700; letter-spacing:0.5px;">
                ✅ &nbsp; Password Reset Successful
              </h1>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background-color:#ffffff; padding: 40px 40px 32px 40px;">
              <p style="color:#374151; font-size:16px; margin:0 0 8px 0;">Hello, <strong style="color:#4f46e5;">{username}</strong></p>
              <p style="color:#6b7280; font-size:14px; margin:0 0 28px 0; line-height:1.7;">
                Your password has been successfully reset. You can now log in to the Hostel Management System with your new password.
              </p>

              <!-- Success Icon -->
              <div style="text-align:center; margin: 0 0 28px 0;">
                <div style="display:inline-block; background: linear-gradient(135deg, #d1fae5, #a7f3d0); border-radius:50%; width:80px; height:80px; line-height:80px; text-align:center; font-size:40px; border: 3px solid #34d399;">
                  ✓
                </div>
              </div>

              <!-- Tips Box -->
              <div style="background: linear-gradient(135deg, #eef2ff, #e0e7ff); border-radius:12px; padding: 24px; margin: 0 0 20px 0;">
                <p style="color:#4f46e5; font-size:14px; font-weight:700; margin:0 0 12px 0;">🛡️ Security Recommendations</p>
                <ul style="color:#6b7280; font-size:13px; margin:0; padding-left:20px; line-height:2;">
                  <li>Use a strong, unique password with letters, numbers & symbols</li>
                  <li>Never reuse passwords across multiple platforms</li>
                  <li>Enable two-factor authentication if available</li>
                </ul>
              </div>

              <!-- Warning -->
              <div style="background-color:#fef2f2; border-left: 4px solid #ef4444; border-radius:8px; padding: 14px 18px;">
                <p style="color:#b91c1c; font-size:12px; margin:0;">
                  ⚠️ &nbsp;If you did not initiate this reset, contact your administrator immediately.
                </p>
              </div>
            </td>
          </tr>

          <!-- DIVIDER INFO -->
          <tr>
            <td style="background-color:#f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 40px;">
              <p style="color:#94a3b8; font-size:12px; margin:0; text-align:center;">
                🔒 &nbsp; Keep your credentials safe and never share them with anyone.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#1e1b4b; padding: 28px 40px; text-align:center;">
              <img src="${EMAIL_BASE.logo}" alt="${EMAIL_BASE.brandName}" style="height:32px; width:auto; object-fit:contain; margin-bottom:12px; opacity:0.8;" />
              <p style="color:#a5b4fc; font-size:12px; margin:0 0 6px 0;">Hostel Management System &nbsp;•&nbsp; NCET Campus, Bengaluru</p>
              <p style="color:#6366f1; font-size:11px; margin:0;">&copy; ${EMAIL_BASE.year} All rights reserved. This is an automated message — please do not reply.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`


// ─── 4. CREDENTIALS EMAIL ────────────────────────────────────────────────────
export const CREDENTIALS_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Account Credentials</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; border-radius:16px; overflow:hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.15);">

          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 32px 40px; text-align: center;">
              <img src="${EMAIL_BASE.logo}" alt="${EMAIL_BASE.brandName}" style="height:56px; width:auto; object-fit:contain; display:block; margin: 0 auto 16px auto;" />
              <div style="width:40px; height:2px; background: linear-gradient(to right, #818cf8, #c7d2fe); margin: 0 auto;"></div>
            </td>
          </tr>

          <!-- TITLE BAND -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 20px 40px; text-align:center;">
              <h1 style="color:white; margin:0; font-size:22px; font-weight:700; letter-spacing:0.5px;">
                🎓 &nbsp; Your Account Has Been Created
              </h1>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background-color:#ffffff; padding: 40px 40px 32px 40px;">
              <p style="color:#374151; font-size:16px; margin:0 0 8px 0;">Hello, <strong style="color:#4f46e5;">{username}</strong></p>
              <p style="color:#6b7280; font-size:14px; margin:0 0 28px 0; line-height:1.7;">
                An account has been created for you on the <strong>Hostel Management System</strong>. Below are your login credentials. Please change your password after your first login.
              </p>

              <!-- Credentials Box -->
              <div style="background: linear-gradient(135deg, #eef2ff, #e0e7ff); border: 1px solid #c7d2fe; border-radius: 12px; padding: 24px; margin: 0 0 28px 0;">
                <p style="color:#6b7280; font-size:11px; text-transform:uppercase; letter-spacing:2px; margin:0 0 16px 0;">Login Credentials</p>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #c7d2fe;">
                      <span style="color:#9ca3af; font-size:12px; display:block; margin-bottom:2px;">EMAIL ADDRESS</span>
                      <span style="color:#1e1b4b; font-size:15px; font-weight:700; font-family:'Courier New', monospace;">{email}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0;">
                      <span style="color:#9ca3af; font-size:12px; display:block; margin-bottom:2px;">TEMPORARY PASSWORD</span>
                      <span style="color:#4f46e5; font-size:15px; font-weight:700; font-family:'Courier New', monospace; background:#fff; padding: 4px 10px; border-radius:6px; border:1px dashed #818cf8;">{password}</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Login Button -->
              <div style="text-align:center; margin: 0 0 28px 0;">
                <a href="{clientUrl}" style="display:inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color:white; padding: 16px 40px; text-decoration:none; border-radius:10px; font-weight:700; font-size:16px; letter-spacing:0.5px; box-shadow: 0 4px 15px rgba(79,70,229,0.4);">
                  Login Now &rarr;
                </a>
              </div>

              <!-- Steps -->
              <div style="background-color:#f8fafc; border-radius:12px; padding:20px 24px; margin:0 0 8px 0;">
                <p style="color:#374151; font-size:13px; font-weight:700; margin:0 0 10px 0;">Next Steps:</p>
                <p style="color:#6b7280; font-size:13px; margin:0 0 6px 0; line-height:1.6;">1. &nbsp;Log in using the credentials above.</p>
                <p style="color:#6b7280; font-size:13px; margin:0 0 6px 0; line-height:1.6;">2. &nbsp;Verify your email using the OTP sent separately.</p>
                <p style="color:#6b7280; font-size:13px; margin:0; line-height:1.6;">3. &nbsp;Change your password immediately after first login.</p>
              </div>
            </td>
          </tr>

          <!-- DIVIDER INFO -->
          <tr>
            <td style="background-color:#fef2f2; border-top: 1px solid #fecaca; padding: 16px 40px;">
              <p style="color:#b91c1c; font-size:12px; margin:0; text-align:center;">
                ⚠️ &nbsp; If you did not expect this email, please contact your administrator immediately.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#1e1b4b; padding: 28px 40px; text-align:center;">
              <img src="${EMAIL_BASE.logo}" alt="${EMAIL_BASE.brandName}" style="height:32px; width:auto; object-fit:contain; margin-bottom:12px; opacity:0.8;" />
              <p style="color:#a5b4fc; font-size:12px; margin:0 0 6px 0;">Hostel Management System &nbsp;•&nbsp; NCET Campus, Bengaluru</p>
              <p style="color:#6366f1; font-size:11px; margin:0;">&copy; ${EMAIL_BASE.year} All rights reserved. This is an automated message — please do not reply.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`


// ─── 5. WELCOME EMAIL ────────────────────────────────────────────────────────
export const WELCOME_PAGE_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Hostel Management System</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; border-radius:16px; overflow:hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.15);">

          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 32px 40px; text-align: center;">
              <img src="${EMAIL_BASE.logo}" alt="${EMAIL_BASE.brandName}" style="height:56px; width:auto; object-fit:contain; display:block; margin: 0 auto 16px auto;" />
              <div style="width:40px; height:2px; background: linear-gradient(to right, #818cf8, #c7d2fe); margin: 0 auto;"></div>
            </td>
          </tr>

          <!-- TITLE BAND -->
          <tr>
            <td style="background: linear-gradient(135deg, #0891b2, #0e7490); padding: 20px 40px; text-align:center;">
              <h1 style="color:white; margin:0; font-size:22px; font-weight:700; letter-spacing:0.5px;">
                🎉 &nbsp; Welcome Aboard!
              </h1>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background-color:#ffffff; padding: 40px 40px 32px 40px; text-align:center;">

              <div style="font-size:56px; margin: 0 0 20px 0;">👋</div>

              <h2 style="color:#1e1b4b; font-size:26px; font-weight:800; margin:0 0 10px 0;">
                Welcome, {username}!
              </h2>
              <p style="color:#6b7280; font-size:14px; margin:0 0 28px 0; line-height:1.8; max-width:420px; margin-left:auto; margin-right:auto;">
                Your account is now active on the <strong>Hostel Management System</strong>. You're all set to manage your hostel operations seamlessly.
              </p>

              <!-- Feature Pills -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 28px 0;">
                <tr>
                  <td width="33%" style="padding:8px; text-align:center;">
                    <div style="background:#eef2ff; border-radius:10px; padding:16px 8px;">
                      <div style="font-size:24px; margin-bottom:6px;">🔐</div>
                      <p style="color:#4f46e5; font-size:11px; font-weight:700; margin:0;">Secure Access</p>
                    </div>
                  </td>
                  <td width="33%" style="padding:8px; text-align:center;">
                    <div style="background:#ecfdf5; border-radius:10px; padding:16px 8px;">
                      <div style="font-size:24px; margin-bottom:6px;">📋</div>
                      <p style="color:#059669; font-size:11px; font-weight:700; margin:0;">Outpass Tracking</p>
                    </div>
                  </td>
                  <td width="33%" style="padding:8px; text-align:center;">
                    <div style="background:#fff7ed; border-radius:10px; padding:16px 8px;">
                      <div style="font-size:24px; margin-bottom:6px;">⚡</div>
                      <p style="color:#ea580c; font-size:11px; font-weight:700; margin:0;">Fast Approvals</p>
                    </div>
                  </td>
                </tr>
              </table>

              <a href="#" style="display:inline-block; background: linear-gradient(135deg, #0891b2, #0e7490); color:white; padding: 16px 40px; text-decoration:none; border-radius:10px; font-weight:700; font-size:16px; letter-spacing:0.5px; box-shadow: 0 4px 15px rgba(8,145,178,0.4); margin-bottom: 8px;">
                Go to Dashboard &rarr;
              </a>
            </td>
          </tr>

          <!-- DIVIDER INFO -->
          <tr>
            <td style="background-color:#f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 40px;">
              <p style="color:#94a3b8; font-size:12px; margin:0; text-align:center;">
                Need help? Reach out to your hostel administrator or warden.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#1e1b4b; padding: 28px 40px; text-align:center;">
              <img src="${EMAIL_BASE.logo}" alt="${EMAIL_BASE.brandName}" style="height:32px; width:auto; object-fit:contain; margin-bottom:12px; opacity:0.8;" />
              <p style="color:#a5b4fc; font-size:12px; margin:0 0 6px 0;">Hostel Management System &nbsp;•&nbsp; NCET Campus, Bengaluru</p>
              <p style="color:#6366f1; font-size:11px; margin:0;">&copy; ${EMAIL_BASE.year} All rights reserved. This is an automated message — please do not reply.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`