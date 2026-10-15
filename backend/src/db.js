import mongoose from 'mongoose';
import { User, EmotionLog, VideoAnalysis, ChatConversation } from './models/index.js';

let isMongoConnected = false;

// In-memory fallback stores when MongoDB is not running locally
export const memoryStore = {
  users: new Map(),
  sessions: new Map(),
  emotionLogs: [],
  videoAnalyses: new Map(),
  chatConversations: []
};

/**
 * Connect to MongoDB with timeout and fallback
 * @param {string} uri MongoDB connection string
 * @returns {Promise<boolean>} True if connected, false if running in fallback mode
 */
export async function connectDB(uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/driver_safety') {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
      connectTimeoutMS: 3000
    });
    isMongoConnected = true;
    console.log(`\x1b[32m[MongoDB] Connected successfully to ${uri}\x1b[0m`);
    return true;
  } catch (err) {
    isMongoConnected = false;
    console.warn(`\x1b[33m[MongoDB] Connection failed (${err.message}). Using In-Memory Fallback Storage.\x1b[0m`);
    return false;
  }
}

/**
 * Check if MongoDB is connected
 */
export function getIsMongoConnected() {
  return isMongoConnected && mongoose.connection.readyState === 1;
}

/**
 * Disconnect DB cleanly
 */
export async function disconnectDB() {
  if (isMongoConnected) {
    await mongoose.disconnect();
    isMongoConnected = false;
  }
}

/**
 * Batch insert emotion logs to MongoDB (or memory store)
 * @param {Array<Object>} logs 
 */
export async function insertBatchLogs(logs) {
  if (!logs || logs.length === 0) return [];

  if (getIsMongoConnected()) {
    try {
      return await EmotionLog.insertMany(logs, { ordered: false });
    } catch (err) {
      console.error('[DB Batch Insert Error]:', err.message);
      // Fallback push
      memoryStore.emotionLogs.push(...logs);
      return logs;
    }
  } else {
    // Memory store insert
    memoryStore.emotionLogs.push(...logs);
    return logs;
  }
}

export default {
  connectDB,
  getIsMongoConnected,
  disconnectDB,
  insertBatchLogs,
  memoryStore
};
