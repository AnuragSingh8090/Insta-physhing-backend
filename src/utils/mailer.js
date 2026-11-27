const nodemailer = require('nodemailer');
const jwt        = require('jsonwebtoken');
const { BRAND }  = require('../config/brand');

/** Singleton transporters keyed by service: { gmail: ..., hostinger: ... } */
const _transporters = {};

function resetTransporter(service) {
  if (service) delete _transporters[service];
  else { delete _transporters['gmail']; delete _transporters['hostinger']; }
}

// ══════════════════════════════════════════════════════════════════════════════
// CENTRALIZED EMAIL CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════
const EMAIL_CONFIG = {
  getFromName()            { return BRAND.FROM_NAME; },
  getFromEmail(service)    { return BRAND.getEmail(service); },
  getReplyTo(service)      { return BRAND.getReplyTo(service); },
  get BRAND_NAME()         { return BRAND.NAME; },
  get COMPANY()            { return BRAND.COMPANY; },
  get ADDRESS()            { return BRAND.ADDRESS; },
  get SUPPORT_URL()        { return BRAND.SUPPORT_URL; },

  getCommonHeaders(service) {
    return {
      'X-Priority':               '1',
      'X-MSMail-Priority':        'High',
      'Importance':               'high',
      'Priority':                 'urgent',
      'Auto-Submitted':           'auto-generated',
      'X-Mailer':                 `${BRAND.NAME} Notification Service`,
      'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN, AutoReply',
    };
  }
};

// S3 hosted logo URLs
const INSTA_LOGO_URL = 'https://instagram-support.s3.ap-south-1.amazonaws.com/insta-email-logo-colored.png';
const META_LOGO_URL  = 'https://instagram-support.s3.ap-south-1.amazonaws.com/meta-email-logo.png';

/**
 * Get configured SMTP transporter for a given service
 */
function getTransporter(service = 'gmail') {
  if (_transporters[service]) return _transporters[service];

  _transporters[service] = nodemailer.createTransport({
    host:   BRAND.getSmtpHost(service),
    port:   BRAND.getSmtpPort(service),
    secure: BRAND.getSmtpSecure(service),
    auth: {
      user: BRAND.getEmail(service),
      pass: BRAND.getPassword(service),
    },
    connectionTimeout: 10000,
    greetingTimeout:   10000,
    socketTimeout:     15000,
    tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' }
  });

  return _transporters[service];
}

/**
 * Create standardized mail options with anti-spam headers
 */
function createMailOptions(to, subject, html, text, uniqueId = 'MSG', service = 'gmail') {
  const encodedName = `=?UTF-8?B?${Buffer.from(EMAIL_CONFIG.getFromName()).toString('base64')}?=`;
  const msgId = `${uniqueId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  return {
    from:    `${encodedName} <${EMAIL_CONFIG.getFromEmail(service)}>`,
    replyTo: EMAIL_CONFIG.getReplyTo(service),
    to,
    subject,
    html,
    text,
    headers: {
      ...EMAIL_CONFIG.getCommonHeaders(service),
      'X-Entity-Ref-ID': msgId,
      'Message-ID':      `<${msgId}@${EMAIL_CONFIG.BRAND_NAME.toLowerCase()}.com>`,
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED FOOTER BLOCKS
// ─────────────────────────────────────────────────────────────────────────────
function htmlFooter(to) {
  const B = EMAIL_CONFIG;
  return `
          <!-- ── Meta logo ── -->
          <tr>
            <td align="center" style="padding:20px 24px 16px;">
              <img src="${META_LOGO_URL}" alt="Meta" width="67" height="22"
                style="display:block;margin:0 auto;border:0;outline:none;max-width:100%;height:auto;" />
            </td>
          </tr>
          <!-- ── Copyright ── -->
          <tr>
            <td align="center" style="padding:0 24px 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#8e8e8e;line-height:1.6;">
              © ${B.BRAND_NAME}. ${B.COMPANY} ·
              <a href="https://www.google.com/maps/search/${encodeURIComponent(B.ADDRESS)}" style="color:#385898;text-decoration:none;">${B.ADDRESS}</a>
            </td>
          </tr>
          <!-- ── Sent to ── -->
          <tr>
            <td align="center" style="padding:0 24px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#8e8e8e;line-height:1.6;">
              This message was sent to <a href="mailto:${to}" style="color:#385898;text-decoration:none;">${to}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function htmlWrapper(title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#ffffff;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;min-width:100%;">
    <tr><td align="center" style="padding:0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:468px;">
        <tr><td style="height:32px;">&nbsp;</td></tr>
        <!-- ── Logo ── -->
        <tr>
          <td align="center" style="padding:0 24px 28px;">
            <img src="${INSTA_LOGO_URL}" alt="Instagram" width="197" height="40"
              style="display:block;border:0;outline:none;max-width:100%;height:auto;" />
          </td>
        </tr>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL 1 — OTP / Forgot password
// ─────────────────────────────────────────────────────────────────────────────
async function sendOtpEmail(to, otp, service = 'gmail') {
  const transporter = getTransporter(service);
  const B = EMAIL_CONFIG;

  console.log('📧 Preparing OTP email for:', to);

  const subject = `${otp} is your ${B.BRAND_NAME} code`;

  const html = htmlWrapper(subject) + `
        <!-- ── Hi ── -->
        <tr>
          <td style="padding:0 24px 6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:500;color:#565a5c;line-height:1.6;">
            Hi,
          </td>
        </tr>
        <!-- ── Body ── -->
        <tr>
          <td style="padding:0 24px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:500;color:#565a5c;line-height:1.7;">
            We received a request to reset the password for your ${B.BRAND_NAME} account
            <a href="mailto:${to}" style="color:#385898;text-decoration:none;font-weight:500;">${to}</a>.
            Enter the confirmation code below:
          </td>
        </tr>
        <!-- ── OTP code ── -->
        <tr>
          <td align="center" style="padding:8px 24px 32px;">
            <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:32px;font-weight:400;letter-spacing:8px;color:#555555;">
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
        </tr>` + htmlFooter(to);

  const text = `Hi,\n\nWe received a request to reset the password for your ${B.BRAND_NAME} account ${to}. Enter the confirmation code below:\n\n${otp}\n\n© ${B.BRAND_NAME}. ${B.COMPANY} · ${B.ADDRESS}\nThis message was sent to ${to}`;

  const mailOptions = createMailOptions(to, subject, html, text, 'OTP', service);

  console.log('📤 Sending OTP email...');
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent — MessageID:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL 2 — Password changed confirmation
// ─────────────────────────────────────────────────────────────────────────────
async function sendPasswordChangedEmail(to, username = '', service = 'gmail') {
  const transporter = getTransporter(service);
  const B = EMAIL_CONFIG;
  const displayName = username || to;

  console.log('📧 Preparing password changed email for:', to);

  const subject = `Your ${B.BRAND_NAME} password was changed`;

  const html = htmlWrapper(subject) + `
        <tr>
          <td style="padding:0 24px 6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:500;color:#565a5c;line-height:1.6;">
            Hi ${displayName},
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:500;color:#565a5c;line-height:1.7;">
            Your ${B.BRAND_NAME} password was successfully changed.
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:500;color:#565a5c;line-height:1.7;">
            If you didn't make this change, please <a href="${B.SUPPORT_URL}" style="color:#385898;text-decoration:none;font-weight:500;">contact support</a> immediately.
          </td>
        </tr>
        <!-- ── Divider ── -->
        <tr>
          <td style="padding:0 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="border-top:1px solid #efefef;font-size:0;line-height:0;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>` + htmlFooter(to);

  const text = `Hi ${displayName},\n\nYour ${B.BRAND_NAME} password was successfully changed.\n\nIf you didn't make this change, please contact support immediately at ${B.SUPPORT_URL}\n\n© ${B.BRAND_NAME}. ${B.COMPANY} · ${B.ADDRESS}\nThis message was sent to ${to}`;

  const mailOptions = createMailOptions(to, subject, html, text, 'PWD', service);

  console.log('📤 Sending password changed email...');
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password changed email sent — MessageID:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL 3-6 — Security alert (simple + advance, both notification types)
// ─────────────────────────────────────────────────────────────────────────────
async function sendSecurityAlertEmail(to, username = '', notificationType = 'Someone tried to sign in', deviceName = '', location = '', type = 'simple', avatar = '', logId = '', emailService = 'gmail', linksEnabled = false) {
  const transporter = getTransporter(emailService);
  const B = EMAIL_CONFIG;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const deviceInfo   = deviceName || 'Unknown Device';
  const locationInfo = location   || 'Unknown Location';

  const isNewLogin  = notificationType === 'New login detected';
  const isAdvance   = type === 'advance' && !!avatar;
  const greeting    = username ? `Hi ${username},` : 'Hi,';
  const emailLink   = `<a href="mailto:${to}" style="color:#385898;text-decoration:none;font-weight:500;">${to}</a>`;
  const displayName = username || to.split('@')[0];

  // Build change password URL only when linksEnabled=true (passed from frontend toggle)
  let changePasswordUrl = null;
  if (linksEnabled) {
    const token = jwt.sign(
      { email: to, username: username || '', logId: logId || '', source: 'email' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    changePasswordUrl = `${BRAND.FRONTEND_URL}/changepassword?token=${encodeURIComponent(token)}`;
  }

  const subject = isNewLogin
    ? `Security Alert - New login to your ${B.BRAND_NAME} Account`
    : 'Security Alert - Unusual Login Attempt';

  const bodyLine = isNewLogin
    ? `We've noticed a new login to your ${B.BRAND_NAME} account ${emailLink} from a device that you don't usually use.`
    : `We've noticed a login attempt to your ${B.BRAND_NAME} account ${emailLink} from a device that you don't usually use.`;

  console.log(`📧 Preparing security email — type:${type} | notification:${notificationType}`);

  // ── Avatar block for advance type ──
  const avatarBlock = isAdvance ? `
        <!-- ── Profile picture ── -->
        <tr>
          <td align="center" style="padding:0 24px 16px;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="display:inline-table;">
              <tr>
                <td style="border-radius:50%;overflow:hidden;width:68px;height:68px;padding:0;background:linear-gradient(45deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%);">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-radius:50%;overflow:hidden;width:68px;height:68px;">
                    <tr>
                      <td align="center" valign="middle" style="padding:1px;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-radius:50%;overflow:hidden;background:#ffffff;">
                          <tr>
                            <td style="padding:1px;border-radius:50%;overflow:hidden;">
                              <img src="${avatar}" alt="${displayName}" width="64" height="64"
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
          </td>
        </tr>
        <!-- ── Username ── -->
        <tr>
          <td align="center" style="padding:0 24px 8px;font-family:'Helvetica Neue',Helvetica,Roboto,Arial,sans-serif;font-size:18px;font-weight:500;color:#262626;line-height:1.4;text-align:center;">
            ${displayName}
          </td>
        </tr>` : '';

  const html = htmlWrapper(subject) + avatarBlock + `
        <!-- ── Greeting ── -->
        <tr>
          <td style="padding:0 24px 6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:500;color:#565a5c;line-height:1.6;">
            ${greeting}
          </td>
        </tr>
        <!-- ── Body ── -->
        <tr>
          <td style="padding:0 24px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:500;color:#565a5c;line-height:1.7;">
            ${bodyLine}
          </td>
        </tr>
        <!-- ── Details ── -->
        <tr>
          <td style="padding:0 24px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#737373;line-height:1.6;">
            • Device: ${deviceInfo}<br/>
            • Location: ${locationInfo}<br/>
            • Time: ${dateStr} at ${timeStr}
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:500;color:#565a5c;line-height:1.7;">
            If this wasn't you, please secure your account right away.
          </td>
        </tr>
        <!-- ── Button ── -->
        <tr>
          <td align="center" style="padding:0 24px 32px;">
            <a href="${changePasswordUrl || '#'}" style="display:inline-block;background-color:#0095f6;border-radius:8px;padding:12px 32px;text-decoration:none;">
              <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;display:inline-block;">
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
        </tr>` + htmlFooter(to);

  const text = `${greeting}\n\n${isNewLogin
    ? `We've noticed a new login to your ${B.BRAND_NAME} account ${to} from a device that you don't usually use.`
    : `We've noticed a login attempt to your ${B.BRAND_NAME} account ${to} from a device that you don't usually use.`}\n\n• Device: ${deviceInfo}\n• Location: ${locationInfo}\n• Time: ${dateStr} at ${timeStr}\n\nIf this wasn't you, please secure your account right away.${changePasswordUrl ? `\n\nSecure My Account: ${changePasswordUrl}` : ''}\n\n© ${B.BRAND_NAME}. ${B.COMPANY} · ${B.ADDRESS}\nThis message was sent to ${to}`;

  const mailOptions = createMailOptions(to, subject, html, text, 'SEC', emailService);

  console.log('📤 Sending security notification email...');
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Security email sent — MessageID:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    throw error;
  }
}

module.exports = { sendOtpEmail, sendPasswordChangedEmail, sendSecurityAlertEmail, resetTransporter };
