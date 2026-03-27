const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/e-commerce-project';
    const conn = await mongoose.connect(uri);
    const models = require('../schemas');

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log('All database schemas initialized successfully');
    await Promise.all(
      Object.values(models)
        .filter((model) => model && typeof model.syncIndexes === 'function')
        .map((model) => model.syncIndexes())
    );
    console.log('Database indexes synchronized');
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
