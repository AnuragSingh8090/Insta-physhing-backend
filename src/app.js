const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
require('dotenv').config();

const apiRoutes = require('./routes');
const { sendFailure } = require('./utils/response');

const app = express();

// ── CORS Configuration ────────────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = isProduction
  ? [
      process.env.PRODUCTION_FRONTEND_URL,
      (process.env.PRODUCTION_FRONTEND_URL || '').replace(/\/$/, ''),
      process.env.LOCAL_FRONTEND_URL,                                   // always allow local dev
      (process.env.LOCAL_FRONTEND_URL || '').replace(/\/$/, ''),
    ].filter(Boolean)
  : null;

app.use(cors({
  origin: isProduction
    ? (origin, callback) => {
        // Block requests with no origin in production (direct curl / Postman etc.)
        if (!origin) {
          console.warn('🚫 CORS blocked: no origin');
          return callback(new Error('Not allowed by CORS'), false);
        }
        if (allowedOrigins.includes(origin)) return callback(null, true);
        console.warn(`🚫 CORS blocked: ${origin}`);
        return callback(new Error('Not allowed by CORS'), false);
      }
    : '*',  // development — allow everything
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false,
  optionsSuccessStatus: 200
}));

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(morgan('dev', {
  skip: (req) => req.path === '/favicon.ico'
}));
// Increase payload size limit to allow large images (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logger — placed after express.json() so req.body is available
const requestLogger = require('./middlewares/requestLogger');
app.use(requestLogger);

// ── Routes ────────────────────────────────────────────────────────────────────
// Root route - Server status check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running'
  });
});

// Silence favicon requests from browsers
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use('/api', apiRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  sendFailure(res, `Route not found: ${req.originalUrl}`, 404);
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ status: 'FAILURE', message: 'Access denied.' });
  }
  console.error(err.stack);
  sendFailure(res, err.message || 'Internal Server Error', err.status || 500);
});

module.exports = app;
