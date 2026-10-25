require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const connectDB = require('./config/db');
const { setIo } = require('./config/socket');

const PORT = process.env.PORT || 5000;

// ── Allowed Origins for CORS ──────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL_LOCAL || 'http://localhost:5173',
  process.env.FRONTEND_URL_PRODUCTION,
].filter(Boolean); // Remove undefined/null values

const startServer = async () => {
  await connectDB();

  const server = http.createServer(app);

  // ── Socket.IO with proper CORS ────────────────────────────────
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    transports: ['websocket', 'polling']
  });

  setIo(io);

  io.on('connection', (socket) => {
    console.log(`🔌 Monitor client connected (${io.engine.clientsCount} total)`);
    socket.on('disconnect', () => {
      console.log(`🔌 Monitor client disconnected (${io.engine.clientsCount} remaining)`);
    });
  });

  server.listen(PORT, () => {
    console.log(
      `🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
    );
    console.log(`📡 Allowed CORS origins:`, allowedOrigins.length > 0 ? allowedOrigins : ['*']);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Kill the process or change PORT in .env`);
    } else {
      console.error(`❌ Server error: ${err.message}`);
    }
    process.exit(1);
  });
};

startServer();
