const cron = require('node-cron');
const NotificationRecord = require('../models/NotificationRecord.model');
const { sendSecurityAlertEmail } = require('./mailer');
const { getIo } = require('../config/socket');

/**
 * Start the scheduled email sender cron job.
 * Checks every minute for due scheduled emails and sends them.
 */
function startScheduledEmailSender() {
  // Run every minute: '* * * * *' means:
  // minute hour day month weekday
  // *      *    *   *     *        = every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      console.log(`🔍 [${now.toISOString()}] Checking for scheduled emails...`);
      
      // Find records with scheduled emails that are due
      // Criteria:
      // 1. schedule is true
      // 2. pendingId exists (indicates a pending scheduled send)
      // 3. scheduledAt time has passed
      const dueRecords = await NotificationRecord.find({
        'notify.schedule': true,
        'notify.pendingId': { $exists: true, $ne: null },
        'notify.scheduledAt': { $lte: now }
      });
      
      if (dueRecords.length === 0) {
        console.log('   No scheduled emails due at this time.');
        return;
      }
      
      console.log(`📬 Found ${dueRecords.length} scheduled email(s) to send`);
      
      // Send each due email
      for (const record of dueRecords) {
        try {
          const notifyType = record.notify.notifyType || 'Someone tried to sign in';
          
          console.log(`   ✉️  Sending to ${record.email} (${notifyType})...`);
          
          // Find the log entry for this scheduled email to get its _id (for tracking)
          const scheduledTime = new Date(record.notify.scheduledAt);
          const logIndex = record.logs.findIndex(log => {
            const logTime = new Date(log.sentAt);
            return Math.abs(logTime.getTime() - scheduledTime.getTime()) < 1000; // Within 1 second
          });

          const scheduledLogId = logIndex !== -1 ? record.logs[logIndex]._id.toString() : '';

          // Send the actual email with logId embedded in the change password URL
          await sendSecurityAlertEmail(
            record.email,
            record.username || '',
            notifyType,
            record.deviceName || '',
            record.address || '',
            record.type || 'simple',
            record.avatar || '',
            scheduledLogId
          );
          
          console.log(`   ✅ Successfully sent scheduled email to ${record.email} logId:${scheduledLogId}`);
          
          // Update the log status to success
          if (logIndex !== -1) {
            record.logs[logIndex].emailStatus = 'success';
            record.logs[logIndex].status = 'sent';
            console.log(`   📝 Updated log entry status to success`);
          }
          
          // Clear the schedule (mark as completed)
          record.notify.schedule = false;
          record.notify.scheduledAt = '';
          record.notify.pendingId = null;
          
          await record.save();
          
          // Broadcast update via WebSocket
          const io = getIo();
          if (io) {
            io.emit('notificationRecordUpdated', formatRecord(record));
          }
          
        } catch (emailError) {
          console.error(`   ❌ Failed to send scheduled email to ${record.email}:`, emailError.message);
          
          // Find and mark the log as failed
          const scheduledTime = new Date(record.notify.scheduledAt);
          const logIndex = record.logs.findIndex(log => {
            const logTime = new Date(log.sentAt);
            return Math.abs(logTime.getTime() - scheduledTime.getTime()) < 1000;
          });
          
          if (logIndex !== -1) {
            record.logs[logIndex].emailStatus = 'failed';
            record.logs[logIndex].status = 'sent'; // Still mark as sent attempt
          }
          
          // Clear the schedule even on failure (don't retry indefinitely)
          record.notify.schedule = false;
          record.notify.scheduledAt = '';
          record.notify.pendingId = null;
          
          await record.save();
          
          // Broadcast update via WebSocket
          const io = getIo();
          if (io) {
            io.emit('notificationRecordUpdated', formatRecord(record));
          }
        }
      }
      
      console.log(`✅ Scheduled email check complete. Processed ${dueRecords.length} email(s).`);
      
    } catch (error) {
      console.error('❌ Error in scheduled email sender cron job:', error.message);
    }
  });
  
  console.log('✅ Scheduled email sender started (runs every minute)');
  console.log('   Cron schedule: * * * * * (every minute)');
}

/**
 * Helper to format record for WebSocket broadcast
 */
function formatRecord(record) {
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
}

module.exports = { startScheduledEmailSender };
