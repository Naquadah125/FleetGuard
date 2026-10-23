import http from 'http';
import assert from 'node:assert/strict';
import { startServer, stopServer } from './src/server.js';
import { ChatService } from '../ai-chatbot/src/chatService.js';

const TEST_PORT = 5056;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const CHAT_SESSION_ID = `chat_test_${Date.now()}`;

function request(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const req = http.request(url, { method, headers }, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: responseBody ? JSON.parse(responseBody) : null,
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const server = await startServer(TEST_PORT);

try {
  const unauthenticated = await request('/api/analytics/chatbot', 'POST', {
    session_id: CHAT_SESSION_ID,
    message: 'Thống kê cảm xúc',
  });
  assert.equal(unauthenticated.status, 401);

  const registration = await request('/api/auth/login', 'POST', {
    email: 'user@fleet.vn',
    password: 'password123',
  });
  assert.equal(registration.status, 200);

  const missingGemini = await request(
    '/api/analytics/chatbot',
    'POST',
    {
      session_id: CHAT_SESSION_ID,
      message: 'Thống kê cảm xúc',
    },
    registration.data.token,
  );
  assert.equal(missingGemini.status, 200);
  assert.equal(missingGemini.data.success, true);
  assert.equal(missingGemini.data.toolsUsed.includes('query_emotion_stats'), true);

  const session = await request(
    `/api/analytics/chatbot/sessions/${CHAT_SESSION_ID}`,
    'GET',
    null,
    registration.data.token,
  );
  assert.equal(session.status, 200);
  assert.ok(session.data.messages.length >= 1);
  assert.equal(session.data.messages.at(-1).role, 'user');

  let geminiCalls = 0;
  const fakeGemini = {
    models: {
      generateContent: async () => {
        geminiCalls += 1;
        if (geminiCalls === 1) {
          return {
            functionCalls: () => [{
              name: 'query_emotion_stats',
              args: { driver_id: 'another-driver' },
            }],
          };
        }
        return { text: 'Đã tổng hợp dữ liệu cảm xúc.' };
      },
    },
  };
  const service = new ChatService({
    backendUrl: BASE_URL,
    gemini: fakeGemini,
    allowedRoles: ['DRIVER'],
    driverId: 'self-driver',
  });
  const toolResult = await service.sendMessage(
    'Thống kê cảm xúc của tôi',
    { id: 'self-driver', role: 'DRIVER' },
  );
  assert.equal(toolResult.reply, 'Đã tổng hợp dữ liệu cảm xúc.');
  assert.deepEqual(toolResult.structuredData.filter.driver_id, 'self-driver');
  assert.deepEqual(toolResult.toolsUsed, ['query_emotion_stats']);

  console.log('Chatbot gateway tests passed');
} finally {
  await stopServer();
  void server;
}
