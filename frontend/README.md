# FleetGuard Frontend 🚗🛡️

Giao diện người dùng cho nền tảng **FleetGuard — Hệ thống Giám Sát Tài Xế AI Thời Gian Thực**: trang giới thiệu (landing), đăng nhập / đăng ký và các phân hệ Tài xế / Quản trị.

---

## 🎨 Giao Diện & Thiết Kế
* **Nhận diện FleetGuard**: logo khiên chevron, tông xanh lục (`brand` #0E9B78, `brand-dark` #08765E), chữ navy (#0D2232), nền trắng / mint nhạt. Toàn bộ token nằm trong theme Tailwind v4 (`src/index.css`).
* **Typography**: **Plus Jakarta Sans** (giao diện) và **JetBrains Mono** (chỉ số trên dashboard), tải qua `@fontsource-variable`, có đầy đủ dấu tiếng Việt.
* **Component**: shadcn/ui (`src/components/ui/`) + icon lucide-react; hình minh họa SVG dựng bằng code (`src/components/illustrations/`).
* **Chuyển động**: GSAP (ScrollTrigger, ScrollSmoother, SplitText, DrawSVG, Flip…) qua `src/lib/motion/` — cuộn mượt + parallax trên desktop, reveal theo cuộn, icon động, dashboard hero "đang chạy". Tôn trọng `prefers-reduced-motion` (tắt hết chuyển động, hiện trạng thái cuối).
* **Nội dung**: toàn bộ chữ của landing nằm trong `src/content/landing.js`.

---

## 📂 Các Trang Hiện Hành
* **`/` (Trang chủ)**: Hero + dashboard đội xe trực tiếp, 6 tính năng, mô phỏng AI 4 trạng thái tài xế, công nghệ & số liệu, bảng giá (tháng / năm), so sánh gói, chân trang.
* **`/login` (Đăng nhập)**: nút điền nhanh tài khoản kiểm thử (`user@fleet.vn` & `admin@fleet.vn`).
* **`/register` (Đăng ký)**: tạo tài khoản tài xế hoặc doanh nghiệp.
* **`/driver`, `/admin`**: phân hệ Tài xế và Quản trị (cần đăng nhập).

---

## 🛠️ Cài Đặt & Chạy Thử

```bash
# Cài đặt thư viện
npm install

# Chạy môi trường phát triển (Port 5173)
npm run dev

# Kiểm tra mã nguồn (Oxlint)
npm run lint

# Đóng gói sản phẩm (Production Build)
npm run build

# Kiểm tra landing (cần dev server đang chạy): sections, lỗi console, tràn ngang,
# reduced motion, nội dung màn hình đầu, nav anchor, rò rỉ ScrollTrigger
npm run check -- http://localhost:5173

# Chụp ảnh toàn trang ở nhiều độ rộng
npm run shot -- http://localhost:5173/ ../.tmp/shots --widths=1440,768,375 --full
```
