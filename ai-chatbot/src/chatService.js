import { getGeminiClient, DEFAULT_MODEL, getGeminiModels } from './geminiClient.js';
import { FLEET_COPILOT_SYSTEM_PROMPT } from './systemPrompt.js';
import { adminGeminiToolDeclarations, geminiToolDeclarations, executeTool } from './tools.js';

export class ChatService {
  /**
   * @param {Object} [options]
   * @param {string} [options.backendUrl] URL of backend REST server
   * @param {string} [options.model] Gemini model name
   * @param {string[]} [options.allowedRoles] Roles allowed to use the service
   * @param {boolean} [options.requireGemini] Require Gemini for successful responses
   * @param {string} [options.driverId] Force analytics tools to this driver
   * @param {number} [options.geminiTimeoutMs] Maximum wait for a Gemini response
   */
  constructor(options = {}) {
    this.backendUrl = options.backendUrl || process.env.BACKEND_URL || 'http://localhost:5000';
    this.model = options.model || DEFAULT_MODEL;
    this.models = getGeminiModels({ models: options.models, model: this.model });
    this.model = this.models[0];
    this.allowedRoles = options.allowedRoles || ['FLEET_ADMIN'];
    this.requireGemini = options.requireGemini ?? true;
    this.driverId = options.driverId;
    this.geminiTimeoutMs = options.geminiTimeoutMs || Number(process.env.GEMINI_TIMEOUT_MS || 8000);
    this.gemini = Object.hasOwn(options, 'gemini') ? options.gemini : getGeminiClient();
  }

  /**
   * Send user message to Fleet Copilot
   * @param {string} message User question/prompt
   * @param {Object} user User profile with { id, role, name }
   * @param {Array<Object>} [conversationHistory=[]] Previous chat turns
   * @param {Object} [requestOptions] Per-request options
   * @returns {Promise<{reply: string, structuredData: Object|null, toolsUsed: Array<string>}>}
   */
  async sendMessage(message, user = {}, conversationHistory = [], requestOptions = {}) {
    if (!user || !this.allowedRoles.includes(user.role)) {
      return {
        reply: 'Rất tiếc, bạn không có quyền FLEET_ADMIN để truy vấn dữ liệu an toàn này.',
        structuredData: null,
        toolsUsed: []
      };
    }

    if (!message || message.trim() === '') {
      return {
        reply: 'Xin chào! Tôi là Fleet Safety Copilot. Hãy hỏi tôi về tình trạng an toàn, vi phạm hoặc phân tích video của tài xế.',
        structuredData: null,
        toolsUsed: []
      };
    }

    if (!this.gemini) {
      const error = new Error('GEMINI_API_KEY chưa được cấu hình ở backend.');
      error.code = 'GEMINI_NOT_CONFIGURED';
      throw error;
    }

    const attemptedModels = [];
    let lastError;
    for (const model of this.models) {
      attemptedModels.push(model);
      try {
        const geminiResult = await this._callGeminiWithTools(
          message,
          user,
          conversationHistory,
          requestOptions,
          model,
        );
        const isAdmin = ['ADMIN', 'FLEET_ADMIN'].includes(user.role);
        const asksForAnalytics = /thống kê|cảm xúc|video|buồn ngủ|mệt mỏi|an toàn|chuyến|phiên lái|cảnh báo|điểm/i.test(message) ||
          (isAdmin && /đội xe|tổng quan|xếp hạng|rủi ro|vi phạm/i.test(message));
        if (asksForAnalytics && !geminiResult.structuredData) {
          const error = new Error('Gemini did not request the required analytics tool.');
          error.code = 'GEMINI_TOOL_REQUIRED';
          throw error;
        }
        return {
          ...geminiResult,
          modelStatus: { source: 'gemini', attemptedModels, selectedModel: model },
        };
      } catch (error) {
        if (['CHATBOT_TOOL_FAILED', 'GEMINI_TOOL_REQUIRED', 'GEMINI_EMPTY_RESPONSE'].includes(error.code)) {
          throw error;
        }
        lastError = error;
        if (!this._isRetryableGeminiError(error)) break;
      }
    }

    const error = new Error('Gemini is temporarily unavailable. Please try again.');
    error.code = 'GEMINI_UNAVAILABLE';
    error.status = 502;
    error.attemptedModels = attemptedModels;
    error.cause = lastError;
    throw error;
  }

  _isRetryableGeminiError(error) {
    return [429, 500, 502, 503, 504].includes(Number(error?.status)) ||
      ['GEMINI_TIMEOUT', 'UND_ERR_CONNECT_TIMEOUT'].includes(error?.code) ||
      /unavailable|overloaded|quota|rate.?limit|timeout|model .*no longer available|model .*not found/i.test(error?.message || '');
  }

  async _withGeminiTimeout(operation) {
    let timer;
    const controller = new AbortController();
    try {
      return await Promise.race([
        Promise.resolve().then(() => operation(controller.signal)),
        new Promise((_, reject) => {
          timer = setTimeout(
            () => {
              controller.abort();
              reject(Object.assign(new Error('Gemini response timed out'), { code: 'GEMINI_TIMEOUT' }));
            },
            this.geminiTimeoutMs,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  async _generateContent(request) {
    return this._withGeminiTimeout(() => this.gemini.models.generateContent(request));
  }

  async _createInteraction(request) {
    return this._withGeminiTimeout((signal) => this.gemini.interactions.create({
      ...request,
      api_version: 'v1beta',
    }, {
      timeout_ms: this.geminiTimeoutMs,
      retries: 0,
      signal,
    }));
  }

  _toInteractionTool(declaration) {
    const normalizeSchema = (schema) => {
      if (Array.isArray(schema)) return schema.map(normalizeSchema);
      if (!schema || typeof schema !== 'object') return schema;
      return Object.fromEntries(Object.entries(schema).map(([key, value]) => [
        key,
        key === 'type' && typeof value === 'string'
          ? value.toLowerCase()
          : normalizeSchema(value),
      ]));
    };

    return {
      type: 'function',
      name: declaration.name,
      description: declaration.description,
      parameters: normalizeSchema(declaration.parameters),
    };
  }

  _interactionText(interaction) {
    if (interaction.output_text) return interaction.output_text.trim();
    const texts = (interaction.steps || [])
      .filter((step) => step.type === 'model_output')
      .flatMap((step) => step.content || [])
      .filter((content) => content.type === 'text' && content.text)
      .map((content) => content.text);
    if (texts.length) return texts.join('\n').trim();
    return (interaction.outputs || [])
      .filter((output) => output.type === 'text' && output.text)
      .map((output) => output.text)
      .join('\n')
      .trim();
  }

  async _callGeminiWithInteractions(message, user, conversationHistory, requestOptions, model) {
    const isAdmin = ['ADMIN', 'FLEET_ADMIN'].includes(user.role);
    const declarations = isAdmin ? adminGeminiToolDeclarations : geminiToolDeclarations;
    const history = conversationHistory
      .map((turn) => `${turn.role === 'model' ? 'Assistant' : 'User'}: ${turn.message}`)
      .join('\n');
    const input = history ? `${history}\nUser: ${message}` : message;
    const initialInteraction = await this._createInteraction({
      model,
      input,
      system_instruction: FLEET_COPILOT_SYSTEM_PROMPT,
      tools: declarations.map((declaration) => this._toInteractionTool(declaration)),
    });
    const functionCalls = (initialInteraction.steps || [])
      .filter((step) => step.type === 'function_call');
    if (!functionCalls.length) {
      functionCalls.push(...(initialInteraction.outputs || [])
        .filter((output) => output.type === 'function_call'));
    }

    if (functionCalls.length > 1) {
      const error = new Error('Gemini requested multiple analytics tools.');
      error.code = 'CHATBOT_TOOL_FAILED';
      throw error;
    }

    if (functionCalls.length === 1) {
      const call = functionCalls[0];
      const toolsUsed = [call.name];
      let toolArgs = call.arguments || {};
      if (typeof toolArgs === 'string') {
        try {
          toolArgs = JSON.parse(toolArgs);
        } catch {
          const error = new Error('Gemini returned invalid analytics tool arguments.');
          error.code = 'CHATBOT_TOOL_FAILED';
          throw error;
        }
      }

      if (!isAdmin && call.name === 'query_emotion_stats') {
        toolArgs = { ...toolArgs };
        toolArgs.driver_id = this.driverId || requestOptions.driverId || user.id || user._id?.toString();
        const endDate = toolArgs.end_date ? new Date(toolArgs.end_date) : new Date();
        if (!toolArgs.end_date) toolArgs.end_date = endDate.toISOString();
        if (!toolArgs.start_date) {
          toolArgs.start_date = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        }
      }

      const toolResult = await executeTool(call.name, toolArgs, {
        backendUrl: this.backendUrl,
        authToken: requestOptions.authToken,
        userAnalyticsResolver: requestOptions.userAnalyticsResolver,
        adminAnalyticsResolver: requestOptions.adminAnalyticsResolver,
      });
      if (toolResult.status !== 'SUCCESS') {
        const error = new Error('The requested analytics tool could not complete.');
        error.code = 'CHATBOT_TOOL_FAILED';
        throw error;
      }

      const secondInteraction = await this._createInteraction({
        model,
        previous_interaction_id: initialInteraction.id,
        input: [{
          type: 'function_result',
          name: call.name,
          call_id: call.id,
          result: JSON.stringify(toolResult.data),
        }],
      });
      const reply = this._interactionText(secondInteraction);
      if (!reply) {
        const error = new Error('Gemini returned an empty response after the analytics query.');
        error.code = 'GEMINI_EMPTY_RESPONSE';
        throw error;
      }
      return { reply, structuredData: toolResult.data, toolsUsed };
    }

    const reply = this._interactionText(initialInteraction);
    if (!reply) {
      const error = new Error('Gemini returned an empty response.');
      error.code = 'GEMINI_EMPTY_RESPONSE';
      throw error;
    }
    return { reply, structuredData: null, toolsUsed: [] };
  }

  /**
   * Multi-turn Function Calling loop using @google/genai SDK
   */
  async _callGeminiWithTools(message, user, conversationHistory = [], requestOptions = {}, model = this.model) {
    if (typeof this.gemini.interactions?.create === 'function') {
      return this._callGeminiWithInteractions(message, user, conversationHistory, requestOptions, model);
    }

    const toolsUsed = [];
    const contents = [];
    for (const turn of conversationHistory) {
      contents.push({
        role: turn.role === 'model' ? 'model' : 'user',
        parts: [{ text: turn.message }]
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const isAdmin = ['ADMIN', 'FLEET_ADMIN'].includes(user.role);
    const declarations = isAdmin ? adminGeminiToolDeclarations : geminiToolDeclarations;
    const response = await this._generateContent({
      model,
      contents,
      config: {
        systemInstruction: FLEET_COPILOT_SYSTEM_PROMPT,
        tools: [{ functionDeclarations: declarations }]
      }
    });

    const functionCalls = typeof response.functionCalls === 'function'
      ? response.functionCalls()
      : response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      if (functionCalls.length > 1) {
        const error = new Error('Gemini requested multiple analytics tools.');
        error.code = 'CHATBOT_TOOL_FAILED';
        throw error;
      }
      const call = functionCalls[0];
      toolsUsed.push(call.name);

      const toolArgs = { ...(call.args || {}) };
      if (!isAdmin && call.name === 'query_emotion_stats') {
        toolArgs.driver_id = this.driverId || requestOptions.driverId || user.id || user._id?.toString();
        const endDate = toolArgs.end_date ? new Date(toolArgs.end_date) : new Date();
        if (!toolArgs.end_date) toolArgs.end_date = endDate.toISOString();
        if (!toolArgs.start_date) {
          toolArgs.start_date = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        }
      }
      const toolResult = await executeTool(call.name, toolArgs, {
        backendUrl: this.backendUrl,
        authToken: requestOptions.authToken,
        userAnalyticsResolver: requestOptions.userAnalyticsResolver,
        adminAnalyticsResolver: requestOptions.adminAnalyticsResolver,
      });
      if (toolResult.status !== 'SUCCESS') {
        const error = new Error('The requested analytics tool could not complete.');
        error.code = 'CHATBOT_TOOL_FAILED';
        throw error;
      }
      const secondTurnResponse = await this._generateContent({
        model,
        contents: [
          ...contents,
          response.candidates?.[0]?.content || {
            role: 'model',
            parts: [{ functionCall: call }]
          },
          {
            role: 'user',
            parts: [{
              functionResponse: {
                name: call.name,
                response: { result: toolResult.data }
              }
            }]
          }
        ],
        config: {
          systemInstruction: FLEET_COPILOT_SYSTEM_PROMPT
        }
      });

      if (!secondTurnResponse.text) {
        const error = new Error('Gemini returned an empty response after the analytics query.');
        error.code = 'GEMINI_EMPTY_RESPONSE';
        throw error;
      }

      return {
        reply: secondTurnResponse.text,
        structuredData: toolResult.data,
        toolsUsed
      };
    }

    if (!response.text) {
      const error = new Error('Gemini returned an empty response.');
      error.code = 'GEMINI_EMPTY_RESPONSE';
      throw error;
    }

    return {
      reply: response.text,
      structuredData: null,
      toolsUsed
    };
  }
}

export default ChatService;
