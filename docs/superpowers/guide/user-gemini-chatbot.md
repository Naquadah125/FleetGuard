# Hướng dẫn Chatbot Gemini cho User

## 1. Cấu hình API key

Tạo file `FleetGuard/backend/.env` và thêm:

```env
GEMINI_API_KEY=your_real_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Không đặt key trong frontend, không commit file `.env`, và không gửi key lên
trình duyệt. Backend đọc key khi khởi động request chatbot.

## 2. Chạy và test

Mở hai terminal:

```bash
cd FleetGuard/backend
npm run dev
```

```bash
cd FleetGuard/frontend
npm run dev
```

Đăng nhập bằng `user@fleet.vn` / `password123`, chọn **Trợ lý AI**, rồi gửi:

- `Thống kê các cảm xúc của tôi trong 7 ngày gần đây`
- `Có cảm xúc giận dữ nào được ghi nhận không?`
- `Giải thích cách FleetGuard trả về dữ liệu cảm xúc`

Nếu thiếu key, UI sẽ hiển thị lỗi cấu hình thay vì trả dữ liệu giả.

## 3. Model trả dữ liệu như thế nào?

1. Frontend gửi `session_id`, câu hỏi và JWT đến
   `POST /api/analytics/chatbot`.
2. Backend xác thực JWT và tạo `ChatService`.
3. Gemini nhận system prompt cùng hai function declarations:
   `query_emotion_stats` và `get_video_emotion_breakdown`.
4. Nếu câu hỏi cần số liệu, Gemini trả về function call dạng có tên tool và
   arguments JSON, ví dụ `start_date`, `end_date`, `metric_type`.
5. Backend thực thi tool trên analytics API, không cho frontend gọi trực tiếp.
6. Kết quả JSON được gửi lại cho Gemini để tạo câu trả lời tự nhiên.
7. Backend trả cả `reply`, `toolsUsed`, `model` và `structuredData`; UI dùng
   `structuredData.emotion_distribution` để hiển thị bảng số liệu.

Ví dụ response rút gọn:

```json
{
  "success": true,
  "session_id": "chat_user_123_...",
  "reply": "Trong khoảng thời gian đã chọn...",
  "toolsUsed": ["query_emotion_stats"],
  "model": "gemini-2.5-flash",
  "structuredData": {
    "metrics": { "total_records": 120 },
    "emotion_distribution": {
      "angry": { "count": 8, "percentage": 6.7 }
    }
  }
}
```

## 4. Model nhận diện cảm xúc tốt nhất?

Trong kiến trúc FleetGuard, Gemini **không trực tiếp nhận diện khuôn mặt trong
video**. AI scanning/telemetry pipeline tạo các nhãn và score cảm xúc từ frame,
analytics API tổng hợp chúng, còn Gemini làm nhiệm vụ hiểu câu hỏi, chọn tool,
đọc JSON và giải thích kết quả.

`gemini-2.5-flash` được chọn cho chatbot vì tốc độ và chi phí phù hợp hội thoại
thời gian thực. Chất lượng nhận diện cảm xúc phải đánh giá riêng trên model
computer-vision đang dùng trong `ai-scanning`, bằng tập dữ liệu có nhãn và các
metric như precision, recall, F1 theo từng cảm xúc; không nên suy ra chất lượng
nhận diện từ chất lượng câu trả lời của Gemini.

## 5. “Inference” với model trong bài thuyết trình

Có thể trình bày inference theo chuỗi:

```text
User question
  -> Gemini intent understanding
  -> function call + JSON arguments
  -> FleetGuard analytics query
  -> structured emotion data
  -> Gemini explanation
  -> UI table + natural-language answer
```

Đây là function calling/tool use, không phải huấn luyện lại model. Model không
được phép tự bịa số liệu: số liệu phải đến từ tool hoặc được báo là không có
dữ liệu.
