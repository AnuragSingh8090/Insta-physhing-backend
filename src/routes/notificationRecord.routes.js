const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationRecord.controller');

// ── Specific named routes FIRST (before /:id) ──────────────────────────────

// Get all notification records (with optional type filter)
router.get('/', controller.getAllRecords);

// Create new notification record
router.post('/', controller.createRecord);

// Create multiple records (bulk)
router.post('/bulk', controller.createBulkRecords);

// Delete multiple records (bulk)
router.delete('/bulk/delete', controller.deleteBulkRecords);

// Clear all records
router.delete('/clear/all', controller.clearAllRecords);

// ── Dynamic :id routes AFTER named routes ──────────────────────────────────

// Get single record by ID
router.get('/:id', controller.getRecordById);

// Update notification record
router.put('/:id', controller.updateRecord);

// Delete notification record
router.delete('/:id', controller.deleteRecord);

// Add notification log to record
router.post('/:id/log', controller.addNotificationLog);

// Send notification (add log entry and send email)
router.post('/:id/send', controller.sendNotification);

module.exports = router;
