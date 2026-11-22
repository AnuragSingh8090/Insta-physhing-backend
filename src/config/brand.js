/**
 * Brand constants — all non-secret brand/SMTP config lives here.
 * To change branding, edit this file only.
 *
 * EMAIL_SERVICE in .env controls which SMTP provider is used:
 *   EMAIL_SERVICE=gmail      → Gmail SMTP (port 587, STARTTLS)
 *   EMAIL_SERVICE=hostinger  → Hostinger SMTP (port 465, SSL)
 */

const isGmail = (process.env.EMAIL_SERVICE || 'hostinger').toLowerCase() === 'gmail';

const BRAND = {
  NAME:        'Instagram',
  COMPANY:     'Meta Platforms, Inc.',
  ADDRESS:     '1601 Willow Road, Menlo Park, CA 94025',
  SUPPORT_URL: 'https://help.instagram.com/contact/',
  FROM_NAME:   'Instagram',

  // Active email credentials — resolved from EMAIL_SERVICE
  get EMAIL()    { return isGmail ? process.env.GOOGLE_EMAIL    : process.env.HOSTINGER_EMAIL; },
  get PASSWORD() { return isGmail ? process.env.GOOGLE_PASSWORD : process.env.HOSTINGER_PASSWORD; },
  get REPLY_TO() { return isGmail ? process.env.GOOGLE_EMAIL    : process.env.HOSTINGER_EMAIL; },

  // SMTP settings — resolved from EMAIL_SERVICE
  SMTP_HOST:   isGmail ? 'smtp.gmail.com'    : 'smtp.hostinger.com',
  SMTP_PORT:   isGmail ? 587                 : 465,
  SMTP_SECURE: isGmail ? false               : true,   // Gmail=STARTTLS, Hostinger=SSL

  // Frontend URL — resolved at runtime based on NODE_ENV
  get FRONTEND_URL() {
    return process.env.NODE_ENV === 'production'
      ? process.env.PRODUCTION_FRONTEND_URL
      : process.env.LOCAL_FRONTEND_URL;
  },

  // Links flag — if true, change password URLs are embedded in emails
  get LINKS_ENABLED() {
    return (process.env.LINKS || 'false').toLowerCase() === 'true';
  },
};

module.exports = BRAND;
