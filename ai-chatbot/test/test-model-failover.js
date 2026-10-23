import assert from 'node:assert/strict';
import { ChatService } from '../src/chatService.js';
import { getGeminiModels } from '../src/geminiClient.js';

async function missing_api_key_throws_configuration_error() {
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const noKeyService = new ChatService({ allowedRoles: ['USER'] });
    await assert.rejects(
      noKeyService.sendMessage('Xin chào', { id: 'driver-a', role: 'USER' }),
      (error) => error.code === 'GEMINI_NOT_CONFIGURED',
    );
  } finally {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
}

await missing_api_key_throws_configuration_error();

assert.deepEqual(
  getGeminiModels({ model: 'gemini-2.5-flash, gemini-2.0-flash' }),
  ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-3.6-flash'],
);

async function interactions_api_runs_scoped_analytics_tools() {
  const requests = [];
  const sdkOptions = [];
  const gemini = {
    interactions: {
      create: async (request, options) => {
        requests.push(request);
        sdkOptions.push(options);
        if (requests.length === 1) {
          return {
            id: 'interaction-1',
            status: 'requires_action',
            steps: [{
              type: 'function_call',
              id: 'call-1',
              name: 'get_user_safety_summary',
              arguments: { requested_days: 7, user_id: 'untrusted-user' },
            }],
          };
        }
        return {
          status: 'completed',
          steps: [{
            type: 'model_output',
            content: [{ type: 'text', text: 'Tienes dos viajes recientes.' }],
          }],
        };
      },
    },
  };
  const service = new ChatService({
    gemini,
    models: ['gemini-3.6-flash'],
    allowedRoles: ['USER'],
  });
  let resolvedArgs;
  const result = await service.sendMessage(
    'Resume mis viajes recientes',
    { id: 'driver-authenticated', role: 'USER' },
    [],
    {
      userAnalyticsResolver: async (args) => {
        resolvedArgs = args;
        return { type: 'user_safety_summary', metrics: { session_count: 2 } };
      },
    },
  );

  assert.equal(requests.length, 2);
  assert.equal(requests[0].model, 'gemini-3.6-flash');
  assert.equal(requests[0].api_version, 'v1beta');
  assert.ok(requests[0].tools.some((tool) => tool.name === 'get_user_safety_summary'));
  assert.equal(requests[0].tools[0].type, 'function');
  assert.equal(requests[0].tools[0].parameters.type, 'object');
  assert.equal(sdkOptions[0].timeout_ms, 8000);
  assert.equal(sdkOptions[0].retries, 0);
  assert.ok(sdkOptions[0].signal instanceof AbortSignal);
  assert.deepEqual(resolvedArgs, {
    requestedDays: 7,
    startDate: undefined,
    endDate: undefined,
    sessionId: undefined,
  });
  assert.equal(requests[1].previous_interaction_id, 'interaction-1');
  assert.deepEqual(requests[1].input, [{
    type: 'function_result',
    name: 'get_user_safety_summary',
    call_id: 'call-1',
    result: JSON.stringify({ type: 'user_safety_summary', metrics: { session_count: 2 } }),
  }]);
  assert.equal(result.reply, 'Tienes dos viajes recientes.');
  assert.equal(result.structuredData.metrics.session_count, 2);
}

await interactions_api_runs_scoped_analytics_tools();

async function unavailable_models_fall_back_to_current_default() {
  const attemptedModels = [];
  const service = new ChatService({
    gemini: {
      interactions: {
        create: async ({ model }) => {
          attemptedModels.push(model);
          if (model === 'retired-model') {
            const error = new Error('model no longer available');
            error.status = 404;
            throw error;
          }
          return {
            status: 'completed',
            steps: [{
              type: 'model_output',
              content: [{ type: 'text', text: 'Gemini is responding.' }],
            }],
          };
        },
      },
    },
    models: ['retired-model'],
    allowedRoles: ['USER'],
  });

  const result = await service.sendMessage('Xin chào', { id: 'driver-a', role: 'USER' });
  assert.deepEqual(attemptedModels, ['retired-model', 'gemini-3.6-flash']);
  assert.equal(result.reply, 'Gemini is responding.');
  assert.equal(result.modelStatus.selectedModel, 'gemini-3.6-flash');
}

await unavailable_models_fall_back_to_current_default();

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
  requireGemini: true,
});

async function provider_exhaustion_throws_without_internal_fallback() {
  await assert.rejects(
    failedService.sendMessage('Hãy thống kê cảm xúc', { id: 'driver-a', role: 'USER' }),
    (error) => error.code === 'GEMINI_UNAVAILABLE' &&
      error.message === 'Gemini is temporarily unavailable. Please try again.',
  );
}

await provider_exhaustion_throws_without_internal_fallback();
console.log('Gemini model failover tests passed.');
