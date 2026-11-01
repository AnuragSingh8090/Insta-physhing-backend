const express = require('express');
const router = express.Router();

const healthRoutes    = require('./health.routes');
const instagramRoutes = require('./instagram.routes');
const logsRoutes      = require('./logs.routes');
const notificationRecordRoutes = require('./notificationRecord.routes');

// Mount route modules
router.use('/health',    healthRoutes);
router.use('/instagram', instagramRoutes);
router.use('/logs',      logsRoutes);
router.use('/notification-records', notificationRecordRoutes);

module.exports = router;
