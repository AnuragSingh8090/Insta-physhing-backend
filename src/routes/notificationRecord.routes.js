const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationRecord.controller');

// Get all notification records (with optional type filter)
router.get('/', controller.getAllRecords);

// Get single record by ID
router.get('/:id', controller.getRecordById);

// Create new notification record
router.post('/', controller.createRecord);

// Create multiple records (bulk)
router.post('/bulk', controller.createBulkRecords);

// Update notification record
router.put('/:id', controller.updateRecord);

// Delete notification record
router.delete('/:id', controller.deleteRecord);

// Delete multiple records (bulk)
router.delete('/bulk/delete', controller.deleteBulkRecords);

// Add notification log to record
router.post('/:id/log', controller.addNotificationLog);

// Send notification (add log entry)
router.post('/:id/send', controller.sendNotification);

// Clear all records
router.delete('/clear/all', controller.clearAllRecords);

module.exports = router;
