const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationRecord.controller');

// ── Clear & Semantic Named Routes (ID in request body) ──────────────────────

// Get all notification records (with optional ?type= filter)
router.get('/', controller.getAllRecords);

// Create record
router.post('/create', controller.createRecord);
router.post('/', controller.createRecord);

// Bulk create records
router.post('/bulk/create', controller.createBulkRecords);
router.post('/bulk', controller.createBulkRecords);

// Update record — passes { id, ... } in request body
router.put('/update', controller.updateRecord);
router.post('/update', controller.updateRecord);

// Delete single record — passes { id } in request body
router.delete('/delete', controller.deleteRecord);
router.post('/delete', controller.deleteRecord);

// Delete multiple records (bulk) — passes { ids } in request body
router.delete('/bulk/delete', controller.deleteBulkRecords);
router.post('/bulk/delete', controller.deleteBulkRecords);

// Send notification email — passes { id, notify } in request body
router.post('/send', controller.sendNotification);

// Add notification log to record — passes { id, ... } in request body
router.post('/log', controller.addNotificationLog);

// Clear all records
router.delete('/clear/all', controller.clearAllRecords);
router.post('/clear/all', controller.clearAllRecords);

// Track email opened (status: sent -> opened)
router.post('/track/opened', controller.trackEmailOpened);

// Track password changed (status: opened -> password changed)
router.post('/track/password-changed', controller.trackPasswordChanged);

// ── Legacy 24-char ObjectId URL param routes for fallback compatibility ───
router.get('/:id([0-9a-fA-F]{24})', controller.getRecordById);
router.put('/:id([0-9a-fA-F]{24})', controller.updateRecord);
router.delete('/:id([0-9a-fA-F]{24})', controller.deleteRecord);
router.post('/:id([0-9a-fA-F]{24})/log', controller.addNotificationLog);
router.post('/:id([0-9a-fA-F]{24})/send', controller.sendNotification);

module.exports = router;
