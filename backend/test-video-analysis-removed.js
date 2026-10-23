import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import analyticsRoutes from './src/routes/analyticsRoutes.js';
import { JWT_SECRET } from './src/middleware/authMiddleware.js';

const app = express();
app.use(express.json());
app.use('/api/analytics', analyticsRoutes);
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.url}` });
});

const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const token = jwt.sign({ id: 'driver-test', role: 'DRIVER' }, JWT_SECRET);

function request(path, method, body, authorization) {
  return new Promise((resolve, reject) => {
    const req = http.request(path, {
      method,
      agent: false,
      headers: {
        Connection: 'close',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(authorization ? { Authorization: authorization } : {}),
      },
    }, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(responseBody) }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let postResponse;
let getResponse;
try {
  postResponse = await request(
    `${baseUrl}/api/analytics/videos`,
    'POST',
    { video_name: 'removed.mp4' }
  );
  getResponse = await request(
    `${baseUrl}/api/analytics/videos/removed-id`,
    'GET',
    null,
    `Bearer ${token}`
  );
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

assert.equal(postResponse.status, 404);
assert.match(postResponse.body.message, /^Route not found:/);
assert.equal(getResponse.status, 404);
assert.match(getResponse.body.message, /^Route not found:/);
console.log('Video analysis endpoints return 404.');
