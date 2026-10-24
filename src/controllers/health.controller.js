const { sendSuccess } = require('../utils/response');

/**
 * @desc    Check API health / connectivity
 * @route   GET /api/health
 * @access  Public
 */
const checkHealth = (req, res) => {
  sendSuccess(res, 'API is up and running', {
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
  });
};

module.exports = { checkHealth };
