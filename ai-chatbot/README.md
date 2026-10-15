# Phân Hệ AI Chatbot (AI Safety Copilot)

Trợ lý thông minh hỗ trợ lái xe an toàn, ứng dụng mô hình ngôn ngữ lớn kết hợp cơ chế **Function Calling** để truy vấn dữ liệu telemetry và lịch sử các ca lái.

---

## 📋 Danh Sách Nhiệm Vụ Cốt Lõi

### 1. Khai Báo Công Cụ (Function Calling / Tool Declarations)
* **`query_user_drowsiness_stats`**:
  * Tự động trích xuất số lần ngủ gật, số lần ngáp, điểm an toàn và khung giờ mệt mỏi từ cơ sở dữ liệu dựa trên câu hỏi của User.
* **`get_fleet_safety_summary`**:
  * Tổng hợp báo cáo toàn hệ thống dành cho Admin (tổng số vi phạm cấp 2, tài xế có nguy cơ cao nhất).

### 2. Tư Vấn Sức Khỏe Lái Xe Cho USER
* Trả lời trực tiếp các câu hỏi truy vấn:
  * *"Hôm nay tôi buồn ngủ mấy lần?"* $\rightarrow$ Đọc dữ liệu hôm nay, báo cáo số lần mí mắt trễ và điểm an toàn.
  * *"Thống kê số lần buồn ngủ tuần này"* $\rightarrow$ Báo cáo tổng hợp số lần ngủ gật, ngáp và so sánh với chu kỳ trước.
  * *"Khung giờ nào tôi hay mất tập trung nhất?"* $\rightarrow$ Phân tích biểu đồ sinh học và cảnh báo khung giờ rủi ro (13:00 - 14:30).
* Đưa ra lời khuyên y khoa khoa học: Quy tắc dừng nghỉ 2 giờ, nhiệt độ điều hòa cabin và mẹo chống ngủ gật.

### 3. Hỗ Trợ Báo Cáo Điều Hành Cho ADMIN
* Trả lời các câu hỏi quản trị:
  * *"Có bao nhiêu tài xế có điểm an toàn dưới 90 trong tuần?"*
  * *"Tổng hợp các sự cố ngủ gật xảy ra vào ca đêm."*

### 4. Cơ Chế Fallback Đảm Bảo Hoạt Động (Reliability)
* Khi có `GEMINI_API_KEY`: Gọi Gemini Model thông qua SDK `@google/genai`.
* Khi chưa cấu hình key: Tự động chuyển tiếp sang **Local Analytics Engine** trích xuất trực tiếp dữ liệu từ Database, đảm bảo phản hồi thông suốt không gián đoạn.

---

## 🛠️ Cài Đặt & Chạy Thử Nghiệm

```bash
cd ai-chatbot
npm install
npm test
```
