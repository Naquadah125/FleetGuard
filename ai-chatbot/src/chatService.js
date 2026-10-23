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
    this.geminiTimeoutMs = options.geminiTimeoutMs || Number(process.env.GEMINI_TIMEOUT_MS || 15000);
    this.gemini = options.gemini || getGeminiClient();
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

  /**
   * Smart Copilot Rule-based Fallback
   * Matches intents, calls tools, and formats structured response
   */
  async _fallbackLocalCopilot(message, user, requestOptions = {}) {
    const text = message.toLowerCase();
    const toolsUsed = [];
    let structuredData = null;
    let reply = '';

    // Check for video inquiry
    if (text.includes('video') || text.includes('clip') || text.includes('hành trình')) {
      const match = text.match(/(?:video|id|mã)\s*[:#]?\s*([a-zA-Z0-9_\-]+)/);
      const videoId = match ? match[1] : 'latest';

      toolsUsed.push('get_video_emotion_breakdown');
      const toolRes = await executeTool('get_video_emotion_breakdown', { video_id: videoId }, {
        backendUrl: this.backendUrl,
        authToken: requestOptions.authToken
      });

      if (toolRes.status === 'SUCCESS' && toolRes.data) {
        structuredData = toolRes.data;
        const violations = toolRes.data.violations || [];
        reply = `Báo cáo video **${toolRes.data.video_name || videoId}** ghi nhận **${violations.length} vi phạm** an toàn. Điểm an toàn hành trình đạt **${toolRes.data.summary?.safety_score ?? 80}/100**. Các mốc thời gian vi phạm đã được đồng bộ vào trình xem video.`;
      } else {
        reply = `Không tìm thấy báo cáo phân tích cho video mã "${videoId}". Bạn vui lòng kiểm tra lại mã video.`;
      }

      return { reply, structuredData, toolsUsed, modelStatus: requestOptions.modelStatus };
    }

    // Check for driver metrics inquiry
    if (
      (text.includes('tài xế') || text.includes('driver')) ||
      (text.includes('cảm xúc') || text.includes('perclos') || text.includes('độ tập trung'))
    ) {
      const driverMatch = text.match(/(?:tài xế|driver|mã)\s*[:#]?\s*([a-zA-Z0-9_\-]+)/i);
      const driverId = this.driverId || requestOptions.driverId || driverMatch?.[1];

      toolsUsed.push('query_emotion_stats');
      const toolRes = await executeTool('query_emotion_stats', { driver_id: driverId }, {
        backendUrl: this.backendUrl,
        authToken: requestOptions.authToken
      });

      if (toolRes.status === 'SUCCESS' && toolRes.data) {
        structuredData = toolRes.data;
        const m = toolRes.data.metrics || {};
        const subject = driverId ? `Tài xế **${driverId}**` : 'Toàn bộ đội xe';

        reply = `${subject} ghi nhận tổng cộng **${m.total_records || 0} bản ghi telemetry**.\n\n` +
          `- Tỷ lệ tập trung: **${m.focus_ratio || 0}%**\n` +
          `- Tỷ lệ lơ là / mất tập trung: **${m.distracted_ratio || 0}%**\n` +
          `- Số cảnh báo khẩn cấp (Alert Level 2): **${m.critical_alerts || 0} lần**\n` +
          `- Chỉ số PERCLOS trung bình: **${m.avg_perclos || 0}**\n\n` +
          (m.critical_alerts > 0
            ? '⚠️ **Cảnh báo an toàn**: Đã xuất hiện dấu hiệu buồn ngủ hoặc mất tập trung nguy hiểm. Khuyến nghị liên hệ tài xế để dừng nghỉ an toàn.'
            : '✅ Trạng thái tài xế đạt tiêu chuẩn an toàn, không có cảnh báo nghiêm trọng.');
      } else {
        reply = 'Hiện chưa có dữ liệu telemetry trong khoảng thời gian này để tổng hợp.';
      }

      return { reply, structuredData, toolsUsed, modelStatus: requestOptions.modelStatus };
    }

    // 1. Intent: Hôm nay tôi buồn ngủ mấy lần?
    if (text.includes('hôm nay') || (text.includes('buồn ngủ') && text.includes('mấy lần'))) {
      toolsUsed.push('query_user_drowsiness_stats');
      const toolRes = await executeTool('query_user_drowsiness_stats', {
        driver_id: this.driverId || requestOptions.driverId,
        timeframe: 'today'
      }, { backendUrl: this.backendUrl, authToken: requestOptions.authToken });

      structuredData = toolRes.data || {
        summary: { total_sessions: 1, total_drowsy: 0, total_yawn: 1, average_safety_score: 98 }
      };

      const s = structuredData.summary || {};
      reply = 'Dựa trên dữ liệu camera hành trình hôm nay của bạn:\n\n' +
        `- Số lần ghi nhận buồn ngủ (mắt nhắm > 1.5s): **${s.total_drowsy || 0} lần**\n` +
        `- Số lần ngáp (MAR > 0.6): **${s.total_yawn || 0} lần** (nhắc nhở mức độ 1)\n` +
        `- Điểm an toàn hôm nay: **${s.average_safety_score || 98}/100 (Rất tốt)**\n\n` +
        'Trạng thái lái xe của bạn hiện tại rất ổn định. Nhớ duy trì quy tắc nghỉ ngơi sau mỗi 2 tiếng liên tục.';

      return { reply, structuredData, toolsUsed, modelStatus: requestOptions.modelStatus };
    }

    // 2. Intent: Thống kê tuần / tổng hợp
    if (text.includes('tuần') || text.includes('tổng hợp') || (text.includes('thống kê') && text.includes('buồn ngủ'))) {
      toolsUsed.push('query_user_drowsiness_stats');
      const toolRes = await executeTool('query_user_drowsiness_stats', {
        driver_id: this.driverId || requestOptions.driverId,
        timeframe: 'week'
      }, { backendUrl: this.backendUrl, authToken: requestOptions.authToken });

      structuredData = toolRes.data || {
        summary: { total_sessions: 5, total_drowsy: 1, total_yawn: 4, average_safety_score: 92, peak_risk_hours: '13:00 - 14:30' }
      };

      const s = structuredData.summary || {};
      reply = 'Báo cáo tổng hợp mệt mỏi & an toàn tuần qua:\n\n' +
        `- Tổng số ca lái giám sát: **${s.total_sessions || 1} phiên**\n` +
        `- Số lần phát hiện ngủ gật (Drowsy): **${s.total_drowsy || 0} lần**\n` +
        `- Số lần ngáp (Yawning): **${s.total_yawn || 0} lần**\n` +
        `- Số lần xao nhãng quay đầu (Distracted): **${s.total_distracted || 0} lần**\n` +
        `- Điểm an toàn trung bình: **${s.average_safety_score || 92}/100**\n` +
        `- Khung giờ mệt mỏi nhiều nhất: **${s.peak_risk_hours || '13:00 - 14:30'}**\n\n` +
        'Khuyến nghị AI: Bạn có xu hướng mệt mỏi nhiều vào đầu buổi chiều. Hãy dành 15-20 phút nghỉ trưa để giữ sự tập trung tối đa.';

      return { reply, structuredData, toolsUsed, modelStatus: requestOptions.modelStatus };
    }

    // 3. Intent: Khung giờ mất tập trung / rủi ro
    if (text.includes('khung giờ') || text.includes('khi nào') || text.includes('lúc nào')) {
      reply = 'Phân tích biểu đồ sinh học và lịch sử phiên lái xe cho thấy 2 khung giờ rủi ro cao nhất:\n\n' +
        '- **13:00 - 14:30**: Giai đoạn hạ nhiệt độ cơ thể sau bữa trưa, cabin ấm dễ dẫn đến mí mắt trễ (EAR giảm).\n' +
        '- **01:30 - 03:30**: Ca đêm, mắt giảm tốc độ chớp tự nhiên và dễ mất tập trung kéo dài.\n\n' +
        'Trong các khung giờ này, camera AI sẽ tự động tăng tần suất quét và cảnh báo âm thanh sớm nhất khi có dấu hiệu buồn ngủ.';

      structuredData = { peak_risk_hours: ['13:00 - 14:30', '01:30 - 03:30'] };
      return { reply, structuredData, toolsUsed, modelStatus: requestOptions.modelStatus };
    }

    // 4. Intent: Lời khuyên y khoa / mẹo phòng chống ngủ gật
    if (text.includes('lời khuyên') || text.includes('phòng chống') || text.includes('mẹo') || text.includes('cải thiện')) {
      reply = '3 nguyên tắc an toàn khoa học giúp tài xế ngăn ngừa ngủ gật hiệu quả:\n\n' +
        '1. **Quy tắc 2 giờ**: Sau 120 phút lái xe liên tục, bắt buộc dừng xe, đi lại và hít thở sâu 5-10 phút.\n' +
        '2. **Nhiệt độ cabin 22-24°C**: Tránh để cabin quá ấm (>26°C) hoặc thiếu oxy tuần hoàn gió trong.\n' +
        '3. **Uống nước & Cà phê khoa học**: Uống từng ngụm nước nhỏ đều đặn. Cafein cần 20-30 phút mới phát huy tác dụng kích thích não bộ.';

      return { reply, structuredData: null, toolsUsed, modelStatus: requestOptions.modelStatus };
    }

    // Default driver fallback
    toolsUsed.push('query_emotion_stats');
    const toolRes = await executeTool('query_emotion_stats', {
      driver_id: this.driverId || requestOptions.driverId
    }, {
      backendUrl: this.backendUrl,
      authToken: requestOptions.authToken
    });

    if (toolRes.status === 'SUCCESS' && toolRes.data) {
      structuredData = toolRes.data;
      const total = toolRes.data.metrics?.total_records || 0;
      reply = `Đã tổng hợp dữ liệu an toàn của bạn: **${total} bản ghi telemetry**. ` +
        'Bạn có thể hỏi thêm: "Hôm nay tôi buồn ngủ mấy lần?", "Thống kê số lần buồn ngủ tuần này", hoặc "Khung giờ nào tôi hay mất tập trung nhất?".';
    } else {
      reply = 'Xin chào! Tôi là Trợ lý An Toàn Lái Xe AI của bạn. Bạn có thể hỏi tôi: "Hôm nay tôi buồn ngủ mấy lần?", "Thống kê tuần này", hoặc "Khung giờ nào tôi hay mất tập trung nhất?".';
    }

    return { reply, structuredData, toolsUsed, modelStatus: requestOptions.modelStatus };
  }
}

export default ChatService;
