# FleetGuard Landing Redesign — Design

- Ngày: 2026-10-22
- Nhánh: `feat/frontend-tailwind-shadcn`
- Nguồn: `fleetguard-design-handoff/` (design-system.md, tokens.json, 2 ảnh mockup trong `assets/`)

## 1. Mục đích

Dựng lại landing page FleetGuard theo bộ handoff mới (teal + navy, Plus Jakarta Sans, minh họa 3D mềm). Đồng thời gỡ toàn bộ tài sản của Samsara mà code hiện tại đang dùng (logo cú, video hero tự host `samsara-hero.mp4` và video hotlink từ CDN `ctfassets.net` của Samsara) — đây là thương hiệu của công ty khác, không được phép dùng.

Trang phải có chuyển động GSAP phong phú nhưng vẫn mang chất sản phẩm doanh nghiệp: parallax theo từng section khi cuộn, icon và hình minh họa có animation riêng.

## 2. Mục tiêu / Không làm / Thất bại nếu

**Mục tiêu**
- Landing khớp mockup `fleetguard-full-page-mockup.png` ở desktop 1440px, có bản tablet (768) và mobile (375) theo mục 10 của design-system.md.
- Toàn bộ token của handoff nằm trong theme Tailwind v4 + biến shadcn; component dùng shadcn primitives.
- Trang Login/Register dùng token và component mới (cùng nhận diện với landing).
- Chuyển động: parallax theo section, icon animation, hero dashboard "đang chạy", driver illustration có trạng thái động.

**Không làm (đợt này)**
- Không reskin dashboard Driver/Admin (`src/pages/driver`, `src/pages/admin`) — để đợt sau.
- Không đổi logic `plan` trong app (`AuthContext`, `store/db.js`). Bảng giá chỉ là nội dung hiển thị.
- Không dark mode (handoff không có).
- Không viết unit test cho UI; kiểm chứng bằng build, lint, screenshot Playwright, Lighthouse.

**Thất bại nếu**
- Còn bất kỳ tài sản/tên Samsara nào trong code hoặc `public/`.
- Animation gây giật (CLS, long task) hoặc chặn người dùng bật "giảm chuyển động".
- Chữ trên nút/link không đạt tương phản AA.
- Trang trông như template chung chung, lệch xa mockup.

## 3. Ràng buộc

- Stack giữ nguyên: React 19 + Vite 8 + JS (không TS) + Tailwind v4 + shadcn (`radix-nova`) + `lucide-react` + `gsap@3.15` + `@gsap/react`.
- Mọi plugin GSAP dùng tới đều có sẵn trong gói `gsap` (ScrollTrigger, ScrollSmoother, DrawSVG, MorphSVG, SplitText, Flip, MotionPath, CustomWiggle).
- Toàn bộ chữ giao diện bằng tiếng Việt; font phải có subset `vietnamese`.
- Dashboard Driver/Admin vẫn dùng CSS Modules và biến cũ trong `index.css` — đổi token không được làm vỡ chúng (giữ các biến cũ như `--bg-primary`, `--amber-*` cho đến khi reskin dashboard).

## 4. Hướng tiếp cận

| Hướng | Mô tả | Đánh đổi |
|---|---|---|
| **A. Viết lại landing bằng Tailwind + shadcn, mỗi section 1 component (chọn)** | `src/components/landing/*`, HomePage chỉ ghép | Sạch, chia việc song song dễ; phải viết lại ~1.700 dòng CSS module |
| B. Giữ CSS Modules, chỉ đổi màu/nội dung | Sửa tại chỗ | Nhanh nhưng bỏ phí Tailwind/shadcn vừa cài, layout cũ lệch mockup nhiều |
| C. Dựng lại toàn app (cả dashboard) | Một lần làm hết | Phạm vi gấp 3, rủi ro cao — tách sang đợt sau |

Chọn A (đề xuất của Claude, người dùng đồng ý phạm vi landing + auth).

## 5. Quyết định đã chốt

1. **Phạm vi**: landing + Login/Register. Dashboard để đợt sau.
2. **Hình minh họa**: xem mục 9.
3. **Bảng giá**: hiển thị theo design — Cơ bản 199.000đ, Nâng cao 299.000đ /xe/tháng; năm = giảm 20% (159.000đ / 239.000đ). Cả hai CTA "Dùng thử 7 ngày" → `/register`. Không đổi logic plan.
4. **Màu warning**: trạng thái cảnh báo dùng cam `#F59E0B` (khớp mockup ngủ gật/mệt mỏi). Tím `#A855F7` chỉ dùng làm màu icon/nền pastel của feature "Báo cáo thông minh".
5. **Nội dung**: chữ lấy theo mockup. Số liệu (98,5%, 10.000+, 500+, 4.9★, 120+ đánh giá, KPI dashboard) là placeholder, gom vào 1 file `src/content/landing.js` để dễ sửa. Link nav "Tài nguyên"/"Liên hệ" cuộn tới footer.
6. **Chuyển động**: mức "phong phú có kiểm soát" — xem mục 8.
7. **Cách chạy**: nhánh hiện tại; commit phần đang dở trước (gsap deps, `.gitignore`); subagent chạy song song trong cùng checkout, mỗi agent chỉ sở hữu file của mình.

## 6. Design tokens

Nguồn: `tokens.json`. Ánh xạ vào `src/index.css`:

- `@theme inline`: `--color-brand` `#0E9B78`, `--color-brand-dark` `#08765E`, `--color-navy` `#0D2232`, `--color-ink` `#334155` (gray-700), `--color-muted-ink` `#94A3B8`, `--color-surface-subtle` `#F1F5F9`, status `success/info/warning/danger/accent`, pastel nền icon (mỗi màu status ở mức ~10%).
- Biến shadcn: `--primary` = brand-dark `#08765E` (để chữ trắng đạt 5,5:1), `--ring` = brand, `--foreground` = navy, `--muted-foreground` = gray-700, `--border` ≈ `#E2E8F0`, `--radius` = 12px (md); thêm `--radius-lg` 16px, `--radius-xl` 24px.
- Shadow: `--shadow-card`, `--shadow-dashboard` theo tokens.json.
- Font: `@fontsource-variable/plus-jakarta-sans` (gỡ Geist khỏi landing; giữ Inter cho dashboard cũ nếu cần).
- Typography: utility hoặc `@utility` cho display/h1–h4/body-lg/body/body-sm/caption theo bảng mục 3 design-system.md, có responsive (Hero 48→40→32, H2 32→28→24).

**Quy tắc tương phản**: chữ trắng chỉ đặt trên `#08765E` trở xuống; `#0E9B78` dùng cho icon, viền, mảng màu lớn, chữ ≥ 24px; `#94A3B8` chỉ cho placeholder/trang trí.

## 7. Component & section

Thư mục `src/components/landing/`. Mỗi section 1 file, component con cùng file hoặc thư mục con nếu lớn.

| Section | Component (theo inventory) | Ghi chú |
|---|---|---|
| Navbar | BrandLogo, NavigationLink, LoginButton, SignupButton, MobileMenu (shadcn Sheet) | Sticky, nền trắng mờ khi cuộn, link active theo section (ScrollTrigger) |
| Hero | HeroHeading, HeroDescription, PrimaryCTA, SecondaryCTA, FleetDashboard, TrustRating | Dashboard dựng bằng code (KPI, bản đồ SVG, cảnh báo, biểu đồ km) — không dùng ảnh |
| Features | SectionHeading, FeatureCard, IconContainer | 3 cột / 2 / 1 |
| AI Demo | ScenarioCard, DriverIllustration, StatusBadge, ScenarioSelector | 4 trạng thái; tự chạy vòng + chọn tay |
| Pricing | BillingToggle, PricingCard, PricingFeature, PricingCTA, PopularBadge | Trang trí xe con + xe tải trên đường |
| Comparison | ComparisonTable, ComparisonRow, FeatureAvailability | Mobile: cuộn ngang; trạng thái có icon + sr-only text |
| Technology + Stats | TechnologyCard, TechnologyIcon, StatsBar | |
| Footer | FooterBrand, FooterLinkGroup, SocialLinks, ContactInfo | Nền navy-teal |

Primitives dùng chung (`src/components/ui/`, qua shadcn CLI rồi chỉnh variant): button (primary/secondary/ghost/text + loading), badge, card, input, checkbox, radio-group, select, toggle-group, table, sheet, separator, avatar.

Logo: SVG khiên chevron FleetGuard tự vẽ theo mockup (`src/components/brand/FleetGuardLogo.jsx`) + favicon mới.

## 8. Chuyển động (GSAP)

Nền tảng (`src/lib/motion/`):
- Đăng ký plugin 1 lần; hook `useGSAP` với `scope` ref cho mọi component; cleanup tự động.
- `gsap.matchMedia()` 3 nhánh: desktop (đầy đủ), mobile (bỏ parallax nặng, giữ reveal), `prefers-reduced-motion: reduce` (tắt hết, hiện trạng thái cuối).
- **ScrollSmoother** cho cuộn mượt + parallax bằng `data-speed` / `data-lag`; `smoothTouch: false`. Navbar fixed nằm ngoài wrapper. Nav anchor dùng `smoother.scrollTo`.
- Chỉ animate `transform`/`opacity`; không animate layout.

Theo section:
- **Parallax theo section**: mỗi section có lớp nền (blob gradient, lá, mây, cây, thành phố) chạy tốc độ khác lớp nội dung; tiêu đề section reveal bằng SplitText (theo dòng/từ, không theo ký tự vì dấu tiếng Việt).
- **Hero**: headline SplitText; dashboard tilt nhẹ theo chuột (`quickTo`); KPI đếm số; pin bản đồ rơi + gợn sóng; tuyến đường vẽ bằng DrawSVG; danh sách cảnh báo trượt vào, định kỳ thêm cảnh báo mới; đường biểu đồ km tự vẽ; cành lá đung đưa (CustomWiggle), parallax.
- **Icon animation** (Lucide là SVG stroke → DrawSVG khi vào khung nhìn) + hover riêng: bell lắc (CustomWiggle), map-pin nảy, chart cột mọc, plug cắm vào, shield/lock đóng khóa, headset nghiêng; tech icons: scan-face có tia quét, brain-circuit nhấp nháy mạch, chip phát sáng, clock kim quay.
- **AI Demo** (bố cục theo mockup: **4 card cùng lúc**, mỗi card 1 `DriverIllustration` cố định 1 trạng thái — quyết định của Claude): mỗi card có vòng idle riêng: bình thường = thở nhẹ + chớp mắt; ngủ gật = đầu gật + "Zzz" bay theo MotionPath; mệt mỏi = ngáp lặp (scale miệng) + tay che; mất tập trung = mắt liếc + điện thoại phát sáng. "Highlight" tự chạy vòng qua 4 card mỗi ~4s (card active nổi lên, viền màu trạng thái, badge bật, có thanh tiến trình), dừng khi hover/focus; hover/focus một card thì card đó thành active. Idle loop chỉ chạy khi section trong khung nhìn. Mobile: carousel vuốt ngang (scroll-snap), 1 card ~80% chiều rộng.
- **Pricing**: đổi tháng/năm → số giá tween + Flip cho pill toggle; xe con và xe tải chạy ngang theo cuộn (scrub); badge "Phổ biến" ánh shimmer.
- **Comparison**: hàng xuất hiện lần lượt, check icon vẽ bằng DrawSVG.
- **Stats**: đếm số khi vào khung nhìn.
- **Footer**: reveal nhẹ.

Ngân sách hiệu năng: LCP < 2,5s, CLS < 0,05, không long task > 50ms do animation; bundle GSAP chỉ import plugin thực dùng.

## 9. Hình minh họa

Yêu cầu chung: cùng một nhân vật tài xế (áo polo xanh lá/teal) ở 4 trạng thái, phong cách vector mềm có đổ sáng nhẹ theo mockup; trang trí: xe tải xanh, xe con trắng, chậu cây, cành lá, điện thoại bản đồ, skyline thành phố. Giấy phép phải cho phép dùng thương mại. Ưu tiên SVG có layer tách được để animate.

**Kết quả nghiên cứu (2026-10-22)**
- Không có bộ hình miễn phí nào có cùng một tài xế ở 4 trạng thái.
- Microsoft Fluent Emoji 3D (MIT) có xe tải/xe con/cây/thành phố/icon nhưng chỉ 256px và là phong cách emoji — dễ lệch phong cách khi đặt cạnh tài xế.
- Kenney Car Kit / Quaternius (CC0) là low-poly GLB — lệch phong cách mockup.
- Tạo 3D bằng AI (Meshy, Tripo, image-gen MCP như Gemini/fal) cần API key trả phí; bản free của Meshy buộc ghi công CC BY 4.0. TRELLIS cần Linux + 24 GB VRAM. blender-mcp cần cài Blender.
- `img2threejs` (đã cài) dựng 3D thủ tục bằng Three.js — miễn phí nhưng nhìn thô hơn mockup và nặng bundle nếu chạy live.

**Hướng chọn (quyết định của Claude, chờ người dùng duyệt)**: vẽ tay bằng **SVG nhiều lớp với gradient/đổ bóng mềm** (giả 3D) theo đúng mockup.
- Lý do: hình tài xế trong mockup thực chất là vector mềm; SVG cho phép GSAP animate từng bộ phận (mắt, miệng, đầu, tay, điện thoại, Zzz, bánh xe, lá); nét sắc ở mọi kích thước; nhẹ; không vướng giấy phép.
- Nâng cấp tùy chọn sau: nếu người dùng cung cấp API key (Gemini/fal) có thể tạo bản raster 3D-clay cho tài xế và giữ SVG làm fallback/animation.

**Sản phẩm**
- `src/components/illustrations/DriverIllustration.jsx` — 1 SVG chứa mọi layer của 4 trạng thái, prop `state` = `normal | drowsy | fatigued | distracted`; các bộ phận có `data-part` cố định để GSAP chuyển trạng thái.
- `src/components/illustrations/` — `DeliveryTruck`, `SedanCar`, `PottedPlant`, `LeafBranch`, `CitySkyline`, `PhoneMap`, `AiChip`, có `data-part` cho phần chuyển động (bánh xe, lá…).
- `src/components/brand/FleetGuardLogo.jsx` — logo khiên chevron + wordmark.
- Trang preview riêng cho dev (`frontend/preview-*.html`), không nằm trong build production.

**Trạng thái (2026-10-22)**: đã dựng xong cả 9 asset + logo + favicon (lint/build pass). Hook `data-part`, pivot và gợi ý animation ghi trong JSDoc đầu mỗi file. Lệch còn lại để Phase 5 xử lý: tóc tài xế hơi trơn, mặt đơn giản hơn mockup, tay giơ (ngáp/điện thoại) hơi cứng; hướng xe tải/xe con ngược với ảnh pricing (lật bằng `scaleX(-1)` khi ghép). `index.html` vẫn trỏ favicon `/samsara-icon.svg` — Phase 1 sửa.

## 10. Kế hoạch thực thi (tóm tắt — chi tiết ở plan)

| Phase | Nội dung | Agent |
|---|---|---|
| 0 | Spec + plan | Claude (chính) |
| 1 | Nền tảng: tokens, font, logo, gỡ Samsara, shadcn primitives, motion lib | 1 agent, chặn các phase sau |
| 1b | Hình minh họa (chạy song song với 1) | 1 agent Opus |
| 2 | Section song song: A Nav+Footer · B Hero+Dashboard · C Features+Tech+Stats · D AI Demo · E Pricing+Comparison · F Login/Register | 6 agent, mỗi agent sở hữu file riêng |
| 3 | Ghép HomePage, ScrollSmoother, parallax toàn trang, nhịp chuyển động | 1 agent |
| 4 | Review song song: code · độ khớp mockup (Playwright 1440/768/375) · a11y/tương phản · hiệu năng (Lighthouse) | 4 agent chỉ đọc |
| 5 | Sửa theo review, tối ưu, verify, commit | 1 agent + Claude kiểm |

## 10b. Quyết định bổ sung sau builder check (quyết định của Claude)

- **Login/Register**: chỉ restyle — giữ nguyên field, toggle tài xế/doanh nghiệp, tài khoản demo điền nhanh, luồng submit. Bố cục desktop chia đôi: trái là panel teal nhạt có `PhoneMap` + `CitySkyline` + 1 câu giá trị; phải là form trong card. Mobile chỉ còn form. Không thêm field gói/chu kỳ thanh toán; CTA pricing chỉ điều hướng `/register` không kèm tham số.
- **Gỡ Samsara trong dashboard**: được phép sửa hẹp `DriverLayout.jsx`, `AdminLayout.jsx` (thay `SamsaraLogo` bằng `FleetGuardLogo`), xóa `SamsaraLogo.jsx`, `public/samsara-*`, sửa comment/README nhắc Samsara. Không đổi gì khác trong dashboard.
- **Review độ khớp mockup (Phase 4)**: hình minh họa được chấm theo "bản vector mềm tương đương phong cách" — bố cục, màu, tỷ lệ, cảm xúc từng trạng thái — không đòi giống render 3D-clay từng pixel.

## 11. Phần để builder tự quyết

- Cấu trúc file con bên trong mỗi section.
- Giá trị ease/duration cụ thể (giữ nhất quán qua 1 file preset trong `src/lib/motion/`).
- Dữ liệu giả cho bản đồ và biểu đồ hero.
