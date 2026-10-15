# Phân Hệ Frontend (Giao Diện User & Admin)

Ứng dụng web xây dựng trên nền tảng **React 18 + Vite**, cung cấp giao diện riêng biệt cho 2 đối tượng người dùng: **USER** và **ADMIN**.

> ⚠️ **Quy Tắc Thiết Kế Bất Biến**:
> Giao diện tuân thủ nghiêm ngặt nguyên tắc **KHÔNG DÙNG ICON**. Toàn bộ cấu trúc trực quan được xây dựng bằng **Typography chuẩn mực, viền công nghệ cao, màu sắc đối lập và badge trạng thái**.

---

## 👥 Cấu Trúc Giao Diện 2 Actor

### 1. Giao Diện USER (5 Tabs Chuẩn Mực tại `/user`)
* **Tab 1: Overview (Trang mặc định khi đăng nhập)**:
  * Lời chào người dùng: *"Xin chào, [Tên User]!"*.
  * Hiển thị bảng thông tin cá nhân: Họ tên, Email, Mã định danh, Vai trò `[USER]`, Trạng thái `[ĐANG HOẠT ĐỘNG]`.
  * Tóm tắt trạng thái hệ thống và nút bấm chuyển nhanh: `[Bắt Đầu Quét Camera Ngay]`.
* **Tab 2: Start Camera**:
  * Bật webcam quét an toàn thời gian thực bằng MediaPipe Face Mesh.
  * Banner trạng thái trực quan phân biệt mức độ cảnh báo (Xanh: Tỉnh táo; Vàng: Ngáp; Đỏ: Buồn ngủ / Mất tập trung) kèm còi báo động.
  * Hàng nút kiểm thử mô phỏng nhanh: `[Tỉnh Táo]`, `[Buồn Ngủ]`, `[Mất Tập Trung]`, `[Ngáp]`.
  * **Tự động lưu**: Bấm `[Tắt Camera & Lưu Phiên]` sẽ tự động đồng bộ thời lượng và số lần vi phạm vào database.
* **Tab 3: Lịch sử**:
  * Bảng nhật ký các phiên quét an toàn được lưu tự động từ Backend.
  * Thống kê tổng số phiên, tổng thời gian giám sát, điểm an toàn trung bình.
  * Hỗ trợ modal xem chi tiết từng phiên quét.
* **Tab 4: Analytic**:
  * Tập trung phân tích chuyên sâu trạng thái **"Buồn ngủ (Drowsy)"**.
  * **Biểu đồ 24 giờ**: Phân bố tần suất buồn ngủ theo khung giờ (làm nổi bật đỉnh điểm 13:00 - 14:30).
  * **Biểu đồ xu hướng an toàn 7 ngày** và tỷ lệ các trạng thái tập trung.
  * Lời khuyên khoa học phòng chống ngủ gật.
* **Tab 5: Chatbot (AI Safety Copilot)**:
  * Khung chat hỏi đáp số liệu với AI, các nút gợi ý câu hỏi nhanh 1-click.
  * Render bảng trích xuất dữ liệu Telemetry trực tiếp trong tin nhắn.

---

### 2. Giao Diện ADMIN (3 Mục Cốt Lõi tại `/admin`)
* **Mục 1: Tổng Quan Toàn Hệ Thống**:
  * Dashboard tổng hợp: Tổng số User, tổng số phiên đã thực hiện, tổng số vụ cảnh báo nguy hiểm Cấp 2 trên toàn hệ thống.
* **Mục 2: Quản Lý Người Dùng & Điểm An Toàn**:
  * Danh sách tài xế, email, số phiên đã lái, điểm an toàn trung bình và phân loại rủi ro (`[AN TOÀN CAO]`, `[CẦN NHẮC NHỞ]`, `[NGUY HIỂM]`).
* **Mục 3: Nhật Ký Cảnh Báo Toàn Cục**:
  * Bảng theo dõi các sự kiện buồn ngủ và mất tập trung nghiêm trọng của tất cả tài xế theo thời gian thực.

---

## 🛠️ Hướng Dẫn Cài Đặt & Chạy

```bash
cd frontend

# Cài đặt thư viện
npm install

# Chạy giao diện ở chế độ phát triển
npm run dev

# Kiểm tra bản build sản phẩm
npm run build
```
