// server/src/utils/emailOtpSender.js
import { sendEmail } from './email.js'

function buildOtpEmail({ studentName, destination, leaveDate, leaveTimeStr, returnStr, hostelBlock, room, otp }) {

  const logoUrl = `https://ncet.co.in/_next/static/media/NGE-Logo.251512d2.png`

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body style="margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 10px;">
<tr>
<td align="center">


<table width="560" cellpadding="0" cellspacing="0"
style="background:#ffffff;border-radius:14px;overflow:hidden;
box-shadow:0 4px 18px rgba(0,0,0,0.08);">


<!-- HEADER -->
<tr>
<td style="background:linear-gradient(135deg,#166534,#15803d);
padding:28px 40px;text-align:center;">

<img src="${logoUrl}" width="70" style="margin-bottom:12px;">

<h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">
NCET Hostel Outpass Approval
</h1>

<p style="margin:6px 0 0;color:#dcfce7;font-size:13px;">
Nagarjuna College of Engineering and Technology
</p>

</td>
</tr>



<!-- BODY -->
<tr>
<td style="padding:34px 40px;">


<p style="margin:0 0 18px;color:#374151;font-size:15px;">
Dear Parent / Guardian,
</p>


<p style="margin:0 0 26px;color:#4b5563;font-size:14px;line-height:1.6;">

Your child <strong style="color:#166534;">${studentName}</strong> 
has submitted a hostel outpass request.

Please review the details below and share the approval code with the hostel warden.

</p>



<!-- DETAILS CARD -->

<table width="100%" cellpadding="0" cellspacing="0"
style="background:#f0fdf4;
border:1px solid #bbf7d0;
border-radius:10px;
margin-bottom:26px;">

<tr>
<td style="padding:18px 22px;">


<table width="100%" cellpadding="6">

<tr>
<td style="color:#6b7280;font-size:13px;width:45%;">
Destination
</td>

<td style="color:#111827;font-weight:600;font-size:13px;">
${destination}
</td>
</tr>


<tr>
<td style="color:#6b7280;font-size:13px;">
Leave Date
</td>

<td style="color:#111827;font-weight:600;font-size:13px;">
${leaveDate}
</td>
</tr>



<tr>
<td style="color:#6b7280;font-size:13px;">
Leave Time
</td>

<td style="color:#111827;font-weight:600;font-size:13px;">
${leaveTimeStr}
</td>
</tr>



<tr>
<td style="color:#6b7280;font-size:13px;">
Expected Return
</td>

<td style="color:#111827;font-weight:600;font-size:13px;">
${returnStr}
</td>
</tr>



<tr>
<td style="color:#6b7280;font-size:13px;">
Hostel / Room
</td>

<td style="color:#111827;font-weight:600;font-size:13px;">
Block ${hostelBlock}, Room ${room}
</td>
</tr>


</table>

</td>
</tr>
</table>




<!-- OTP BOX -->

<table width="100%" cellpadding="0" cellspacing="0"
style="background:#ecfdf5;
border:2px dashed #166534;
border-radius:12px;
margin-bottom:28px;">

<tr>
<td align="center" style="padding:24px;">


<p style="margin:0 0 8px;
color:#166534;
font-size:13px;
font-weight:700;
letter-spacing:1px;">

APPROVAL CODE

</p>


<p style="margin:0;
font-size:42px;
font-weight:800;
color:#166534;
letter-spacing:12px;">

${otp}

</p>



<p style="margin-top:8px;
color:#6b7280;
font-size:12px;">

Valid for 10 minutes · Share only with hostel warden

</p>


</td>
</tr>

</table>



<p style="margin:0;color:#6b7280;font-size:13px;">

If you did not request this, please contact hostel office immediately.

</p>



</td>
</tr>




<!-- FOOTER -->


<tr>
<td style="background:#f9fafb;
padding:26px 40px;
text-align:center;
border-top:1px solid #e5e7eb;">



<p style="margin:0;
font-weight:600;
color:#166534;
font-size:14px;">

Greetings from NCET College Hostel

</p>



<p style="margin:10px 0;
color:#6b7280;
font-size:12px;
line-height:1.6;">


Nagarjuna College of Engineering and Technology Hostel<br>

Beedaganahalli, Post, Devanahalli,<br>

Venkatagiri Kote, Bengaluru,<br>

Karnataka – 562135


</p>




<p style="margin:10px 0;
color:#6b7280;
font-size:12px;">


Head Warden: Monish<br>

Contact: 9999999999


</p>




<p style="margin-top:14px;
color:#9ca3af;
font-size:11px;">

This is an automated message from NCET Hostel Outpass System

</p>



</td>
</tr>



</table>


</td>
</tr>
</table>



</body>
</html>
`
}

export async function sendOtpEmail({ to, otp, studentName, destination, leaveTime, expectedReturn, hostelBlock, room }) {
  if (!to) throw new Error('Missing "to" email for OTP')
  const devRedirect = process.env.EMAIL_DEV_REDIRECT_TO
  if (devRedirect) {
    console.info(`[EMAIL DEV] Redirecting OTP email from ${to} → ${devRedirect}`)
    to = devRedirect
  }
  const leaveDate = leaveTime
    ? new Date(leaveTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A'
  const leaveTimeStr = leaveTime
    ? new Date(leaveTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : 'N/A'
  const returnStr = expectedReturn
    ? new Date(expectedReturn).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'N/A'

  const html = buildOtpEmail({ studentName, destination, leaveDate, leaveTimeStr, returnStr, hostelBlock, room, otp })

  await sendEmail({
    to,
    subject: `🔐 Outpass Approval Code for ${studentName}`,
    html,
    text: `Your ward ${studentName} is requesting an outpass to ${destination} on ${leaveDate}. Your approval code is: ${otp}. Valid for 10 minutes. Share only with the hostel warden.`
  })

  return { success: true, provider: 'nodemailer' }
}