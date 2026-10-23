import dotenv from 'dotenv';
dotenv.config();

import { User, EmotionLog, ChatConversation, DrivingSession } from './models/index.js';
import { getIsMongoConnected, memoryStore, connectDB, disconnectDB } from './db.js';

/**
 * Blank slate seeder: Purges active application data while preserving DB schema and connection
 */
export async function seedBlankDatabase() {
  console.log('\x1b[36m[Blank Slate] Đang dọn dữ liệu ứng dụng...\x1b[0m');

  if (getIsMongoConnected()) {
    const [delUsers, delSessions, delLogs, delChats] = await Promise.all([
      User.deleteMany({}),
      DrivingSession.deleteMany({}),
      EmotionLog.deleteMany({}),
      ChatConversation.deleteMany({}),
    ]);

    console.log(`  \x1b[32m✓\x1b[0m [MongoDB] Đã xóa ${delUsers.deletedCount} tài khoản người dùng`);
    console.log(`  \x1b[32m✓\x1b[0m [MongoDB] Đã xóa ${delSessions.deletedCount} phiên lái xe`);
    console.log(`  \x1b[32m✓\x1b[0m [MongoDB] Đã xóa ${delLogs.deletedCount} nhật ký telemetry`);
    console.log(`  \x1b[32m✓\x1b[0m [MongoDB] Đã xóa ${delChats.deletedCount} đoạn hội thoại chatbot`);
  } else {
    memoryStore.users.clear();
    memoryStore.sessions.clear();
    memoryStore.emotionLogs = [];
    memoryStore.chatConversations = [];
    console.log('  \x1b[32m✓\x1b[0m [In-Memory] Đã xóa dữ liệu ứng dụng trong bộ nhớ tạm');
  }

  console.log('\x1b[32m[Blank Slate] Hoàn tất! Dữ liệu ứng dụng đã sẵn sàng để kiểm thử từ đầu.\x1b[0m');
}

// Chạy trực tiếp qua: node src/seedBlank.js hoặc npm run seeding_blank
if (process.argv[1] && (process.argv[1].endsWith('seedBlank.js') || process.argv[1].includes('seedBlank'))) {
  (async () => {
    try {
      await connectDB(process.env.MONGODB_URI);
      await seedBlankDatabase();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('\x1b[31m[Blank Slate Lỗi]:\x1b[0m', err.message);
      process.exit(1);
    }
  })();
}

export default seedBlankDatabase;
