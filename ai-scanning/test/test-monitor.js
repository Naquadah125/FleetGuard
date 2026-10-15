/**
 * Unit & Integration Tests for DriverSafetyMonitor & VideoAnalyzer
 * Verifies EAR, MAR, Head Pose, PERCLOS, Emotion temporal smoothing, and 500ms video sampling.
 */

import { DriverSafetyMonitor } from '../src/DriverSafetyMonitor.js';
import { VideoAnalyzer } from '../src/videoAnalyzer.js';

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

/**
 * Generate a synthetic 468-point landmark array with custom modifiers
 */
function createSyntheticLandmarks(overrides = {}) {
  const landmarks = new Array(468).fill(null).map(() => ({ x: 0.5, y: 0.5, z: 0 }));

  // Eyes base coordinates (eyeSpan = 0.30, eyeMidX = 0.50, eyeMidY = 0.35)
  landmarks[33] = { x: 0.35, y: 0.35, z: 0 };  // Left eye outer
  landmarks[133] = { x: 0.45, y: 0.35, z: 0 }; // Left eye inner
  landmarks[362] = { x: 0.55, y: 0.35, z: 0 }; // Right eye inner
  landmarks[263] = { x: 0.65, y: 0.35, z: 0 }; // Right eye outer

  // Eye open/closed delta
  const eyeOpenDelta = overrides.eyeClosed ? 0.005 : 0.025; // 0.005 => EAR ~ 0.10, 0.025 => EAR ~ 0.50
  landmarks[160] = { x: 0.38, y: 0.35 - eyeOpenDelta, z: 0 };
  landmarks[144] = { x: 0.38, y: 0.35 + eyeOpenDelta, z: 0 };
  landmarks[158] = { x: 0.42, y: 0.35 - eyeOpenDelta, z: 0 };
  landmarks[153] = { x: 0.42, y: 0.35 + eyeOpenDelta, z: 0 };

  landmarks[385] = { x: 0.58, y: 0.35 - eyeOpenDelta, z: 0 };
  landmarks[380] = { x: 0.58, y: 0.35 + eyeOpenDelta, z: 0 };
  landmarks[387] = { x: 0.62, y: 0.35 - eyeOpenDelta, z: 0 };
  landmarks[373] = { x: 0.62, y: 0.35 + eyeOpenDelta, z: 0 };

  // Mouth base coordinates (horizontal = 0.10)
  landmarks[78] = { x: 0.45, y: 0.65, z: 0 };
  landmarks[308] = { x: 0.55, y: 0.65, z: 0 };

  const mouthOpenDelta = overrides.yawning ? 0.05 : 0.01; // 0.05 => MAR ~ 0.75, 0.01 => MAR ~ 0.15
  landmarks[13] = { x: 0.50, y: 0.65 - mouthOpenDelta, z: 0 };
  landmarks[14] = { x: 0.50, y: 0.65 + mouthOpenDelta, z: 0 };
  landmarks[82] = { x: 0.48, y: 0.65 - mouthOpenDelta, z: 0 };
  landmarks[317] = { x: 0.48, y: 0.65 + mouthOpenDelta, z: 0 };
  landmarks[87] = { x: 0.52, y: 0.65 - mouthOpenDelta, z: 0 };
  landmarks[312] = { x: 0.52, y: 0.65 + mouthOpenDelta, z: 0 };

  // Head pose: Nose and Chin
  const noseXOffset = overrides.noseXOffset ?? 0.0;
  landmarks[1] = { x: 0.50 + noseXOffset, y: 0.50, z: 0 }; // Nose tip
  landmarks[152] = { x: 0.50, y: 0.75, z: 0 };             // Chin

  // Eyebrows for emotion (AU4 Corrugator supercilii)
  const browSpacing = overrides.angry ? 0.06 : 0.12; // 0.06 / 0.30 = 0.20 < 0.28 (angry)
  landmarks[55] = { x: 0.50 - browSpacing / 2, y: 0.28, z: 0 };
  landmarks[285] = { x: 0.50 + browSpacing / 2, y: 0.28, z: 0 };

  // Smile points (AU12)
  landmarks[61] = { x: 0.44, y: 0.65, z: 0 };
  landmarks[291] = { x: 0.56, y: 0.65, z: 0 };

  // Brow height points
  landmarks[70] = { x: 0.40, y: 0.25, z: 0 };
  landmarks[159] = { x: 0.40, y: 0.33, z: 0 };
  landmarks[300] = { x: 0.60, y: 0.25, z: 0 };
  landmarks[386] = { x: 0.60, y: 0.33, z: 0 };

  return landmarks;
}

console.log('\n\x1b[1m=== BẮT ĐẦU KIỂM THỬ: DRIVER SAFETY MONITOR & VIDEO ANALYZER ===\x1b[0m\n');

// -------------------------------------------------------------
// Test 1: EAR Calculation & Drowsiness State Machine (45 frames)
// -------------------------------------------------------------
console.log('\x1b[36m[Test 1] Kiểm tra EAR và Phát hiện Ngủ gật (DROWSY - Cấp 2)\x1b[0m');
{
  const monitor = new DriverSafetyMonitor();
  const normalFace = createSyntheticLandmarks({ eyeClosed: false });
  const closedFace = createSyntheticLandmarks({ eyeClosed: true });

  const normalEar = monitor.calculateEAR(normalFace);
  const closedEar = monitor.calculateEAR(closedFace);

  assert(normalEar > 0.21, `EAR mắt mở bình thường đạt ${normalEar.toFixed(3)} (> 0.21)`);
  assert(closedEar < 0.21, `EAR mắt nhắm đạt ${closedEar.toFixed(3)} (< 0.21)`);

  let lastPayload = null;
  // Xử lý 44 frame nhắm mắt -> Chưa đạt ngưỡng 45 frame
  for (let i = 1; i <= 44; i++) {
    lastPayload = monitor.processLandmarks(closedFace);
  }
  assert(lastPayload.status !== 'DROWSY', `44 frame nhắm mắt chưa báo động DROWSY (Hiện tại: ${lastPayload.status})`);
  assert(monitor.consecutiveDrowsyFrames === 44, `Đếm đúng 44 frame nhắm mắt liên tiếp`);

  // Đến frame thứ 45 -> Kích hoạt DROWSY Level 2
  lastPayload = monitor.processLandmarks(closedFace);
  assert(lastPayload.status === 'DROWSY', `Đủ 45 frame nhắm mắt kích hoạt trạng thái 'DROWSY'`);
  assert(lastPayload.alert_level === 2, `Cảnh báo chuyển sang Level 2 (DANGER)`);

  // Khi mở mắt lại -> Giảm dần bộ đếm
  monitor.processLandmarks(normalFace);
  assert(monitor.consecutiveDrowsyFrames === 43, `Mở mắt làm giảm bộ đếm ngủ gật theo bước 2`);
}

// -------------------------------------------------------------
// Test 2: MAR Calculation & Yawn State Machine (45 frames)
// -------------------------------------------------------------
console.log('\n\x1b[36m[Test 2] Kiểm tra MAR và Phát hiện Ngáp (YAWNING - Cấp 1)\x1b[0m');
{
  const monitor = new DriverSafetyMonitor();
  const normalFace = createSyntheticLandmarks({ yawning: false });
  const yawnFace = createSyntheticLandmarks({ yawning: true });

  const normalMar = monitor.calculateMAR(normalFace);
  const yawnMar = monitor.calculateMAR(yawnFace);

  assert(normalMar < 0.65, `MAR miệng bình thường đạt ${normalMar.toFixed(3)} (< 0.65)`);
  assert(yawnMar > 0.65, `MAR ngáp mở to miệng đạt ${yawnMar.toFixed(3)} (> 0.65)`);

  let lastPayload = null;
  for (let i = 1; i <= 45; i++) {
    lastPayload = monitor.processLandmarks(yawnFace);
  }

  assert(lastPayload.status === 'YAWNING', `Ngáp liên tục 45 frame kích hoạt trạng thái 'YAWNING'`);
  assert(lastPayload.alert_level === 1, `Cảnh báo ngáp ở Level 1 (WARNING)`);
  assert(lastPayload.yawn_count === 1, `Bộ đếm số lần ngáp tăng lên 1 (Hiện tại: ${lastPayload.yawn_count})`);

  // Miệng khép lại -> Reset đếm ngáp về 0
  lastPayload = monitor.processLandmarks(normalFace);
  assert(monitor.consecutiveYawnFrames === 0, `Khép miệng reset consecutiveYawnFrames về 0`);
  assert(lastPayload.status === 'NORMAL', `Trở về trạng thái NORMAL`);
  assert(lastPayload.yawn_count === 1, `Tổng số lần ngáp trong phiên vẫn được giữ nguyên`);
}

// -------------------------------------------------------------
// Test 3: Head Pose & Distraction (Yaw > 25° trong 60 frames)
// -------------------------------------------------------------
console.log('\n\x1b[36m[Test 3] Kiểm tra Head Pose và Mất tập trung (DISTRACTED - Cấp 2)\x1b[0m');
{
  const monitor = new DriverSafetyMonitor();
  const forwardFace = createSyntheticLandmarks({ noseXOffset: 0.0 });
  const turnedFace = createSyntheticLandmarks({ noseXOffset: 0.055 }); // Quay ngang khoảng 30 độ

  const forwardPose = monitor.calculateHeadPose(forwardFace);
  const turnedPose = monitor.calculateHeadPose(turnedFace);

  assert(Math.abs(forwardPose.yaw) < 25.0, `Góc yaw nhìn thẳng là ${forwardPose.yaw}° (< 25°)`);
  assert(Math.abs(turnedPose.yaw) > 25.0, `Góc yaw quay ngang là ${turnedPose.yaw}° (> 25°)`);

  let lastPayload = null;
  for (let i = 1; i <= 59; i++) {
    lastPayload = monitor.processLandmarks(turnedFace);
  }
  assert(lastPayload.status !== 'DISTRACTED', `59 frame quay mặt chưa đạt ngưỡng 60 frames`);

  lastPayload = monitor.processLandmarks(turnedFace);
  assert(lastPayload.status === 'DISTRACTED', `Đủ 60 frame quay mặt kích hoạt 'DISTRACTED'`);
  assert(lastPayload.alert_level === 2, `Cảnh báo mất tập trung là Level 2 (DANGER)`);
}

// -------------------------------------------------------------
// Test 4: Facial Action Unit Anger & Temporal Smoothing (45 frames)
// -------------------------------------------------------------
console.log('\n\x1b[36m[Test 4] Kiểm tra Cảm xúc Giận dữ và Temporal Smoothing (ANGRY_OUTBURST - Cấp 2)\x1b[0m');
{
  const monitor = new DriverSafetyMonitor();
  const angryFace = createSyntheticLandmarks({ angry: true });
  const normalFace = createSyntheticLandmarks({ angry: false });

  // 1 frame giận dữ đơn lẻ không làm bùng phát cảnh báo cấp 2 ngay (tránh false positive)
  let payload1 = monitor.processLandmarks(angryFace);
  assert(payload1.status === 'NORMAL', `1 frame giận dữ chưa kích hoạt ANGRY_OUTBURST (tránh false positive)`);

  // Duy trì giận dữ trong 45 frames (tỷ lệ >= 65%)
  for (let i = 2; i <= 45; i++) {
    payload1 = monitor.processLandmarks(angryFace);
  }

  assert(payload1.emotion === 'angry', `Cảm xúc chủ đạo nhận diện là 'angry'`);
  assert(payload1.status === 'ANGRY_OUTBURST', `Duy trì giận dữ 45 frame kích hoạt 'ANGRY_OUTBURST'`);
  assert(payload1.alert_level === 2, `Cảnh báo giận dữ bùng phát là Level 2 (DANGER)`);
}

// -------------------------------------------------------------
// Test 5: PERCLOS Sliding Window (Ngưỡng >= 0.15)
// -------------------------------------------------------------
console.log('\n\x1b[36m[Test 5] Kiểm tra Cửa sổ trượt PERCLOS 60s\x1b[0m');
{
  const monitor = new DriverSafetyMonitor({ slidingWindowSeconds: 2, targetFps: 10 }); // 20 frames buffer
  // Cho nhắm mắt 4 frame trên 20 frame (4 / 20 = 0.20 >= 0.15)
  for (let i = 0; i < 16; i++) {
    monitor.updatePERCLOS(false);
  }
  for (let i = 0; i < 4; i++) {
    monitor.updatePERCLOS(true);
  }

  const perclosVal = monitor.closureBuffer.reduce((a, b) => a + b, 0) / monitor.closureBuffer.length;
  assert(perclosVal >= 0.15, `PERCLOS tính đúng tỉ lệ mắt nhắm ${perclosVal.toFixed(3)} (>= 0.15)`);
}

// -------------------------------------------------------------
// Test 6: VideoAnalyzer Offline Sampling (500ms) & Timeline
// -------------------------------------------------------------
console.log('\n\x1b[36m[Test 6] Kiểm tra VideoAnalyzer Phân tích Video Offline mỗi 500ms\x1b[0m');
{
  const analyzer = new VideoAnalyzer({ sampleIntervalMs: 500 });

  // Giả lập 300 frame video tương đương 10 giây (30 FPS, dt = 33.3ms)
  const videoFrames = [];
  const baseTimestamp = 1700000000000;

  for (let f = 0; f < 300; f++) {
    const frameTime = baseTimestamp + Math.round(f * (1000 / 30));
    // Giây 0 đến 2 (frame 0-60): Lái xe bình thường
    // Giây 2 đến 4.5 (frame 61-135): Quay đầu mất tập trung
    // Giây 4.5 đến 6.5 (frame 136-190): Bình thường trở lại
    // Giây 6.5 đến 9 (frame 191-260): Nhắm mắt ngủ gật
    // Giây 9 đến 10 (frame 261-299): Bình thường trở lại
    let overrides = {};
    if (f >= 61 && f <= 135) {
      overrides.noseXOffset = 0.06;
    } else if (f >= 191 && f <= 260) {
      overrides.eyeClosed = true;
    }

    videoFrames.push({
      landmarks: createSyntheticLandmarks(overrides),
      timestamp: frameTime
    });
  }

  const result = analyzer.analyzeFrames(videoFrames);

  assert(result.emotion_timeline.length > 0, `Tạo thành công emotion_timeline (${result.emotion_timeline.length} mốc)`);
  assert(result.summary.total_frames_analyzed <= 25, `Lấy mẫu chính xác khoảng 20-22 mốc cho 10s (mỗi 500ms lấy 1 mẫu)`);
  assert(result.violations.length > 0, `Phát hiện được danh sách vi phạm (${result.violations.length} vi phạm)`);

  const hasDrowsyViolation = result.violations.some(v => v.type === 'DROWSY');
  const hasDistractedViolation = result.violations.some(v => v.type === 'DISTRACTED');

  assert(hasDrowsyViolation, `Tìm thấy vi phạm ngủ gật 'DROWSY' trong video`);
  assert(hasDistractedViolation, `Tìm thấy vi phạm quay đầu 'DISTRACTED' trong video`);
  assert(result.summary.highest_alert_level === 2, `Cảnh báo cao nhất trong video là Level 2`);
  assert(result.summary.safety_score < 100, `Điểm an toàn bị trừ khi có vi phạm (Điểm: ${result.summary.safety_score}/100)`);
}

// -------------------------------------------------------------
// Test 7: Xử lý ngoại lệ Không phát hiện khuôn mặt (NO_FACE)
// -------------------------------------------------------------
console.log('\n\x1b[36m[Test 7] Kiểm tra Xử lý Ngoại lệ (NO_FACE / Che camera)\x1b[0m');
{
  const monitor = new DriverSafetyMonitor();
  const nullResult = monitor.processLandmarks(null);
  assert(nullResult.status === 'NO_FACE', `Xử lý an toàn khi landmarks là null -> Trạng thái 'NO_FACE'`);
  assert(nullResult.alert_level === 1, `Khi mất dấu khuôn mặt, phát cảnh báo Level 1`);

  const emptyResult = monitor.processLandmarks([]);
  assert(emptyResult.status === 'NO_FACE', `Xử lý an toàn khi mảng landmarks rỗng (< 468 điểm)`);
}

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n\x1b[1m=== KẾT QUẢ KIỂM THỬ ===\x1b[0m');
console.log(`Tổng số assertions: ${totalTests}`);
console.log(`\x1b[32mSố bài test đạt: ${passedTests}\x1b[0m`);
if (failedTests > 0) {
  console.log(`\x1b[31mSố bài test thất bại: ${failedTests}\x1b[0m\n`);
  process.exit(1);
} else {
  console.log(`\x1b[32mTất cả bài test ĐẠT 100%!\x1b[0m\n`);
  process.exit(0);
}
