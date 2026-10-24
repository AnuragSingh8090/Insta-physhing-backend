const express = require('express');
const router  = express.Router();
const { sendOtp, verifyOtpHandler } = require('../controllers/otp.controller');

// POST /api/otp/send    — send OTP to email
// POST /api/otp/verify  — verify submitted OTP
router.post('/send',   sendOtp);
router.post('/verify', verifyOtpHandler);

module.exports = router;
