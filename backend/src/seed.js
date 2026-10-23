import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcryptjs';
import { User, DrivingSession, EmotionLog, AuditLog } from './models/index.js';
import { getIsMongoConnected, memoryStore, connectDB, disconnectDB } from './db.js';

export const ORG_ID = 'org_fleetguard_logistics';
export const ORG_NAME = 'FleetGuard Logistics Corp';

export const SEED_USERS = [
  // 1. Tài khoản Quản trị viên (Admin)
  {
    id: 'ADMIN-001',
    name: 'Trần Hoàng Nam (Quản trị viên)',
    email: 'admin@fleet.vn',
    password: 'password123',
    role: 'ADMIN',
    organizationId: ORG_ID,
    organizationName: ORG_NAME,
    phone: '0908123456',
    dateOfBirth: '1985-06-15',
    avatarColor: '#0E9B78'
  },

  // 2. Tài khoản Cá nhân (User) độc lập
  {
    id: 'USR-PERSONAL-01',
    name: 'Hoàng Văn Khang (Lái xe cá nhân)',
    email: 'user@fleet.vn',
    password: 'password123',
    role: 'USER',
    organizationId: null,
    organizationName: 'Cá nhân',
    phone: '0987654321',
    dateOfBirth: '1993-04-25',
    avatarColor: '#F59E0B'
  },

  // 3. 6 Tài xế liên kết trong đội xe của Admin (Cùng organizationId)
  {
    id: 'DRV-001',
    name: 'Nguyễn Văn An',
    email: 'an.nguyen@fleet.vn',
    password: 'password123',
    role: 'DRIVER',
    organizationId: ORG_ID,
    organizationName: ORG_NAME,
    phone: '0912345601',
    dateOfBirth: '1990-03-12',
    avatarColor: '#2563EB',
    vehicleId: '51C-882.14'
  },
  {
    id: 'DRV-002',
    name: 'Trần Minh Đức',
    email: 'duc.tran@fleet.vn',
    password: 'password123',
    role: 'DRIVER',
    organizationId: ORG_ID,
    organizationName: ORG_NAME,
    phone: '0912345602',
    dateOfBirth: '1992-08-22',
    avatarColor: '#7C3AED',
    vehicleId: '51D-945.32'
  },
  {
    id: 'DRV-003',
    name: 'Lê Quốc Bảo',
    email: 'bao.le@fleet.vn',
    password: 'password123',
    role: 'DRIVER',
    organizationId: ORG_ID,
    organizationName: ORG_NAME,
    phone: '0912345603',
    dateOfBirth: '1988-11-05',
    avatarColor: '#D97706',
    vehicleId: '60B-123.88'
  },
  {
    id: 'DRV-004',
    name: 'Phạm Hoàng Nam',
    email: 'nam.pham@fleet.vn',
    password: 'password123',
    role: 'DRIVER',
    organizationId: ORG_ID,
    organizationName: ORG_NAME,
    phone: '0912345604',
    dateOfBirth: '1995-01-30',
    avatarColor: '#DC2626',
    vehicleId: '50H-567.89'
  },
  {
    id: 'DRV-005',
    name: 'Võ Thành Long',
    email: 'long.vo@fleet.vn',
    password: 'password123',
    role: 'DRIVER',
    organizationId: ORG_ID,
    organizationName: ORG_NAME,
    phone: '0912345605',
    dateOfBirth: '1991-07-18',
    avatarColor: '#059669',
    vehicleId: '51A-789.01'
  },
  {
    id: 'DRV-006',
    name: 'Đặng Gia Huy',
    email: 'huy.dang@fleet.vn',
    password: 'password123',
    role: 'DRIVER',
    organizationId: ORG_ID,
    organizationName: ORG_NAME,
    phone: '0912345606',
    dateOfBirth: '1994-12-09',
    avatarColor: '#0891B2',
    vehicleId: '29C-334.55'
  }
];

// Cấu hình lịch sử phiên lái mẫu trải dài 7 ngày gần đây
export const RAW_SESSIONS_CONFIG = [
  // Lịch sử cho tài khoản cá nhân (user@fleet.vn)
  {
    session_id: 'SES-USER-20261023-01',
    user_email: 'user@fleet.vn',
    vehicle_id: '59A-112.33',
    daysAgo: 1,
    durationMinutes: 75,
    safety_score: 96,
    drowsy_count: 0,
    yawn_count: 1,
    distracted_count: 0,
    normal_count: 420,
    peak_alert_level: 1,
    notes: 'Chuyến đi sáng ngoại thành. Trạng thái tỉnh táo, 1 lần ngáp nhẹ khi đợi đèn đỏ.'
  },
  {
    session_id: 'SES-USER-20261021-01',
    user_email: 'user@fleet.vn',
    vehicle_id: '59A-112.33',
    daysAgo: 3,
    durationMinutes: 90,
    safety_score: 88,
    drowsy_count: 1,
    yawn_count: 2,
    distracted_count: 1,
    normal_count: 480,
    peak_alert_level: 2,
    notes: 'Lái xe sau giờ làm việc. Cảnh báo buồn ngủ lúc 18:30, đã tấp xe uống nước.'
  },
  {
    session_id: 'SES-USER-20261019-01',
    user_email: 'user@fleet.vn',
    vehicle_id: '59A-112.33',
    daysAgo: 5,
    durationMinutes: 120,
    safety_score: 83,
    drowsy_count: 2,
    yawn_count: 1,
    distracted_count: 2,
    normal_count: 650,
    peak_alert_level: 2,
    notes: 'Hành trình đường dài. Hệ thống ghi nhận 2 lần nhắm mắt chậm và 2 lần mất tập trung.'
  },

  // 1. Tài xế Nguyễn Văn An (an.nguyen@fleet.vn)
  {
    session_id: 'SES-ORG-AN-01',
    user_email: 'an.nguyen@fleet.vn',
    vehicle_id: '51C-882.14',
    daysAgo: 0.5,
    durationMinutes: 120,
    safety_score: 97,
    drowsy_count: 0,
    yawn_count: 1,
    distracted_count: 0,
    normal_count: 680,
    peak_alert_level: 1,
    notes: 'Tuyến Q.1 -> KCN VSIP Bình Dương. Vận hành mẫu mực, giữ khoảng cách tốt.'
  },
  {
    session_id: 'SES-ORG-AN-02',
    user_email: 'an.nguyen@fleet.vn',
    vehicle_id: '51C-882.14',
    daysAgo: 2,
    durationMinutes: 150,
    safety_score: 93,
    drowsy_count: 1,
    yawn_count: 2,
    distracted_count: 0,
    normal_count: 820,
    peak_alert_level: 2,
    notes: 'Tuyến Cát Lái -> Biên Hòa. Có 1 cảnh báo buồn ngủ ngắn giữa ca.'
  },

  // 2. Tài xế Trần Minh Đức (duc.tran@fleet.vn)
  {
    session_id: 'SES-ORG-DUC-01',
    user_email: 'duc.tran@fleet.vn',
    vehicle_id: '51D-945.32',
    daysAgo: 1,
    durationMinutes: 160,
    safety_score: 84,
    drowsy_count: 2,
    yawn_count: 3,
    distracted_count: 1,
    normal_count: 860,
    peak_alert_level: 2,
    notes: 'Tuyến Long An -> TP.HCM. Di chuyển trong mưa, dấu hiệu mệt mỏi ở 30 phút cuối.'
  },
  {
    session_id: 'SES-ORG-DUC-02',
    user_email: 'duc.tran@fleet.vn',
    vehicle_id: '51D-945.32',
    daysAgo: 4,
    durationMinutes: 180,
    safety_score: 79,
    drowsy_count: 3,
    yawn_count: 4,
    distracted_count: 2,
    normal_count: 910,
    peak_alert_level: 2,
    notes: 'Ca đêm Tân Cảng -> Hiệp Phước. Cảnh báo cấp 2 kích hoạt 3 lần, cần theo dõi sức khỏe.'
  },

  // 3. Tài xế Lê Quốc Bảo (bao.le@fleet.vn)
  {
    session_id: 'SES-ORG-BAO-01',
    user_email: 'bao.le@fleet.vn',
    vehicle_id: '60B-123.88',
    daysAgo: 0.3,
    durationMinutes: 90,
    safety_score: 98,
    drowsy_count: 0,
    yawn_count: 0,
    distracted_count: 0,
    normal_count: 510,
    peak_alert_level: 0,
    notes: 'Tuyến xe đưa đón nhân viên. Tập trung cao độ, không phát hiện vi phạm.'
  },
  {
    session_id: 'SES-ORG-BAO-02',
    user_email: 'bao.le@fleet.vn',
    vehicle_id: '60B-123.88',
    daysAgo: 3,
    durationMinutes: 130,
    safety_score: 95,
    drowsy_count: 0,
    yawn_count: 1,
    distracted_count: 1,
    normal_count: 730,
    peak_alert_level: 1,
    notes: 'Tuyến Sài Gòn -> Vũng Tàu. Vận hành ổn định, 1 lần ngáp nhẹ khi trả khách.'
  },

  // 4. Tài xế Phạm Hoàng Nam (nam.pham@fleet.vn)
  {
    session_id: 'SES-ORG-NAM-01',
    user_email: 'nam.pham@fleet.vn',
    vehicle_id: '50H-567.89',
    daysAgo: 1.5,
    durationMinutes: 140,
    safety_score: 91,
    drowsy_count: 1,
    yawn_count: 2,
    distracted_count: 1,
    normal_count: 760,
    peak_alert_level: 2,
    notes: 'Giao hàng xe lạnh chợ đầu mối Thủ Đức. Có 1 lần xao nhãng quan sát biển chỉ dẫn.'
  },
  {
    session_id: 'SES-ORG-NAM-02',
    user_email: 'nam.pham@fleet.vn',
    vehicle_id: '50H-567.89',
    daysAgo: 5,
    durationMinutes: 170,
    safety_score: 87,
    drowsy_count: 2,
    yawn_count: 2,
    distracted_count: 1,
    normal_count: 880,
    peak_alert_level: 2,
    notes: 'Chạy đường vành đai ca chiều. Cảnh báo buồn ngủ ở km 45.'
  },

  // 5. Tài xế Võ Thành Long (long.vo@fleet.vn)
  {
    session_id: 'SES-ORG-LONG-01',
    user_email: 'long.vo@fleet.vn',
    vehicle_id: '51A-789.01',
    daysAgo: 2,
    durationMinutes: 110,
    safety_score: 96,
    drowsy_count: 0,
    yawn_count: 1,
    distracted_count: 0,
    normal_count: 610,
    peak_alert_level: 1,
    notes: 'Xe dịch vụ bảo dưỡng thiết bị viễn thông. Điểm an toàn rất cao.'
  },
  {
    session_id: 'SES-ORG-LONG-02',
    user_email: 'long.vo@fleet.vn',
    vehicle_id: '51A-789.01',
    daysAgo: 6,
    durationMinutes: 135,
    safety_score: 94,
    drowsy_count: 0,
    yawn_count: 2,
    distracted_count: 0,
    normal_count: 740,
    peak_alert_level: 1,
    notes: 'Tuyến trạm phát sóng Cần Giờ. Lái xe an toàn và đúng quy chuẩn.'
  },

  // 6. Tài xế Đặng Gia Huy (huy.dang@fleet.vn)
  {
    session_id: 'SES-ORG-HUY-01',
    user_email: 'huy.dang@fleet.vn',
    vehicle_id: '29C-334.55',
    daysAgo: 0.8,
    durationMinutes: 125,
    safety_score: 82,
    drowsy_count: 2,
    yawn_count: 3,
    distracted_count: 2,
    normal_count: 690,
    peak_alert_level: 2,
    notes: 'Tuyến giao hàng nội đô mật độ cao. Tài xế có biểu hiện căng thẳng và mệt mỏi.'
  },
  {
    session_id: 'SES-ORG-HUY-02',
    user_email: 'huy.dang@fleet.vn',
    vehicle_id: '29C-334.55',
    daysAgo: 3.5,
    durationMinutes: 155,
    safety_score: 86,
    drowsy_count: 1,
    yawn_count: 2,
    distracted_count: 2,
    normal_count: 810,
    peak_alert_level: 2,
    notes: 'Tuyến bến xe Miền Tây. 2 lần quay đầu xao nhãng khi tìm địa chỉ kho.'
  }
];

/**
 * Tạo dữ liệu mẫu các bản ghi EmotionLog cho mỗi phiên lái
 */
function generateEmotionLogsForSession(session, driverId, vehicleId) {
  const logs = [];
  const startMs = new Date(session.start_time).getTime();
  const endMs = new Date(session.end_time).getTime();
  const totalDuration = endMs - startMs;

  // 1. Bản ghi bình thường đầu phiên
  logs.push({
    session_id: session.session_id,
    driver_id: driverId,
    vehicle_id: vehicleId,
    timestamp: new Date(startMs + 5 * 60 * 1000),
    dominant_emotion: 'happy',
    confidence: 0.94,
    scores: { neutral: 0.15, happy: 0.80, angry: 0.01, sad: 0.01, surprised: 0.01, fatigued: 0.02 },
    ear: 0.33,
    mar: 0.14,
    perclos: 0.01,
    head_pose: { yaw: 1, pitch: -2, roll: 0 },
    alert_level: 0,
    status: 'NORMAL',
    yawn_count: 0
  });

  // 2. Nếu phiên có ngáp
  if (session.yawn_count > 0) {
    logs.push({
      session_id: session.session_id,
      driver_id: driverId,
      vehicle_id: vehicleId,
      timestamp: new Date(startMs + Math.floor(totalDuration * 0.4)),
      dominant_emotion: 'fatigued',
      confidence: 0.89,
      scores: { neutral: 0.25, happy: 0.02, angry: 0.01, sad: 0.02, surprised: 0.05, fatigued: 0.65 },
      ear: 0.26,
      mar: 0.68,
      perclos: 0.06,
      head_pose: { yaw: 3, pitch: 2, roll: -1 },
      alert_level: 1,
      status: 'YAWNING',
      yawn_count: 1
    });
  }

  // 3. Nếu phiên có xao nhãng (quay đầu)
  if (session.distracted_count > 0) {
    logs.push({
      session_id: session.session_id,
      driver_id: driverId,
      vehicle_id: vehicleId,
      timestamp: new Date(startMs + Math.floor(totalDuration * 0.6)),
      dominant_emotion: 'neutral',
      confidence: 0.85,
      scores: { neutral: 0.82, happy: 0.03, angry: 0.05, sad: 0.02, surprised: 0.03, fatigued: 0.05 },
      ear: 0.31,
      mar: 0.16,
      perclos: 0.02,
      head_pose: { yaw: 38, pitch: -8, roll: 6 },
      alert_level: 1,
      status: 'DISTRACTED',
      yawn_count: 0
    });
  }

  // 4. Nếu phiên có buồn ngủ (Cảnh báo cấp 2)
  if (session.drowsy_count > 0) {
    logs.push({
      session_id: session.session_id,
      driver_id: driverId,
      vehicle_id: vehicleId,
      timestamp: new Date(startMs + Math.floor(totalDuration * 0.75)),
      dominant_emotion: 'fatigued',
      confidence: 0.95,
      scores: { neutral: 0.10, happy: 0.01, angry: 0.01, sad: 0.03, surprised: 0.02, fatigued: 0.83 },
      ear: 0.17,
      mar: 0.22,
      perclos: 0.42,
      head_pose: { yaw: -5, pitch: -16, roll: -4 },
      alert_level: 2,
      status: 'DROWSY',
      yawn_count: session.yawn_count
    });
  }

  // 5. Bản ghi ổn định cuối phiên
  logs.push({
    session_id: session.session_id,
    driver_id: driverId,
    vehicle_id: vehicleId,
    timestamp: new Date(endMs - 3 * 60 * 1000),
    dominant_emotion: 'neutral',
    confidence: 0.91,
    scores: { neutral: 0.78, happy: 0.12, angry: 0.02, sad: 0.01, surprised: 0.02, fatigued: 0.05 },
    ear: 0.30,
    mar: 0.15,
    perclos: 0.03,
    head_pose: { yaw: 0, pitch: -1, roll: 0 },
    alert_level: 0,
    status: 'NORMAL',
    yawn_count: 0
  });

  return logs;
}

/**
 * Seed database chính thức (thực thi khi chạy: npm run seed)
 */
export async function seedDatabase(isForce = false) {
  console.log('\x1b[36m[Seeder] Bắt đầu khởi tạo dữ liệu FleetGuard (1 Admin + 6 Tài xế liên kết + 1 Tài khoản cá nhân)...\x1b[0m');

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  if (getIsMongoConnected()) {
    // 1. Làm sạch dữ liệu cũ khi force seed
    if (isForce) {
      await Promise.all([
        User.deleteMany({}),
        DrivingSession.deleteMany({}),
        EmotionLog.deleteMany({}),
        AuditLog.deleteMany({})
      ]);
      console.log('  \x1b[33m✓\x1b[0m [MongoDB] Đã làm sạch các bảng dữ liệu cũ trước khi nạp');
    }

    // 2. Tạo hoặc Cập nhật Users
    const userMap = new Map();
    for (const u of SEED_USERS) {
      const savedUser = await User.findOneAndUpdate(
        { email: u.email.toLowerCase() },
        {
          name: u.name,
          email: u.email.toLowerCase(),
          passwordHash,
          role: u.role,
          organizationId: u.organizationId,
          organizationName: u.organizationName,
          phone: u.phone,
          dateOfBirth: u.dateOfBirth,
          avatarColor: u.avatarColor
        },
        { upsert: true, new: true }
      );
      userMap.set(u.email.toLowerCase(), savedUser);
      console.log(`  \x1b[32m✓\x1b[0m [MongoDB] Người dùng: ${u.name} <${u.email}> (${u.role}) - Org: ${u.organizationName || 'Trống'}`);
    }

    // 3. Khởi tạo DrivingSessions & EmotionLogs
    let totalLogs = 0;
    const now = Date.now();

    for (const cfg of RAW_SESSIONS_CONFIG) {
      const driver = userMap.get(cfg.user_email.toLowerCase());
      if (!driver) continue;

      const driverId = driver._id.toString();
      const startTime = new Date(now - cfg.daysAgo * 24 * 3600 * 1000);
      const endTime = new Date(startTime.getTime() + cfg.durationMinutes * 60 * 1000);

      const sessionRecord = {
        session_id: cfg.session_id,
        user_id: driverId,
        user_email: cfg.user_email.toLowerCase(),
        start_time: startTime,
        end_time: endTime,
        duration_seconds: cfg.durationMinutes * 60,
        safety_score: cfg.safety_score,
        drowsy_count: cfg.drowsy_count,
        yawn_count: cfg.yawn_count,
        distracted_count: cfg.distracted_count,
        normal_count: cfg.normal_count,
        peak_alert_level: cfg.peak_alert_level,
        status: 'COMPLETED',
        notes: cfg.notes
      };

      await DrivingSession.findOneAndUpdate(
        { session_id: cfg.session_id },
        sessionRecord,
        { upsert: true, new: true }
      );

      // Tạo EmotionLogs cho phiên
      const logs = generateEmotionLogsForSession(sessionRecord, driverId, cfg.vehicle_id);
      await EmotionLog.insertMany(logs);
      totalLogs += logs.length;
    }

    console.log(`  \x1b[32m✓\x1b[0m [MongoDB] Đã nạp ${RAW_SESSIONS_CONFIG.length} phiên lái xe mẫu`);
    console.log(`  \x1b[32m✓\x1b[0m [MongoDB] Đã nạp ${totalLogs} bản ghi EmotionLog telemetry chi tiết`);

    // 4. Khởi tạo AuditLogs cho Admin
    const adminUser = userMap.get('admin@fleet.vn');
    if (adminUser) {
      const adminId = adminUser._id.toString();
      const auditRecords = [
        {
          actorId: adminId,
          actorName: adminUser.name,
          actorEmail: adminUser.email,
          organizationId: ORG_ID,
          action: 'USER_LOGIN',
          resourceType: 'AUTH',
          description: 'Quản trị viên đăng nhập cổng thông tin FleetGuard',
          timestamp: new Date(now - 12 * 3600 * 1000)
        },
        {
          actorId: adminId,
          actorName: adminUser.name,
          actorEmail: adminUser.email,
          organizationId: ORG_ID,
          action: 'INSPECT_TRIP',
          resourceType: 'TRIP',
          resourceId: 'SES-ORG-DUC-02',
          description: 'Kiểm tra cảnh báo buồn ngủ của tài xế Trần Minh Đức',
          timestamp: new Date(now - 8 * 3600 * 1000)
        },
        {
          actorId: adminId,
          actorName: adminUser.name,
          actorEmail: adminUser.email,
          organizationId: ORG_ID,
          action: 'EXPORT_REPORT',
          resourceType: 'REPORT',
          description: 'Xuất báo cáo an toàn tuần đội xe FleetGuard Logistics Corp',
          timestamp: new Date(now - 2 * 3600 * 1000)
        }
      ];

      await AuditLog.insertMany(auditRecords);
      console.log(`  \x1b[32m✓\x1b[0m [MongoDB] Đã nạp ${auditRecords.length} sự kiện kiểm toán AuditLog`);
    }

  } else {
    // 5. In-Memory Store Fallback
    memoryStore.users.clear();
    memoryStore.sessions.clear();
    memoryStore.emotionLogs = [];
    memoryStore.auditLogs = [];

    const now = Date.now();
    for (const u of SEED_USERS) {
      memoryStore.users.set(u.email.toLowerCase(), {
        _id: u.id,
        id: u.id,
        name: u.name,
        email: u.email.toLowerCase(),
        passwordHash,
        role: u.role,
        organizationId: u.organizationId,
        organizationName: u.organizationName,
        phone: u.phone,
        dateOfBirth: u.dateOfBirth,
        avatarColor: u.avatarColor,
        created_at: new Date()
      });
      console.log(`  \x1b[32m✓\x1b[0m [In-Memory] Đã nạp tài khoản: ${u.email} (${u.role})`);
    }

    for (const cfg of RAW_SESSIONS_CONFIG) {
      const driver = memoryStore.users.get(cfg.user_email.toLowerCase());
      if (!driver) continue;

      const startTime = new Date(now - cfg.daysAgo * 24 * 3600 * 1000);
      const endTime = new Date(startTime.getTime() + cfg.durationMinutes * 60 * 1000);

      const sessionObj = {
        _id: cfg.session_id,
        id: cfg.session_id,
        session_id: cfg.session_id,
        user_id: driver.id,
        user_email: cfg.user_email.toLowerCase(),
        start_time: startTime,
        end_time: endTime,
        duration_seconds: cfg.durationMinutes * 60,
        safety_score: cfg.safety_score,
        drowsy_count: cfg.drowsy_count,
        yawn_count: cfg.yawn_count,
        distracted_count: cfg.distracted_count,
        normal_count: cfg.normal_count,
        peak_alert_level: cfg.peak_alert_level,
        status: 'COMPLETED',
        notes: cfg.notes
      };

      memoryStore.sessions.set(cfg.session_id, sessionObj);

      const logs = generateEmotionLogsForSession(sessionObj, driver.id, cfg.vehicle_id);
      memoryStore.emotionLogs.push(...logs);
    }

    console.log(`  \x1b[32m✓\x1b[0m [In-Memory] Đã nạp ${RAW_SESSIONS_CONFIG.length} phiên lái xe`);
  }

  console.log('\n\x1b[32m[Seeder] Hoàn thành seeding dữ liệu mẫu thành công 100%!\x1b[0m');
  console.log('--------------------------------------------------');
  console.log('📌 Tài khoản Quản trị (Admin):');
  console.log('   - Email: admin@fleet.vn  |  Mật khẩu: password123');
  console.log('   - Đội xe: FleetGuard Logistics Corp (6 tài xế liên kết)');
  console.log('📌 Tài khoản Cá nhân (User):');
  console.log('   - Email: user@fleet.vn   |  Mật khẩu: password123');
  console.log('📌 Danh sách 6 Tài xế liên kết (Mật khẩu chung: password123):');
  console.log('   1. an.nguyen@fleet.vn  (Nguyễn Văn An)');
  console.log('   2. duc.tran@fleet.vn   (Trần Minh Đức)');
  console.log('   3. bao.le@fleet.vn    (Lê Quốc Bảo)');
  console.log('   4. nam.pham@fleet.vn   (Phạm Hoàng Nam)');
  console.log('   5. long.vo@fleet.vn    (Võ Thành Long)');
  console.log('   6. huy.dang@fleet.vn   (Đặng Gia Huy)');
  console.log('--------------------------------------------------\n');
}

// Chạy trực tiếp từ CLI: npm run seed hoặc node src/seed.js
if (process.argv[1] && (process.argv[1].endsWith('seed.js') || process.argv[1].includes('seed.js'))) {
  (async () => {
    try {
      await connectDB(process.env.MONGODB_URI);
      await seedDatabase(true);
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('\x1b[31m[Seeder Lỗi]:\x1b[0m', err.message);
      process.exit(1);
    }
  })();
}

export default seedDatabase;
