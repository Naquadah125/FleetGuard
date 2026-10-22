/**
 * All landing-page copy and placeholder figures (Vietnamese, verbatim from the mockup).
 * Section components read from here only — no hard-coded copy in section files.
 * Icons are lucide-react component *names*; each section maps names → components.
 */

export const NAV_LINKS = [
  { label: 'Trang chủ', id: 'top' },
  { label: 'Tính năng', id: 'features' },
  { label: 'Công nghệ', id: 'technology' },
  { label: 'Bảng giá', id: 'pricing' },
  { label: 'Tài nguyên', id: 'contact', menu: true },
  { label: 'Liên hệ', id: 'contact' },
]

/** Navbar actions + accessible names (desktop bar and mobile Sheet). */
export const NAV_ACTIONS = {
  login: 'Đăng nhập',
  register: 'Đăng ký',
  openMenu: 'Mở menu',
  closeMenu: 'Đóng menu',
  navLabel: 'Điều hướng chính',
  /** Skip link (sr-only until focused) → <main>. */
  skipToContent: 'Bỏ qua đến nội dung chính',
}

export const HERO = {
  titleLine1: 'An toàn trên mọi hành trình',
  titleLine2: 'Bảo vệ doanh nghiệp bằng AI thông minh',
  description:
    'FleetGuard – Hệ thống giám sát và bảo vệ tài xế toàn diện. Ứng dụng AI giúp phát hiện sớm rủi ro, cảnh báo kịp thời và nâng cao hiệu quả vận hành đội xe.',
  primaryCta: 'Dùng thử miễn phí',
  secondaryCta: 'Xem demo',
  trustCompanies: '500+',
  trustCompaniesLabel: 'doanh nghiệp tin dùng',
  rating: '4.9',
  ratingMax: '5',
  ratingCount: '(120+ đánh giá)',
  /** Decorative initials for the trust-row avatars (no real customers are named). */
  trustAvatars: ['TL', 'MH', 'QA'],
}

export const DASHBOARD = {
  title: 'Tổng quan đội xe',
  kpis: [
    { label: 'Tổng xe', value: 128, tone: 'info' },
    { label: 'Đang hoạt động', value: 96, tone: 'success' },
    { label: 'Cảnh báo hôm nay', value: 12, tone: 'danger' },
    { label: 'Tài xế online', value: 86, tone: 'navy' },
  ],
  alertsTitle: 'Cảnh báo gần đây',
  alerts: [
    { kind: 'drowsy', type: 'Ngủ gật', time: '15:30', plate: '29C-123.45', tone: 'danger' },
    { kind: 'distracted', type: 'Mất tập trung', time: '15:28', plate: '29C-678.90', tone: 'warning' },
    { kind: 'fatigued', type: 'Mệt mỏi', time: '15:20', plate: '29D-246.80', tone: 'warning' },
  ],
  extraAlerts: [
    { kind: 'distracted', type: 'Mất tập trung', time: '15:34', plate: '30A-512.07', tone: 'warning' },
    { kind: 'drowsy', type: 'Ngủ gật', time: '15:37', plate: '51B-889.21', tone: 'danger' },
  ],
  viewAll: 'Xem tất cả',
  /** Alert meta line: `{time} - {alertMetaPrefix} {plate}`. */
  alertMetaPrefix: 'Xe',
  distanceUnit: 'km',
  distanceLabel: 'Quãng đường hôm nay',
  distanceKm: 1245,
  distanceDelta: '↑ 12% so với hôm qua',
  distanceSeries: [12, 18, 15, 24, 22, 30, 28, 36, 34, 42, 40, 48],
  /** Accessible names: the mock is exposed as one image instead of ~25 loose paragraphs. */
  mockLabel:
    'Minh hoạ bảng điều khiển FleetGuard: 128 xe, 96 xe đang hoạt động, 12 cảnh báo hôm nay, 86 tài xế online, bản đồ lộ trình và danh sách cảnh báo gần đây (ngủ gật, mất tập trung, mệt mỏi).',
  distanceMockLabel: 'Quãng đường hôm nay: 1.245 km, tăng 12% so với hôm qua.',
}

/** Pause / resume control for the auto-playing landing motion (WCAG 2.2.2). */
export const MOTION_CONTROL = {
  pause: 'Tạm dừng chuyển động',
  resume: 'Tiếp tục chuyển động',
}

/**
 * Floating contact buttons (bottom-right, FloatingContact.jsx). `zaloNumber` is a placeholder
 * until the real Zalo OA / phone number is supplied; the link is `https://zalo.me/<zaloNumber>`.
 */
export const CONTACT_CTA = {
  zaloNumber: '19001234',
  zaloLabel: 'Chat Zalo',
  hotline: '1900 1234',
  hotlineHref: 'tel:19001234',
  hotlineLabel: 'Gọi 1900 1234',
  ariaZalo: 'Chat Zalo với FleetGuard',
  ariaHotline: 'Gọi 1900 1234 – hotline FleetGuard',
  /** Name of the dock's `<aside>` landmark. */
  regionLabel: 'Liên hệ nhanh',
  /** Appended to the Zalo link's accessible name: it opens in a new tab. */
  newTabHint: '(mở tab mới)',
}

export const FEATURES_HEADING = 'FleetGuard có thể giúp gì cho bạn?'

export const FEATURES = [
  {
    title: 'Cảnh báo tức thời',
    desc: 'Phát hiện sớm các hành vi nguy hiểm như buồn ngủ, mất tập trung, sử dụng điện thoại khi lái xe.',
    icon: 'bell',
    motion: 'bell',
    tone: 'success',
  },
  {
    title: 'Giám sát toàn diện',
    desc: 'Theo dõi vị trí, lộ trình, tốc độ và trạng thái của mọi phương tiện 24/7.',
    icon: 'pin',
    motion: 'pin',
    tone: 'info',
  },
  {
    title: 'Báo cáo thông minh',
    desc: 'Báo cáo chi tiết, trực quan giúp doanh nghiệp tối ưu vận hành và giảm chi phí.',
    icon: 'chart',
    motion: 'chart',
    tone: 'violet',
  },
  {
    title: 'Dễ dàng tích hợp',
    desc: 'Tích hợp linh hoạt với hệ thống sẵn có qua API, phù hợp mọi loại phương tiện.',
    icon: 'plug',
    motion: 'plug',
    tone: 'warning',
  },
  {
    title: 'Bảo mật tuyệt đối',
    desc: 'Dữ liệu được mã hóa và lưu trữ an toàn trên hệ thống đạt chuẩn quốc tế.',
    icon: 'lock',
    motion: 'lock',
    tone: 'danger',
  },
  {
    title: 'Hỗ trợ 24/7',
    desc: 'Đội ngũ kỹ thuật luôn sẵn sàng hỗ trợ bạn mọi lúc, mọi nơi.',
    icon: 'headset',
    motion: 'headset',
    tone: 'info',
  },
]

export const DEMO = {
  title: 'AI giám sát như thế nào?',
  subtitle: 'Hệ thống AI sẽ phân tích khuôn mặt và hành vi tài xế theo thời gian thực',
  scenarios: [
    { state: 'normal', label: 'Bình thường', caption: 'Tài xế tập trung lái xe', tone: 'success' },
    { state: 'drowsy', label: 'Ngủ gật', caption: 'Phát hiện dấu hiệu buồn ngủ', tone: 'warning' },
    { state: 'fatigued', label: 'Mệt mỏi', caption: 'Cảnh báo tài xế mệt mỏi', tone: 'warning' },
    { state: 'distracted', label: 'Mất tập trung', caption: 'Phát hiện mất tập trung', tone: 'danger' },
  ],
  cycleSeconds: 4,
}

export const PRICING = {
  title: 'Gói dịch vụ phù hợp với bạn',
  monthlyLabel: 'Thanh toán tháng',
  yearlyLabel: 'Thanh toán năm',
  yearlyBadge: 'Tiết kiệm 20%',
  /** Accessible name of the monthly / yearly toggle. */
  toggleLabel: 'Chu kỳ thanh toán',
  unit: '/xe/tháng',
  popularBadge: 'PHỔ BIẾN',
  plans: [
    {
      id: 'basic',
      name: 'CƠ BẢN',
      /** Sentence-case name for screen-reader announcements. */
      label: 'Cơ bản',
      monthly: 199000,
      yearly: 159000,
      desc: 'Phù hợp với doanh nghiệp vừa và nhỏ',
      features: [
        'Giám sát vị trí & lộ trình',
        'Cảnh báo buồn ngủ, mất tập trung',
        'Báo cáo cơ bản',
        'Hỗ trợ qua email',
      ],
      cta: 'Dùng thử 7 ngày',
      popular: false,
    },
    {
      id: 'advanced',
      name: 'NÂNG CAO',
      label: 'Nâng cao',
      monthly: 299000,
      yearly: 239000,
      desc: 'Đầy đủ tính năng cho doanh nghiệp',
      features: [
        'Tất cả tính năng gói Cơ bản',
        'Báo cáo nâng cao & tùy chỉnh',
        'Tích hợp API',
        'Hỗ trợ 24/7 ưu tiên',
      ],
      cta: 'Dùng thử 7 ngày',
      popular: true,
    },
  ],
}

export const COMPARISON = {
  title: 'So sánh chi tiết tính năng',
  columns: ['Tính năng', 'Cơ bản', 'Nâng cao'],
  /** Accessible name of the (horizontally scrollable on phones) table container. */
  scrollLabel: 'Bảng so sánh tính năng các gói',
  /** Screen-reader text for the check / dash cells. */
  yes: 'Có',
  no: 'Không',
  rows: [
    ['Giám sát vị trí & lộ trình', true, true],
    ['Cảnh báo buồn ngủ, mất tập trung', true, true],
    ['Báo cáo cơ bản', true, true],
    ['Báo cáo nâng cao & tùy chỉnh', false, true],
    ['Tích hợp API', false, true],
    ['Hỗ trợ 24/7', 'Email', 'Ưu tiên'],
  ],
}

export const TECHNOLOGY = {
  title: 'Công nghệ AI tiên tiến',
  description:
    'FleetGuard ứng dụng các công nghệ AI hiện đại nhất để đảm bảo độ chính xác và hiệu quả vượt trội.',
  cta: 'Tìm hiểu thêm',
  items: [
    { title: 'Computer Vision', desc: 'Nhận diện khuôn mặt chính xác', icon: 'ScanFace', motion: 'scan' },
    { title: 'Deep Learning', desc: 'Phân tích hành vi thông minh', icon: 'BrainCircuit', motion: 'brain' },
    { title: 'Edge Computing', desc: 'Xử lý dữ liệu ngay trên thiết bị', icon: 'Cpu', motion: 'chip' },
    { title: 'Real-time Alert', desc: 'Cảnh báo tức thời qua đa kênh', icon: 'AlarmClock', motion: 'clock' },
  ],
}

export const STATS = [
  { value: 98.5, decimals: 1, suffix: '%', label: 'Độ chính xác' },
  { value: 10000, suffix: '+', label: 'Phương tiện kết nối' },
  { value: 500, suffix: '+', label: 'Doanh nghiệp tin dùng' },
  { text: '24/7', label: 'Hỗ trợ khách hàng' },
]

export const FOOTER = {
  description:
    'Giải pháp giám sát và bảo vệ đội xe bằng AI hàng đầu cho doanh nghiệp vận tải Việt Nam.',
  groups: [
    { title: 'Sản phẩm', links: ['Tính năng', 'Bảng giá', 'Công nghệ', 'Chính sách'] },
    { title: 'Tài nguyên', links: ['Blog', 'Hướng dẫn sử dụng', 'Tài liệu API', 'Câu hỏi thường gặp'] },
    { title: 'Công ty', links: ['Giới thiệu', 'Tin tức', 'Tuyển dụng', 'Liên hệ'] },
  ],
  contactTitle: 'Liên hệ',
  phone: '1900 1234',
  email: 'support@fleetguard.vn',
  address: 'Tòa nhà ABC, 123 Đường XYZ, Quận 1, TP.HCM',
  socials: ['facebook', 'youtube', 'linkedin', 'zalo'],
  copyright: 'FleetGuard. All rights reserved.',
  /** sr-only h2 heading the footer's h3 groups. */
  srTitle: 'Thông tin FleetGuard',
  legal: ['Điều khoản sử dụng', 'Chính sách bảo mật'],
}

const VI = 'vi-VN'

/**
 * Single polite announcement after the billing toggle changes, e.g.
 * "Thanh toán năm: Cơ bản 159.000đ, Nâng cao 239.000đ /xe/tháng".
 */
export function pricingAnnouncement(billing) {
  const period = billing === 'yearly' ? PRICING.yearlyLabel : PRICING.monthlyLabel
  const prices = PRICING.plans.map((p) => `${p.label} ${formatVnd(p[billing])}`).join(', ')
  return `${period}: ${prices} ${PRICING.unit}`
}

/** 199000 → '199.000đ' (vi-VN grouping with '.'). */
export function formatVnd(n) {
  return `${new Intl.NumberFormat(VI, { maximumFractionDigits: 0 }).format(Math.round(n))}đ`
}

/** formatStat(98.5, 1) → '98,5'; formatStat(10000) → '10.000'. Fixed decimals so count-up tweens don't jitter. */
export function formatStat(value, decimals = 0) {
  return new Intl.NumberFormat(VI, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}
