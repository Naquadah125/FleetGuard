# FleetGuard Design System & Component Library

## 1. Tổng quan

Thiết kế landing page FleetGuard theo phong cách SaaS hiện đại, sạch, thân thiện và phù hợp doanh nghiệp. Ngôn ngữ thị giác dùng nền trắng, xanh ngọc/teal làm màu thương hiệu, chữ navy đậm, card bo tròn, bóng nhẹ, icon nhất quán và minh họa tài xế dạng 3D vector mềm.

Ảnh component sheet nằm trong `assets/fleetguard-component-sheet.png`; ảnh mockup toàn trang nằm trong `assets/fleetguard-full-page-mockup.png` nếu file có sẵn.

## 2. Color tokens

Các mã màu dưới đây là token đề xuất chuẩn hóa theo hình mockup; không phải dữ liệu được trích xuất trực tiếp từ file thiết kế gốc.

| Token | Hex | Vai trò |
|---|---|---|
| Primary | `#0E9B78` | CTA chính, link, trạng thái được chọn |
| Primary Dark | `#08765E` | Hover, vùng nhấn, footer |
| Dark Navy | `#0D2232` | Heading và chữ chính |
| Gray 700 | `#334155` | Body text |
| Gray 400 | `#94A3B8` | Placeholder, nội dung phụ |
| Gray 100 | `#F1F5F9` | Nền phụ, đường phân cách |
| White | `#FFFFFF` | Nền và card |
| Success | `#22C55E` | Trạng thái hoàn thành/an toàn |
| Info | `#3882F6` | Thông tin, GPS |
| Warning | `#A855F7` | Cảnh báo cần chú ý |
| Danger | `#EF4444` | Nguy hiểm/cảnh báo khẩn |
| Accent | `#F59E0B` | Điểm nhấn và tiết kiệm |

### Quy tắc màu
- Tỷ lệ gợi ý: 60% trắng/nền sáng, 30% xanh ngọc và xanh đậm, 10% màu trạng thái/nhấn.
- Primary dùng cho CTA chính, liên kết quan trọng và trạng thái đang chọn.
- Đỏ và tím dành cho trạng thái cảnh báo, không dùng làm màu chủ đạo toàn trang.
- Footer dùng navy pha xanh đậm để tạo điểm kết thúc thị giác.
- Duy trì độ tương phản đủ rõ giữa chữ và nền.

## 3. Typography

**Font đề xuất:** Plus Jakarta Sans — https://fonts.google.com/specimen/Plus+Jakarta+Sans

Font được đề xuất theo phong cách SaaS/dashboard hiện đại. Có thể dùng font fallback `Arial, sans-serif` nếu không tải được font web.

| Token | Cỡ chữ / line-height | Weight |
|---|---:|---|
| Display / Hero | 48 / 56 px | 700–800 |
| H1 | 40 / 48 px | 700 |
| H2 | 32 / 40 px | 700 |
| H3 | 24 / 32 px | 600–700 |
| H4 | 20 / 28 px | 600–700 |
| Body Large | 16 / 26 px | 400 |
| Body | 14 / 22 px | 400 |
| Body Small | 12 / 18 px | 400–500 |
| Caption | 11 / 16 px | 400–500 |
| Button | 14 / 20 px | 600 |

### Responsive typography
- Desktop: Hero 48 px, H2 32 px.
- Tablet: Hero 40 px, H2 28 px.
- Mobile: Hero 32 px, H2 24 px, body tối thiểu 14 px.

Ví dụ headline:
- H1: “An toàn trên mọi hành trình”
- Headline nhấn: “Bảo vệ doanh nghiệp bằng AI thông minh”
- Body: “FleetGuard giúp phát hiện sớm rủi ro, cảnh báo kịp thời và nâng cao hiệu quả vận hành đội xe.”

## 4. Spacing, radius và shadow

| Token | Giá trị | Áp dụng |
|---|---:|---|
| `space-1` | 4 px | Khoảng cách icon nhỏ |
| `space-2` | 8 px | Giữa thành phần liên quan |
| `space-3` | 12 px | Padding nhỏ |
| `space-4` | 16 px | Padding card |
| `space-6` | 24 px | Khoảng cách giữa nhóm |
| `space-8` | 32 px | Khoảng cách nội dung lớn |
| `space-12` | 48 px | Padding section nhỏ |
| `space-20` | 80 px | Khoảng cách section desktop |
| `radius-md` | 12 px | Input, button |
| `radius-lg` | 16 px | Card |
| `radius-xl` | 24 px | Hero panel, dashboard |

Shadow đề xuất:
- Card: `0 4px 16px rgba(13, 34, 50, 0.06)`
- Dashboard nổi: `0 12px 32px rgba(13, 34, 50, 0.10)`

## 5. Icon system

Gợi ý thư viện: Lucide — https://lucide.dev/icons/

- Outline icons, stroke khoảng 1.75–2 px.
- Đầu nét và góc bo tròn, nhất quán về trọng lượng nét.
- Dùng kích thước 16, 20, 24 px cho UI; 28–32 px trong icon container lớn.
- Icon container 40–48 px, nền pastel theo loại tính năng.
- Các icon gợi ý: `bell`, `map-pin`, `chart-no-axes-combined`, `plug`, `shield-check`, `headset`, `scan-face`, `brain-circuit`, `clock`, `car-front`.

## 6. Illustration style

- Minh họa tài xế dạng 3D vector thân thiện, ánh sáng mềm.
- Áo xanh lá/teal làm màu nhận diện; nền pastel xanh nhạt.
- Hình minh họa cần cùng phong cách, góc nhìn và tỷ lệ giữa các scenario.
- Tránh trộn icon outline, emoji và minh họa photorealistic trong cùng một nhóm component.

## 7. Component inventory

### 01 — Header / Navigation
- `BrandLogo`
- `NavigationLink`
- `LoginButton`
- `SignupButton`
- `MobileMenu`

### 02 — Hero Section
- `HeroHeading`
- `HeroDescription`
- `PrimaryCTA`
- `SecondaryCTA`
- `FleetDashboard`
- `TrustRating`

### 03 — Feature Grid
- `SectionHeading`
- `FeatureCard`
- `IconContainer`
- `FeatureDescription`

### 04 — AI Monitoring Demo
- `ScenarioCard`
- `DriverIllustration`
- `StatusBadge`
- `ScenarioSelector`

### 05 — Pricing
- `BillingToggle`
- `PricingCard`
- `PricingFeature`
- `PricingCTA`
- `PopularBadge`

### 06 — Comparison Table
- `ComparisonTable`
- `ComparisonRow`
- `FeatureAvailability`
- `CheckIcon`

### 07 — Technology
- `TechnologyCard`
- `TechnologyIcon`
- `StatCard`
- `StatsBar`

### 08 — Footer
- `FooterBrand`
- `FooterLinkGroup`
- `SocialLinks`
- `ContactInfo`

## 8. Component behavior and rules

### Buttons
Variants: `primary`, `secondary`, `ghost`, `text`.
States: `default`, `hover`, `disabled`, `loading`.
- Primary: nền Primary, chữ trắng.
- Secondary: nền trắng, viền Primary, chữ xanh đậm.
- Ghost: nền trong suốt, dành cho thao tác phụ.
- Text link: không có khung, có trạng thái hover rõ ràng.

### Cards
- Nền trắng, viền xám sáng, radius 12–16 px.
- Shadow nhẹ, hover nâng nhẹ và tăng độ rõ viền.
- Giữ padding và chiều cao nhất quán trong cùng một grid.

### Badges
- Dạng pill, nền nhạt, chữ đậm.
- Màu phải phản ánh trạng thái thực tế; không dùng màu cảnh báo cho nội dung thông thường.

### Pricing cards
- Hai card cùng chiều cao trong cùng hàng.
- Gói được đề xuất có viền Primary và badge riêng.
- CTA đặt gần đáy card để dễ so sánh.
- Giá và quyền lợi trong mockup cần được xác minh trước khi công bố.

### Comparison table
- Hàng cao tối thiểu 40 px.
- Header có nền xanh rất nhạt.
- Trạng thái thể hiện bằng icon và/hoặc nhãn, không chỉ dựa vào màu.
- Trên mobile, cân nhắc cuộn ngang hoặc chuyển thành các bảng so sánh theo từng gói.

## 9. Section outline và nội dung

1. **Hero** — “An toàn trên mọi hành trình. Bảo vệ doanh nghiệp bằng AI thông minh.”
2. **Features** — Cảnh báo tức thời; Giám sát toàn diện; Báo cáo thông minh; Dễ dàng tích hợp; Bảo mật tuyệt đối; Hỗ trợ 24/7.
3. **AI monitoring demo** — Bình thường; Ngủ gật; Mệt mỏi; Mất tập trung.
4. **Pricing** — Cơ bản 199.000đ và Nâng cao 299.000đ mỗi tháng theo hình minh họa.
5. **Comparison** — So sánh quyền lợi giữa hai gói.
6. **Technology** — Computer Vision; Deep Learning; Edge Computing; Real-time Alert.
7. **Stats** — 98,5%; 10.000+; 500+; 24/7.
8. **Footer** — Sản phẩm; Tài nguyên; Công ty; Liên hệ; Chính sách.

Các mức giá, số liệu và nội dung định lượng nêu trên được giữ theo mockup, chưa được xác minh là thông tin kinh doanh thực tế.

## 10. Responsive behavior

- Desktop: hero chia hai cột; feature grid 3 cột; pricing 2 cột; dashboard rộng.
- Tablet: giảm khoảng cách section; feature grid 2 cột; giữ CTA dễ nhìn.
- Mobile: hero một cột; hình dashboard đặt dưới headline/CTA; feature và scenario card xếp một cột hoặc carousel; pricing xếp một cột; bảng so sánh cuộn ngang nếu cần.
- Header mobile dùng menu thu gọn.
- Không để chữ body nhỏ hơn 14 px trên mobile theo guideline này.
- Giữ vùng chạm tương tác khoảng 44 × 44 px trở lên.

## 11. Gợi ý tổ chức file Figma

- `01 — Foundations`: Color, Typography, Spacing, Radius, Shadows.
- `02 — Components`: Buttons, Inputs, Badges, Cards, Navigation, Tables.
- `03 — Sections`: Hero, Features, AI Demo, Pricing, Technology, Footer.
- `04 — Landing Page`: lắp ráp toàn bộ section từ component.
- `05 — Responsive`: biến thể desktop, tablet và mobile.

Dùng Auto Layout cho component và section; đặt tên layer theo vai trò; tạo variants cho trạng thái và kích thước; dùng design variables cho color và spacing.

## 12. Reusable image-generation prompt

Design a premium, modern SaaS website UI for FleetGuard, an AI-powered fleet safety and vehicle monitoring platform.

**Visual identity**
- Primary: teal green #0E9B78; dark teal #08765E.
- Dark text: #0D2232; body text: #334155.
- White canvas, subtle cool-gray surfaces, pastel green, blue, purple, orange, and red status colors.
- Typography: Plus Jakarta Sans, with a strong hierarchy and generous line-height.
- Rounded 12–16px cards, subtle borders, soft shadows, consistent spacing, polished enterprise-grade finish.

**Component system**
Create reusable navigation, hero, CTA buttons, feature cards, AI monitoring scenario cards, pricing cards, comparison tables, technology cards, statistics bars, badges, form controls, and footer groups. Use consistent icon sizing, stroke weight, radii, and interaction states.

**Page sections**
1. Navigation with FleetGuard logo, links, login, and signup.
2. Hero with a large Vietnamese headline, clear CTAs, a fleet-monitoring dashboard, map pins, vehicle statistics, and real-time driver alerts.
3. Six feature cards.
4. Four AI driver-monitoring scenarios: normal, drowsy, fatigued, distracted.
5. Monthly/yearly billing selector and two pricing plans.
6. Feature comparison table.
7. Technology capabilities and key metrics.
8. Dark teal footer with grouped navigation and contact details.

**Layout**
Desktop-first, 12-column grid, generous whitespace, strong visual hierarchy, balanced text-to-visual ratio, accessible contrast, responsive tablet/mobile adaptations. Align elements precisely and use consistent vertical rhythm.

**Output**
Produce a high-fidelity visual UI mockup, not code. Keep the same design system across every section. Avoid clutter, excessive gradients, random icon styles, tiny typography, and generic template layouts. All interface copy should be in Vietnamese.

## 13. Limitations and handoff notes

Ảnh mockup là ảnh raster, không phải file thiết kế có layer. Không thể tự động tách chính xác từng component thành các layer editable chỉ từ ảnh. Component inventory và tokens trong gói này là bản tái dựng theo mockup; để có file Figma thực, cần dựng lại các thành phần bằng vector/text và áp dụng variables, Auto Layout, component variants.
