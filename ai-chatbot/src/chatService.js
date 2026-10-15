import { getGeminiClient, DEFAULT_MODEL } from './geminiClient.js';
import { FLEET_COPILOT_SYSTEM_PROMPT } from './systemPrompt.js';
import { geminiToolDeclarations, executeTool } from './tools.js';

export class ChatService {
  /**
   * @param {Object} [options]
   * @param {string} [options.backendUrl] URL of backend REST server
   * @param {string} [options.model] Gemini model name
   */
  constructor(options = {}) {
    this.backendUrl = options.backendUrl || process.env.BACKEND_URL || 'http://localhost:5000';
    this.model = options.model || DEFAULT_MODEL;
    this.gemini = getGeminiClient();
  }

  /**
   * Send user message to Fleet Copilot
   * @param {string} message User question/prompt
   * @param {Object} user User profile with { id, role, name }
   * @param {Array<Object>} [conversationHistory=[]] Previous chat turns
   * @returns {Promise<{reply: string, structuredData: Object|null, toolsUsed: Array<string>}>}
   */
  async sendMessage(message, user = {}, conversationHistory = []) {
    // 1. RBAC Security Check: Enforce FLEET_ADMIN role
    if (!user || user.role !== 'FLEET_ADMIN') {
      return {
        reply: 'Rất tiếc, bạn không có quyền FLEET_ADMIN để truy vấn dữ liệu an toàn và cảm xúc của đội xe.',
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

    // 2. If Gemini API is configured, use official SDK with Function Calling
    if (this.gemini) {
      try {
        return await this._callGeminiWithTools(message, user, conversationHistory);
      } catch (err) {
        console.warn(`[Gemini SDK Notice]: ${err.message}. Falling back to Smart Copilot Engine.`);
        return await this._fallbackLocalCopilot(message, user);
      }
    }

    // 3. Fallback Smart Copilot (for offline dev and test verification)
    return await this._fallbackLocalCopilot(message, user);
  }

  /**
   * Multi-turn Function Calling loop using @google/genai SDK
   */
  async _callGeminiWithTools(message, user, conversationHistory = []) {
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
      model: this.model,
      contents,
      config: {
        systemInstruction: FLEET_COPILOT_SYSTEM_PROMPT,
        tools: [{ functionDeclarations: geminiToolDeclarations }]
      }
    });

    // Check for Function Calls
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      toolsUsed.push(call.name);

      const toolResult = await executeTool(call.name, call.args, {
        backendUrl: this.backendUrl
      });

      structuredData = toolResult.data;

      // Provide tool result back to Gemini for the final natural explanation
      const secondTurnResponse = await this.gemini.models.generateContent({
        model: this.model,
        contents: [
          ...contents,
          {
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
  async _fallbackLocalCopilot(message, user) {
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
        backendUrl: this.backendUrl
      });

      if (toolRes.status === 'SUCCESS' && toolRes.data) {
        structuredData = toolRes.data;
        const violations = toolRes.data.violations || [];
        reply = `Báo cáo video **${toolRes.data.video_name || videoId}** ghi nhận **${violations.length} vi phạm** an toàn. Điểm an toàn hành trình đạt **${toolRes.data.summary?.safety_score ?? 80}/100**. Các mốc thời gian vi phạm đã được đồng bộ vào trình xem video.`;
      } else {
        reply = `Không tìm thấy báo cáo phân tích cho video mã "${videoId}". Bạn vui lòng kiểm tra lại mã video.`;
      }

      return { reply, structuredData, toolsUsed };
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
      const driverId = driverMatch ? driverMatch[1] : undefined;

      toolsUsed.push('query_emotion_stats');
      const toolRes = await executeTool('query_emotion_stats', { driver_id: driverId }, {
        backendUrl: this.backendUrl
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

      return { reply, structuredData, toolsUsed };
    }

    // Default introductory help
    reply = 'Chào bạn! Tôi là Fleet Safety Copilot. Bạn có thể hỏi tôi các câu hỏi như:\n' +
      '- "Thống kê tình trạng an toàn của tài xế drv_test_01?"\n' +
      '- "Kiểm tra vi phạm trong video dashcam_trip_101?"\n' +
      '- "Tỷ lệ tập trung và số lần buồn ngủ của đội xe hôm nay?"';

    return { reply, structuredData: null, toolsUsed };
  }
}

export default ChatService;
