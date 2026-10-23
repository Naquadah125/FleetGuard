/**
 * Integration Test Suite for Driver Safety Backend
 * Tests:
 * 1. Auth REST API (User registration, login, JWT token verification)
 * 2. Socket.io Telemetry Streaming (Live relay to Fleet Admin)
 * 3. 2-Second Telemetry Batching Buffer (Queueing and flushing)
 * 4. Critical Alert Level 2 Instant Relay to Fleet Admin
 * 5. Emotion Analytics Aggregation API (/api/analytics/emotions)
 * 6. Removed Video Analysis report endpoints
 */

import { io as ClientSocket } from 'socket.io-client';
import http from 'http';
import { startServer, stopServer, telemetryHandler } from './src/server.js';
import { memoryStore } from './src/db.js';

const TEST_PORT = 5055;
const BASE_URL = `http://localhost:${TEST_PORT}`;

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  \x1b[32m✓\x1b[0m ${message}`);
  } else {
    failedAssertions++;
    console.error(`  \x1b[31m✗\x1b[0m ${message}`);
  }
}

/**
 * HTTP helper
 */
async function httpRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      url,
      {
        method,
        headers
      },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

console.log('\n\x1b[1m=== BẮT ĐẦU KIỂM THỬ TÍCH HỢP: DRIVER SAFETY BACKEND ===\x1b[0m\n');

async function runTests() {
  let serverInstance = null;
  let adminSocket = null;
  let driverSocket = null;

  try {
    // 0. Khởi động backend server
    console.log('\x1b[36m[Khởi tạo] Khởi động test server trên port ' + TEST_PORT + '...\x1b[0m');
    serverInstance = await startServer(TEST_PORT);
    assert(serverInstance !== null, `Server khởi chạy thành công trên cổng ${TEST_PORT}`);

    // 1. Kiểm tra Auth API (Đăng ký & Đăng nhập)
    console.log('\n\x1b[36m[Test 1] Kiểm tra Auth REST API & JWT RBAC\x1b[0m');
    const adminRegRes = await httpRequest('/api/auth/register', 'POST', {
      name: 'Fleet Manager',
      email: 'admin@fleet.vn',
      password: 'SecurePassword123!',
      role: 'FLEET_ADMIN'
    });
    assert(adminRegRes.status === 201, `Đăng ký tài khoản FLEET_ADMIN thành công (Status: ${adminRegRes.status})`);
    assert(adminRegRes.data.token !== undefined, `Nhận được JWT token cho FLEET_ADMIN`);

    const adminToken = adminRegRes.data.token;

    const driverRegRes = await httpRequest('/api/auth/register', 'POST', {
      name: 'Nguyễn Văn A',
      email: 'driver1@fleet.vn',
      password: 'DriverPass123!',
      role: 'DRIVER',
      vehicle_id: 'VEH-9999'
    });
    assert(driverRegRes.status === 201, `Đăng ký tài khoản DRIVER thành công`);

    const loginRes = await httpRequest('/api/auth/login', 'POST', {
      email: 'driver1@fleet.vn',
      password: 'DriverPass123!'
    });
    assert(loginRes.status === 200, `Đăng nhập thành công với tài khoản DRIVER`);
    assert(loginRes.data.user.role === 'DRIVER', `Role trả về chính xác là DRIVER`);

    const meRes = await httpRequest('/api/auth/me', 'GET', null, adminToken);
    assert(meRes.status === 200 && meRes.data.user.email === 'admin@fleet.vn', `Xác thực JWT token thành công qua /api/auth/me`);

    // 2. Kiểm tra Socket.io kết nối và tham gia phòng Admin
    console.log('\n\x1b[36m[Test 2] Kiểm tra Kết nối Socket.io & Room Fleet Admins\x1b[0m');
    adminSocket = ClientSocket(BASE_URL);
    await new Promise((resolve) => adminSocket.on('connect', resolve));
    assert(adminSocket.connected, `Socket Client Admin kết nối thành công`);

    const joinedPromise = new Promise((resolve) => {
      adminSocket.on('admin:joined', (msg) => resolve(msg));
    });
    adminSocket.emit('admin:join');
    const joinedMsg = await joinedPromise;
    assert(joinedMsg.room === 'room:fleet_admins', `Admin tham gia phòng 'room:fleet_admins' thành công`);

    // 3. Kiểm tra Driver stream telemetry & Bộ đệm Batching 2 giây
    console.log('\n\x1b[36m[Test 3] Kiểm tra Telemetry Streaming & Bộ đệm Batch Buffer\x1b[0m');
    driverSocket = ClientSocket(BASE_URL);
    await new Promise((resolve) => driverSocket.on('connect', resolve));
    assert(driverSocket.connected, `Socket Client Driver kết nối thành công`);

    // Lắng nghe live telemetry phía Admin
    let liveReceivedCount = 0;
    adminSocket.on('telemetry:live', () => {
      liveReceivedCount++;
    });

    const driverId = 'drv_test_01';
    const sessionId = 'ses_test_01';

    // Phát 5 frames telemetry bình thường
    for (let i = 1; i <= 5; i++) {
      driverSocket.emit('telemetry:stream', {
        driver_id: driverId,
        session_id: sessionId,
        vehicle_id: 'VEH-9999',
        ear: 0.35,
        mar: 0.15,
        perclos: 0.02,
        head_pose: { yaw: 2.0, pitch: -3.0, roll: 0.0 },
        emotion: 'neutral',
        emotion_confidence: 0.85,
        scores: { neutral: 0.85, happy: 0.05, angry: 0, sad: 0, surprised: 0, fatigued: 0.1 },
        status: 'NORMAL',
        alert_level: 0,
        timestamp: Date.now()
      });
    }

    // Đợi 100ms để socket truyền tin
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert(liveReceivedCount === 5, `Fleet Admin nhận trực tiếp 5 telemetry events thời gian thực`);
    assert(telemetryHandler.telemetryBuffer.length >= 5, `Bộ đệm in-memory tích lũy đủ 5 bản ghi (Hiện có: ${telemetryHandler.telemetryBuffer.length})`);

    // 4. Kiểm tra Batch Insert Flush vào Database
    console.log('\n\x1b[36m[Test 4] Kiểm tra Batch Flush vào Database (chu kỳ 2s)\x1b[0m');
    const flushedCount = await telemetryHandler.flushBatch();
    assert(flushedCount >= 5, `Xả thành công ${flushedCount} bản ghi từ bộ đệm vào Database`);
    assert(telemetryHandler.telemetryBuffer.length === 0, `Bộ đệm in-memory được làm rỗng sau khi flush`);

    // 5. Kiểm tra Phát cảnh báo Nguy hiểm Cấp 2 ngay lập tức (Critical Alert Relay)
    console.log('\n\x1b[36m[Test 5] Kiểm tra Relay Cảnh báo Khẩn cấp Level 2 (DROWSY)\x1b[0m');
    const criticalAlertPromise = new Promise((resolve) => {
      adminSocket.on('alert:critical', (alert) => resolve(alert));
    });

    // Driver phát 1 cảnh báo khẩn cấp Level 2 (Ngủ gật)
    driverSocket.emit('telemetry:stream', {
      driver_id: driverId,
      session_id: sessionId,
      vehicle_id: 'VEH-9999',
      ear: 0.11,
      mar: 0.20,
      perclos: 0.30,
      head_pose: { yaw: 0, pitch: -10, roll: 0 },
      emotion: 'fatigued',
      emotion_confidence: 0.95,
      status: 'DROWSY',
      alert_level: 2,
      timestamp: Date.now()
    });

    const receivedAlert = await criticalAlertPromise;
    assert(receivedAlert.alert_level === 2, `Admin nhận ngay lập tức cảnh báo Alert Level 2`);
    assert(receivedAlert.status === 'DROWSY', `Trạng thái cảnh báo khẩn cấp là 'DROWSY'`);
    assert(receivedAlert.driver_id === driverId, `Mã tài xế vi phạm khớp chính xác (${receivedAlert.driver_id})`);

    // Flush cảnh báo vào DB
    await telemetryHandler.flushBatch();

    // 6. Kiểm tra REST API Analytics (/api/analytics/emotions)
    console.log('\n\x1b[36m[Test 6] Kiểm tra REST API Thống kê Cảm xúc & Tập trung (/api/analytics/emotions)\x1b[0m');
    const analyticsRes = await httpRequest(`/api/analytics/emotions?driver_id=${driverId}`, 'GET');
    assert(analyticsRes.status === 200, `API /api/analytics/emotions trả về HTTP 200`);
    assert(analyticsRes.data.success === true, `Response success là true`);
    assert(analyticsRes.data.metrics.total_records >= 6, `Tổng số bản ghi tổng hợp đạt ${analyticsRes.data.metrics.total_records}`);
    assert(analyticsRes.data.metrics.critical_alerts >= 1, `Ghi nhận chính xác số cảnh báo khẩn cấp (>= 1)`);
    assert(analyticsRes.data.emotion_distribution.neutral !== undefined, `Phân phối cảm xúc chứa 'neutral'`);

    // 7. Removed offline video analysis report API
    console.log('\n\x1b[36m[Test 7] Xác nhận API báo cáo phân tích video đã bị gỡ\x1b[0m');
    const saveVidRes = await httpRequest('/api/analytics/videos', 'POST', { video_name: 'removed.mp4' });
    assert(saveVidRes.status === 404, `POST /api/analytics/videos không còn khả dụng (Status: ${saveVidRes.status})`);

    const getVidRes = await httpRequest('/api/analytics/videos/removed-id', 'GET');
    assert(getVidRes.status === 404, `GET /api/analytics/videos/:id không còn khả dụng (Status: ${getVidRes.status})`);

  } catch (err) {
    console.error('\x1b[31m[Lỗi Test]:\x1b[0m', err);
    failedAssertions++;
  } finally {
    // Dọn dẹp kết nối
    if (adminSocket) adminSocket.disconnect();
    if (driverSocket) driverSocket.disconnect();
    await stopServer();
    console.log('\x1b[36m[Dọn dẹp] Đã đóng các Socket và tắt server kiểm thử.\x1b[0m');
  }

  // Tổng kết
  console.log('\n\x1b[1m=== KẾT QUẢ KIỂM THỬ BACKEND ===\x1b[0m');
  console.log(`Tổng số assertions: ${totalAssertions}`);
  console.log(`\x1b[32mSố assertions đạt: ${passedAssertions}\x1b[0m`);
  if (failedAssertions > 0) {
    console.log(`\x1b[31mSố assertions thất bại: ${failedAssertions}\x1b[0m\n`);
    process.exit(1);
  } else {
    console.log(`\x1b[32mTất cả bài test Backend ĐẠT 100%!\x1b[0m\n`);
    process.exit(0);
  }
}

runTests();
