const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const apiRoutes = require('./routes');
const { sendFailure } = require('./utils/response');

const app = express();

// ── CORS Configuration ────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL_LOCAL || 'http://localhost:5173',
  process.env.FRONTEND_URL_PRODUCTION,
].filter(Boolean); // Remove undefined/null values

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true, // Allow cookies and authentication headers
  optionsSuccessStatus: 200 // For legacy browser support
};

app.use(cors(corsOptions));

// ── Middleware ────────────────────────────────────────────────
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
