import { getGeminiClient, DEFAULT_MODEL, getGeminiModels } from './geminiClient.js';
import { FLEET_COPILOT_SYSTEM_PROMPT } from './systemPrompt.js';
import { geminiToolDeclarations, executeTool } from './tools.js';

export class ChatService {
  /**
   * @param {Object} [options]
   * @param {string} [options.backendUrl] URL of backend REST server
   * @param {string} [options.model] Gemini model name
   * @param {string[]} [options.allowedRoles] Roles allowed to use the service
   * @param {boolean} [options.requireGemini] Disable local fallback when true
   * @param {string} [options.driverId] Force analytics tools to this driver
   * @param {number} [options.geminiTimeoutMs] Maximum wait for a Gemini response
   */
  constructor(options = {}) {
    this.backendUrl = options.backendUrl || process.env.BACKEND_URL || 'http://localhost:5000';
    this.model = options.model || DEFAULT_MODEL;
    this.models = getGeminiModels({ models: options.models, model: this.model });
    this.model = this.models[0];
    this.allowedRoles = options.allowedRoles || ['FLEET_ADMIN'];
    this.requireGemini = options.requireGemini || false;
    this.driverId = options.driverId;
    this.geminiTimeoutMs = options.geminiTimeoutMs || Number(process.env.GEMINI_TIMEOUT_MS || 8000);
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

    if (!this.gemini && this.requireGemini) {
      const error = new Error('GEMINI_API_KEY chưa được cấu hình ở backend.');
      error.code = 'GEMINI_NOT_CONFIGURED';
      throw error;
    }

    if (this.gemini) {
      const attemptedModels = [];
      let lastError;
      for (const model of this.models) {
        attemptedModels.push(model);
        try {
          const geminiRequest = this._callGeminiWithTools(message, user, conversationHistory, requestOptions, model);
          const timeout = new Promise((_, reject) => {
            setTimeout(() => reject(Object.assign(new Error('Gemini response timed out'), { code: 'GEMINI_TIMEOUT' })), this.geminiTimeoutMs);
          });
          const geminiResult = await Promise.race([geminiRequest, timeout]);
          const asksForAnalytics = /thống kê|cảm xúc|video|buồn ngủ|mệt mỏi|an toàn/i.test(message);
          const modelStatus = {
            source: 'gemini',
            attemptedModels,
            selectedModel: model,
          };
          if (asksForAnalytics && !geminiResult.structuredData) {
            return await this._fallbackLocalCopilot(message, user, { ...requestOptions, modelStatus });
          }
          return { ...geminiResult, modelStatus };
        } catch (err) {
          lastError = err;
          if (!this._isRetryableGeminiError(err)) break;
        }
      }
      if (this.requireGemini) throw lastError;
      const failureCode = lastError?.status === 429 ? 'GEMINI_QUOTA_EXHAUSTED' : 'GEMINI_UNAVAILABLE';
      const modelStatus = { source: 'internal', attemptedModels, failureCode };
      console.warn(`[Gemini SDK Notice]: ${lastError?.message}. Falling back to Smart Copilot Engine.`);
      const fallback = await this._fallbackLocalCopilot(message, user, { ...requestOptions, modelStatus });
      return {
        ...fallback,
        modelStatus,
        reply: `${fallback.reply}\n\nGemini API đang tạm thời không khả dụng; dữ liệu trên là phân tích nội bộ.`
      };
    }

    return await this._fallbackLocalCopilot(message, user, {
      ...requestOptions,
      modelStatus: { source: 'internal', attemptedModels: [], failureCode: 'GEMINI_NOT_CONFIGURED' }
    });
  }

  _isRetryableGeminiError(error) {
    return [429, 500, 502, 503, 504].includes(Number(error?.status)) ||
      ['GEMINI_TIMEOUT', 'UND_ERR_CONNECT_TIMEOUT'].includes(error?.code) ||
      /unavailable|overloaded|quota|rate.?limit|timeout/i.test(error?.message || '');
  }

  async interpretAdminResult(message, user, structuredData) {
    const attemptedModels = [];
    if (!this.gemini) {
      return {
        reply: `${structuredData.title || 'Đã tổng hợp dữ liệu.'}. Dữ liệu được lấy từ analytics nội bộ.`,
        modelStatus: { source: 'internal', attemptedModels, failureCode: 'GEMINI_NOT_CONFIGURED' }
      };
    }

    let lastError;
    for (const model of this.models) {
      attemptedModels.push(model);
      try {
        const response = await Promise.race([
          this.gemini.models.generateContent({
            model,
            contents: [{
              role: 'user',
              parts: [{ text: `${message}\nDữ liệu cấu trúc:\n${JSON.stringify(structuredData)}` }]
            }],
            config: { systemInstruction: FLEET_COPILOT_SYSTEM_PROMPT }
          }),
          new Promise((_, reject) => setTimeout(
            () => reject(Object.assign(new Error('Gemini response timed out'), { code: 'GEMINI_TIMEOUT' })),
            this.geminiTimeoutMs
          ))
        ]);
        return {
          reply: response.text || `${structuredData.title}. Đã tổng hợp dữ liệu nội bộ.`,
          modelStatus: { source: 'gemini', attemptedModels, selectedModel: model }
        };
      } catch (error) {
        lastError = error;
        if (!this._isRetryableGeminiError(error)) break;
      }
    }

    return {
      reply: `${structuredData.title || 'Đã tổng hợp dữ liệu.'}. Gemini đang tạm thời không khả dụng; số liệu bên dưới là phân tích nội bộ.`,
      modelStatus: {
        source: 'internal',
        attemptedModels,
        failureCode: lastError?.status === 429 ? 'GEMINI_QUOTA_EXHAUSTED' : 'GEMINI_UNAVAILABLE'
      }
    };
  }

  /**
   * Multi-turn Function Calling loop using @google/genai SDK
   */
  async _callGeminiWithTools(message, user, conversationHistory = [], requestOptions = {}, model = this.model) {
    const toolsUsed = [];
    let structuredData = null;

    // Build chat contents
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

    const response = await this.gemini.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: FLEET_COPILOT_SYSTEM_PROMPT,
        tools: [{ functionDeclarations: geminiToolDeclarations }]
      }
    });

    // Check for Function Calls
    const functionCalls = typeof response.functionCalls === 'function'
      ? response.functionCalls()
      : response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      toolsUsed.push(call.name);

      const toolArgs = {
        ...call.args,
        ...(this.driverId || requestOptions.driverId
          ? { driver_id: this.driverId || requestOptions.driverId }
          : {})
      };
      const toolResult = await executeTool(call.name, toolArgs, {
        backendUrl: this.backendUrl,
        authToken: requestOptions.authToken
      });

      structuredData = toolResult.data;

      // Provide tool result back to Gemini for the final natural explanation
      const secondTurnResponse = await this.gemini.models.generateContent({
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
                response: { result: toolResult }
              }
            }]
          }
        ],
        config: {
          systemInstruction: FLEET_COPILOT_SYSTEM_PROMPT
        }
      });

      return {
        reply: secondTurnResponse.text || 'Đã trích xuất số liệu an toàn từ hệ thống.',
        structuredData,
        toolsUsed
      };
    }

    // Standard conversational reply
    return {
      reply: response.text || 'Tôi có thể hỗ trợ gì thêm về an toàn đội xe cho bạn?',
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
      text.includes('tài xế') ||
      text.includes('driver') ||
      text.includes('thống kê') ||
      text.includes('cảm xúc') ||
      text.includes('ngủ gật') ||
      text.includes('mệt mỏi') ||
      text.includes('an toàn')
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
        'Bạn có thể hỏi thêm về cảm xúc, buồn ngủ, mất tập trung hoặc video.';
    } else {
      reply = 'Chưa có dữ liệu telemetry để tổng hợp. Bạn có thể thử lại sau khi hoàn tất một phiên lái.';
    }

    return { reply, structuredData, toolsUsed, modelStatus: requestOptions.modelStatus };
  }
}

export default ChatService;
