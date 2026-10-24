const logStore = require('../utils/logStore');
const { getIo } = require('../config/socket');
const { sendSuccess, sendFailure } = require('../utils/response');

/**
 * GET /api/logs/meta
 * Return server start time and current log count (no log entries).
 */
const getMeta = (req, res) => {
  return sendSuccess(res, 'Meta retrieved', {
    serverStartTime: logStore.serverStartTime,
    count: logStore.getAll().length,
  });
};

/**
 * GET /api/logs
 * Return every stored request log (newest first).
 */
const getLogs = (req, res) => {
  const logs = logStore.getAll();
  return sendSuccess(res, 'Logs retrieved', { logs });
};

/**
 * DELETE /api/logs
 * Remove every log entry.  Broadcasts a "logsCleared" event.
 */
const clearLogs = (req, res) => {
  logStore.deleteAll();

  const io = getIo();
  if (io) io.emit('logsCleared');

  return sendSuccess(res, 'All logs cleared');
};

/**
 * DELETE /api/logs/:id
 * Remove a single log entry by ID.  Broadcasts "logDeleted".
 */
const deleteLog = (req, res) => {
  const { id } = req.params;
  const ok = logStore.deleteById(id);

  if (!ok) return sendFailure(res, `Log ${id} not found`, 404);

  const io = getIo();
  if (io) io.emit('logDeleted', { id: Number(id) });

  return sendSuccess(res, `Log ${id} deleted`);
};

module.exports = { getMeta, getLogs, clearLogs, deleteLog };
