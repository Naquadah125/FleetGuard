import http from 'node:http';
import { startServer, stopServer } from './src/server.js';

const port = 5061;
const baseUrl = `http://localhost:${port}`;

async function request(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(raw) }));
    });
    req.on('error', reject);
    req.end(body ? JSON.stringify(body) : undefined);
  });
}

const server = await startServer(port);
try {
  const registration = await request('/api/auth/register', 'POST', {
    name: 'Admin AI Test',
    email: `admin-ai-${Date.now()}@fleet.vn`,
    password: 'SecurePassword123!',
    role: 'ADMIN',
  });
  const result = await request('/api/analytics/chatbot', 'POST', {
    session_id: `admin-test-${Date.now()}`,
    message: 'Tổng quan an toàn đội xe',
  }, registration.data.token);

  if (result.status !== 200 || result.data.structuredData?.source !== 'internal') {
    throw new Error(`Unexpected Admin chatbot response: ${JSON.stringify(result.data)}`);
  }
  if (result.data.modelStatus?.source !== 'internal') {
    throw new Error('Admin response is missing sanitized model status');
  }
  console.log('Admin chatbot API tests passed.');
} finally {
  await stopServer(server);
}
