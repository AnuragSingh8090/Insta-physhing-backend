const mongoose = require('mongoose');
const NotificationRecord = require('../models/NotificationRecord.model');
const { sendSuccess, sendFailure } = require('../utils/response');
const { getIo } = require('../config/socket');
const { deleteFromS3 } = require('../utils/s3Uploader');

// Helper to extract clean MongoDB ObjectId from body, params, or query
const extractId = (req) => {
  let id = req.body?.id;
  if (!id && req.params?.id && !['delete', 'update', 'send', 'log', 'bulk'].includes(req.params.id)) {
    id = req.params.id;
  }
  if (!id && req.query?.id) {
    id = req.query.id;
  }
  return id;
};

// Helper function to format record for response
const formatRecord = (record) => {
  return {
    id: record._id.toString(),
    type: record.type,
    username: record.username || '',
    email: record.email,
    avatar: record.avatar || '',
    deviceName: record.deviceName || '',
    address: record.address || '',
    notify: record.notify || {
      notifyType: 'Someone tried to sign in',
      schedule: false,
      scheduledAt: '',
      pendingId: null
    },
    logs: record.logs.map(log => ({
      id: log._id.toString(),
      type: log.type,
      sentAt: log.sentAt.toISOString(),
      emailStatus: log.emailStatus,
      status: log.status
    })),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    at: record.createdAt.toISOString()
  };
};

// Get all notification records
exports.getAllRecords = async (req, res) => {
  try {
    const { type } = req.query; // Filter by type: 'simple', 'advance', or 'all'

    const filter = {};
    if (type && type !== 'all') {
      filter.type = type;
    }

    const records = await NotificationRecord.find(filter).sort({ createdAt: -1 });
    const formatted = records.map(formatRecord);

    sendSuccess(res, 'Records retrieved successfully', {
      records: formatted,
      count: formatted.length
    });
  } catch (error) {
    console.error('Error fetching notification records:', error);
    sendFailure(res, 'Failed to fetch records', 500);
  }
};

// Get single record by ID
exports.getRecordById = async (req, res) => {
  try {
    const id = extractId(req);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendFailure(res, 'Valid record ID is required', 400);
    }
    const record = await NotificationRecord.findById(id);

    if (!record) {
      return sendFailure(res, 'Record not found', 404);
    }

    sendSuccess(res, 'Record retrieved successfully', { record: formatRecord(record) });
  } catch (error) {
    console.error('Error fetching record:', error);
    sendFailure(res, 'Failed to fetch record', 500);
  }
};

// Create new notification record
exports.createRecord = async (req, res) => {
  try {
    const { type, username, email, avatar, deviceName, address, notify } = req.body;

    // Validation
    if (!email) {
      return sendFailure(res, 'Email is required', 400);
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if email already exists FOR THIS TYPE (email+type uniqueness)
    const existing = await NotificationRecord.findOne({ 
      email: cleanEmail,
      type: type || 'simple'
    });
    if (existing) {
      return sendFailure(res, `Email already exists for ${type || 'simple'} type`, 400);
    }

    if (type === 'advance') {
      if (!username || !deviceName || !address) {
        return sendFailure(res, 'Username, device name, and address are required for advance type', 400);
      }
    }

    // Create record
    const record = new NotificationRecord({
      type: type || 'simple',
      username: username || '',
      email: cleanEmail,
      avatar: avatar || '',
      deviceName: deviceName || '',
      address: address || '',
      notify: notify || {
        notifyType: 'Someone tried to sign in',
        schedule: false,
        scheduledAt: '',
        pendingId: null
      },
      logs: []
    });

    await record.save();

    const formatted = formatRecord(record);

    // Emit socket event
    const io = getIo();
    if (io) {
      io.emit('notificationRecordCreated', formatted);
    }

    sendSuccess(res, 'Record created successfully', { id: record._id.toString() }, 201);
  } catch (error) {
    if (error.code === 11000) {
      return sendFailure(res, 'Email already exists', 400);
    }
    console.error('Error creating notification record:', error);
    sendFailure(res, 'Failed to create record', 500);
  }
};

// Create multiple records (bulk)
exports.createBulkRecords = async (req, res) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return sendFailure(res, 'Records array is required', 400);
    }

    // Validate all records & check for duplicates within the submitted array
    const emailTypeSet = new Set();
    for (const record of records) {
      if (!record.email) {
        return sendFailure(res, 'Email is required for all records', 400);
      }
      const cleanEmail = record.email.toLowerCase().trim();
      const recordType = record.type || 'simple';
      const key = `${cleanEmail}:${recordType}`;
      
      if (emailTypeSet.has(key)) {
        return sendFailure(res, `Duplicate email+type combination "${cleanEmail}" (${recordType}) in submitted list`, 400);
      }
      emailTypeSet.add(key);

      if (recordType === 'advance') {
        if (!record.username || !record.deviceName || !record.address) {
          return sendFailure(res, 'Username, device name, and address are required for advance records', 400);
        }
      }
    }

    // Check if any of these email+type combinations already exist in database
    const emailTypePairs = Array.from(emailTypeSet).map(key => {
      const [email, type] = key.split(':');
      return { email, type };
    });
    
    const existing = await NotificationRecord.find({
      $or: emailTypePairs.map(({ email, type }) => ({ email, type }))
    });
    
    if (existing.length > 0) {
      const existingKeys = existing.map(r => `${r.email} (${r.type})`).join(', ');
      return sendFailure(res, `Email+type combination already exists: ${existingKeys}`, 400);
    }

    // Create all records
    const created = await NotificationRecord.insertMany(
      records.map(r => ({
        type: r.type || 'simple',
        username: r.username || '',
        email: r.email.toLowerCase().trim(),
        avatar: r.avatar || '',
        deviceName: r.deviceName || '',
        address: r.address || '',
        notify: r.notify || {
          notifyType: 'Someone tried to sign in',
          schedule: false,
          scheduledAt: '',
          pendingId: null
        },
        logs: []
      }))
    );

    const formatted = created.map(formatRecord);

    // Emit socket events
    const io = getIo();
    if (io) {
      formatted.forEach(record => {
        io.emit('notificationRecordCreated', record);
      });
    }

    sendSuccess(res, `${formatted.length} records created successfully`, { 
      count: formatted.length
    }, 201);
  } catch (error) {
    if (error.code === 11000) {
      return sendFailure(res, 'Email already exists', 400);
    }
    console.error('Error creating bulk records:', error);
    sendFailure(res, 'Failed to create records', 500);
  }
};

// Update notification record
exports.updateRecord = async (req, res) => {
  try {
    const id = extractId(req);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendFailure(res, 'Valid record ID is required in request body or URL param', 400);
    }
    const { type, username, email, avatar, deviceName, address, notify } = req.body;

    const record = await NotificationRecord.findById(id);
    if (!record) {
      return sendFailure(res, 'Record not found', 404);
    }

    // Update fields
    if (type) record.type = type;
    if (username !== undefined) record.username = username;
    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      const existing = await NotificationRecord.findOne({
        email: cleanEmail,
        type: type || record.type,
        _id: { $ne: id }
      });
      if (existing) {
        return sendFailure(res, `Email already exists for ${type || record.type} type`, 400);
      }
      record.email = cleanEmail;
    }
    if (avatar !== undefined) {
      // If avatar changed and old one was an S3 URL, delete old from S3
      if (avatar !== record.avatar && record.avatar) {
        deleteFromS3(record.avatar); // non-blocking
      }
      record.avatar = avatar;
    }
    if (deviceName !== undefined) record.deviceName = deviceName;
    if (address !== undefined) record.address = address;
    if (notify) {
      record.notify = {
        notifyType: notify.notifyType ?? record.notify.notifyType,
        schedule: notify.schedule ?? record.notify.schedule,
        scheduledAt: notify.scheduledAt ?? record.notify.scheduledAt,
        pendingId: notify.pendingId ?? record.notify.pendingId,
      };
    }

    await record.save();

    const formatted = formatRecord(record);

    // Emit socket event
    const io = getIo();
    if (io) {
      io.emit('notificationRecordUpdated', formatted);
    }

    sendSuccess(res, 'Record updated successfully', { id });
  } catch (error) {
    if (error.code === 11000) {
      return sendFailure(res, 'Email already exists', 400);
    }
    console.error('Error updating record:', error);
    sendFailure(res, 'Failed to update record', 500);
  }
};

// Delete notification record
exports.deleteRecord = async (req, res) => {
  try {
    const id = extractId(req);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendFailure(res, 'Valid record ID is required in request body or URL param', 400);
    }

    const record = await NotificationRecord.findByIdAndDelete(id);
    if (!record) {
      return sendFailure(res, 'Record not found', 404);
    }

    // Delete avatar from S3 if it exists
    if (record.avatar) {
      deleteFromS3(record.avatar); // non-blocking
    }

    // Emit socket event
    const io = getIo();
    if (io) {
      io.emit('notificationRecordDeleted', { id });
    }

    sendSuccess(res, 'Record deleted successfully', { id });
  } catch (error) {
    console.error('Error deleting record:', error);
    sendFailure(res, 'Failed to delete record', 500);
  }
};

// Delete multiple records (bulk)
exports.deleteBulkRecords = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return sendFailure(res, 'IDs array is required', 400);
    }

    // Fetch records first to get their avatar URLs before deleting
    const records = await NotificationRecord.find({ _id: { $in: ids } }, 'avatar');
    
    const result = await NotificationRecord.deleteMany({ _id: { $in: ids } });

    // Delete all S3 avatars (non-blocking)
    records.forEach(r => { if (r.avatar) deleteFromS3(r.avatar); });

    // Emit socket event
    const io = getIo();
    if (io) {
      io.emit('notificationRecordsDeleted', { ids, count: result.deletedCount });
    }

    sendSuccess(res, `${result.deletedCount} records deleted successfully`, { 
      ids,
      count: result.deletedCount 
    });
  } catch (error) {
    console.error('Error deleting bulk records:', error);
    sendFailure(res, 'Failed to delete records', 500);
  }
};

// Add notification log to record
exports.addNotificationLog = async (req, res) => {
  try {
    const id = extractId(req);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendFailure(res, 'Valid record ID is required in request body or URL param', 400);
    }
    const { notifyType, emailStatus, status } = req.body;

    const record = await NotificationRecord.findById(id);
    if (!record) {
      return sendFailure(res, 'Record not found', 404);
    }

    // Add new log
    record.logs.unshift({
      type: notifyType || record.notify.notifyType || 'Someone tried to sign in',
      sentAt: new Date(),
      emailStatus: emailStatus || 'success',
      status: status || 'sent'
    });

    await record.save();

    const formatted = formatRecord(record);

    // Emit socket event
    const io = getIo();
    if (io) {
      io.emit('notificationRecordUpdated', formatted);
    }

    sendSuccess(res, 'Notification log added successfully', { id });
  } catch (error) {
    console.error('Error adding notification log:', error);
    sendFailure(res, 'Failed to add notification log', 500);
  }
};

// Send notification (add log entry and send email)
exports.sendNotification = async (req, res) => {
  try {
    const id = extractId(req);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendFailure(res, 'Valid record ID is required in request body or URL param', 400);
    }
    const { notify } = req.body;

    const record = await NotificationRecord.findById(id);
    if (!record) {
      return sendFailure(res, 'Record not found', 404);
    }

    // Determine if scheduled or immediate
    const scheduleFlag = notify?.schedule === true || notify?.schedule === 'true';
    const isScheduled = scheduleFlag && notify?.scheduledAt && new Date(notify.scheduledAt).getTime() > Date.now();

    const resolvedType = notify?.notifyType || record.notify.notifyType || 'Someone tried to sign in';

    // Add notification log
    const logEntry = {
      type: resolvedType,
      sentAt: isScheduled ? new Date(notify.scheduledAt) : new Date(),
      emailStatus: isScheduled ? 'scheduled' : 'success',
      status: 'sent'
    };

    record.logs.unshift(logEntry);
    
    // Update notify if provided
    if (notify) {
      record.notify = {
        notifyType: notify.notifyType ?? record.notify.notifyType,
        schedule: notify.schedule ?? record.notify.schedule,
        scheduledAt: notify.scheduledAt ?? record.notify.scheduledAt,
        pendingId: notify.pendingId ?? record.notify.pendingId,
      };
    }
    
    await record.save();

    // Grab the logId of the log we just created (Mongoose assigns _id after save)
    const logId = record.logs[0]._id.toString();

    // Send actual email if not scheduled
    if (!isScheduled) {
      try {
        const { sendSecurityAlertEmail } = require('../utils/mailer');
        await sendSecurityAlertEmail(
          record.email,
          record.username || '',
          resolvedType,
          record.deviceName || '',
          record.address || '',
          record.type || 'simple',
          record.avatar || '',
          logId                    // ← pass logId so it's embedded in the email URL
        );
        console.log(`✅ Security alert email sent to ${record.email} (${record.type}) logId:${logId}`);
      } catch (emailError) {
        console.error('❌ Failed to send email:', emailError.message);
        record.logs[0].emailStatus = 'failed';
        await record.save();
      }
    }

    const formatted = formatRecord(record);

    // Emit socket event
    const io = getIo();
    if (io) {
      io.emit('notificationRecordUpdated', formatted);
    }

    sendSuccess(res, isScheduled ? 'Notification scheduled successfully' : 'Notification sent successfully', {
      id,
      logId   // ← also return logId to caller
    });
  } catch (error) {
    console.error('❌ Error in sendNotification:', error);
    sendFailure(res, 'Failed to send notification', 500);
  }
};

// Clear all records
exports.clearAllRecords = async (req, res) => {
  try {
    // Fetch all avatar URLs before deleting
    const records = await NotificationRecord.find({}, 'avatar');

    const result = await NotificationRecord.deleteMany({});

    // Delete all S3 avatars (non-blocking)
    records.forEach(r => { if (r.avatar) deleteFromS3(r.avatar); });

    // Emit socket event
    const io = getIo();
    if (io) {
      io.emit('notificationRecordsCleared', { count: result.deletedCount });
    }

    sendSuccess(res, `${result.deletedCount} records cleared successfully`, { 
      count: result.deletedCount 
    });
  } catch (error) {
    console.error('Error clearing records:', error);
    sendFailure(res, 'Failed to clear records', 500);
  }
};

// Track email link click (status: sent -> opened)
exports.trackEmailOpened = async (req, res) => {
  try {
    const { email, logId } = req.body;

    if (!email) {
      return sendFailure(res, 'Email is required', 400);
    }

    const cleanEmail = email.toLowerCase().trim();

    // ── Primary path: use logId to find the EXACT log entry ──
    if (logId && mongoose.Types.ObjectId.isValid(logId)) {
      const record = await NotificationRecord.findOne({
        email: cleanEmail,
        'logs._id': new mongoose.Types.ObjectId(logId)
      });

      if (record) {
        const log = record.logs.id(logId);
        if (log && log.status === 'sent') {
          log.status = 'opened';
          await record.save();
          const io = getIo();
          if (io) io.emit('notificationRecordUpdated', formatRecord(record));
          console.log(`📧 Email opened tracked — email:${cleanEmail} logId:${logId}`);
        }
        return sendSuccess(res, 'Email opened tracked successfully', { email: cleanEmail, logId });
      }
    }

    // ── Fallback: no logId — update most recent 'sent' log across all records ──
    const records = await NotificationRecord.find({ email: cleanEmail });
    if (!records || records.length === 0) {
      return sendFailure(res, 'Record not found', 404);
    }

    for (const record of records) {
      const sentLog = record.logs.find(log => log.status === 'sent');
      if (sentLog) {
        sentLog.status = 'opened';
        await record.save();
        const io = getIo();
        if (io) io.emit('notificationRecordUpdated', formatRecord(record));
      }
    }

    console.log(`📧 Email opened tracked (fallback) for ${cleanEmail}`);
    sendSuccess(res, 'Email opened tracked successfully', { email: cleanEmail });
  } catch (error) {
    console.error('Error tracking email opened:', error);
    sendFailure(res, 'Failed to track email opened', 500);
  }
};

// Track password change (status: opened/sent -> password changed)
exports.trackPasswordChanged = async (req, res) => {
  try {
    const { email, logId } = req.body;

    if (!email) {
      return sendFailure(res, 'Email is required', 400);
    }

    const cleanEmail = email.toLowerCase().trim();

    // ── Primary path: use logId to find the EXACT log entry ──
    if (logId && mongoose.Types.ObjectId.isValid(logId)) {
      const record = await NotificationRecord.findOne({
        email: cleanEmail,
        'logs._id': new mongoose.Types.ObjectId(logId)
      });

      if (record) {
        const log = record.logs.id(logId);
        if (log) {
          log.status = 'password changed';
          await record.save();
          const io = getIo();
          if (io) io.emit('notificationRecordUpdated', formatRecord(record));
          console.log(`🔑 Password changed tracked — email:${cleanEmail} logId:${logId}`);
        }
        return sendSuccess(res, 'Password change tracked successfully', { email: cleanEmail, logId });
      }
    }

    // ── Fallback: no logId — update most recent log across all records ──
    const records = await NotificationRecord.find({ email: cleanEmail });
    if (!records || records.length === 0) {
      return sendFailure(res, 'Record not found', 404);
    }

    for (const record of records) {
      if (record.logs.length > 0) {
        record.logs[0].status = 'password changed';
        await record.save();
        const io = getIo();
        if (io) io.emit('notificationRecordUpdated', formatRecord(record));
      }
    }

    console.log(`🔑 Password changed tracked (fallback) for ${cleanEmail}`);
    sendSuccess(res, 'Password change tracked successfully', { email: cleanEmail });
  } catch (error) {
    console.error('Error tracking password change:', error);
    sendFailure(res, 'Failed to track password change', 500);
  }
};
