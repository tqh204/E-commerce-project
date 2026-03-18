const mongoose = require('mongoose');

// Kết nối MongoDB
const connectDB = async () => {
  try {
    // Thay đổi connection string nếu cần
    const conn = await mongoose.connect('mongodb://localhost:27017/e-commerce-project');

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
