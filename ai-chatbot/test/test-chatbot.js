/**
 * Unit & Integration Test Suite for Fleet Copilot AI Chatbot
 * Tests:
 * 1. RBAC Security: Enforcing FLEET_ADMIN role, rejecting DRIVER role
 * 2. Tool Declarations: Validating Gemini function calling schemas
 * 3. Tool Execution: Calling query_emotion_stats & get_video_emotion_breakdown
 * 4. Multi-turn Agent Loop: Synthesizing natural reply + structuredData JSON
 */

import http from 'http';
import strictAssert from 'node:assert/strict';
import { ChatService } from '../src/chatService.js';
import { geminiToolDeclarations, executeTool } from '../src/tools.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✓\x1b[0m ${message}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✗\x1b[0m ${message}`);
  }
}

const MOCK_PORT = 5059;

console.log('\n\x1b[1m=== BẮT ĐẦU KIỂM THỬ: FLEET COPILOT AI CHATBOT ===\x1b[0m\n');

async function user_summary_tool_uses_authenticated_identity() {
  let requested;
  let declarations;
  let callCount = 0;
  const gemini = {
    models: {
      generateContent: async (request) => {
        callCount += 1;
        if (request.config.tools) declarations = request.config.tools[0].functionDeclarations;
        if (callCount === 1) {
          return {
            functionCalls: [{
              name: 'get_user_safety_summary',
              args: {
                requested_days: 7,
                session_id: 'session-self',
                user_id: 'other-user',
                driver_id: 'other-driver',
              },
            }],
          };
        }
        return { text: 'Tổng hợp chuyến lái của bạn.' };
      },
    },
  };
  const service = new ChatService({
    gemini,
    allowedRoles: ['USER'],
    driverId: 'driver-self',
  });
  const result = await service.sendMessage(
    'Thống kê chuyến lái của tôi',
    { id: 'driver-self', role: 'USER' },
    [],
    {
      userAnalyticsResolver: async (args) => {
        requested = args;
        return { type: 'user_safety_summary', metrics: { session_count: 2 } };
      },
    },
  );

  strictAssert.deepEqual(requested, {
    requestedDays: 7,
    startDate: undefined,
    endDate: undefined,
    sessionId: 'session-self',
  });
  strictAssert.ok(declarations.some((tool) => tool.name === 'get_user_safety_summary'));
  strictAssert.ok(!declarations.some((tool) => tool.name === 'resolve_admin_analytics'));
  strictAssert.equal(result.structuredData.metrics.session_count, 2);
  strictAssert.equal(result.modelStatus.source, 'gemini');
}

async function admin_analytics_tool_uses_server_resolver() {
  let requested;
  let declarations;
  let callCount = 0;
  const resultData = { type: 'alert_breakdown', recordsUsed: { sessions: 3 } };
  const gemini = {
    models: {
      generateContent: async (request) => {
        callCount += 1;
        if (request.config.tools) declarations = request.config.tools[0].functionDeclarations;
        if (callCount === 1) {
          return {
            functionCalls: [{
              name: 'resolve_admin_analytics',
              args: {
                intent: 'alerts',
                requested_days: 7,
                organization_id: 'foreign-org',
                driver_id: 'foreign-driver',
              },
            }],
          };
        }
        return { text: 'Ba cảnh báo trong phạm vi tổ chức.' };
      },
    },
  };
  const service = new ChatService({ gemini, allowedRoles: ['ADMIN'] });
  const result = await service.sendMessage(
    'Tổng hợp cảnh báo đội xe',
    { id: 'admin-a', role: 'ADMIN', organizationId: 'org-a' },
    [],
    {
      adminAnalyticsResolver: async (args) => {
        requested = args;
        return resultData;
      },
    },
  );

  strictAssert.deepEqual(requested, { intent: 'alerts', requestedDays: 7 });
  strictAssert.ok(declarations.some((tool) => tool.name === 'resolve_admin_analytics'));
  strictAssert.ok(!declarations.some((tool) => tool.name === 'get_user_safety_summary'));
  strictAssert.deepEqual(result.structuredData, resultData);
  strictAssert.deepEqual(result.toolsUsed, ['resolve_admin_analytics']);
  strictAssert.equal(result.modelStatus.source, 'gemini');
}

async function no_data_admin_result_is_interpreted_by_gemini() {
  let callCount = 0;
  let interpretationRequest;
  const noData = { type: 'no_data_guidance', title: 'Chưa có dữ liệu' };
  const gemini = {
    models: {
      generateContent: async (request) => {
        callCount += 1;
        if (callCount === 1) {
          return {
            functionCalls: [{
              name: 'resolve_admin_analytics',
              args: { intent: 'overview', requested_days: 7 },
            }],
          };
        }
        interpretationRequest = request;
        return { text: 'Tổ chức chưa có dữ liệu trong khoảng đã chọn.' };
      },
    },
  };
  const service = new ChatService({ gemini, allowedRoles: ['ADMIN'] });
  const result = await service.sendMessage(
    'Tổng quan đội xe',
    { id: 'admin-a', role: 'ADMIN', organizationId: 'org-a' },
    [],
    { adminAnalyticsResolver: async () => noData },
  );

  strictAssert.equal(result.reply, 'Tổ chức chưa có dữ liệu trong khoảng đã chọn.');
  strictAssert.deepEqual(result.structuredData, noData);
  strictAssert.ok(JSON.stringify(interpretationRequest.contents).includes('no_data_guidance'));
}

async function runTests() {
  let mockServer = null;
  let emotionRequestUrl;

  try {
    // 0. Khởi động Mock Backend Server
    console.log('\x1b[36m[Khởi tạo] Tạo mock backend server trên port ' + MOCK_PORT + '...\x1b[0m');
    mockServer = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');

      if (req.url.startsWith('/api/analytics/emotions')) {
        emotionRequestUrl = req.url;
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          metrics: {
            total_records: 120,
            avg_ear: 0.28,
            avg_mar: 0.18,
            avg_perclos: 0.04,
            critical_alerts: 2,
            warning_alerts: 5,
            focus_ratio: 88.5,
            distracted_ratio: 7.2,
            drowsy_ratio: 4.3
          },
          emotion_distribution: {
            neutral: { count: 85, percentage: 70.8 },
            fatigued: { count: 20, percentage: 16.7 },
            happy: { count: 15, percentage: 12.5 }
          }
        }));
        return;
      }

      if (req.url.startsWith('/api/analytics/videos/')) {
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          analysis: {
            video_name: 'cam_trip_888.mp4',
            duration_sec: 180,
            violations: [
              { timestamp_sec: 24.0, type: 'DROWSY', alert_level: 2 },
              { timestamp_sec: 95.5, type: 'DISTRACTED', alert_level: 2 }
            ],
            summary: {
              total_duration_sec: 180,
              total_violations: 2,
              safety_score: 70
            }
          }
        }));
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ success: false, message: 'Not found' }));
    });

    await new Promise((resolve) => mockServer.listen(MOCK_PORT, resolve));
    assert(mockServer !== null, `Mock backend server sẵn sàng trên port ${MOCK_PORT}`);

    await user_summary_tool_uses_authenticated_identity();
    await admin_analytics_tool_uses_server_resolver();
    await no_data_admin_result_is_interpreted_by_gemini();

    const chatService = new ChatService({
      backendUrl: `http://localhost:${MOCK_PORT}`
    });

    // 1. Kiểm tra RBAC (Từ chối DRIVER, chấp thuận FLEET_ADMIN)
    console.log('\n\x1b[36m[Test 1] Kiểm tra Phân quyền RBAC cho Chatbot\x1b[0m');
    const driverUser = { id: 'usr_drv_01', name: 'Tài xế B', role: 'DRIVER' };
    const driverRes = await chatService.sendMessage('Cho tôi xem thông tin tài xế khác', driverUser);
    assert(
      driverRes.reply.includes('không có quyền FLEET_ADMIN'),
      `Từ chối yêu cầu từ tài xế thường (role DRIVER)`
    );
    assert(driverRes.structuredData === null, `Không trả về structuredData cho người dùng trái phép`);

    const adminUser = { id: 'usr_adm_01', name: 'Điều hành viên', role: 'FLEET_ADMIN' };
    const adminWelcomeRes = await chatService.sendMessage('', adminUser);
    assert(
      adminWelcomeRes.reply.includes('Fleet Safety Copilot'),
      `Chấp thuận người dùng có quyền FLEET_ADMIN`
    );

    const sdkShapeGemini = {
      models: {
        generateContent: async ({ contents }) => {
          if (contents.length === 1) {
            return {
              functionCalls: [{
                name: 'query_emotion_stats',
                args: { driver_id: 'drv_test_01' }
              }]
            };
          }
          return { text: 'Đã đọc dữ liệu cảm xúc.' };
        }
      }
    };
    const sdkShapeService = new ChatService({
      backendUrl: `http://localhost:${MOCK_PORT}`,
      gemini: sdkShapeGemini,
      allowedRoles: ['USER'],
      driverId: 'drv_test_01',
    });
    const sdkShapeRes = await sdkShapeService.sendMessage(
      'Thống kê cảm xúc của tôi',
      { id: 'drv_test_01', role: 'USER' }
    );
    const emotionQuery = new URLSearchParams(emotionRequestUrl.split('?')[1]);
    const requestedRangeMs = Date.parse(emotionQuery.get('end_date')) - Date.parse(emotionQuery.get('start_date'));
    assert(
      sdkShapeRes.reply === 'Đã đọc dữ liệu cảm xúc.',
      `Hỗ trợ response functionCalls dạng mảng của Gemini SDK`
    );
    strictAssert.ok(
      Math.abs(requestedRangeMs - 7 * 24 * 60 * 60 * 1000) < 5000,
      'user_emotion_stats_default_to_last_seven_days',
    );

    let secondRequest;
    const thoughtSignature = 'signature-from-gemini';
    const thoughtSignatureGemini = {
      models: {
        generateContent: async (request) => {
          if (request.contents.length === 1) {
            return {
              functionCalls: [{
                name: 'query_emotion_stats',
                args: { driver_id: 'drv_test_01' }
              }],
              candidates: [{
                content: {
                  role: 'model',
                  parts: [{
                    functionCall: {
                      name: 'query_emotion_stats',
                      args: { driver_id: 'drv_test_01' }
                    },
                    thoughtSignature
                  }]
                }
              }]
            };
          }
          secondRequest = request;
          return { text: 'Đã giữ nguyên chữ ký của Gemini.' };
        }
      }
    };
    const thoughtSignatureService = new ChatService({
      backendUrl: `http://localhost:${MOCK_PORT}`,
      gemini: thoughtSignatureGemini,
      allowedRoles: ['USER'],
      driverId: 'drv_test_01',
    });
    await thoughtSignatureService.sendMessage(
      'Thống kê cảm xúc của tôi',
      { id: 'drv_test_01', role: 'USER' },
    );
    assert(
      secondRequest.contents.some((content) =>
        content.role === 'model' &&
        content.parts?.some((part) => part.thoughtSignature === thoughtSignature)
      ),
      `Giữ thought_signature khi gửi kết quả tool về Gemini`
    );

    const unavailableGemini = {
      models: {
        generateContent: async () => {
          throw new Error('Gemini temporarily unavailable');
        }
      }
    };
    const fallbackService = new ChatService({
      backendUrl: `http://localhost:${MOCK_PORT}`,
      gemini: unavailableGemini,
      allowedRoles: ['USER'],
      driverId: 'drv_test_01'
    });
    await strictAssert.rejects(
      fallbackService.sendMessage(
        'Thống kê cảm xúc của tôi',
        { id: 'drv_test_01', role: 'USER' },
        [],
        { authToken: 'test-token' },
      ),
      (error) => error.code === 'GEMINI_UNAVAILABLE',
    );

    const hangingGemini = {
      models: {
        generateContent: () => new Promise(() => {})
      }
    };
    const timeoutService = new ChatService({
      backendUrl: `http://localhost:${MOCK_PORT}`,
      gemini: hangingGemini,
      geminiTimeoutMs: 10,
      allowedRoles: ['USER'],
      driverId: 'drv_test_01'
    });
    await strictAssert.rejects(
      timeoutService.sendMessage(
        'Thống kê cảm xúc của tôi',
        { id: 'drv_test_01', role: 'USER' },
      ),
      (error) => error.code === 'GEMINI_UNAVAILABLE',
    );

    const genericGemini = {
      models: {
        generateContent: async () => ({ text: 'Tôi có thể giúp gì thêm?' })
      }
    };
    const intentFallbackService = new ChatService({
      backendUrl: `http://localhost:${MOCK_PORT}`,
      gemini: genericGemini,
      allowedRoles: ['USER'],
      driverId: 'drv_test_01'
    });
    await strictAssert.rejects(
      intentFallbackService.sendMessage(
        'Thống kê các cảm xúc của tôi',
        { id: 'drv_test_01', role: 'USER' },
      ),
      (error) => error.code === 'GEMINI_TOOL_REQUIRED',
    );

    // 2. Kiểm tra Tool Declarations
    console.log('\n\x1b[36m[Test 2] Kiểm tra Khai báo Công cụ (Gemini Function Declarations)\x1b[0m');
    assert(Array.isArray(geminiToolDeclarations), `Khai báo công cụ là một mảng`);
    assert(geminiToolDeclarations.length === 3, `Có ba công cụ dữ liệu dành cho User`);

    const hasEmotionTool = geminiToolDeclarations.some(t => t.name === 'query_emotion_stats');
    const hasVideoTool = geminiToolDeclarations.some(t => t.name === 'get_video_emotion_breakdown');
    assert(hasEmotionTool, `Công cụ 'query_emotion_stats' được định nghĩa hợp lệ`);
    assert(hasVideoTool, `Công cụ 'get_video_emotion_breakdown' được định nghĩa hợp lệ`);

    // 3. Kiểm tra Gọi Tool query_emotion_stats trực tiếp
    console.log('\n\x1b[36m[Test 3] Kiểm tra Thực thi Tool query_emotion_stats\x1b[0m');
    const emotionToolRes = await executeTool('query_emotion_stats', { driver_id: 'drv_test_01' }, {
      backendUrl: `http://localhost:${MOCK_PORT}`
    });
    assert(emotionToolRes.status === 'SUCCESS', `Thực thi tool query_emotion_stats thành công`);
    assert(emotionToolRes.data.metrics.total_records === 120, `Lấy đúng số bản ghi (120) từ backend`);
    assert(emotionToolRes.data.metrics.critical_alerts === 2, `Lấy đúng số cảnh báo khẩn cấp (2)`);

    // 4. Kiểm tra Gọi Tool get_video_emotion_breakdown trực tiếp
    console.log('\n\x1b[36m[Test 4] Kiểm tra Thực thi Tool get_video_emotion_breakdown\x1b[0m');
    const videoToolRes = await executeTool('get_video_emotion_breakdown', { video_id: 'cam_trip_888' }, {
      backendUrl: `http://localhost:${MOCK_PORT}`
    });
    assert(videoToolRes.status === 'SUCCESS', `Thực thi tool get_video_emotion_breakdown thành công`);
    assert(videoToolRes.data.violations.length === 2, `Lấy đúng danh sách vi phạm video (2 sự cố)`);
    assert(videoToolRes.data.summary.safety_score === 70, `Lấy đúng điểm an toàn video (70/100)`);

  } catch (err) {
    console.error('\x1b[31m[Lỗi Test Chatbot]:\x1b[0m', err);
    failedTests++;
  } finally {
    if (mockServer) {
      await new Promise((resolve) => mockServer.close(resolve));
      console.log('\x1b[36m[Dọn dẹp] Đã tắt mock backend server.\x1b[0m');
    }
  }

  // Tổng kết
  console.log('\n\x1b[1m=== KẾT QUẢ KIỂM THỬ CHATBOT ===\x1b[0m');
  console.log(`Tổng số assertions: ${totalTests}`);
  console.log(`\x1b[32mSố assertions đạt: ${passedTests}\x1b[0m`);
  if (failedTests > 0) {
    console.log(`\x1b[31mSố assertions thất bại: ${failedTests}\x1b[0m\n`);
    process.exit(1);
  } else {
    console.log(`\x1b[32mTất cả bài test Chatbot ĐẠT 100%!\x1b[0m\n`);
    process.exit(0);
  }
}

runTests();
