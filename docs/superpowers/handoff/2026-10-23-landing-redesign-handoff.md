# Handoff — FleetGuard landing redesign

- Ngày: 2026-10-23
- Nhánh: `feat/frontend-tailwind-shadcn` (đã push, HEAD `87d552c`). Chưa mở PR vào `main`.
- Spec: `docs/superpowers/specs/2026-10-22-fleetguard-landing-redesign-design.md`
- Plan: `docs/superpowers/plans/2026-10-22-fleetguard-landing-redesign.md`
- Thiết kế gốc: `fleetguard-design-handoff/` (mockup raster, tokens, design-system)

## 1. Trạng thái hiện tại

Đã xong: landing page mới (Tailwind v4 + shadcn + GSAP) theo mockup, Login/Register đổi giao diện, gỡ toàn bộ tài sản Samsara, bộ hình minh họa SVG, chuyển động (ScrollSmoother, parallax, idle loop khi section trong khung nhìn, count-up), nút liên hệ nổi Zalo/Hotline. Features, AI Demo, Pricing đã chỉnh lại khớp mockup ở 1440 px (±5%).

| Kiểm tra | Kết quả gần nhất |
|---|---|
| `npm run lint` | sạch |
| `npx vite build` | ok — chunk chính ~725 kB / 240 kB gzip (có cảnh báo > 500 kB) |
| `npm run check -- <baseUrl>` | 11/11 PASS |
| Lighthouse mobile (median 3 lần, trước Phase 7) | điểm 0.91 · LCP 2.87 s · TBT ~167 ms · CLS 0 |
| Lighthouse desktop | 0.99 · LCP 0.64 s |

Lịch sử commit chính: `f074441` nền → `09603c2` Phase 1 → `83bd6d1` sections → `cbb1143` ghép trang → `79a7c84` sửa theo review → `51c922a`/`fe24d2f`/`4ec47e0` Phase 6 (nền, 3D, motion) → `511922a` Phase 7 (khớp design 3 section).

## 2. Chạy và kiểm tra

```bash
cd frontend
npm install
npx vite --port 5190 --strictPort   # cổng 5173 trên máy dev đang bị một server khác chiếm
npm run check -- http://localhost:5190
npm run shot -- "http://localhost:5190/" ../.tmp/shots --widths=1440,768,375
```

- `scripts/check-landing.mjs`: 11 phép kiểm tra (sections, no-errors, no-overflow, no-samsara, reduced-motion, above-fold, count-up, nav-anchor, nav-bottom, breakpoint-roundtrip, no-leak). Chạy bằng Chrome thật qua `playwright-core`.
- Trang preview cho dev (không vào build production): `preview-landing.html?s=<Section>` (`?s=__ui` = component sheet), `preview-driver.html`, `preview-decor.html`, `preview-badges.html`, `preview-backdrops.html`, `preview-glyphs.html`, `preview-vehicles.html`, `preview-motion.html`.

## 3. Bản đồ code

- Nội dung chữ + số liệu: `src/content/landing.js` (mọi copy landing nằm ở đây).
- Section: `src/components/landing/{Navbar,Hero,Features,AiDemo,Pricing,Comparison,Technology,Footer}.jsx` (+ `hero/`, `demo/`, `pricing/`), ghép trong `src/pages/HomePage.jsx`, bọc bởi `SmoothScroll.jsx`.
- Motion dùng chung: `src/lib/motion/` — `gsap.js` (đăng ký plugin, luôn import gsap từ đây), `presets.js` (`MQ`, `EASE`, `clampStart`), `defer.js` (`deferSetup`), `idle.js` (`bindIdle`), `countUp.js`, `scroll.js` (`scrollToSection`), `iconMotion.js`. Nút tạm dừng: `components/landing/{motionPause.js,MotionPauseButton.jsx}`.
- Trang trí: `components/landing/decor/` (`SectionBackdrop`, `Float3D`, patterns), nút liên hệ `FloatingContact.jsx`.
- Hình minh họa SVG: `src/components/illustrations/` (tài xế, xe, cây, thành phố, `3d/` huy hiệu clay, `feature-glyphs/`), logo `src/components/brand/FleetGuardLogo.jsx`. Mỗi file có JSDoc liệt kê `data-part` + tâm xoay.
- UI primitives: `src/components/ui/` (shadcn). Import `cn` từ `@/lib/utils`, **không** từ gói `cn`. `src/lib/cn-tables.js` là file sinh ra — phải sinh lại khi đổi thang text/shadow trong `@theme` (lệnh ở đầu file).

## 4. Việc chưa xong (ưu tiên giảm dần)

### Cần người quyết định / cung cấp
1. **Số Zalo thật** — đang là placeholder `19001234` (`CONTACT_CTA.zaloNumber` trong `src/content/landing.js`). Hotline `1900 1234`, email, địa chỉ, giá (199.000đ/299.000đ), số liệu (98,5%, 10.000+, 500+, 4.9★, 120+ đánh giá) đều là số trong mockup, chưa xác minh với kinh doanh.
2. **Hình tài xế (AI Demo) — đã thay bằng ảnh raster (2026-10-23)**: 4 ảnh vẽ bằng AI theo mockup, `src/assets/driver/{normal,drowsy,fatigued,distracted}.webp` (800×650, ~27 kB/ảnh, `loading="lazy"`), khung squircle cắt bằng CSS mask. Chuyển động còn lại: nhịp thở (`art`), Zzz bay (drowsy), ánh điện thoại (distracted). Mất chớp mắt / gật đầu / ngáp động theo bộ phận. Muốn đổi ảnh: giữ tỉ lệ 16:13 và vị trí đầu/vô-lăng như cũ; nếu đầu lệch nhiều thì chỉnh lại toạ độ Zzz / `phone-glow` trong `DriverIllustration.jsx`.
3. **Mở PR vào `main`** — chưa mở.
4. **Nút tạm dừng trên `/login`** — chuyển động điện thoại ở AuthShell chỉ tôn trọng trạng thái tạm dừng đặt từ landing; trang login không có nút riêng (WCAG 2.2.2). Chọn: thêm `MotionPauseButton` vào panel trái, hoặc giới hạn chuyển động ~5 s.
5. **Màu placeholder input** `ink-subtle` (#94A3B8) chỉ 2.56:1 — spec cho phép vì chỉ dùng cho placeholder; nếu muốn đạt AA cần đổi token.

### Hiệu năng
6. **LCP mobile 2.87 s** (mục tiêu tự đặt ≤ 2.80 s; ngân sách gốc của plan 2.5 s). Phần còn lại là task khởi tạo ~360 ms (React + intro Hero + SplitText) và chunk chính (react-dom ~200 kB, gsap ~175 kB). Hướng tiếp: hoãn idle loop + ticker của Hero sau first paint (chỉ giữ intro đồng bộ), bỏ plugin Flip (đang dùng ở `Hero.jsx`, `hero/FleetDashboard.jsx`, `Pricing.jsx`; thay bằng FLIP tự viết, ~−19 kB), cân nhắc prerender HTML landing. Đã thử lazy-load section: LCP dao động mạnh (2.70–3.33 s) → không dùng.
7. **Số tween chạy cùng lúc khi đang cuộn** lên 33–34 (mục tiêu ≤ 30), chủ yếu idle loop Hero chồng với reveal Features/Demo. **Parallax `data-speed`**: 22 phần tử ở ≥ 1280 px (mục tiêu ~20).
8. `AiDemo` tự viết phần gating idle nên không được giới hạn 30 fps như `bindIdle` — là chi phí idle lớn nhất ở y≈1800. `pricing/PricingCard.jsx` vẫn dùng `loopWhileVisible` cũ thay vì `bindIdle`.
9. Memo hoá `Intl.NumberFormat` trong `formatVnd`/`formatStat` (`landing.js`) — ~12 ms ở profile 4× CPU.
10. Idle loop đã hạ 30 fps; mới phân tích theo khung hình, **chưa ai xem tận mắt trên màn 60 Hz** — kiểm tra đường đi/sparkline Hero có bị giật không.

### Code / tooling
11. **`npm run shot --full` chụp trang trống dưới Hero** — vì section dưới Hero giờ mount lần lượt sau first paint; script tắt ScrollSmoother và chụp trước khi mount xong. Sửa `scripts/shot.mjs`: chờ mọi `section[id]` có nội dung trước khi chụp. (Trang thật không bị.)
12. ~~Footer tra link theo label~~ — xong (2026-10-23): menu theo đúng thứ tự section, footer dùng `{ label, id }` (Chat Zalo nằm ở cột Liên hệ); mục chưa có trang (Blog, API, Tuyển dụng, Điều khoản…) hiện chữ + nhãn "Sắp ra mắt", không còn link `#`. Khi có trang thật: thêm `href` vào item trong `FOOTER` và một nhánh trong `FooterLink`.
13. Xoá class thừa `.brandText` / `.brandAccent` trong `pages/{admin,driver}/*Layout.module.css`.
14. Đường chạy trên điện thoại ở AuthShell dùng path SVG nhân bản bằng code — nên chuyển vào `PhoneMap.jsx` (hoạt động đúng, chỉ là dọn dẹp).
15. Phím mũi tên cho ToggleGroup chọn loại tài khoản ở Register và nút tháng/năm ở Pricing.
16. Vài shadow tuỳ ý (`shadow-[…]`) ở AuthShell/RegisterPage chưa thành token.
17. Hero: intro chạy lại khi kéo cửa sổ qua mốc 1024 px (matchMedia) — nhỏ.

### Hình ảnh còn lệch nhẹ so với mockup (đã chấp nhận)
- Container 1200 px (mockup ~1226 px, mép không đều) — đã thử nới, độ lệch tổng tăng 305 → 459 px nên giữ nguyên.
- CTA và nút chọn tháng/năm dùng `brand-dark` thay vì xanh sáng của mockup (để chữ trắng đạt AA).
- Xe ở Pricing bị cắt mép màn hình ở 1024–1279 px.
- Font Plus Jakarta hẹp hơn font mockup ~2–6%, vài mô tả xuống dòng khác một từ.
- Ở trang dashboard `/driver`, 768 px bị cuộn ngang — có từ trước redesign.

### Ngoài phạm vi đợt này
- Dashboard Driver/Admin chưa đổi giao diện (chỉ đổi logo + font). Đây là đợt tiếp theo theo spec.

## 5. Quyết định đã chốt (để không làm lại)
- Section order theo mockup: Hero → Features → AI Demo → Pricing → Comparison → Technology(+Stats) → Footer.
- Features/AI Demo/Pricing bám mockup tuyệt đối (không huy hiệu 3D, không họa tiết); Hero và Technology giữ nền nhiều lớp + huy hiệu 3D của Phase 6.
- Touch target ≥ 44 px trên thiết bị cảm ứng; desktop giữ kích thước thiết kế.
- Không lazy-load module/section (làm LCP xấu hơn).
- Chuyển động chỉ chạy khi trong khung nhìn, tôn trọng `prefers-reduced-motion` và nút tạm dừng; SplitText chỉ `lines,words` (dấu tiếng Việt).
- Bảng giá chỉ là nội dung hiển thị — không đổi logic `plan` trong app.

## 6. Ghi chú quy trình
- Toàn bộ sổ theo dõi, báo cáo từng agent và review nằm ở `.superpowers/sdd/2026-10-22-fleetguard-landing-redesign/` — thư mục này **bị gitignore**, chỉ có trên máy dev đã làm.
- Ảnh so sánh với mockup: `.tmp/cmp/compare-{features,demo,pricing}.png` (cũng bị gitignore).
