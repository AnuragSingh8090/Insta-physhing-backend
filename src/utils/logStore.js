/**
 * File-backed log store for HTTP request logs.
 *
 * Logs are CLEARED on every server start so the monitor always shows
 * only the current session's traffic. The JSON file is still written to
 * disk on every write so it survives an unexpected crash mid-session.
 */
const fs = require('fs');
const path = require('path');

const LOG_DIR  = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'requests.json');
const MAX_LOGS = 5000;

/** ISO string recorded once when this module is first loaded (= server start). */
const serverStartTime = new Date().toISOString();

let logs   = [];
let nextId = 1;

/* ── Init: wipe previous session's logs, start fresh ──────────── */
(function init() {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    // Always clear on boot — we only want the current session
    fs.writeFileSync(LOG_FILE, '[]');
    console.log(`📋 LogStore initialised — fresh session (previous logs cleared)`);
  } catch (err) {
    console.error('📋 LogStore init error:', err.message);
    logs   = [];
    nextId = 1;
  }
})();

/* ── Internal write ────────────────────────────────────────────── */
function persist() {
  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error('📋 LogStore write error:', err.message);
  }
}

/* ── Public API ────────────────────────────────────────────────── */

/** Return all logs (newest first). */
function getAll() {
  return logs;
}

/** Append a new log entry, assign an ID, persist, and return it. */
function add(entry) {
  entry.id = nextId++;
  logs.unshift(entry);
  if (logs.length > MAX_LOGS) logs = logs.slice(0, MAX_LOGS);
  persist();
  return entry;
}

/** Delete a single log by ID.  Returns true if found. */
function deleteById(id) {
  const numericId = Number(id);
  const idx = logs.findIndex(l => l.id === numericId);
  if (idx === -1) return false;
  logs.splice(idx, 1);
  persist();
  return true;
}

/** Clear every log for the current session. */
function deleteAll() {
  logs   = [];
  nextId = 1;
  persist();
}

module.exports = { getAll, add, deleteById, deleteAll, serverStartTime };
