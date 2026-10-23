import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'url';

import path from 'path';

import { connectDB, disconnectDB, getIsMongoConnected } from './db.js';
import authRoutes from './routes/authRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import { TelemetryHandler } from './socket/telemetryHandler.js';
import { seedDatabase } from './seed.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './middleware/authMiddleware.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'driver-safety-backend',
    mongodb_connected: getIsMongoConnected(),
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.url}` });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// HTTP & Socket Server
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Socket authentication required'));
    socket.authUser = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return next(new Error('Invalid socket token'));
  }
});

const telemetryHandler = new TelemetryHandler(io, {
  batchIntervalMs: parseInt(process.env.BATCH_INTERVAL_MS || '2000', 10)
});

/**
 * Start Server instance
 */
export async function startServer(port = process.env.PORT || 5000) {
  await connectDB(process.env.MONGODB_URI);

  return new Promise((resolve) => {
    httpServer.listen(port, () => {
      console.log(`\x1b[32m[Driver Safety Backend] Running on http://localhost:${port}\x1b[0m`);
      console.log(`\x1b[36m[Socket.io] Real-time telemetry streaming ready\x1b[0m`);
      resolve({ httpServer, io, telemetryHandler, app, port });
    });
  });
}

/**
 * Stop Server instance
 */
export async function stopServer() {
  telemetryHandler.stop();
  await telemetryHandler.flushBatch();
  await disconnectDB();
  return new Promise((resolve) => {
    httpServer.close(() => {
      resolve();
    });
  });
}

// Auto-run if executed directly
const isDirectRun = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1].endsWith('server.js')
);

if (isDirectRun) {
  const PORT = process.env.PORT || 5000;
  startServer(PORT);
}

export { app, httpServer, io, telemetryHandler };
export default app;
