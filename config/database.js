var mongoose = require('mongoose');

var connectDB = async function() {
  try {
    var uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/e-commerce-project';
    var conn = await mongoose.connect(uri);
    var models = require('../schemas');

    console.log('MongoDB Connected: ' + conn.connection.host);
    console.log('All database schemas initialized successfully');
    await Promise.all(
      Object.values(models)
        .filter(function(model) {
          return model && typeof model.syncIndexes === 'function';
        })
        .map(function(model) {
          return model.syncIndexes();
        })
    );
    console.log('Database indexes synchronized');
    return conn;
  } catch (error) {
    console.error('Error: ' + error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
