# Phân Hệ AI Scanning (Computer Vision Engine)

Phân hệ xử lý thị giác máy tính nhận diện khuôn mặt tài xế bằng **MediaPipe Face Mesh (468 landmarks 3D)**, tập trung phát hiện sớm nguy cơ buồn ngủ, ngáp và mất tập trung.

---

## 📋 Danh Sách Nhiệm Vụ Cốt Lõi

### 1. Giám sát Mắt & Ngủ gật (Eye Aspect Ratio - EAR)
* **Thuật toán**: Tính khoảng cách Euclidean giữa 6 điểm mốc trên mí mắt trái và phải.
* **Ngưỡng kích hoạt**:
  * $EAR < 0.21$ liên tục $\ge 1.5$ giây $\rightarrow$ Bật trạng thái **`DROWSY`** (Cảnh báo nguy hiểm Cấp 2 kèm còi báo động).
  * Đo chỉ số **$PERCLOS$** (tỷ lệ phần trăm thời gian nhắm mắt trong 60 giây). Nguy hiểm khi $PERCLOS \ge 15\%$.

### 2. Giám sát Miệng & Ngáp Mệt Mỏi (Mouth Aspect Ratio - MAR)
* **Thuật toán**: Đo độ mở dọc và ngang của khóe miệng và bờ môi.
* **Ngưỡng kích hoạt**:
  * $MAR > 0.65$ kéo dài $\ge 1.5$ giây $\rightarrow$ Bật trạng thái **`YAWNING`** (Nhắc nhở Cấp 1).
  * Tự động đếm dồn số lần ngáp trong phiên để phân tích xu hướng kiệt sức.

### 3. Giám sát Hướng Nhìn & Xao Nhãng (Head Pose Estimation)
* **Thuật toán**: Ước tính góc Euler (Yaw, Pitch, Roll) từ chóp mũi, cằm và 2 mắt.
* **Ngưỡng kích hoạt**:
  * Quay đầu sang trái/phải $|Yaw| > 25^\circ$ hoặc cúi đầu $Pitch < -15^\circ$ quá $2.0$ giây $\rightarrow$ Bật trạng thái **`DISTRACTED`** (Cảnh báo Cấp 2).

### 4. Phân Tích Video Offline (Video Analyzer)
* Quét video hành trình tải lên với tần suất lấy mẫu 500ms/frame.
* Trích xuất danh sách các mốc thời gian vi phạm (Violation Markers) và tính điểm an toàn tổng thể của chuyến đi.

---

## 🛠️ Cài Đặt & Chạy Thử Nghiệm

```bash
cd ai-scanning
npm install
npm test
```
