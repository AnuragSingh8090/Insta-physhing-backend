const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const apiRoutes = require('./routes');
const { sendFailure } = require('./utils/response');

const app = express();

// ── CORS Configuration ────────────────────────────────────────
// Allow all origins for maximum compatibility
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false,
  optionsSuccessStatus: 200
}));

// ── Middleware ────────────────────────────────────────────────
app.use(morgan('dev'));
// Increase payload size limit to allow large images (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logger — placed after express.json() so req.body is available
const requestLogger = require('./middlewares/requestLogger');
app.use(requestLogger);

// ── Routes ────────────────────────────────────────────────────
// Root route - Server status check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running'
  });
});

app.use('/api', apiRoutes);

// ── 404 Handler ───────────────────────────────────────────────
app.use((req, res) => {
  sendFailure(res, `Route not found: ${req.originalUrl}`, 404);
});

// ── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  sendFailure(res, err.message || 'Internal Server Error', err.status || 500);
});

module.exports = app;
