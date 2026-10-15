# Phân Hệ Backend (Server, Database & Telemetry Core)

Máy chủ trung tâm xử lý REST API, truyền nhận dữ liệu thời gian thực qua **Socket.io** và lưu trữ dữ liệu an toàn trên **MongoDB** (hỗ trợ tự động fallback sang bộ nhớ In-Memory khi không có MongoDB).

---

## 🗄️ 4 Bảng Dữ Liệu Cần Lưu Trữ (Data Schemas)

1. **`Users` (Tài khoản & Phân quyền)**:
   * `name`: Họ và tên người dùng.
   * `email`: Email đăng nhập (duy nhất).
   * `passwordHash`: Mật khẩu mã hóa bcrypt.
   * `role`: Phân quyền `['USER', 'ADMIN']`.
   * `created_at`: Ngày tạo.

2. **`DrivingSessions` (Nhật ký phiên lái xe & quét camera)**:
   * `session_id`: Mã phiên duy nhất (ví dụ: `SES-20261015-01`).
   * `user_id` & `user_email`: Người thực hiện phiên.
   * `start_time` & `end_time`: Thời gian bắt đầu và kết thúc.
   * `duration_seconds`: Thời lượng phiên tính bằng giây.
   * `safety_score`: Điểm an toàn (0 - 100).
   * `drowsy_count`, `yawn_count`, `distracted_count`: Đếm số lần vi phạm.
   * `peak_alert_level`: Mức cảnh báo cao nhất trong phiên (0, 1, 2).
   * `status`: Trạng thái `['COMPLETED', 'ACTIVE']`.
   * `notes`: Ghi chú tóm tắt từ hệ thống.

3. **`TelemetryLogs` (Dữ liệu quét chi tiết theo từng nhịp)**:
   * `session_id`, `driver_id`, `timestamp`.
   * `ear`, `mar`, `perclos`, `head_pose` (`yaw`, `pitch`, `roll`).
   * `status` (`NORMAL`, `DROWSY`, `YAWNING`, `DISTRACTED`), `alert_level`.

4. **`ChatLogs` (Lịch sử hội thoại AI)**:
   * `user_id`, `role` (`user` hoặc `model`), `message`, `structured_data`, `timestamp`.

---

## 📋 Danh Sách Nhiệm Vụ Backend

* **Nhiệm vụ 1: Hệ thống Auth & RBAC**:
  * Đăng ký (`POST /api/auth/register`), Đăng nhập (`POST /api/auth/login`) sinh JWT token phân quyền `USER` và `ADMIN`.
* **Nhiệm vụ 2: Quản lý Phiên Lái Xe**:
  * Lưu tự động phiên khi tắt camera (`POST /api/analytics/sessions`).
  * Lấy danh sách lịch sử phiên của User (`GET /api/analytics/sessions`).
* **Nhiệm vụ 3: Xử lý Telemetry Socket.io**:
  * Bộ đệm nhận luồng dữ liệu 60 FPS từ webcam, thực hiện gom nhóm batch insert mỗi 2 giây vào Database.
* **Nhiệm vụ 4: Cảnh Báo Khẩn Cấp Tức Thì**:
  * Khi phát hiện trạng thái Cấp 2 (`alert_level === 2`: Ngủ gật hoặc Mất tập trung), phát ngay sự kiện `alert:critical` qua Socket đến phòng điều hành.
* **Nhiệm vụ 5: Tích hợp Chatbot An Toàn**:
  * Endpoint `POST /api/analytics/chatbot` phân tích dữ liệu buồn ngủ theo thời gian và trả về phản hồi kèm bảng thống kê.

---

## 🛠️ Hướng Dẫn Chạy & Nạp Dữ Liệu

```bash
cd backend

# Cài đặt thư viện
npm install

# Nạp dữ liệu mẫu cho User và Admin
npm run seed

# Chạy server ở chế độ phát triển
npm run dev

# Chạy bộ test tích hợp toàn diện
npm test
```
