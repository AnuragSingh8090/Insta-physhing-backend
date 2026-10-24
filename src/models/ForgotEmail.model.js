const mongoose = require('mongoose');

/**
 * Tracks every email submitted on the Forgot Password page.
 * Collection: Instagram.forgotpassword
 */
const forgotPasswordSchema = new mongoose.Schema(
  {
    email: {
      type:      String,
      required:  true,
      trim:      true,
      lowercase: true,
    },
    verified: {
      type:    Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Explicit collection name: Instagram.forgotpassword
const ForgotEmail = mongoose.model('ForgotEmail', forgotPasswordSchema, 'forgotpassword');

module.exports = ForgotEmail;
