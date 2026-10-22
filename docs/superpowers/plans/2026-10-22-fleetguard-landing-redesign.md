# FleetGuard Landing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the FleetGuard landing page (+ Login/Register restyle) from `fleetguard-design-handoff/` with Tailwind v4 + shadcn, the approved SVG illustrations, and GSAP motion (section parallax, icon animation, live hero dashboard), and remove every Samsara asset.

**Architecture:** One file per landing section under `src/components/landing/`, all copy/data in `src/content/landing.js`, shared motion helpers in `src/lib/motion/`. `HomePage.jsx` only composes sections inside a ScrollSmoother wrapper. Each section owns its GSAP timeline via `useGSAP` + `gsap.matchMedia()`.

**Tech Stack:** React 19, Vite 8, plain JS/JSX (no TS), Tailwind CSS v4, shadcn (`radix-nova`, `radix-ui`), lucide-react, gsap 3.15 + @gsap/react, playwright-core (dev, verification only).

**Spec:** `docs/superpowers/specs/2026-10-22-fleetguard-landing-redesign-design.md` — read it before your task; it argues the why. Visual truth: `fleetguard-design-handoff/assets/fleetguard-full-page-mockup.png` (layout) and `fleetguard-component-sheet.png` (component states).

## Global Constraints

- All UI copy in Vietnamese, taken verbatim from `src/content/landing.js` (Task 4). No hard-coded copy in section files.
- Colors only via theme tokens from Task 2 (`brand`, `brand-dark`, `brand-50`, `navy`, `ink`, `ink-subtle`, `surface`, `line`, `success`, `info`, `warning`, `danger`, `violet`, `footer`). No raw hex in section files except inside illustration SVGs.
- White text only on `brand-dark` (#08765E) or darker. `brand` (#0E9B78) is for icons, borders, large fills, text ≥ 24px. `ink-subtle` (#94A3B8) only for placeholders/decoration.
- Body text ≥ 14px on mobile; touch targets ≥ 44×44px.
- Breakpoints: mobile < 768, tablet 768–1023, desktop ≥ 1024. Layout: desktop hero 2 columns, features 3 cols, pricing 2 cols; tablet features 2 cols; mobile everything 1 col, AI demo = horizontal scroll-snap carousel, comparison table scrolls horizontally inside its own container.
- Motion: every GSAP animation lives inside `useGSAP(() => {...}, { scope })` and inside `gsap.matchMedia()` using `MQ` from `src/lib/motion/presets.js`. Under `MQ.reduce` nothing animates and the final state is visible. Animate only `transform`/`opacity` (plus SVG `strokeDashoffset`/DrawSVG). Never `from({opacity:0})` outside matchMedia.
- SplitText: `type: 'lines,words'`, never `chars` (Vietnamese diacritics). Use `mask: 'lines'` only if line-height ≥ 1.2.
- Illustrations: import from `src/components/illustrations/*` and `src/components/brand/FleetGuardLogo.jsx`; animate them only through their documented `data-part` hooks (JSDoc at top of each file). Do not edit illustration files except in Task 13.
- No new runtime dependencies beyond those named in this plan.
- Parallel agents: touch only the files your task lists. Do not run `git commit` (the controller commits after each phase). Do not kill dev servers you did not start. Use your assigned port.
- Section ids (fixed): `top` (hero), `features`, `demo`, `technology`, `pricing`, `comparison`, `contact` (footer).

## Review Focus

1. **Reduced motion** — a user with `prefers-reduced-motion: reduce` must see every section's content fully (no element stuck at opacity 0 / off-screen). Pinned by `check-landing.mjs` "reduced-motion" assertion (Task 1), passing from Task 11.
2. **Phone width overflow** — decorative parallax layers, road band, truck/car, comparison table must not create horizontal page scroll at 375px. Pinned by "no-overflow" assertion at 375/768/1440 (Task 1).
3. **Anchor navigation with ScrollSmoother** — clicking a nav link (desktop and mobile Sheet) must land the section top just below the fixed header and close the mobile menu. Pinned by "nav-anchor" assertion (Task 1).
4. **Leaking timelines / intervals** — StrictMode double-mount and route changes must not duplicate ScrollTriggers, auto-cycle timers or the hero alert ticker. Pinned by "no-leak" assertion: visit `/` → `/login` → `/`; `ScrollTrigger.getAll().length` equals the first-visit count (dev-only `window.__fg` hook, Task 4).
5. **Clipped Vietnamese diacritics** — SplitText masks / `overflow-hidden` / tight line-height cutting off ắ ộ ữ in headings. Pinned by the Phase 4 visual review checklist (Task 12b) and the SplitText rule above.

---

## Phase 0 — Controller

### Task 0: Commit baseline
- [ ] `git add .gitignore frontend/package.json frontend/package-lock.json frontend/public/favicon.svg frontend/src/components/illustrations frontend/src/components/brand frontend/src/preview frontend/preview-driver.html frontend/preview-decor.html docs fleetguard-design-handoff`
- [ ] Commit `chore: add design handoff, spec, plan, SVG illustrations and gsap deps`.

---

## Phase 1 — Foundation (2 agents in parallel: P1a = Tasks 1–3, P1b = Task 4)

### Task 1: Verification harness (P1a)

**Files:**
- Modify: `frontend/package.json` (devDependency `playwright-core`; scripts `shot`, `check`)
- Create: `frontend/scripts/shot.mjs`, `frontend/scripts/check-landing.mjs`
- Create: `frontend/preview-landing.html`, `frontend/src/preview/landing.jsx`

**Interfaces — Produces:**
- `node scripts/shot.mjs <url> <outDir> [--widths=1440,768,375] [--full] [--reduced]` → writes `<outDir>/<slug>-<width>.png`, prints `errors: [...]` (pageerror + console.error) and `overflowX: <px>` per width; exit 1 if errors. Uses `chromium.launch({ channel: 'chrome' })` from `playwright-core`.
- `node scripts/check-landing.mjs [baseUrl=http://localhost:5173]` → runs the 5 assertions below, prints `PASS <name>` / `FAIL <name>: <reason>`, exit 1 on any FAIL.
- Preview: `http://localhost:<port>/preview-landing.html?s=<FileName>` renders `src/components/landing/<FileName>.jsx` default export (found via `import.meta.glob('/src/components/landing/*.jsx')`), wrapped in `<BrowserRouter>`, imports `@/index.css`. `?s=` missing → list of links to available sections.

- [ ] **Step 1: Write `check-landing.mjs` with these assertions** (all must currently FAIL or be skipped against the old page — that is expected):
  - `sections`: elements `#top, #features, #demo, #technology, #pricing, #comparison, #contact` all exist.
  - `no-errors`: zero pageerror/console.error after load + full scroll to bottom (scroll in 10 steps, 150ms apart).
  - `no-overflow`: at widths 375, 768, 1440 → `document.documentElement.scrollWidth <= innerWidth`.
  - `no-samsara`: `document.documentElement.outerHTML` does not match `/samsara/i`; and `fetch('/samsara-icon.svg')` is 404 or returns the SPA html.
  - `reduced-motion`: new context with `reducedMotion: 'reduce'`, after load + full scroll to bottom + 300ms, every element matching `[data-reveal], h1, h2, h3, p` inside `main`, excluding anything inside `[aria-hidden="true"]`, has computed `opacity === '1'` (check the element and its ancestors up to `main`) and `getBoundingClientRect().width > 0`.
  - `nav-anchor`: at 1440 click the header link named "Bảng giá"; after 1500ms `#pricing.getBoundingClientRect().top` is between 0 and 120. At 375 open the menu button (`aria-label="Mở menu"`), click "Bảng giá", same check, and the menu dialog is gone.
  - `no-leak`: load `/`, read `window.__fg.ScrollTrigger.getAll().length` (=N), click "Đăng nhập", then `history.back()`, wait 800ms, count must equal N.
- [ ] **Step 2:** `npm i -D playwright-core` then run `node scripts/check-landing.mjs` against the running dev server (`npx vite --port 5173`) → expected: FAIL on `sections`, `no-samsara`, `nav-anchor`, `no-leak`.
- [ ] **Step 3:** Write `shot.mjs` and the preview page. Run `node scripts/shot.mjs "http://localhost:5173/preview-landing.html" ../.tmp/shots` → prints `errors: []` and the index list renders.
- [ ] **Step 4:** Add npm scripts `"shot": "node scripts/shot.mjs"`, `"check": "node scripts/check-landing.mjs"`. Make sure `vite build` output does not include preview pages (default Vite only builds `index.html`; verify `dist/` has no `preview-*`).

### Task 2: Theme tokens, font, index.html, dashboard logo (P1a)

**Files:**
- Modify: `frontend/src/index.css`, `frontend/index.html`, `frontend/package.json`
- Modify: `frontend/src/pages/driver/DriverLayout.jsx`, `frontend/src/pages/admin/AdminLayout.jsx` (logo import only)

**Interfaces — Produces (Tailwind classes later tasks use):**
- Colors: `brand #0E9B78`, `brand-dark #08765E`, `brand-darker #065F4C` (hover), `brand-50 #ECFDF5`, `brand-100 #D1FAE5`, `navy #0D2232`, `ink #334155`, `ink-subtle #94A3B8`, `surface #F1F5F9`, `line #E2E8F0`, `success #22C55E`, `info #3882F6`, `warning #F59E0B`, `danger #EF4444`, `violet #A855F7`, `footer #0B3B33`. Pastels via opacity modifiers (`bg-info/10`).
- shadcn vars: `--primary #08765E`, `--primary-foreground #FFFFFF`, `--ring #0E9B78`, `--foreground #0D2232`, `--muted-foreground #334155`, `--border #E2E8F0`, `--input #E2E8F0`, `--background #FFFFFF`, `--card #FFFFFF`, `--secondary #F1F5F9`, `--accent #ECFDF5`, `--accent-foreground #08765E`, `--destructive #EF4444`.
- Radius (explicit, not computed): `rounded-sm 8px`, `rounded-md 12px`, `rounded-lg 16px`, `rounded-xl 24px`.
- Shadows: `shadow-card` = `0 4px 16px rgba(13,34,50,0.06)`, `shadow-dashboard` = `0 12px 32px rgba(13,34,50,0.10)`, `shadow-card-hover` = `0 10px 28px rgba(13,34,50,0.10)`.
- Type (theme `--text-*` with line-height + weight): `text-display 48/56 800`, `text-h1 40/48 700`, `text-h2 32/40 700`, `text-h3 24/32 700`, `text-h4 20/28 600`, `text-body-lg 16/26`, `text-body 14/22`, `text-body-sm 12/18`, `text-caption 11/16`. Responsive utilities: `heading-hero` (32 → md 40 → lg 48, weight 800, line-height 1.17), `heading-section` (24 → md 28 → lg 32, weight 700, line-height 1.25).
- Font: `font-sans` = `'Plus Jakarta Sans Variable', Arial, sans-serif` globally (dashboards included — font only).
- Layout helper: `container-page` = `mx-auto w-full max-w-[1200px] px-4 md:px-6 lg:px-8`.

- [ ] **Step 1:** `npm i @fontsource-variable/plus-jakarta-sans`; import it (with Vietnamese subset — the variable package includes it) in `index.css`; remove the Geist import and `@fontsource-variable/geist` dependency; remove the Google Fonts `<link>`s from `index.html`.
- [ ] **Step 2:** In `index.html`: favicon → `/favicon.svg`; keep title/description. 
- [ ] **Step 3:** Add tokens above to `:root` / `@theme inline`. Keep every legacy variable (`--bg-*`, `--amber-*`, `--level-*`, `--text-*` legacy color vars, etc.) untouched so dashboards keep working. Delete the Samsara comment header; replace with a FleetGuard one.
- [ ] **Step 4:** In both dashboard layouts replace `SamsaraLogo` with `FleetGuardLogo` from `@/components/brand/FleetGuardLogo` (use `variant` that suits each sidebar background; `showWordmark` as the old markup had text). No other dashboard change.
- [ ] **Step 5:** Verify: `npx vite build` passes; `node scripts/shot.mjs http://localhost:5173/driver ../.tmp/shots --widths=1440` after logging in is not required — instead `grep -rn "SamsaraLogo" src/pages` returns nothing; open `/login` page renders with no console errors.

### Task 3: shadcn primitives (P1a)

**Files:**
- Modify: `frontend/src/components/ui/button.jsx`
- Create via CLI (`npx shadcn@latest add ...`): `badge card input checkbox radio-group select toggle-group table sheet separator avatar label` in `frontend/src/components/ui/`

**Interfaces — Produces:**
- `<Button variant size loading asChild>`; variants: `default` (= handoff Primary: `bg-primary text-white hover:bg-brand-darker`), `outline` (= handoff Secondary: white bg, `border-brand`, `text-brand-dark`, hover `bg-brand-50`), `ghost` (transparent, hover `bg-surface`), `link` (= handoff Text link: `text-brand-dark`, no frame, hover underline + trailing chevron nudge via `group`), plus existing `secondary`, `destructive`. Sizes: `sm` h-9 px-4, `default` h-10 px-5, `lg` h-12 px-6 text-[15px]; all `rounded-md font-semibold text-sm`. `loading` → disabled + `aria-busy` + spinning `Loader2` before children. Disabled = `opacity-50` (handoff greys).
- `<Badge variant>`: `default` (brand-50 / brand-dark), `info`, `warning`, `danger`, `success`, `violet`, `neutral` (surface/ink); pill, `text-body-sm font-semibold px-2.5 py-0.5`.
- Other primitives keep shadcn APIs; restyle only through tokens (inputs h-11 rounded-md, focus ring brand).

- [ ] **Step 1:** Add components via CLI (answer prompts non-interactively with `-y`; if CLI tries to rewrite `index.css` tokens, re-apply Task 2 values afterwards).
- [ ] **Step 2:** Implement Button/Badge variants above.
- [ ] **Step 3:** Add a `?s=__ui` special case to `src/preview/landing.jsx` rendering every button variant × state (default/hover via `data-hover` class not needed — just default/disabled/loading), badges, input states (default/focus/filled/error), checkbox/radio, select — mirroring component-sheet sections 04–06.
- [ ] **Step 4:** `npm run shot -- "http://localhost:5173/preview-landing.html?s=__ui" ../.tmp/shots --widths=1440` → `errors: []`; compare visually with component sheet 04–06; `npm run lint` and `npx vite build` pass.

### Task 4: Content, motion library, shared landing pieces (P1b — parallel with Tasks 1–3)

**Files:**
- Create: `frontend/src/content/landing.js`
- Create: `frontend/src/lib/motion/gsap.js`, `frontend/src/lib/motion/presets.js`, `frontend/src/lib/motion/scroll.js`, `frontend/src/lib/motion/iconMotion.js`
- Create: `frontend/src/components/landing/SectionHeading.jsx`, `frontend/src/components/landing/AnimatedIcon.jsx`, `frontend/src/components/landing/Reveal.jsx`

**Interfaces — Produces:**
- `gsap.js`: registers `ScrollTrigger, ScrollSmoother, SplitText, DrawSVGPlugin, MorphSVGPlugin, MotionPathPlugin, Flip, CustomEase, CustomWiggle` and `useGSAP` once; re-exports `{ gsap, ScrollTrigger, ScrollSmoother, SplitText, Flip, useGSAP }`. In dev (`import.meta.env.DEV`) sets `window.__fg = { gsap, ScrollTrigger }`. All other files import gsap from here, never from `'gsap'` directly.
- `presets.js`: `export const MQ = { desktop: '(min-width: 1024px) and (prefers-reduced-motion: no-preference)', mobile: '(max-width: 1023px) and (prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)' }`; `export const EASE = { out: 'power3.out', inOut: 'power2.inOut', spring: 'back.out(1.6)' }`; `export const DUR = { fast: 0.25, base: 0.6, slow: 1.0 }`; `export const REVEAL_START = 'top 80%'`.
- `scroll.js`: `export function scrollToSection(id)` → if `ScrollSmoother.get()` then `smoother.scrollTo('#'+id, true, 'top 72px')` else `window.scrollTo({ top: el.offsetTop - 72, behavior: 'smooth' })` (respect reduced motion → `behavior: 'auto'`). `export const HEADER_OFFSET = 72`.
- `iconMotion.js`: `export const ICON_MOTIONS = { bell, pin, chart, plug, lock, headset, scan, brain, chip, clock }` — each `(el, gsap) => Timeline` for the hover/loop micro-animation (bell: CustomWiggle rotate ±14° around top; pin: y bounce; chart: scaleY of paths from bottom stagger; plug: x nudge in/out; lock: shackle y; headset: rotate ±8°; scan: a `<rect>` scan line sweeping y; brain: path opacity flicker stagger; chip: scale pulse; clock: rotate hands 360°). `export function drawIconIn(svgEl, gsap)` → DrawSVG `0%`→`100%` on all `path, line, circle, rect, polyline` children, stagger 0.05, duration 0.8.
- `<AnimatedIcon icon={LucideComponent} motion="bell" tone="brand|info|violet|warning|danger|success" size={24} container="lg|md" />` — renders pastel rounded-md container (lg = 48px, md = 40px; bg `<tone>/10`, icon color `<tone>`, stroke 2). On mount (scroll into view, once) draws the icon in; on hover/focus of the closest `[data-icon-trigger]` ancestor (or itself) plays `ICON_MOTIONS[motion]`. Static under `MQ.reduce`.
- `<SectionHeading title subtitle align="center|left" underline />` — `h2.heading-section text-navy`, optional subtitle `text-body-lg text-ink`, optional 48×3px brand underline (as mockup "FleetGuard có thể giúp gì cho bạn?"). Reveals with SplitText lines/words (desktop+mobile), `data-reveal` on wrapper.
- `<Reveal as="div" y={24} stagger={0.08} children>` — fades/translates direct children with `data-reveal` in on `REVEAL_START`, once.
- `landing.js` exports (copy verbatim, from the mockup):
  - `NAV_LINKS = [{label:'Trang chủ',id:'top'},{label:'Tính năng',id:'features'},{label:'Công nghệ',id:'technology'},{label:'Bảng giá',id:'pricing'},{label:'Tài nguyên',id:'contact'},{label:'Liên hệ',id:'contact'}]`
  - `HERO = { titleLine1:'An toàn trên mọi hành trình', titleLine2:'Bảo vệ doanh nghiệp bằng AI thông minh', description:'FleetGuard – Hệ thống giám sát và bảo vệ tài xế toàn diện. Ứng dụng AI giúp phát hiện sớm rủi ro, cảnh báo kịp thời và nâng cao hiệu quả vận hành đội xe.', primaryCta:'Dùng thử miễn phí', secondaryCta:'Xem demo', trustCompanies:'500+', trustCompaniesLabel:'doanh nghiệp tin dùng', rating:'4.9', ratingMax:'5', ratingCount:'(120+ đánh giá)' }`
  - `DASHBOARD = { title:'Tổng quan đội xe', kpis:[{label:'Tổng xe',value:128,tone:'info'},{label:'Đang hoạt động',value:96,tone:'success'},{label:'Cảnh báo hôm nay',value:12,tone:'danger'},{label:'Tài xế online',value:86,tone:'navy'}], alertsTitle:'Cảnh báo gần đây', alerts:[{type:'Ngủ gật',time:'15:30',plate:'29C-123.45',tone:'danger'},{type:'Mất tập trung',time:'15:28',plate:'29C-678.90',tone:'warning'},{type:'Mệt mỏi',time:'15:20',plate:'29D-246.80',tone:'warning'}], extraAlerts:[{type:'Mất tập trung',time:'15:34',plate:'30A-512.07',tone:'warning'},{type:'Ngủ gật',time:'15:37',plate:'51B-889.21',tone:'danger'}], viewAll:'Xem tất cả', distanceLabel:'Quãng đường hôm nay', distanceKm:1245, distanceDelta:'↑ 12% so với hôm qua', distanceSeries:[12,18,15,24,22,30,28,36,34,42,40,48] }`
  - `FEATURES_HEADING = 'FleetGuard có thể giúp gì cho bạn?'`; `FEATURES = [` `{title:'Cảnh báo tức thời',desc:'Phát hiện sớm các hành vi nguy hiểm như buồn ngủ, mất tập trung, sử dụng điện thoại khi lái xe.',icon:'Bell',motion:'bell',tone:'success'}`, `{title:'Giám sát toàn diện',desc:'Theo dõi vị trí, lộ trình, tốc độ và trạng thái của mọi phương tiện 24/7.',icon:'MapPin',motion:'pin',tone:'info'}`, `{title:'Báo cáo thông minh',desc:'Báo cáo chi tiết, trực quan giúp doanh nghiệp tối ưu vận hành và giảm chi phí.',icon:'ChartNoAxesCombined',motion:'chart',tone:'violet'}`, `{title:'Dễ dàng tích hợp',desc:'Tích hợp linh hoạt với hệ thống sẵn có qua API, phù hợp mọi loại phương tiện.',icon:'Plug',motion:'plug',tone:'warning'}`, `{title:'Bảo mật tuyệt đối',desc:'Dữ liệu được mã hóa và lưu trữ an toàn trên hệ thống đạt chuẩn quốc tế.',icon:'Lock',motion:'lock',tone:'danger'}`, `{title:'Hỗ trợ 24/7',desc:'Đội ngũ kỹ thuật luôn sẵn sàng hỗ trợ bạn mọi lúc, mọi nơi.',icon:'Headset',motion:'headset',tone:'info'}` `]` (icons as lucide names; the section maps names → components)
  - `DEMO = { title:'AI giám sát như thế nào?', subtitle:'Hệ thống AI sẽ phân tích khuôn mặt và hành vi tài xế theo thời gian thực', scenarios:[{state:'normal',label:'Bình thường',caption:'Tài xế tập trung lái xe',tone:'success'},{state:'drowsy',label:'Ngủ gật',caption:'Phát hiện dấu hiệu buồn ngủ',tone:'warning'},{state:'fatigued',label:'Mệt mỏi',caption:'Cảnh báo tài xế mệt mỏi',tone:'warning'},{state:'distracted',label:'Mất tập trung',caption:'Phát hiện mất tập trung',tone:'danger'}], cycleSeconds:4 }`
  - `PRICING = { title:'Gói dịch vụ phù hợp với bạn', monthlyLabel:'Thanh toán tháng', yearlyLabel:'Thanh toán năm', yearlyBadge:'Tiết kiệm 20%', unit:'/xe/tháng', popularBadge:'PHỔ BIẾN', plans:[{id:'basic',name:'CƠ BẢN',monthly:199000,yearly:159000,desc:'Phù hợp với doanh nghiệp vừa và nhỏ',features:['Giám sát vị trí & lộ trình','Cảnh báo buồn ngủ, mất tập trung','Báo cáo cơ bản','Hỗ trợ qua email'],cta:'Dùng thử 7 ngày',popular:false},{id:'advanced',name:'NÂNG CAO',monthly:299000,yearly:239000,desc:'Đầy đủ tính năng cho doanh nghiệp',features:['Tất cả tính năng gói Cơ bản','Báo cáo nâng cao & tùy chỉnh','Tích hợp API','Hỗ trợ 24/7 ưu tiên'],cta:'Dùng thử 7 ngày',popular:true}] }`; `formatVnd(n)` → `'199.000đ'` (vi-VN grouping with '.').
  - `COMPARISON = { title:'So sánh chi tiết tính năng', columns:['Tính năng','Cơ bản','Nâng cao'], rows:[['Giám sát vị trí & lộ trình',true,true],['Cảnh báo buồn ngủ, mất tập trung',true,true],['Báo cáo cơ bản',true,true],['Báo cáo nâng cao & tùy chỉnh',false,true],['Tích hợp API',false,true],['Hỗ trợ 24/7','Email','Ưu tiên']] }`
  - `TECHNOLOGY = { title:'Công nghệ AI tiên tiến', description:'FleetGuard ứng dụng các công nghệ AI hiện đại nhất để đảm bảo độ chính xác và hiệu quả vượt trội.', cta:'Tìm hiểu thêm', items:[{title:'Computer Vision',desc:'Nhận diện khuôn mặt chính xác',icon:'ScanFace',motion:'scan'},{title:'Deep Learning',desc:'Phân tích hành vi thông minh',icon:'BrainCircuit',motion:'brain'},{title:'Edge Computing',desc:'Xử lý dữ liệu ngay trên thiết bị',icon:'Cpu',motion:'chip'},{title:'Real-time Alert',desc:'Cảnh báo tức thời qua đa kênh',icon:'AlarmClock',motion:'clock'}] }`
  - `STATS = [{value:98.5,decimals:1,suffix:'%',label:'Độ chính xác'},{value:10000,suffix:'+',label:'Phương tiện kết nối'},{value:500,suffix:'+',label:'Doanh nghiệp tin dùng'},{text:'24/7',label:'Hỗ trợ khách hàng'}]`; `formatStat(value, decimals)` → vi-VN (`98,5`, `10.000`).
  - `FOOTER = { description:'Giải pháp giám sát và bảo vệ đội xe bằng AI hàng đầu cho doanh nghiệp vận tải Việt Nam.', groups:[{title:'Sản phẩm',links:['Tính năng','Bảng giá','Công nghệ','Chính sách']},{title:'Tài nguyên',links:['Blog','Hướng dẫn sử dụng','Tài liệu API','Câu hỏi thường gặp']},{title:'Công ty',links:['Giới thiệu','Tin tức','Tuyển dụng','Liên hệ']}], contactTitle:'Liên hệ', phone:'1900 1234', email:'support@fleetguard.vn', address:'Tòa nhà ABC, 123 Đường XYZ, Quận 1, TP.HCM', socials:['facebook','youtube','linkedin','zalo'], copyright:'FleetGuard. All rights reserved.', legal:['Điều khoản sử dụng','Chính sách bảo mật'] }`

- [ ] **Step 1:** Create `landing.js` + `formatVnd`/`formatStat`; verify with `node -e "import('./src/content/landing.js').then(m=>{console.log(m.formatVnd(199000), m.formatStat(98.5,1), m.formatStat(10000))})"` → `199.000đ 98,5 10.000`.
- [ ] **Step 2:** Create motion files and components. Note `src/components/landing/` preview needs Task 1's preview page; if Task 1 is not done yet, build a temporary page `frontend/preview-motion.html` + `src/preview/motion.jsx` (yours) on port **5184** showing SectionHeading, Reveal, and all 10 AnimatedIcon motions.
- [ ] **Step 3:** Screenshot via headless Chrome (use `scripts/shot.mjs` when it exists, otherwise an equivalent local script in `../.tmp/`), hover-trigger each icon with Playwright, confirm no console errors; reduced-motion screenshot shows everything static and visible.
- [ ] **Step 4:** `npx oxlint src/lib src/content src/components/landing` and `npx vite build` pass.

**Controller after Phase 1:** review diff + `?s=__ui` screenshot, commit `feat(frontend): theme tokens, ui primitives, motion lib, verification harness`.

---

## Phase 2 — Sections (6 agents in parallel)

Common to every Phase 2 task:
- Each section default-exports one component with root `<section id="<id>" className="relative overflow-hidden ...">` (Navbar is `<header>`, Footer is `<footer id="contact">`).
- Decorative parallax layers: `aria-hidden="true"`, `pointer-events-none`, `absolute`, and carry `data-speed` (ScrollSmoother, desktop only — Task 11 enables it) **and** a fallback ScrollTrigger scrub inside `MQ.mobile` only if the effect matters on mobile. Keep layers inside the section's `overflow-hidden` box so nothing widens the page.
- Content blocks that reveal carry `data-reveal`.
- Verify loop: dev server on your port → `npm run shot -- "http://localhost:<port>/preview-landing.html?s=<File>" ../.tmp/shots/<task> --widths=1440,768,375 --full` (also `--reduced` once) → compare with the mockup region → iterate ≥ 2 rounds → `npx oxlint <your files>` + `npx vite build` pass.
- Load skills before coding: `frontend-design`, `gsap-react`, `gsap-scrolltrigger`, plus those listed per task.

### Task 5: Navbar + Footer (Agent A, port 5191)
**Files:** Create `frontend/src/components/landing/Navbar.jsx`, `frontend/src/components/landing/Footer.jsx`
**Consumes:** `NAV_LINKS`, `FOOTER`, `scrollToSection`, `FleetGuardLogo`, `Button`, `Sheet`.
- Navbar: fixed top, h-[72px], `container-page`; transparent over hero → white/90 + backdrop-blur + `shadow-card` after 24px scroll (ScrollTrigger `onToggle`, not a scroll listener). Desktop links `text-body font-medium text-ink`, active link `text-brand-dark` with 2px underline — active state from ScrollTrigger per section id. "Tài nguyên" shows `ChevronDown`. Right: `Button variant="outline"` "Đăng nhập" → `/login`, `Button` "Đăng ký" → `/register`. Mobile (< 1024): menu button `aria-label="Mở menu"` opens `Sheet` (right) with links + both buttons; clicking a link closes the sheet then `scrollToSection`. Entrance: logo chevrons slide in stagger (`chevron-top`, `chevron-bottom`), links fade down stagger.
- Footer `id="contact"`: bg `footer`, text white/80, `FleetGuardLogo variant="light"`, description, 4 social buttons (inline SVG brand icons — lucide has none — 36px circles white/10, hover white/20 + lift), 3 link groups + contact block with `Phone`, `Mail`, `MapPin` icons; bottom bar: `© {new Date().getFullYear()} ` + copyright, legal links separated by `|`. Links are `href="#"` except product group items that map to section ids (Tính năng/Bảng giá/Công nghệ). Mobile: groups 2 columns, contact full width. Reveal columns stagger.

### Task 6: Hero + FleetDashboard (Agent B, port 5192) — load also `gsap-timeline`, `gsap-plugins`, `dataviz`
**Files:** Create `frontend/src/components/landing/Hero.jsx`, `frontend/src/components/landing/hero/FleetDashboard.jsx`, `frontend/src/components/landing/hero/FleetMap.jsx`
**Consumes:** `HERO`, `DASHBOARD`, `LeafBranch`, `Button`, `Avatar`, `scrollToSection`.
- Layout (mockup top): section `id="top"`, pt-[72px], soft mint radial background blobs + light curved wave at the bottom; desktop 2 columns 5/7; left: h1 `heading-hero` (line 1 navy, line 2 brand), description `text-body-lg text-ink max-w-[480px]`, CTAs `lg` ("Dùng thử miễn phí" → `/register`; "Xem demo" outline with `CirclePlay` → `scrollToSection('demo')`), trust row (3 overlapping avatars with initials, `500+ doanh nghiệp tin dùng`, `Star` filled `warning` + `4.9/5` + 5 small stars + count).
- FleetDashboard (code-built, not an image): `rounded-xl shadow-dashboard bg-white` card: slim left icon rail (logo mark + 4 icons), header "Tổng quan đội xe" + 3 small icon buttons, 4 KPI tiles (value colored by tone), map panel (FleetMap: SVG streets grid on `surface`, 2 translucent geofence circles, route path, 4 pins), alerts list (3 items: tone icon chip, type, `time - Xe plate`, "Xem tất cả" link). Floating overlap card bottom-left "Quãng đường hôm nay" `1.245 km`, delta in `success`, sparkline SVG area chart from `distanceSeries`. `LeafBranch` absolutely positioned bottom-right, `data-speed="0.85"`.
- Motion (desktop+mobile unless noted): headline SplitText words rise stagger; description/CTAs/trust fade up; dashboard rises + scales from 0.96; KPI numbers count up (`gsap.to(obj,{val})` + `snap`); map route DrawSVG; pins drop with `EASE.spring` stagger then pulse ring loop; sparkline DrawSVG then area fade; alerts slide in from right stagger; **ticker**: every 6s prepend the next of `extraAlerts`/cycle (Flip for list shift), only while hero is in view (ScrollTrigger `toggleActions`/`onToggle` → pause/resume), cleaned up on unmount. Desktop only: dashboard tilt toward pointer (`quickTo` rotationX/Y ±4°, `transformPerspective: 1200`), leaves sway (`leaf-*` rotate ±4° yoyo, staggered). Parallax: dashboard `data-speed="0.95"`, floating distance card `data-speed="1.08"`, blobs `data-speed="0.8"`.
- Mobile: single column, dashboard below CTAs, alerts panel stacks under map, floating card becomes inline; dashboard must fit 343px width without overflow.

### Task 7: Features + Technology/Stats (Agent C, port 5193) — load also `gsap-plugins`
**Files:** Create `frontend/src/components/landing/Features.jsx`, `frontend/src/components/landing/Technology.jsx`
**Consumes:** `FEATURES_HEADING`, `FEATURES`, `TECHNOLOGY`, `STATS`, `formatStat`, `SectionHeading`, `AnimatedIcon`, `Reveal`, `AiChip`, `CitySkyline`, `Button`.
- Features `id="features"` (mockup "FleetGuard có thể giúp gì cho bạn?"): white bg; `SectionHeading` centered with underline; 3/2/1-column grid of feature rows: `AnimatedIcon container="lg"` left + title `text-h4 text-navy` + desc `text-body text-ink`; each item is a `data-icon-trigger` card with transparent bg that gains `bg-white shadow-card-hover` + lift −4px on hover. Reveal grid stagger 0.08 from y 24. Parallax: two soft blurred mint blobs `data-speed="0.7"` / `"1.15"`.
- Technology `id="technology"`: light gradient bg (`brand-50` → white); desktop 2 columns: left title `heading-section` + description + `Button variant="outline"` "Tìm hiểu thêm"; right 4 tech items (64px white circle wrapper with `shadow-card` around `AnimatedIcon container="md" tone="brand"` — do not modify AnimatedIcon), title `text-body font-bold text-navy`, desc `text-body-sm text-ink`. `CitySkyline` behind at bottom with layers parallax via `data-speed` 0.6/0.8/0.95 on `layer-back/mid/front` (apply attributes by querying data-parts inside `useGSAP`, desktop only). `AiChip` small decorative near title with traces DrawSVG + glow pulse.
- StatsBar (inside Technology, bottom): `rounded-xl` gradient `brand`→`brand-dark`, white text, 4 columns divided by white/20 rules (2×2 on mobile); value `text-h2 font-extrabold`, label `text-body-sm text-white/85`; count-up with `formatStat` on enter; bar scales in from 0.96.

### Task 8: AI Demo (Agent D, port 5194) — load also `gsap-timeline`, `gsap-plugins`
**Files:** Create `frontend/src/components/landing/AiDemo.jsx`, `frontend/src/components/landing/demo/ScenarioCard.jsx`, `frontend/src/components/landing/demo/driverMotion.js`
**Consumes:** `DEMO`, `SectionHeading`, `DriverIllustration` (`state`, `transition={false}`, `data-part` hooks per its JSDoc), `Badge`.
- `driverMotion.js`: `export function createIdle(svgRoot, state, gsap) → Timeline` (repeat −1): normal = breathe (`torso` + `head` y ±1.5, 3s) + blink every ~3.5s (`[data-part=eyelids] > g` scaleY 1 from top, 0.08s yoyo); drowsy = `head` nod (rotate 0→6°, `svgOrigin: '160 145'`, slow-fast) + `zzz-1..3` rising/fading via MotionPath stagger; fatigued = `mouth-yawn` scale 0.85↔1.05 + `hand-right-cheek` small rotate; distracted = `pupils` x 2.5 glance + `phone-glow` opacity 0.4↔1. Never tween `head-pose` / `pupils-pose`.
- Section `id="demo"`: mint gradient bg; `SectionHeading` (title + subtitle). 4 `ScenarioCard`s (grid 4 cols desktop, 2 cols tablet, mobile horizontal `snap-x snap-mandatory` row with cards `w-[80%] shrink-0`, scrollbar hidden, `role="list"`). Card: white `rounded-lg border-line shadow-card`, header dot (tone) + label `text-h4`, illustration area, caption `text-body text-ink`.
- Active highlight: auto-cycles every `cycleSeconds` through 0..3; active card lifts −6px, border `<tone>`, `shadow-card-hover`, its `Badge` (tone) pops in with `EASE.spring`, a 3px progress bar at card bottom fills over the cycle; hover/focus-within any card → that card active + cycle paused; leave → resume. Idle timelines run for all 4 cards but only while the section is in view (ScrollTrigger onToggle → `play()/pause()`); all killed on unmount. Cards reveal stagger on enter. Keyboard: cards are focusable (`tabIndex=0`) with visible focus ring; `aria-current="true"` on the active card. Reduced motion: no cycle, no idle, first card shown active statically.

### Task 9: Pricing + Comparison (Agent E, port 5195) — load also `gsap-plugins`
**Files:** Create `frontend/src/components/landing/Pricing.jsx`, `frontend/src/components/landing/pricing/PricingCard.jsx`, `frontend/src/components/landing/Comparison.jsx`
**Consumes:** `PRICING`, `formatVnd`, `COMPARISON`, `SectionHeading`, `ToggleGroup`, `Badge`, `Button`, `Table`, `RoadBand`, `SedanCar`, `DeliveryTruck`, `PottedPlant`.
- Pricing `id="pricing"`: `SectionHeading` "Gói dịch vụ phù hợp với bạn"; BillingToggle = `ToggleGroup type="single"` pill (`rounded-full bg-surface p-1`, active item `bg-primary text-white`) + `Badge variant="success"` "Tiết kiệm 20%"; `aria-label="Chu kỳ thanh toán"`. Two `PricingCard`s equal height (`grid lg:grid-cols-2 max-w-[880px] mx-auto items-stretch`): plan icon chip, name `text-body font-bold tracking-wide`, price `text-h1 font-extrabold text-navy` + unit `text-body text-ink`, desc, feature list with `CircleCheck` `text-brand`, CTA at bottom (`mt-auto`) → `/register`: basic `outline`, advanced `default`; advanced card `border-2 border-brand` + top ribbon `PHỔ BIẾN` (bg brand-dark, white `text-caption font-bold`) with a shimmer sweep loop (desktop). Price change: `Flip` for the toggle thumb; price number tweens between values (`formatVnd` on update) — also announced via `aria-live="polite"`.
- Decor band behind cards (mockup): `RoadBand` across the lower half; `SedanCar` left and `DeliveryTruck` right (mirror with `-scale-x-100` per spec note so they face the mockup directions). Scroll scrub (desktop): sedan x from −120 → 0, truck x from 120 → 0 as section enters; wheels rotate proportional to x (`wheel-*`, `transformOrigin: '50% 50%'`); road `dashes` strokeDashoffset loop 0→−48 while in view. Mobile: road + vehicles scaled down below cards, static wheels spin only.
- Comparison `id="comparison"`: `SectionHeading` "So sánh chi tiết tính năng"; container `max-w-[880px] rounded-lg border-line shadow-card bg-white overflow-x-auto` (scroll only inside on mobile; table `min-w-[560px]`); header row `bg-brand-50`, "Nâng cao" header `text-brand-dark`; rows ≥ 44px; `true` → `Check` in brand circle + `<span class="sr-only">Có</span>`; `false` → `Minus` ink-subtle + sr-only "Không"; strings as text. `PottedPlant` left outside the table (desktop only, `data-speed="0.9"`, leaves sway). Rows reveal stagger; check icons DrawSVG in.

### Task 10: Login/Register restyle (Agent F, port 5196) — load also `shadcn`
**Files:** Create `frontend/src/components/auth/AuthShell.jsx`; Modify `frontend/src/pages/LoginPage.jsx`, `frontend/src/pages/RegisterPage.jsx`; Delete `frontend/src/pages/Auth.module.css` when unused.
**Consumes:** `FleetGuardLogo`, `PhoneMap`, `CitySkyline`, `Button`, `Input`, `Label`, `Checkbox`, `Card`, `Badge`.
- `<AuthShell title subtitle footer children>`: desktop split — left panel (`lg:w-[44%]`, `bg-brand-50`, logo top-left linking `/`, value line "An toàn trên mọi hành trình" `heading-section`, `PhoneMap` with route DrawSVG + pin drop, `CitySkyline` at bottom); right: form in white `rounded-xl shadow-card` card max-w-[440px]. Mobile: logo + form only.
- Keep every existing field, the driver/company toggle (as `ToggleGroup`), demo quick-fill accounts, validation and submit logic exactly; only markup/classes change. Keep existing copy, including "Bắt Đầu Miễn Phí" (driver accounts are free in app logic). Remove `SamsaraLogo` usage.
- Verify: log in with `user@fleet.vn` / `password123` via quick-fill still navigates to `/driver`; `admin@fleet.vn` → `/admin` (use the in-browser store; backend not required if the app uses `store/db.js`). Screenshots of `/login` and `/register` at 1440/375.

**Controller after Phase 2:** look at every agent's screenshots against the mockup; send back obvious misses to the same agent; then commit `feat(frontend): landing sections and auth restyle`.

---

## Phase 3 — Assemble (1 agent)

### Task 11: Compose HomePage, smoother, cleanup (port 5173)
**Files:**
- Create: `frontend/src/components/landing/SmoothScroll.jsx`
- Rewrite: `frontend/src/pages/HomePage.jsx`
- Delete: `frontend/src/pages/HomePage.module.css`, `frontend/src/components/HeroSection.jsx`, `frontend/src/components/HeroSection.module.css`, `frontend/src/components/Navbar.jsx`, `frontend/src/components/Navbar.module.css`, `frontend/src/components/SamsaraLogo.jsx`, `frontend/public/samsara-hero.mp4`, `frontend/public/samsara-icon.svg`, `frontend/public/samsara-logo.svg`, `frontend/src/assets/hero.png`, `frontend/src/assets/hero_bg.jpg` (only if unreferenced), `frontend/src/App.css` (only if unreferenced)
- Modify: `frontend/README.md`, root `README.md` (remove Samsara mentions and the "no icons" line), any CSS-module comments mentioning Samsara (`grep -rni samsara frontend/src`)

**Interfaces:** `<SmoothScroll>{children}</SmoothScroll>` renders `#smooth-wrapper > #smooth-content`; creates `ScrollSmoother.create({ smooth: 1.1, effects: true, smoothTouch: false, normalizeScroll: false })` only under `MQ.desktop`; kills on unmount; calls `ScrollTrigger.refresh()` after fonts load (`document.fonts.ready`).

- [ ] **Step 1:** Run `npm run check` → expect the FAILs listed in Task 1.
- [ ] **Step 2:** `HomePage`: `<Navbar/>` outside the wrapper; inside: `<main>` Hero, Features, AiDemo, Technology, Pricing, Comparison; then Footer. Section rhythm: `py-20 lg:py-24` on sections, alternating backgrounds as mockup (white / mint gradient).
- [ ] **Step 3:** Page-level choreography pass: ensure no two parallax layers fight (same element both `data-speed` and a scrub tween), consistent `REVEAL_START`, section-to-section background transitions smooth (mockup's wave edges); hash links on first load (`/#pricing`) scroll correctly after smoother init.
- [ ] **Step 4:** Delete the files above; `grep -rni samsara frontend --exclude-dir=node_modules --exclude-dir=dist` → no output.
- [ ] **Step 5:** `npm run check` → all PASS; `npm run lint`; `npx vite build`; `npm run shot -- http://localhost:5173/ ../.tmp/shots/page --widths=1440,768,375 --full` and `--reduced`.

**Controller after Phase 3:** commit `feat(frontend): assemble redesigned landing with smooth scroll and parallax; remove Samsara assets`.

---

## Phase 4 — Review (4 read-only agents in parallel; report findings, change nothing)

### Task 12a: Code review — skill `requesting-code-review` / `vercel-react-best-practices` / `gsap-react`
Diff `main...HEAD` limited to `frontend/`. Focus: GSAP cleanup and scoping, StrictMode safety, matchMedia coverage, prop/API consistency with this plan's Interfaces, dead code, copy hard-coded outside `landing.js`, raw hex outside illustrations.
### Task 12b: Visual fidelity — skills `design-taste-frontend`, `impeccable` (critique mode)
Screenshots of `/` at 1440/768/375 vs `fleetguard-full-page-mockup.png` section by section, plus `?s=__ui` vs component sheet. Checklist: spacing rhythm, type scale, radii, shadows, colors, icon sizes/stroke, alignment, Vietnamese diacritics never clipped (Review Focus 5), illustration placement, hover states. Output a ranked list with screenshot crops.
### Task 12c: Accessibility — skills `web-design-guidelines`, `chrome-devtools-mcp:a11y-debugging`
Contrast (AA), focus order/visibility, landmarks/headings order (one h1), Sheet focus trap/escape, toggle group semantics, carousel keyboard, `aria-live` price, reduced motion, touch targets 44px, alt/aria-hidden on decor.
### Task 12d: Performance — skills `gsap-performance`, `chrome-devtools-mcp:debug-optimize-lcp`
Lighthouse (mobile + desktop) on `vite preview` build; performance trace while scrolling the full page (long tasks, layout thrash, forced reflow from GSAP), bundle size of the landing chunk and GSAP plugins, font loading (preload, `font-display`), SVG size. Budgets: LCP < 2.5s, CLS < 0.05, TBT < 200ms, no long task > 50ms from animation.

---

## Phase 5 — Fix & optimize (1–2 agents) + finish

### Task 13: Apply review findings
- Controller merges the four reports into one ranked list (drop disputed items per `receiving-code-review`), splits into ≤ 2 disjoint file sets, dispatches fix agents. Include the illustration polish from the spec (driver hair volume, face shading, raised-arm pose) as a separate agent touching only `DriverIllustration.jsx`.
- Each fix agent: reproduce → fix → re-run the relevant check/screenshot → report.

### Task 14: Final verification + branch finish (controller)
- [ ] `npm run lint`, `npx vite build`, `npm run check` (all PASS), full-page screenshots at 3 widths + reduced motion, Lighthouse numbers within budget — skill `verification-before-completion`.
- [ ] Commit `fix(frontend): address landing review findings`.
- [ ] Skill `finishing-a-development-branch` — present push/PR options to the user (do not push without their OK).
