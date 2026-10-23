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

  const registration = await request('/api/auth/register', 'POST', {
    name: 'Chatbot User Test',
    email: `chatbot-user-${Date.now()}@fleet.vn`,
    password: 'SecurePassword123!',
    role: 'USER',
  });
  assert.equal(registration.status, 201);

  const originalGeminiKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  let missingGemini;
  try {
    missingGemini = await request(
      '/api/analytics/chatbot',
      'POST',
      {
        session_id: CHAT_SESSION_ID,
        message: 'Thống kê cảm xúc',
      },
      registration.data.token,
    );
  } finally {
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
  }
  assert.equal(missingGemini.status, 503, 'user_chatbot_returns_503_without_gemini_key');
  assert.equal(missingGemini.data.success, false);
  assert.equal(missingGemini.data.code, 'GEMINI_NOT_CONFIGURED');

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
