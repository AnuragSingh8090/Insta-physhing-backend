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

  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST', 'DELETE'] },
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
