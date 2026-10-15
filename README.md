# Driver Safety System 🚗🛡️

Hệ thống giám sát hành trình và cảnh báo buồn ngủ thời gian thực ứng dụng AI Computer Vision và Trợ lý ảo AI Copilot.

Hệ thống phục vụ **2 Actor chính**:
* **USER**: Người lái xe (Overview, Start Camera quét AI, Lịch sử, Analytic, Chatbot).
* **ADMIN**: Quản trị viên (Tổng quan toàn cục, Quản lý người dùng, Nhật ký vi phạm).

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
* **[`frontend/`](./frontend/README.md)**: Giao diện React/Vite cho User & Admin (Thiết kế hiện đại, thuần chữ & badge, tuyệt đối không dùng icon).
