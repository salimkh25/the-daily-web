// config/db.js — Mongoose connection. [PLUMBING — written for you]
//
// Called once from server.js at startup. Uses MONGODB_URI from the environment.
const mongoose = require('mongoose');
const logger = require('../src/utils/logger');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }

  // Fail fast instead of buffering queries forever if Mongo is down.
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    logger.info(`MongoDB connected: ${mongoose.connection.name}`);
  } catch (err) {
    logger.error('MongoDB connection failed', err.message);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => logger.error('MongoDB error', err.message));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
}

module.exports = connectDB;
