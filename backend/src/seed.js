import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcryptjs';
import { User, DrivingSession, EmotionLog } from './models/index.js';
import { getIsMongoConnected, memoryStore, connectDB, disconnectDB } from './db.js';

export const SEED_USERS = [
  {
    name: 'Quản Trị Viên (Admin)',
    email: 'admin@fleet.vn',
    password: 'password123',
    role: 'ADMIN',
    id: 'ADMIN-001'
  },
  {
    name: 'Nguyễn Văn An (Tài xế chính)',
    email: 'user@fleet.vn',
    password: 'password123',
    role: 'USER',
    id: 'USR-8821'
  },
  {
    name: 'Trần Minh Đức (Tài xế phụ)',
    email: 'driver@fleet.vn',
    password: 'password123',
    role: 'USER',
    id: 'USR-8822'
  }
];

export const SEED_SESSIONS = [
  {
    session_id: 'SES-20261015-01',
    user_id: 'USR-8821',
    user_email: 'user@fleet.vn',
    start_time: new Date(Date.now() - 3600 * 1000 * 3),
    end_time: new Date(Date.now() - 3600 * 1000 * 1),
    duration_seconds: 7200,
    safety_score: 98,
    drowsy_count: 0,
    yawn_count: 1,
    distracted_count: 0,
    normal_count: 360,
    peak_alert_level: 1,
    status: 'COMPLETED',
    notes: 'Ca sáng tuyến Q.1 -> Thủ Đức. Vận hành chuẩn mực, 1 lần ngáp nhẹ khi dừng đèn đỏ.'
  },
  {
    session_id: 'SES-20261014-02',
    user_id: 'USR-8821',
    user_email: 'user@fleet.vn',
    start_time: new Date(Date.now() - 3600 * 1000 * 22),
    end_time: new Date(Date.now() - 3600 * 1000 * 19),
    duration_seconds: 10800,
    safety_score: 91,
    drowsy_count: 2,
    yawn_count: 3,
    distracted_count: 1,
    normal_count: 520,
    peak_alert_level: 2,
    status: 'COMPLETED',
    notes: 'Ca chiều tuyến Tân Thuận -> Hiệp Phước. Cảnh báo buồn ngủ lúc 14:15, tài xế đã dừng nghỉ 10 phút.'
  },
  {
    session_id: 'SES-20261013-01',
    user_id: 'USR-8821',
    user_email: 'user@fleet.vn',
    start_time: new Date(Date.now() - 3600 * 1000 * 46),
    end_time: new Date(Date.now() - 3600 * 1000 * 43),
    duration_seconds: 9000,
    safety_score: 95,
    drowsy_count: 1,
    yawn_count: 2,
    distracted_count: 1,
    normal_count: 440,
    peak_alert_level: 2,
    status: 'COMPLETED',
    notes: 'Ca sáng tuyến Bến xe Miền Đông -> Biên Hòa. Có 1 lần xao nhãng quay đầu sang phải.'
  },
  {
    session_id: 'SES-20261012-02',
    user_id: 'USR-8821',
    user_email: 'user@fleet.vn',
    start_time: new Date(Date.now() - 3600 * 1000 * 70),
    end_time: new Date(Date.now() - 3600 * 1000 * 67),
    duration_seconds: 10200,
    safety_score: 96,
    drowsy_count: 0,
    yawn_count: 2,
    distracted_count: 0,
    normal_count: 500,
    peak_alert_level: 1,
    status: 'COMPLETED',
    notes: 'Tuyến Cát Lái -> Khu Công Nghệ Cao. Chạy ổn định, giữ khoảng cách an toàn.'
  },
  {
    session_id: 'SES-20261011-01',
    user_id: 'USR-8821',
    user_email: 'user@fleet.vn',
    start_time: new Date(Date.now() - 3600 * 1000 * 94),
    end_time: new Date(Date.now() - 3600 * 1000 * 91),
    duration_seconds: 9600,
    safety_score: 89,
    drowsy_count: 3,
    yawn_count: 4,
    distracted_count: 2,
    normal_count: 460,
    peak_alert_level: 2,
    status: 'COMPLETED',
    notes: 'Ca đêm tuyến Q.7 -> Long Thành. Ghi nhận 3 lần nháy mắt chậm do lái xe sau 22h.'
  }
];

/**
 * Seed database with default admin & user accounts + sample sessions
 */
export async function seedDatabase(isForce = false) {
  console.log('\x1b[36m[Seeder] Bắt đầu khởi tạo dữ liệu mẫu cho USER & ADMIN...\x1b[0m');

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  if (getIsMongoConnected()) {
    // 1. Seed MongoDB Users
    for (const u of SEED_USERS) {
      const exists = await User.findOne({ email: u.email.toLowerCase() });
      if (!exists || isForce) {
        await User.findOneAndUpdate(
          { email: u.email.toLowerCase() },
          {
            name: u.name,
            email: u.email.toLowerCase(),
            passwordHash,
            role: u.role
          },
          { upsert: true, new: true }
        );
        console.log(`  \x1b[32m✓\x1b[0m [MongoDB] Đã tạo tài khoản: ${u.email} (${u.role})`);
      }
    }

    // 2. Seed MongoDB DrivingSessions
    for (const s of SEED_SESSIONS) {
      await DrivingSession.findOneAndUpdate(
        { session_id: s.session_id },
        s,
        { upsert: true, new: true }
      );
    }
    console.log(`  \x1b[32m✓\x1b[0m [MongoDB] Đã nạp ${SEED_SESSIONS.length} phiên lái xe mẫu`);
  } else {
    // 3. Seed In-Memory Store Fallback
    for (const u of SEED_USERS) {
      memoryStore.users.set(u.email.toLowerCase(), {
        _id: u.id,
        id: u.id,
        name: u.name,
        email: u.email.toLowerCase(),
        passwordHash,
        role: u.role,
        created_at: new Date()
      });
      console.log(`  \x1b[32m✓\x1b[0m [In-Memory] Đã nạp tài khoản: ${u.email} (${u.role})`);
    }

    for (const s of SEED_SESSIONS) {
      memoryStore.sessions.set(s.session_id, {
        _id: s.session_id,
        id: s.session_id,
        ...s
      });
    }
    console.log(`  \x1b[32m✓\x1b[0m [In-Memory] Đã nạp ${SEED_SESSIONS.length} phiên lái xe mẫu`);
  }

  console.log('\x1b[32m[Seeder] Hoàn thành seeding thành công!\x1b[0m');
}

// Chạy trực tiếp nếu execute từ command line
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  (async () => {
    await connectDB();
    await seedDatabase(true);
    await disconnectDB();
    process.exit(0);
  })();
}

export default seedDatabase;
