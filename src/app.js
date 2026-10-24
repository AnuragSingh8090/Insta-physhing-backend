const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const apiRoutes = require('./routes');
const { sendFailure } = require('./utils/response');

const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger — placed after express.json() so req.body is available
const requestLogger = require('./middlewares/requestLogger');
app.use(requestLogger);

// ── Routes ────────────────────────────────────────────────────
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
