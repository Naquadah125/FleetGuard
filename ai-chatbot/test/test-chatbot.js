/**
 * Unit & Integration Test Suite for Fleet Copilot AI Chatbot
 * Tests:
 * 1. RBAC Security: Enforcing FLEET_ADMIN role, rejecting DRIVER role
 * 2. Tool Declarations: Validating Gemini function calling schemas
 * 3. Tool Execution: Calling query_emotion_stats & get_video_emotion_breakdown
 * 4. Multi-turn Agent Loop: Synthesizing natural reply + structuredData JSON
 */

import http from 'http';
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

async function runTests() {
  let mockServer = null;

  try {
    // 0. Khởi động Mock Backend Server
    console.log('\x1b[36m[Khởi tạo] Tạo mock backend server trên port ' + MOCK_PORT + '...\x1b[0m');
    mockServer = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');

      if (req.url.startsWith('/api/analytics/emotions')) {
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

    // 2. Kiểm tra Tool Declarations
    console.log('\n\x1b[36m[Test 2] Kiểm tra Khai báo Công cụ (Gemini Function Declarations)\x1b[0m');
    assert(Array.isArray(geminiToolDeclarations), `Khai báo công cụ là một mảng`);
    assert(geminiToolDeclarations.length === 2, `Có đầy đủ 2 công cụ cốt lõi`);

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

    // 5. Kiểm tra Agent trả lời câu hỏi tài xế kèm structuredData
    console.log('\n\x1b[36m[Test 5] Kiểm tra Agent Xử lý Câu hỏi Tài xế & Trả về Structured Data\x1b[0m');
    const chatDriverRes = await chatService.sendMessage(
      'Tài xế drv_test_01 có dấu hiệu mệt mỏi hay buồn ngủ không?',
      adminUser
    );
    assert(chatDriverRes.toolsUsed.includes('query_emotion_stats'), `Agent tự động kích hoạt tool 'query_emotion_stats'`);
    assert(chatDriverRes.structuredData !== null, `Trả về structuredData cho giao diện dashboard`);
    assert(chatDriverRes.reply.includes('120 bản ghi'), `Nội dung trả lời tự nhiên có nhắc đến số liệu`);
    assert(chatDriverRes.reply.includes('Cảnh báo an toàn'), `Copilot tự động đưa ra cảnh báo can thiệp kịp thời`);

    // 6. Kiểm tra Agent trả lời câu hỏi video
    console.log('\n\x1b[36m[Test 6] Kiểm tra Agent Xử lý Câu hỏi Phân tích Video\x1b[0m');
    const chatVideoRes = await chatService.sendMessage(
      'Kiểm tra vi phạm trong video cam_trip_888',
      adminUser
    );
    assert(chatVideoRes.toolsUsed.includes('get_video_emotion_breakdown'), `Agent tự động kích hoạt tool 'get_video_emotion_breakdown'`);
    assert(chatVideoRes.structuredData !== null, `Có structuredData video`);
    assert(chatVideoRes.reply.includes('2 vi phạm'), `Nội dung tóm tắt chính xác 2 vi phạm trong video`);

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
