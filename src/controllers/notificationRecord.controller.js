const NotificationRecord = require('../models/NotificationRecord.model');
const { sendSuccess, sendFailure } = require('../utils/response');
const { getIo } = require('../config/socket');

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
    const { id } = req.params;
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

    if (type === 'advance') {
      if (!username || !deviceName || !address) {
        return sendFailure(res, 'Username, device name, and address are required for advance type', 400);
      }
    }

    // Create record
    const record = new NotificationRecord({
      type: type || 'simple',
      username: username || '',
      email,
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

    sendSuccess(res, 'Record created successfully', { record: formatted }, 201);
  } catch (error) {
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

    // Validate all records
    for (const record of records) {
      if (!record.email) {
        return sendFailure(res, 'Email is required for all records', 400);
      }
      if (record.type === 'advance') {
        if (!record.username || !record.deviceName || !record.address) {
          return sendFailure(res, 'Username, device name, and address are required for advance records', 400);
        }
      }
    }

    // Create all records
    const created = await NotificationRecord.insertMany(
      records.map(r => ({
        type: r.type || 'simple',
        username: r.username || '',
        email: r.email,
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
      records: formatted,
      count: formatted.length
    }, 201);
  } catch (error) {
    console.error('Error creating bulk records:', error);
    sendFailure(res, 'Failed to create records', 500);
  }
};

// Update notification record
exports.updateRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, username, email, avatar, deviceName, address, notify } = req.body;

    const record = await NotificationRecord.findById(id);
    if (!record) {
      return sendFailure(res, 'Record not found', 404);
    }

    // Update fields
    if (type) record.type = type;
    if (username !== undefined) record.username = username;
    if (email) record.email = email;
    if (avatar !== undefined) record.avatar = avatar;
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

    sendSuccess(res, 'Record updated successfully', { record: formatted });
  } catch (error) {
    console.error('Error updating record:', error);
    sendFailure(res, 'Failed to update record', 500);
  }
};

// Delete notification record
exports.deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await NotificationRecord.findByIdAndDelete(id);
    if (!record) {
      return sendFailure(res, 'Record not found', 404);
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

    const result = await NotificationRecord.deleteMany({ _id: { $in: ids } });

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
    const { id } = req.params;
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

    sendSuccess(res, 'Notification log added successfully', { record: formatted });
  } catch (error) {
    console.error('Error adding notification log:', error);
    sendFailure(res, 'Failed to add notification log', 500);
  }
};

// Send notification (add log entry and send email)
exports.sendNotification = async (req, res) => {
  try {
    const { id } = req.params;
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

    // Send actual email if not scheduled
    if (!isScheduled) {
      try {
        const { sendSecurityAlertEmail } = require('../utils/mailer');
        await sendSecurityAlertEmail(
          record.email,
          record.username || '',
          resolvedType,
          record.deviceName || '',
          record.address || ''
        );
        console.log(`✅ Security alert email sent to ${record.email}`);
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
      record: formatted 
    });
  } catch (error) {
    console.error('❌ Error in sendNotification:', error);
    sendFailure(res, 'Failed to send notification', 500);
  }
};

// Clear all records
exports.clearAllRecords = async (req, res) => {
  try {
    const result = await NotificationRecord.deleteMany({});

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
