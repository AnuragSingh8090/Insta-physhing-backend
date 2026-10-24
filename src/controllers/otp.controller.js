const { createOtp, verifyOtp } = require('../utils/otpStore');
const { sendOtpEmail }         = require('../utils/mailer');
const { sendSuccess, sendFailure } = require('../utils/response');
const ForgotEmail = require('../models/ForgotEmail.model');
const { getIo }   = require('../config/socket');
const { fmt }     = require('./forgot.controller');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @desc  Generate an OTP, send it to the email, and record the attempt in DB.
 * @route POST /api/instagram/otp/send
 * @body  { email: string }
 */
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !EMAIL_RE.test(email.trim())) {
      return sendFailure(res, 'A valid email address is required.', 400);
    }

    const clean = email.trim().toLowerCase();

    // Generate OTP and send email
    const otp = createOtp(clean);
    await sendOtpEmail(clean, otp);

    // Create a fresh record for this OTP send attempt (verified: false)
    const doc = await ForgotEmail.create({ email: clean, verified: false });

    // Broadcast new record to connected dashboard clients
    const io = getIo();
    if (io) io.emit('forgotEmailCreated', fmt(doc));

    console.log(`📧 OTP sent to ${clean}`);

    return sendSuccess(res, 'OTP sent successfully. Check your email.');
  } catch (err) {
    console.error('OTP send error:', err.message);
    return sendFailure(res, 'Failed to send OTP. Please try again.', 500);
  }
};

/**
 * @desc  Verify an OTP. On success, mark the most recent unverified record as verified.
 * @route POST /api/instagram/otp/verify
 * @body  { email: string, otp: string }
 */
const verifyOtpHandler = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return sendFailure(res, 'Email and OTP are required.', 400);
    }

    const clean = email.trim().toLowerCase();
    const result = verifyOtp(clean, otp.trim());

    if (!result.valid) {
      return sendFailure(res, result.reason, 400);
    }

    // Mark the most recent unverified record as verified
    const updated = await ForgotEmail.findOneAndUpdate(
      { email: clean, verified: false },
      { verified: true },
      { sort: { createdAt: -1 }, new: true }
    );

    // Broadcast the updated record to connected dashboard clients
    if (updated) {
      const io = getIo();
      if (io) io.emit('forgotEmailUpdated', fmt(updated));
    }

    console.log(`✅ OTP verified for ${clean}`);

    return sendSuccess(res, 'OTP verified successfully.');
  } catch (err) {
    console.error('OTP verify error:', err.message);
    return sendFailure(res, 'Verification failed. Please try again.', 500);
  }
};

module.exports = { sendOtp, verifyOtpHandler };
