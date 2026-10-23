# Driver Safety System 🚗🛡️

FleetGuard là hệ thống giám sát hành trình và cảnh báo buồn ngủ theo thời
gian thực, kết hợp AI Computer Vision với trợ lý ảo Gemini AI Copilot.
Hệ thống phân tích các tín hiệu an toàn như buồn ngủ, mất tập trung và cảm
xúc của người lái, sau đó trả về cảnh báo và dữ liệu có cấu trúc để theo dõi.

Hệ thống phục vụ **2 Actor chính**:

* **USER**: Người lái xe — xem tổng quan, bật Camera Buồng Lái để quét AI,
  xem lịch sử hành trình, dữ liệu phân tích và trò chuyện với Trợ lý AI.
* **ADMIN**: Quản trị viên — xem tổng quan toàn cục, quản lý người dùng và
  theo dõi nhật ký vi phạm, sử dụng Trợ lý AI vận hành theo phạm vi công ty.

### Trợ lý AI Gemini cho User

Chatbot được tích hợp tại mục **Trợ lý AI** trong khu vực User/Driver:

* Trò chuyện theo từng session và tạo session mới.
* Thống kê nhiều cảm xúc theo tài xế, phiên lái hoặc khoảng thời gian.
* Truy vấn phân tích cảm xúc và các mốc vi phạm trong video.
* Trả về đồng thời câu trả lời tự nhiên và `structuredData` để giao diện
  hiển thị bảng thống kê.
* Gemini chạy ở backend; API key không được gửi xuống frontend.

Chatbot chỉ diễn giải dữ liệu từ pipeline Computer Vision và telemetry hiện
có, không thay thế model nhận diện cảm xúc. Xem hướng dẫn cấu hình, demo và
câu hỏi bảo vệ tại
[`docs/superpowers/guide/user-gemini-chatbot.md`](./docs/superpowers/guide/user-gemini-chatbot.md).

### Trợ lý AI vận hành cho Admin

Admin truy cập tại `/admin/chat`. Các câu hỏi về tổng quan đội xe, cảnh báo
và cảm xúc chỉ đọc dữ liệu của `organizationId` trong JWT hiện tại. Khoảng
thời gian được thử theo thứ tự 7 ngày, 30 ngày, rồi toàn bộ lịch sử nếu cần.
Khi không có dữ liệu, giao diện hướng dẫn thêm nhân viên hoặc tạo phiên lái,
không dùng dữ liệu demo ở frontend.

Gemini hỗ trợ diễn giải nhưng analytics nội bộ là nguồn số liệu chính. Có thể
cấu hình danh sách model dự phòng ở backend:

```env
GEMINI_MODELS=gemini-2.5-flash,gemini-2.0-flash
```

Mỗi model chỉ được thử một lần trong một request. Nếu tất cả model gặp quota,
rate limit, overload hoặc timeout, hệ thống trả structured data từ analytics
nội bộ và hiển thị trạng thái Gemini tạm thời không khả dụng. Nhiều model dùng
cùng một Google project vẫn có thể dùng chung quota; đổi model không đảm bảo
vượt giới hạn project.

---

## ⚡ Hướng Dẫn Cài Đặt & Chạy Nhanh

### Bước 1: Cài đặt thư viện (npm install)
Mở terminal tại thư mục gốc `driver-safety-system/`:

```bash
# 1. Cài đặt thư viện cho Backend
cd backend
npm install

# 2. Cài đặt thư viện cho Frontend
cd ../frontend
npm install
```

---

### Bước 2: Nạp dữ liệu kiểm thử (Seeding)
Tự động nạp tài khoản mẫu và các phiên lái xe thực tế:

```bash
cd ../backend
npm run seed
```

---

### Bước 3: Chạy ứng dụng

Mở **2 cửa sổ terminal**:

#### Terminal 1 — Chạy Backend (Cổng 5000):
```bash
cd backend
npm run dev
```
> Server API và Socket.io sẽ chạy tại: `http://localhost:5000`

#### Terminal 2 — Chạy Frontend (Cổng 5173):
```bash
cd frontend
npm run dev
```
> Giao diện web sẵn sàng tại: `http://localhost:5173`

---

## 🔑 Tài Khoản Kiểm Thử Sẵn Có

| Vai trò | Email đăng nhập | Mật khẩu | Đường dẫn truy cập |
| :--- | :--- | :--- | :--- |
| **USER (Tài xế)** | `user@fleet.vn` | `password123` | [http://localhost:5173/user](http://localhost:5173/user) |
| **ADMIN (Quản trị)** | `admin@fleet.vn` | `password123` | [http://localhost:5173/admin](http://localhost:5173/admin) |

---

## 📂 Cấu Trúc Các Phân Hệ

* **[`ai-scanning/`](./ai-scanning/README.md)**: Xử lý Computer Vision (MediaPipe Face Mesh), đo chỉ số nhắm mắt EAR, ngáp MAR, quay đầu xao nhãng.
* **[`backend/`](./backend/README.md)**: Server Express + Socket.io, lưu trữ 4 bảng dữ liệu (`Users`, `DrivingSessions`, `TelemetryLogs`, `ChatLogs`).
* **[`ai-chatbot/`](./ai-chatbot/README.md)**: Trợ lý an toàn AI kết nối dữ liệu chuyến đi, hỗ trợ Function Calling.
* **[`frontend/`](./frontend/README.md)**: Giao diện React/Vite (Tailwind v4 + shadcn/ui, GSAP) cho landing, User & Admin.
