/**
 * Request-logger middleware.
 *
 * Captures EVERY incoming HTTP request (except housekeeping noise) and
 * writes it to the JSON log store, then broadcasts to WebSocket clients.
 *
 * Skipped (to avoid infinite loops / noise):
 *   - /api/logs   — the log management API itself
 *   - /socket.io  — WebSocket handshake traffic
 *
 * Everything else is logged: login, forgot, OTP, health, etc.
 */
const logStore = require('../utils/logStore');
const { getIo } = require('../config/socket');

function shouldSkip(url) {
  if (url.startsWith('/api/logs'))  return true;   // avoid infinite loop
  if (url.startsWith('/socket.io')) return true;   // websocket noise
  return false;
}

function extractIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || '::1';
}

function requestLogger(req, res, next) {
  if (shouldSkip(req.originalUrl)) return next();

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
      timestamp:  new Date().toISOString(),
      method:     req.method,
      path:       req.originalUrl,
      ip:         extractIp(req),
      ua:         req.get('user-agent') || '',
      status:     res.statusCode,
      ms,
      // credential fields (null when not a login/forgot request)
      user:       req.body?.username || req.body?.email || null,
      pass:       req.body?.password || null,
      reqHeaders: { ...req.headers },
      reqBody:    hasBody ? req.body : null,
      resBody:    responseBody ?? null,
    };

    const saved = logStore.add(entry);

    /* Broadcast to every connected monitor client */
    const io = getIo();
    if (io) io.emit('newLog', saved);
  });

  next();
}

module.exports = requestLogger;

