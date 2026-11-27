const express = require('express');
const router = express.Router();
const { checkHealth, switchEmailService, getActiveEmailService, getLinksState, switchLinks } = require('../controllers/health.controller');

// GET /api/health
router.get('/', checkHealth);

// GET /api/health/email-service
router.get('/email-service', getActiveEmailService);
// POST /api/health/email-service  { service: 'gmail'|'hostinger' }
router.post('/email-service', switchEmailService);

// GET /api/health/links
router.get('/links', getLinksState);
// POST /api/health/links  { enabled: true|false }
router.post('/links', switchLinks);

module.exports = router;
