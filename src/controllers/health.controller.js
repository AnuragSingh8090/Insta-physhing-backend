const { sendSuccess, sendFailure } = require('../utils/response');
const { setEmailService, getEmailService, setLinksEnabled, getLinksEnabled } = require('../config/brand');

/**
 * GET /api/health
 */
const checkHealth = (req, res) => {
  sendSuccess(res, 'API is up and running', {
    environment:  process.env.NODE_ENV || 'development',
    timestamp:    new Date().toISOString(),
    uptime:       `${Math.floor(process.uptime())}s`,
    emailService: getEmailService(),
    linksEnabled: getLinksEnabled(),
  });
};

/**
 * POST /api/health/email-service
 * Body: { service: 'gmail' | 'hostinger' }
 * Switches the active email provider at runtime — no restart needed.
 */
const switchEmailService = (req, res) => {
  const { service } = req.body;
  if (!service) return sendFailure(res, 'service is required (gmail | hostinger)', 400);
  const ok = setEmailService(service);
  if (!ok) return sendFailure(res, 'Invalid service. Use "gmail" or "hostinger"', 400);
  sendSuccess(res, `Email service switched to ${getEmailService()}`, { emailService: getEmailService() });
};

/**
 * GET /api/health/email-service
 * Returns the currently active email service.
 */
const getActiveEmailService = (req, res) => {
  sendSuccess(res, 'Current email service', { emailService: getEmailService() });
};

/**
 * GET /api/health/links
 */
const getLinksState = (req, res) => {
  sendSuccess(res, 'Current links state', { linksEnabled: getLinksEnabled() });
};

/**
 * POST /api/health/links
 * Body: { enabled: true | false }
 */
const switchLinks = (req, res) => {
  const { enabled } = req.body;
  if (enabled === undefined) return sendFailure(res, 'enabled (true|false) is required', 400);
  setLinksEnabled(enabled);
  sendSuccess(res, `Email links ${getLinksEnabled() ? 'enabled' : 'disabled'}`, { linksEnabled: getLinksEnabled() });
};

module.exports = { checkHealth, switchEmailService, getActiveEmailService, getLinksState, switchLinks };
