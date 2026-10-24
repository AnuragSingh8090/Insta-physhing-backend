/**
 * File-backed log store for HTTP request logs.
 *
 * Stores every logged request as a JSON array inside logs/requests.json.
 * The whole array is kept in memory and flushed to disk on every write,
 * which is fine for a monitoring tool with moderate traffic.
 */
const fs = require('fs');
const path = require('path');

const LOG_DIR  = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'requests.json');
const MAX_LOGS = 5000;

let logs   = [];
let nextId = 1;

/* ── Init: load existing file ──────────────────────────────────── */
(function init() {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    if (fs.existsSync(LOG_FILE)) {
      const raw = fs.readFileSync(LOG_FILE, 'utf8');
      logs = JSON.parse(raw);
      if (!Array.isArray(logs)) logs = [];
      nextId = logs.reduce((mx, l) => Math.max(mx, l.id ?? 0), 0) + 1;
    }
    console.log(`📋 LogStore initialised — ${logs.length} existing log(s)`);
  } catch (err) {
    console.error('📋 LogStore init error:', err.message);
    logs = [];
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

/** Clear every log. */
function deleteAll() {
  logs = [];
  nextId = 1;
  persist();
}

module.exports = { getAll, add, deleteById, deleteAll };
