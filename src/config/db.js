const mongoose = require('mongoose');
const dns = require('dns');

// Force Node.js to use reliable public DNS servers instead of the local
// resolver, which may not support SRV record lookups required by mongodb+srv://
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host} | DB: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
