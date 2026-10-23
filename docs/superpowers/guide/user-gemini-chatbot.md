# Hướng dẫn Chatbot Gemini cho User

Luồng chung của hai chatbot được mô tả tại
[AI Chatbot Flows](./ai-chatbot-flows.md). Tài liệu này tập trung vào thiết
lập và trải nghiệm User/Driver.

## 1. Cấu hình Gemini

Tạo `backend/.env`:

```env
GEMINI_API_KEY=your_real_gemini_api_key
GEMINI_MODEL=gemini-3.6-flash
# Tùy chọn: thử lần lượt các model này nếu model trước lỗi/quota
GEMINI_MODELS=gemini-3.6-flash,another-supported-model
GEMINI_TIMEOUT_MS=8000
```

Không đặt key trong frontend, không commit file `.env`, và không gửi key lên
trình duyệt. Backend gọi Interactions API `v1beta` bằng Google GenAI SDK 2.x; key được đọc
phía server. Model mặc định đã kiểm thử là `gemini-3.6-flash`; nếu model cấu
hình cũ không còn dùng được, hệ thống tự thử model mặc định này làm fallback.

## 2. Chạy và test

Mở hai terminal:

```powershell
cd FleetGuard\backend
npm run dev
```

```powershell
cd FleetGuard\frontend
npm run dev
```

Đăng nhập, chọn **Trợ lý AI**, rồi thử:

- `Thống kê chuyến lái của tôi trong 7 ngày gần đây`
- `Có cảm xúc giận dữ nào được ghi nhận trong tuần này?`
- `Phân tích video <mã-video>`
- `Giải thích cách FleetGuard trả về dữ liệu cảm xúc`

Chạy test chatbot/backend:

```powershell
cd FleetGuard\ai-chatbot
node test\test-chatbot.js
node test\test-model-failover.js
cd ..\backend
node test-user-analytics.js
node test-chatbot.js
```

## 3. Luồng dữ liệu User

1. Frontend gửi `{ session_id, message }` và JWT đến
   `POST /api/analytics/chatbot`.
2. Backend xác thực JWT, nạp lịch sử của đúng User/session, rồi gửi câu hỏi
   cùng các tool User cho Gemini.
3. Gemini có thể gọi:
   - `get_user_safety_summary`: đọc `DrivingSession` của User đã xác thực;
   - `query_emotion_stats`: đọc `EmotionLog` cảm xúc/attention, backend ép
     `driver_id` về User đã xác thực;
4. Thống kê chuyến lái và emotion mặc định dùng 7 ngày gần nhất. Ngày bắt
   đầu/kết thúc hoặc `session_id` cụ thể được giữ nguyên; truy vấn session cụ
   thể không bị giới hạn nhầm bởi cửa sổ 7 ngày.
5. Backend gửi JSON từ tool lại cho Gemini để viết lời giải thích và trả
   `reply`, `structuredData`, `toolsUsed`, `modelStatus`, `model` và timestamp.

Ví dụ cấu trúc phản hồi thống kê chuyến:

```json
{
  "success": true,
  "session_id": "chat_user_123",
  "reply": "Trong 7 ngày gần nhất...",
  "toolsUsed": ["get_user_safety_summary"],
  "modelStatus": {
    "source": "gemini",
    "attemptedModels": ["gemini-3.6-flash"],
    "selectedModel": "gemini-3.6-flash"
  },
  "structuredData": {
    "type": "user_safety_summary",
    "recordsUsed": { "sessions": 2 },
    "metrics": {
      "session_count": 2,
      "average_safety_score": 92.5,
      "drowsy_count": 0,
      "yawn_count": 1,
      "distracted_count": 0,
      "critical_alerts": 0,
      "warning_alerts": 1,
      "duration_seconds": 5400
    }
  }
}
```

## 4. Lỗi Gemini

- Thiếu `GEMINI_API_KEY`: API trả HTTP 503, `success: false`,
  `code: "GEMINI_NOT_CONFIGURED"`.
- Nếu các model cấu hình đều lỗi/quota, tool bắt buộc không chạy được, hoặc
  Gemini không chọn tool cho câu hỏi cần số liệu: API trả lỗi non-2xx an toàn.
- Không trả lời thành công bằng Local Analytics Engine khi Gemini không dùng
  được. Analytics nội bộ chỉ cung cấp dữ liệu cho tool; không thay Gemini để
  giả làm câu trả lời của model.

## 5. Gemini và nhận diện cảm xúc

Gemini **không trực tiếp nhận diện khuôn mặt trong video**. Pipeline AI
scanning/telemetry tạo nhãn và score từ frame; analytics API tổng hợp các bản
ghi; Gemini hiểu câu hỏi, chọn tool và giải thích JSON. Emotion score là tín
hiệu dự đoán, không phải kết luận tâm lý.

`gemini-3.6-flash` là model mặc định hiện đã kiểm thử cho hội thoại;
`GEMINI_MODELS` có thể đặt danh sách failover theo thứ tự. Chất lượng nhận diện cảm xúc phải
được đánh giá riêng trên pipeline computer-vision bằng dữ liệu có nhãn và
precision/recall/F1.
