require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const connectDB = require('./config/db');
const { setIo } = require('./config/socket');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  const server = http.createServer(app);

  // ── Socket.IO with CORS allowing all origins ──────────────────
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      credentials: false
    },
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 50 * 1024 * 1024 // 50MB for large payloads
  });

  setIo(io);

  io.on('connection', (socket) => {
    console.log(`🔌 Monitor client connected (${io.engine.clientsCount} total)`);
    socket.on('disconnect', () => {
      console.log(`🔌 Monitor client disconnected (${io.engine.clientsCount} remaining)`);
    });
  });

  // ── Start scheduled email sender ──────────────────────────────
  try {
    const { startScheduledEmailSender } = require('./utils/scheduledEmailSender');
    startScheduledEmailSender();
  } catch (error) {
    console.log('⚠️  Scheduled email sender not started:', error.message);
    console.log('   Install node-cron to enable scheduled emails: npm install node-cron');
  }

  server.listen(PORT, () => {
    console.log(
      `🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
    );
    console.log(`📡 CORS: Allowing all origins (*)`);
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
