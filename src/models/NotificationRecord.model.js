const mongoose = require('mongoose');

// Notification log sub-schema
const notificationLogSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['Someone tried to sign in', 'New login detected']
  },
  sentAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  emailStatus: {
    type: String,
    enum: ['success', 'failed', 'scheduled', 'cancelled'],
    default: 'success'
  },
  status: {
    type: String,
    enum: ['sent', 'opened', 'password changed'],
    default: 'sent'
  }
}, { _id: true });

// Main notification record schema
const notificationRecordSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['simple', 'advance'],
    default: 'simple'
  },
  username: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
    // unique: true removed - uniqueness now enforced by composite index with type
  },
  avatar: {
    type: String,
    default: ''
  },
  // Fields specific to advance type
  deviceName: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  // Notification settings
  notify: {
    notifyType: {
      type: String,
      default: 'Someone tried to sign in'
    },
    schedule: {
      type: Boolean,
      default: false
    },
    scheduledAt: {
      type: String,
      default: ''
    },
    pendingId: {
      type: String,
      default: null
    }
  },
  // Notification logs
  logs: [notificationLogSchema],
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes
notificationRecordSchema.index({ email: 1, type: 1 }, { unique: true }); // Composite unique: same email allowed for different types
notificationRecordSchema.index({ type: 1 });
notificationRecordSchema.index({ createdAt: -1 });

const NotificationRecord = mongoose.model('NotificationRecord', notificationRecordSchema);

module.exports = NotificationRecord;
