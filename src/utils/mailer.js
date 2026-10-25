const nodemailer = require('nodemailer');

/** Lazily-created singleton transporter. */
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_ID,
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  return _transporter;
}

// S3 hosted logo URLs
const INSTA_LOGO_URL = 'https://instagram-support.s3.ap-south-1.amazonaws.com/insta-email-logo.png';
const META_LOGO_URL = 'https://instagram-support.s3.ap-south-1.amazonaws.com/meta-email-logo.png';

/**
 * Send a 6-digit OTP email matching Instagram's real confirmation email format.
 * Uses external S3 URLs for images.
 * @param {string} to   Recipient email address
 * @param {string} otp  6-digit code
 */
async function sendOtpEmail(to, otp) {
  const transporter = getTransporter();

  console.log('📧 Preparing OTP email for:', to);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${otp} is your Instagram code</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#ffffff;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#ffffff;min-width:100%;">
    <tr>
      <td align="center" style="padding:0;">

        <!-- Content card — max 468px, full width on mobile -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"
          style="width:100%;max-width:468px;">

          <!-- ── Top spacer ── -->
          <tr><td style="height:32px;">&nbsp;</td></tr>

          <!-- ── Instagram logo ── -->
          <tr>
            <td align="center" style="padding:0 24px 28px;">
              <img
                src="${INSTA_LOGO_URL}"
                alt="Instagram"
                width="197" height="40"
                style="display:block;border:0;outline:none;max-width:100%;height:auto;" />
            </td>
          </tr>

          <!-- ── Body text ── -->
          <tr>
            <td style="padding:0 24px 6px;
                       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                       font-size:18px!important;font-weight:500;color:#565a5c;line-height:1.6;">
              Hi,
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;
                       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                       font-size:18px!important;font-weight:500;color:#565a5c;line-height:1.7;">
              This is your forgot password OTP for Instagram account
              <a href="mailto:${to}" style="color:#385898;text-decoration:none;font-weight:500;font-size:18px!important;">${to}</a>.
              If it was you, enter this confirmation code in the app:
            </td>
          </tr>

          <!-- ── OTP code ── -->
          <tr>
            <td align="center" style="padding:8px 24px 32px;">
              <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                           font-size:32px;font-weight:400;letter-spacing:8px;color:#555555;">
                ${otp}
              </span>
            </td>
          </tr>

          <!-- ── Divider ── -->
          <tr>
            <td style="padding:0 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="border-top:1px solid #efefef;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- ── "from" label ── -->
          <tr>
            <td align="center" style="padding:20px 24px 8px;">
              <p style="margin:0;
                        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                        font-size:11px;color:#8e8e8e;">
                from
              </p>
            </td>
          </tr>

          <!-- ── Meta logo ── -->
          <tr>
            <td align="center" style="padding:0 24px 16px;">
              <img
                src="${META_LOGO_URL}"
                alt="Meta"
                width="67" height="22"
                style="display:block;margin:0 auto;border:0;outline:none;max-width:100%;height:auto;" />
            </td>
          </tr>

          <!-- ── Copyright line ── -->
          <tr>
            <td align="center" style="padding:0 24px 4px;
                       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                       font-size:11px;color:#8e8e8e;line-height:1.6;">
              © Instagram. Meta Platforms, Inc. ·
              <a href="https://www.google.com/maps/search/1601+Willow+Road+Menlo+Park+CA+94025"
                 style="color:#385898;text-decoration:none;">
                1601 Willow Road, Menlo Park, CA 94025
              </a>
            </td>
          </tr>

          <!-- ── "This message was sent to" ── -->
          <tr>
            <td align="center" style="padding:0 24px 32px;
                       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                       font-size:11px;color:#8e8e8e;line-height:1.6;">
              This message was sent to
              <a href="mailto:${to}" style="color:#385898;text-decoration:none;">${to}</a>
            </td>
          </tr>

        </table>
        <!-- /Content card -->

      </td>
    </tr>
  </table>

</body>
</html>`;

  const text = `Hi,\n\nThis is your forgot password OTP for Instagram account ${to}. If it was you, enter this confirmation code in the app:\n\n${otp}\n\n© Instagram. Meta Platforms, Inc. · 1601 Willow Road, Menlo Park, CA 94025\nThis message was sent to ${to}`;

  const mailOptions = {
    from: `"Instagram" <${process.env.GMAIL_ID}>`,
    to,
    subject: `${otp} is your Instagram code`,
    html,
    text,
  };

  console.log('📤 Sending OTP email...');
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent successfully');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    return info;
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    throw error;
  }
}

/**
 * Send password changed confirmation email matching Instagram's format.
 * Uses external S3 URLs for images.
 * @param {string} to         Recipient email address
 * @param {string} username   Username (optional, will use email if not provided)
 */
async function sendPasswordChangedEmail(to, username = '') {
  const transporter = getTransporter();
  const displayName = username || to;

  console.log('🔒 Preparing password change confirmation email for:', to);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Your Instagram password was changed</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#ffffff;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#ffffff;min-width:100%;">
    <tr>
      <td align="center" style="padding:0;">

        <!-- Content card — max 468px, full width on mobile -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"
          style="width:100%;max-width:468px;">

          <!-- ── Top spacer ── -->
          <tr><td style="height:32px;">&nbsp;</td></tr>

          <!-- ── Instagram logo ── -->
          <tr>
            <td align="center" style="padding:0 24px 28px;">
              <img
                src="${INSTA_LOGO_URL}"
                alt="Instagram"
                width="197" height="40"
                style="display:block;border:0;outline:none;max-width:100%;height:auto;" />
            </td>
          </tr>

          <!-- ── Body text ── -->
          <tr>
            <td style="padding:0 24px 6px;
                       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                       font-size:18px!important;font-weight:500;color:#565a5c;line-height:1.6;">
              Hi ${displayName},
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;
                       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                       font-size:18px!important;font-weight:500;color:#565a5c;line-height:1.7;">
              Your Instagram password was successfully changed.
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 32px;
                       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                       font-size:18px!important;font-weight:500;color:#565a5c;line-height:1.7;">
              If you didn't make this change or if you believe an unauthorized person has accessed your account, please
              <a href="https://help.instagram.com/contact/" style="color:#385898;text-decoration:none;font-weight:500;font-size:18px!important;">contact support</a>
              immediately.
            </td>
          </tr>

          <!-- ── Divider ── -->
          <tr>
            <td style="padding:0 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="border-top:1px solid #efefef;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- ── "from" label ── -->
          <tr>
            <td align="center" style="padding:20px 24px 8px;">
              <p style="margin:0;
                        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                        font-size:11px;color:#8e8e8e;">
                from
              </p>
            </td>
          </tr>

          <!-- ── Meta logo ── -->
          <tr>
            <td align="center" style="padding:0 24px 16px;">
              <img
                src="${META_LOGO_URL}"
                alt="Meta"
                width="67" height="22"
                style="display:block;margin:0 auto;border:0;outline:none;max-width:100%;height:auto;" />
            </td>
          </tr>

          <!-- ── Copyright line ── -->
          <tr>
            <td align="center" style="padding:0 24px 4px;
                       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                       font-size:11px;color:#8e8e8e;line-height:1.6;">
              © Instagram. Meta Platforms, Inc. ·
              <a href="https://www.google.com/maps/search/1601+Willow+Road+Menlo+Park+CA+94025"
                 style="color:#385898;text-decoration:none;">
                1601 Willow Road, Menlo Park, CA 94025
              </a>
            </td>
          </tr>

          <!-- ── "This message was sent to" ── -->
          <tr>
            <td align="center" style="padding:0 24px 32px;
                       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                       font-size:11px;color:#8e8e8e;line-height:1.6;">
              This message was sent to
              <a href="mailto:${to}" style="color:#385898;text-decoration:none;">${to}</a>
            </td>
          </tr>

        </table>
        <!-- /Content card -->

      </td>
    </tr>
  </table>

</body>
</html>`;

  const text = `Hi ${displayName},\n\nYour Instagram password was successfully changed.\n\nIf you didn't make this change or if you believe an unauthorized person has accessed your account, please contact support immediately at https://help.instagram.com/contact/\n\n© Instagram. Meta Platforms, Inc. · 1601 Willow Road, Menlo Park, CA 94025\nThis message was sent to ${to}`;

  const mailOptions = {
    from: `"Instagram" <${process.env.GMAIL_ID}>`,
    to,
    subject: 'Your Instagram password was changed',
    html,
    text,
  };

  console.log('📤 Sending password change confirmation email...');
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password change confirmation email sent');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    return info;
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    throw error;
  }
}

module.exports = { sendOtpEmail, sendPasswordChangedEmail };
