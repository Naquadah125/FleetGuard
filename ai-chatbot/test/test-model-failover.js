import assert from 'node:assert/strict';
import { ChatService } from '../src/chatService.js';
import { getGeminiModels } from '../src/geminiClient.js';

assert.deepEqual(
  getGeminiModels({ model: 'gemini-2.5-flash, gemini-2.0-flash' }),
  ['gemini-2.5-flash', 'gemini-2.0-flash'],
);

const calls = [];
const gemini = {
  models: {
    generateContent: async ({ model }) => {
      calls.push(model);
      if (model === 'primary') {
        const error = new Error('temporarily unavailable');
        error.status = 503;
        throw error;
      }
      return { text: 'Phản hồi từ model dự phòng.' };
    },
  },
};

const service = new ChatService({
  gemini,
  models: ['primary', 'fallback'],
  allowedRoles: ['USER'],
});
const result = await service.sendMessage('Xin chào', { id: 'driver-a', role: 'USER' });

assert.deepEqual(calls, ['primary', 'fallback']);
assert.equal(result.reply, 'Phản hồi từ model dự phòng.');
assert.equal(result.modelStatus.selectedModel, 'fallback');
assert.deepEqual(result.modelStatus.attemptedModels, ['primary', 'fallback']);

const failedService = new ChatService({
  gemini: {
    models: {
      generateContent: async ({ model }) => {
        const error = new Error(`quota for ${model}`);
        error.status = 429;
        throw error;
      },
    },
  },
  models: ['primary', 'fallback'],
  allowedRoles: ['USER'],
});
const failedResult = await failedService.sendMessage('Hãy thống kê cảm xúc', { id: 'driver-a', role: 'USER' });

assert.equal(failedResult.modelStatus.source, 'internal');
assert.equal(failedResult.modelStatus.failureCode, 'GEMINI_QUOTA_EXHAUSTED');
assert.match(failedResult.reply, /Gemini|quota|không khả dụng/i);

const interpretation = await service.interpretAdminResult(
  'Tổng quan đội xe',
  { role: 'ADMIN' },
  { type: 'fleet_overview', title: 'Tổng quan', recordsUsed: { sessions: 2 } },
);
assert.equal(interpretation.modelStatus.selectedModel, 'fallback');
assert.match(interpretation.reply, /Phản hồi từ model dự phòng/);
console.log('Gemini model failover tests passed.');
