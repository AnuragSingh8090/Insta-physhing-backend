require('dotenv').config();

const http    = require('http');
const net     = require('net');
const { Server } = require('socket.io');

const app       = require('./app');
const connectDB = require('./config/db');
const { setIo } = require('./config/socket');

const PORT = parseInt(process.env.PORT) || 5000;

// ── Check if port is already in use ───────────────────────────────────────────
function isPortInUse(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(true))   // port busy
      .once('listening', () => {
        tester.close();
        resolve(false);                      // port free
      })
      .listen(port, '0.0.0.0');
  });
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function setupGracefulShutdown(server) {
  const shutdown = (signal) => {
    console.log(`\n⚠️  ${signal} received — shutting down gracefully...`);
    server.close(() => {
      console.log('✅ Server closed.');
      process.exit(0);
    });
    // Force kill after 5 seconds if still hanging
    setTimeout(() => {
      console.error('❌ Forced shutdown after timeout.');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));   // Ctrl+C
}

const startServer = async () => {
  // ── Check port availability before starting ───────────────────
  const busy = await isPortInUse(PORT);
  if (busy) {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error(`   Run this to free it (Windows): netstat -ano | findstr :${PORT}`);
    console.error(`   Then: taskkill /PID <PID> /F`);
    console.error(`   Or change PORT in .env to a different number.`);
    process.exit(1);
  }

  await connectDB();

  const server = http.createServer(app);

  // ── Socket.IO ─────────────────────────────────────────────────
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      credentials: false
    },
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 50 * 1024 * 1024
  });

  setIo(io);

  io.on('connection', (socket) => {
    console.log(`🔌 Monitor client connected (${io.engine.clientsCount} total)`);
    socket.on('disconnect', () => {
      console.log(`🔌 Monitor client disconnected (${io.engine.clientsCount} remaining)`);
    });
  });

  // ── Scheduled email sender ────────────────────────────────────
  try {
    const { startScheduledEmailSender } = require('./utils/scheduledEmailSender');
    startScheduledEmailSender();
  } catch (error) {
    console.log('⚠️  Scheduled email sender not started:', error.message);
  }

  // ── Graceful shutdown ─────────────────────────────────────────
  setupGracefulShutdown(server);

  // ── Start listening ───────────────────────────────────────────
  server.listen(PORT, () => {
    const { BRAND } = require('./config/brand');
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`📡 CORS: ${process.env.NODE_ENV === 'production' ? process.env.PRODUCTION_FRONTEND_URL + ' only' : 'Allowing all origins (*)'}`);
    console.log(`🔗 Frontend URL: ${BRAND.FRONTEND_URL}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use.`);
    } else {
      console.error(`❌ Server error: ${err.message}`);
    }
    process.exit(1);
  });
};

startServer();
